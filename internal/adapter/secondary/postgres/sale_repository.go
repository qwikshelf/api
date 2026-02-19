package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"

	"github.com/qwikshelf/api/internal/domain/entity"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
)

// SaleRepository implements repository.SaleRepository
type SaleRepository struct {
	db *DB
}

// NewSaleRepository creates a new sale repository
func NewSaleRepository(db *DB) *SaleRepository {
	return &SaleRepository{db: db}
}

// Create records a new sale with its items
func (r *SaleRepository) Create(ctx context.Context, sale *entity.Sale) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	query := `
		INSERT INTO sales (warehouse_id, customer_name, total_amount, tax_amount, discount_amount, payment_method, processed_by_user_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at
	`
	err = tx.QueryRow(ctx, query,
		sale.WarehouseID, sale.CustomerName, sale.TotalAmount, sale.TaxAmount, sale.DiscountAmount,
		sale.PaymentMethod, sale.ProcessedByUserID,
	).Scan(&sale.ID, &sale.CreatedAt)
	if err != nil {
		return err
	}

	itemQuery := `
		INSERT INTO sale_items (sale_id, variant_id, quantity, unit_price, line_total)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`
	for i := range sale.Items {
		sale.Items[i].SaleID = sale.ID
		err = tx.QueryRow(ctx, itemQuery,
			sale.ID, sale.Items[i].VariantID, sale.Items[i].Quantity,
			sale.Items[i].UnitPrice, sale.Items[i].LineTotal,
		).Scan(&sale.Items[i].ID)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

// GetByID retrieves a sale with its items
func (r *SaleRepository) GetByID(ctx context.Context, id int64) (*entity.Sale, error) {
	query := `
		SELECT id, warehouse_id, customer_name, total_amount, tax_amount, discount_amount, payment_method, processed_by_user_id, created_at
		FROM sales WHERE id = $1
	`
	s := &entity.Sale{}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&s.ID, &s.WarehouseID, &s.CustomerName, &s.TotalAmount, &s.TaxAmount, &s.DiscountAmount,
		&s.PaymentMethod, &s.ProcessedByUserID, &s.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainErrors.ErrNotFound
	}
	if err != nil {
		return nil, err
	}

	// Fetch items
	itemQuery := `
		SELECT si.id, si.variant_id, si.quantity, si.unit_price, si.line_total,
		       pv.name, pv.sku
		FROM sale_items si
		JOIN product_variants pv ON pv.id = si.variant_id
		WHERE si.sale_id = $1
	`
	rows, err := r.db.Pool.Query(ctx, itemQuery, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var item entity.SaleItem
		item.SaleID = id
		item.Variant = &entity.ProductVariant{}
		if err := rows.Scan(
			&item.ID, &item.VariantID, &item.Quantity, &item.UnitPrice, &item.LineTotal,
			&item.Variant.Name, &item.Variant.SKU,
		); err != nil {
			return nil, err
		}
		item.Variant.ID = item.VariantID
		s.Items = append(s.Items, item)
	}
	return s, rows.Err()
}

// List retrieves all sales with pagination and optional warehouse filter
func (r *SaleRepository) List(ctx context.Context, warehouseID *int64, offset, limit int) ([]entity.Sale, int64, error) {
	var total int64
	countQuery := `SELECT COUNT(*) FROM sales`
	if warehouseID != nil {
		countQuery += ` WHERE warehouse_id = $1`
		r.db.Pool.QueryRow(ctx, countQuery, *warehouseID).Scan(&total)
	} else {
		r.db.Pool.QueryRow(ctx, countQuery).Scan(&total)
	}

	query := `
		SELECT id, warehouse_id, customer_name, total_amount, tax_amount, discount_amount, payment_method, processed_by_user_id, created_at
		FROM sales
	`
	var rows pgx.Rows
	var err error
	if warehouseID != nil {
		query += ` WHERE warehouse_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`
		rows, err = r.db.Pool.Query(ctx, query, *warehouseID, limit, offset)
	} else {
		query += ` ORDER BY created_at DESC LIMIT $1 OFFSET $2`
		rows, err = r.db.Pool.Query(ctx, query, limit, offset)
	}

	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var sales []entity.Sale
	for rows.Next() {
		var s entity.Sale
		if err := rows.Scan(
			&s.ID, &s.WarehouseID, &s.CustomerName, &s.TotalAmount, &s.TaxAmount, &s.DiscountAmount,
			&s.PaymentMethod, &s.ProcessedByUserID, &s.CreatedAt,
		); err != nil {
			return nil, 0, err
		}
		sales = append(sales, s)
	}
	return sales, total, rows.Err()
}
