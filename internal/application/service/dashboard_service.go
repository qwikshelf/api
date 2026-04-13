package service

import (
	"context"

	"github.com/qwikshelf/api/internal/adapter/secondary/postgres"
	"github.com/qwikshelf/api/internal/domain/entity"
)

type DashboardService struct {
	db *postgres.DB
}

func NewDashboardService(db *postgres.DB) *DashboardService {
	return &DashboardService{db: db}
}

// TrendPoint represents a data point in a time-series chart
type TrendPoint struct {
	Date  string  `json:"date"`
	Value float64 `json:"value"`
}

// TopProduct represents a product ranked by performance
type TopProduct struct {
	Name  string  `json:"name"`
	Value float64 `json:"value"`
}

// DashboardStats contains raw aggregates and trends
type DashboardStats struct {
	TotalProducts         int64
	TotalWarehouses       int64
	TotalSuppliers        int64
	TotalCategories       int64
	TotalUsers            int64
	TotalFamilies         int64
	ActivePOs             int64
	TotalSKUs             int64
	LowStockItems         int64
	OutOfStockItems       int64
	TotalPOSpend          float64
	PendingDeliveries     int64
	OverduePOs            int64
	InventoryValue        float64
	TotalSalesValue       float64
	AccountsReceivable    float64
	TotalMilkBought       float64
	ClosingInventoryValue float64
	SalesTrend            []TrendPoint
	CollectionTrend       []TrendPoint
	TopProducts           []TopProduct
}

