package postgres

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"

	"github.com/qwikshelf/api/internal/domain/entity"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
)

// WarehouseRepository implements repository.WarehouseRepository
type WarehouseRepository struct {
	db *DB
}

// NewWarehouseRepository creates a new warehouse repository
func NewWarehouseRepository(db *DB) *WarehouseRepository {
	return &WarehouseRepository{db: db}
}

// Create creates a new warehouse
func (r *WarehouseRepository) Create(ctx context.Context, warehouse *entity.Warehouse) error {
	query := `
		INSERT INTO warehouses (name, type, address)
		VALUES ($1, $2, $3)
		RETURNING id
	`
	return r.db.Pool.QueryRow(ctx, query,
		warehouse.Name, warehouse.Type, warehouse.Address,
	).Scan(&warehouse.ID)
}

// GetByID retrieves a warehouse by ID
func (r *WarehouseRepository) GetByID(ctx context.Context, id int64) (*entity.Warehouse, error) {
	query := `SELECT id, name, type, address FROM warehouses WHERE id = $1`
	w := &entity.Warehouse{}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(&w.ID, &w.Name, &w.Type, &w.Address)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainErrors.ErrWarehouseNotFound
	}
	if err != nil {
		return nil, err
	}
	return w, nil
}

// List retrieves all warehouses
func (r *WarehouseRepository) List(ctx context.Context) ([]entity.Warehouse, error) {
	query := `SELECT id, name, type, address FROM warehouses ORDER BY id`
	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var warehouses []entity.Warehouse
	for rows.Next() {
		var w entity.Warehouse
		if err := rows.Scan(&w.ID, &w.Name, &w.Type, &w.Address); err != nil {
			return nil, err
		}
		warehouses = append(warehouses, w)
	}
	return warehouses, rows.Err()
}

// ListByType retrieves warehouses by type
func (r *WarehouseRepository) ListByType(ctx context.Context, warehouseType entity.WarehouseType) ([]entity.Warehouse, error) {
	query := `SELECT id, name, type, address FROM warehouses WHERE type = $1 ORDER BY id`
	rows, err := r.db.Pool.Query(ctx, query, warehouseType)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var warehouses []entity.Warehouse
	for rows.Next() {
		var w entity.Warehouse
		if err := rows.Scan(&w.ID, &w.Name, &w.Type, &w.Address); err != nil {
			return nil, err
		}
		warehouses = append(warehouses, w)
	}
	return warehouses, rows.Err()
}

// Update updates a warehouse
func (r *WarehouseRepository) Update(ctx context.Context, warehouse *entity.Warehouse) error {
	query := `UPDATE warehouses SET name = $1, type = $2, address = $3 WHERE id = $4`
	result, err := r.db.Pool.Exec(ctx, query, warehouse.Name, warehouse.Type, warehouse.Address, warehouse.ID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainErrors.ErrWarehouseNotFound
	}
	return nil
}

// Delete deletes a warehouse
func (r *WarehouseRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM warehouses WHERE id = $1`
	result, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainErrors.ErrWarehouseNotFound
	}
	return nil
}

// SupplierRepository implements repository.SupplierRepository
type SupplierRepository struct {
	db *DB
}

// NewSupplierRepository creates a new supplier repository
func NewSupplierRepository(db *DB) *SupplierRepository {
	return &SupplierRepository{db: db}
}

// Create creates a new supplier
func (r *SupplierRepository) Create(ctx context.Context, supplier *entity.Supplier) error {
	query := `
		INSERT INTO suppliers (name, phone, location)
		VALUES ($1, $2, $3)
		RETURNING id
	`
	return r.db.Pool.QueryRow(ctx, query,
		supplier.Name, supplier.Phone, supplier.Location,
	).Scan(&supplier.ID)
}

// GetByID retrieves a supplier by ID
func (r *SupplierRepository) GetByID(ctx context.Context, id int64) (*entity.Supplier, error) {
	query := `SELECT id, name, phone, location FROM suppliers WHERE id = $1`
	s := &entity.Supplier{}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(&s.ID, &s.Name, &s.Phone, &s.Location)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainErrors.ErrSupplierNotFound
	}
	if err != nil {
		return nil, err
	}
	return s, nil
}

// List retrieves all suppliers with pagination
func (r *SupplierRepository) List(ctx context.Context, offset, limit int) ([]entity.Supplier, int64, error) {
	var total int64
	if err := r.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM suppliers`).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `SELECT id, name, phone, location FROM suppliers ORDER BY id LIMIT $1 OFFSET $2`
	rows, err := r.db.Pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var suppliers []entity.Supplier
	for rows.Next() {
		var s entity.Supplier
		if err := rows.Scan(&s.ID, &s.Name, &s.Phone, &s.Location); err != nil {
			return nil, 0, err
		}
		suppliers = append(suppliers, s)
	}
	return suppliers, total, rows.Err()
}

