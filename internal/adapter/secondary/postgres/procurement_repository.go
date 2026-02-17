package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"

	"github.com/qwikshelf/api/internal/domain/entity"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
)

// ProcurementRepository implements repository.ProcurementRepository
type ProcurementRepository struct {
	db *DB
}

// NewProcurementRepository creates a new procurement repository
func NewProcurementRepository(db *DB) *ProcurementRepository {
	return &ProcurementRepository{db: db}
}

// Create creates a new procurement with its items
func (r *ProcurementRepository) Create(ctx context.Context, procurement *entity.Procurement) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	query := `
		INSERT INTO procurements (supplier_id, warehouse_id, ordered_by_user_id, expected_delivery, status)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`
	err = tx.QueryRow(ctx, query,
		procurement.SupplierID, procurement.WarehouseID, procurement.OrderedByUserID,
		procurement.ExpectedDelivery, procurement.Status,
	).Scan(&procurement.ID, &procurement.CreatedAt)
	if err != nil {
		return err
	}

	itemQuery := `
		INSERT INTO procurement_items (procurement_id, variant_id, quantity_ordered, unit_cost)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`
	for i := range procurement.Items {
		procurement.Items[i].ProcurementID = procurement.ID
		err = tx.QueryRow(ctx, itemQuery,
			procurement.ID, procurement.Items[i].VariantID,
			procurement.Items[i].QuantityOrdered, procurement.Items[i].UnitCost,
		).Scan(&procurement.Items[i].ID)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

// GetByID retrieves a procurement with its items
func (r *ProcurementRepository) GetByID(ctx context.Context, id int64) (*entity.Procurement, error) {
	query := `
		SELECT p.id, p.supplier_id, p.warehouse_id, p.ordered_by_user_id,
		       p.created_at, p.expected_delivery, p.status,
		       s.name, s.phone, s.location,
		       w.name, w.type, w.address
		FROM procurements p
		JOIN suppliers s ON s.id = p.supplier_id
		JOIN warehouses w ON w.id = p.warehouse_id
		WHERE p.id = $1
	`
	p := &entity.Procurement{
		Supplier:  &entity.Supplier{},
		Warehouse: &entity.Warehouse{},
	}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&p.ID, &p.SupplierID, &p.WarehouseID, &p.OrderedByUserID,
		&p.CreatedAt, &p.ExpectedDelivery, &p.Status,
		&p.Supplier.Name, &p.Supplier.Phone, &p.Supplier.Location,
		&p.Warehouse.Name, &p.Warehouse.Type, &p.Warehouse.Address,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainErrors.ErrProcurementNotFound
	}
	if err != nil {
		return nil, err
	}
	p.Supplier.ID = p.SupplierID
	p.Warehouse.ID = p.WarehouseID

	// Fetch items
	itemQuery := `
		SELECT pi.id, pi.variant_id, pi.quantity_ordered, pi.quantity_received, pi.unit_cost,
		       pv.name, pv.sku, pv.unit
		FROM procurement_items pi
		JOIN product_variants pv ON pv.id = pi.variant_id
		WHERE pi.procurement_id = $1
		ORDER BY pi.id
	`
	rows, err := r.db.Pool.Query(ctx, itemQuery, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var item entity.ProcurementItem
		item.ProcurementID = id
		item.Variant = &entity.ProductVariant{}
		if err := rows.Scan(
			&item.ID, &item.VariantID, &item.QuantityOrdered, &item.QuantityReceived, &item.UnitCost,
			&item.Variant.Name, &item.Variant.SKU, &item.Variant.Unit,
		); err != nil {
			return nil, err
		}
		item.Variant.ID = item.VariantID
		p.Items = append(p.Items, item)
	}
	return p, rows.Err()
}

// List retrieves all procurements with pagination
func (r *ProcurementRepository) List(ctx context.Context, offset, limit int) ([]entity.Procurement, int64, error) {
	var total int64
	if err := r.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM procurements`).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT p.id, p.supplier_id, p.warehouse_id, p.ordered_by_user_id,
		       p.created_at, p.expected_delivery, p.status,
		       s.name, w.name
		FROM procurements p
		JOIN suppliers s ON s.id = p.supplier_id
		JOIN warehouses w ON w.id = p.warehouse_id
		ORDER BY p.created_at DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.db.Pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var procurements []entity.Procurement
	for rows.Next() {
		p := entity.Procurement{
			Supplier:  &entity.Supplier{},
			Warehouse: &entity.Warehouse{},
		}
		if err := rows.Scan(
			&p.ID, &p.SupplierID, &p.WarehouseID, &p.OrderedByUserID,
			&p.CreatedAt, &p.ExpectedDelivery, &p.Status,
			&p.Supplier.Name, &p.Warehouse.Name,
		); err != nil {
			return nil, 0, err
		}
		p.Supplier.ID = p.SupplierID
		p.Warehouse.ID = p.WarehouseID
		procurements = append(procurements, p)
	}
	return procurements, total, rows.Err()
}

// ListBySupplier retrieves procurements for a supplier
func (r *ProcurementRepository) ListBySupplier(ctx context.Context, supplierID int64) ([]entity.Procurement, error) {
	query := `
		SELECT p.id, p.supplier_id, p.warehouse_id, p.ordered_by_user_id,
		       p.created_at, p.expected_delivery, p.status,
		       w.name
		FROM procurements p
		JOIN warehouses w ON w.id = p.warehouse_id
		WHERE p.supplier_id = $1
		ORDER BY p.created_at DESC
	`
	rows, err := r.db.Pool.Query(ctx, query, supplierID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var procurements []entity.Procurement
	for rows.Next() {
		p := entity.Procurement{Warehouse: &entity.Warehouse{}}
		p.SupplierID = supplierID
		if err := rows.Scan(
			&p.ID, &p.SupplierID, &p.WarehouseID, &p.OrderedByUserID,
			&p.CreatedAt, &p.ExpectedDelivery, &p.Status,
			&p.Warehouse.Name,
		); err != nil {
			return nil, err
		}
		p.Warehouse.ID = p.WarehouseID
		procurements = append(procurements, p)
	}
	return procurements, rows.Err()
}

// UpdateStatus updates the status of a procurement
func (r *ProcurementRepository) UpdateStatus(ctx context.Context, id int64, status entity.ProcurementStatus) error {
	query := `UPDATE procurements SET status = $1 WHERE id = $2`
	result, err := r.db.Pool.Exec(ctx, query, status, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainErrors.ErrProcurementNotFound
	}
	return nil
}

// UpdateItemReceived updates the quantity_received for a procurement item
func (r *ProcurementRepository) UpdateItemReceived(ctx context.Context, itemID int64, quantityReceived float64) error {
	query := `UPDATE procurement_items SET quantity_received = $1 WHERE id = $2`
	result, err := r.db.Pool.Exec(ctx, query, quantityReceived, itemID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainErrors.ErrProcurementNotFound
	}
	return nil
}