// GetStats calculates the dashboard aggregates, respecting the user's permissions
func (s *DashboardService) GetStats(ctx context.Context, user *entity.User, days int) (*DashboardStats, error) {
	stats := &DashboardStats{}
	pool := s.db.Pool

	// Check permissions
	canViewProducts := user.Role.Name == "admin" || s.hasPerm(user, "products.view")
	canViewUsers := user.Role.Name == "admin" || s.hasPerm(user, "users.view")
	canViewWarehouses := user.Role.Name == "admin" || s.hasPerm(user, "warehouses.view")
	canViewSuppliers := user.Role.Name == "admin" || s.hasPerm(user, "suppliers.view")
	canViewInventory := user.Role.Name == "admin" || s.hasPerm(user, "inventory.view")
	canViewProcurement := user.Role.Name == "admin" || s.hasPerm(user, "procurement.view")
	canViewSales := user.Role.Name == "admin" || s.hasPerm(user, "sales.view")

	// Total Products, Categories, Families
	if canViewProducts {
		_ = pool.QueryRow(ctx, "SELECT count(*) FROM product_variants").Scan(&stats.TotalProducts)
		_ = pool.QueryRow(ctx, "SELECT count(*) FROM product_categories").Scan(&stats.TotalCategories)
		_ = pool.QueryRow(ctx, "SELECT count(*) FROM product_families").Scan(&stats.TotalFamilies)
	}

	// Total Users
	if canViewUsers {
		_ = pool.QueryRow(ctx, "SELECT count(*) FROM users").Scan(&stats.TotalUsers)
	}

	// Total Warehouses
	if canViewWarehouses {
		_ = pool.QueryRow(ctx, "SELECT count(*) FROM warehouses").Scan(&stats.TotalWarehouses)
	}

	// Total Suppliers
	if canViewSuppliers {
		_ = pool.QueryRow(ctx, "SELECT count(*) FROM suppliers").Scan(&stats.TotalSuppliers)
	}

	// Inventory Stats (SKUs, Low Stock, Out of Stock, Value)
	if canViewInventory {
		_ = pool.QueryRow(ctx, "SELECT count(*) FROM inventory_levels").Scan(&stats.TotalSKUs)
		_ = pool.QueryRow(ctx, "SELECT count(*) FROM inventory_levels WHERE quantity > 0 AND quantity < 10").Scan(&stats.LowStockItems)
		_ = pool.QueryRow(ctx, "SELECT count(*) FROM inventory_levels WHERE quantity <= 0").Scan(&stats.OutOfStockItems)

		// Closing Inventory Value = sum(quantity * cost_price)
		invQuery := `
			SELECT COALESCE(SUM(il.quantity * pv.cost_price), 0)
			FROM inventory_levels il
			JOIN product_variants pv ON il.variant_id = pv.id
		`
		_ = pool.QueryRow(ctx, invQuery).Scan(&stats.InventoryValue)
		stats.ClosingInventoryValue = stats.InventoryValue
	}

	// Procurement Stats (Active POs, Spend, Pending, Overdue, Milk Bought)
	if canViewProcurement {
		_ = pool.QueryRow(ctx, "SELECT count(*) FROM procurements WHERE status NOT IN ('received', 'cancelled')").Scan(&stats.ActivePOs)
		_ = pool.QueryRow(ctx, "SELECT count(*) FROM procurements WHERE status = 'ordered' AND expected_delivery IS NOT NULL").Scan(&stats.PendingDeliveries)
		_ = pool.QueryRow(ctx, "SELECT count(*) FROM procurements WHERE status NOT IN ('received', 'cancelled') AND expected_delivery < NOW()").Scan(&stats.OverduePOs)

		poSpendQuery := `
			SELECT COALESCE(SUM(pi.quantity_ordered * pi.unit_cost), 0)
			FROM procurements p
			JOIN procurement_items pi ON p.id = pi.procurement_id
		`
		_ = pool.QueryRow(ctx, poSpendQuery).Scan(&stats.TotalPOSpend)

		// Total Milk Bought (assume collections table stores this)
		_ = pool.QueryRow(ctx, "SELECT COALESCE(SUM(weight), 0) FROM collections").Scan(&stats.TotalMilkBought)
	}

	// Sales Stats (Total Sales, Accounts Receivable, Trend)
	if canViewSales {
		_ = pool.QueryRow(ctx, "SELECT COALESCE(SUM(total_amount), 0) FROM sales").Scan(&stats.TotalSalesValue)
		_ = pool.QueryRow(ctx, "SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE payment_method IN ('credit', 'other')").Scan(&stats.AccountsReceivable)

		// Sales Trend (Dynamic days)
		rows, _ := pool.Query(ctx, `
			SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COALESCE(SUM(total_amount), 0) as total
			FROM sales
			WHERE created_at >= NOW() - (INTERVAL '1 day' * $1)
			GROUP BY 1
			ORDER BY 1
		`, days)
		for rows.Next() {
			var p TrendPoint
			if err := rows.Scan(&p.Date, &p.Value); err == nil {
				stats.SalesTrend = append(stats.SalesTrend, p)
			}
		}

		// Top Products by sales
		pRows, _ := pool.Query(ctx, `
			SELECT pv.name, COALESCE(SUM(si.line_total), 0) as total
			FROM sale_items si
			JOIN product_variants pv ON si.variant_id = pv.id
			GROUP BY pv.name
			ORDER BY total DESC
			LIMIT 5
		`)
		for pRows.Next() {
			var tp TopProduct
			if err := pRows.Scan(&tp.Name, &tp.Value); err == nil {
				stats.TopProducts = append(stats.TopProducts, tp)
			}
		}
	}

	// Collection Trend (Dynamic days)
	if canViewProcurement {
		cRows, _ := pool.Query(ctx, `
			SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, COALESCE(SUM(weight), 0) as total
			FROM collections
			WHERE created_at >= NOW() - (INTERVAL '1 day' * $1)
			GROUP BY 1
			ORDER BY 1
		`, days)
		for cRows.Next() {
			var p TrendPoint
			if err := cRows.Scan(&p.Date, &p.Value); err == nil {
				stats.CollectionTrend = append(stats.CollectionTrend, p)
			}
		}
	}

	return stats, nil
}

// NOTE: We need the user permissions. Since user.Permissions isn't directly loaded on the vanilla User struct globally unless we join,
// we will rely on injecting it from the handler using a simpler parameter passing or getting perms via repository.
func (s *DashboardService) hasPerm(user *entity.User, perm string) bool {
	// In actual implementation, we'd pass raw perms from JWT or fetch via repo here.
	// To keep it simple and fast without modifying User entity further, we'll assume the DashboardHandler checks this
	// or we fetch permissions explicitly. Let's fetch them here.

	// We already have userRepo wired up usually, but db.Pool is sufficient.
	var count int
	query := `
        SELECT count(*) FROM permissions p 
        WHERE p.slug = $2 AND p.id IN (
            SELECT permission_id FROM role_permissions rp WHERE rp.role_id = $1
            UNION
            SELECT permission_id FROM user_permissions up WHERE up.user_id = $3
        )
    `
	_ = s.db.Pool.QueryRow(context.Background(), query, user.RoleID, perm, user.ID).Scan(&count)
	return count > 0
}