// Update updates a supplier
func (r *SupplierRepository) Update(ctx context.Context, supplier *entity.Supplier) error {
	query := `UPDATE suppliers SET name = $1, phone = $2, location = $3 WHERE id = $4`
	result, err := r.db.Pool.Exec(ctx, query, supplier.Name, supplier.Phone, supplier.Location, supplier.ID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainErrors.ErrSupplierNotFound
	}
	return nil
}

// Delete deletes a supplier
func (r *SupplierRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM suppliers WHERE id = $1`
	result, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainErrors.ErrSupplierNotFound
	}
	return nil
}

// AddVariant adds a variant to a supplier
func (r *SupplierRepository) AddVariant(ctx context.Context, sv *entity.SupplierVariant) error {
	query := `
		INSERT INTO supplier_variants (supplier_id, variant_id, agreed_cost, is_preferred)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (supplier_id, variant_id) DO UPDATE SET agreed_cost = $3, is_preferred = $4
	`
	_, err := r.db.Pool.Exec(ctx, query, sv.SupplierID, sv.VariantID, sv.AgreedCost, sv.IsPreferred)
	return err
}

// GetVariants retrieves all variants for a supplier with full product and supplier details
func (r *SupplierRepository) GetVariants(ctx context.Context, supplierID int64) ([]entity.SupplierVariant, error) {
	query := `
		SELECT sv.supplier_id, s.name, s.phone, s.location,
		       sv.variant_id, pv.name, pv.sku, pf.name,
		       sv.agreed_cost, sv.is_preferred
		FROM supplier_variants sv
		JOIN suppliers s ON s.id = sv.supplier_id
		JOIN product_variants pv ON pv.id = sv.variant_id
		JOIN product_families pf ON pf.id = pv.family_id
		WHERE sv.supplier_id = $1
		ORDER BY pf.name, pv.name
	`
	rows, err := r.db.Pool.Query(ctx, query, supplierID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var variants []entity.SupplierVariant
	for rows.Next() {
		var sv entity.SupplierVariant
		sv.Supplier = &entity.Supplier{}
		sv.Variant = &entity.ProductVariant{}
		var familyName string
		if err := rows.Scan(
			&sv.SupplierID, &sv.Supplier.Name, &sv.Supplier.Phone, &sv.Supplier.Location,
			&sv.VariantID, &sv.Variant.Name, &sv.Variant.SKU, &familyName,
			&sv.AgreedCost, &sv.IsPreferred,
		); err != nil {
			return nil, err
		}
		sv.Supplier.ID = supplierID
		sv.Variant.ID = sv.VariantID
		sv.Variant.FamilyName = familyName
		variants = append(variants, sv)
	}
	return variants, rows.Err()
}

// GetPreferredSupplierForVariant retrieves the preferred supplier for a variant
func (r *SupplierRepository) GetPreferredSupplierForVariant(ctx context.Context, variantID int64) (*entity.SupplierVariant, error) {
	query := `
		SELECT supplier_id, variant_id, agreed_cost, is_preferred
		FROM supplier_variants
		WHERE variant_id = $1 AND is_preferred = true
		LIMIT 1
	`
	sv := &entity.SupplierVariant{}
	err := r.db.Pool.QueryRow(ctx, query, variantID).Scan(&sv.SupplierID, &sv.VariantID, &sv.AgreedCost, &sv.IsPreferred)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainErrors.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return sv, nil
}

// RemoveVariant removes a variant from a supplier
func (r *SupplierRepository) RemoveVariant(ctx context.Context, supplierID, variantID int64) error {
	query := `DELETE FROM supplier_variants WHERE supplier_id = $1 AND variant_id = $2`
	_, err := r.db.Pool.Exec(ctx, query, supplierID, variantID)
	return err
}
