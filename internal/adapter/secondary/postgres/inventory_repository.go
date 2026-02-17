package postgres

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"

	"github.com/qwikshelf/api/internal/domain/entity"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
)

// InventoryRepository implements repository.InventoryRepository
type InventoryRepository struct {
	db *DB
}

// NewInventoryRepository creates a new inventory repository
func NewInventoryRepository(db *DB) *InventoryRepository {
	return &InventoryRepository{db: db}
}

// GetLevel retrieves inventory level for a specific warehouse and variant
func (r *InventoryRepository) GetLevel(ctx context.Context, warehouseID, variantID int64) (*entity.InventoryLevel, error) {
	query := `
		SELECT id, warehouse_id, variant_id, quantity, batch_number, expiry_date
		FROM inventory_levels
		WHERE warehouse_id = $1 AND variant_id = $2
	`
	il := &entity.InventoryLevel{}
	err := r.db.Pool.QueryRow(ctx, query, warehouseID, variantID).Scan(
		&il.ID, &il.WarehouseID, &il.VariantID, &il.Quantity, &il.BatchNumber, &il.ExpiryDate,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		// Return zero quantity if no record exists
		return &entity.InventoryLevel{
			WarehouseID: warehouseID,
			VariantID:   variantID,
			Quantity:    decimal.Zero,
		}, nil
	}
	if err != nil {
		return nil, err
	}
	return il, nil
}

// GetLevelsByWarehouse retrieves all inventory levels for a warehouse
func (r *InventoryRepository) GetLevelsByWarehouse(ctx context.Context, warehouseID int64) ([]entity.InventoryLevel, error) {
	query := `
		SELECT il.id, il.warehouse_id, il.variant_id, il.quantity, il.batch_number, il.expiry_date,
		       pv.id, pv.name, pv.sku
		FROM inventory_levels il
		LEFT JOIN product_variants pv ON il.variant_id = pv.id
		WHERE il.warehouse_id = $1
		ORDER BY pv.name
	`
	rows, err := r.db.Pool.Query(ctx, query, warehouseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var levels []entity.InventoryLevel
	for rows.Next() {
		il := entity.InventoryLevel{Variant: &entity.ProductVariant{}}
		if err := rows.Scan(
			&il.ID, &il.WarehouseID, &il.VariantID, &il.Quantity, &il.BatchNumber, &il.ExpiryDate,
			&il.Variant.ID, &il.Variant.Name, &il.Variant.SKU,
		); err != nil {
			return nil, err
		}
		levels = append(levels, il)
	}
	return levels, rows.Err()
}

// GetLevelsByVariant retrieves all inventory levels for a variant
func (r *InventoryRepository) GetLevelsByVariant(ctx context.Context, variantID int64) ([]entity.InventoryLevel, error) {
	query := `
		SELECT il.id, il.warehouse_id, il.variant_id, il.quantity, il.batch_number, il.expiry_date,
		       w.id, w.name, w.type
		FROM inventory_levels il
		LEFT JOIN warehouses w ON il.warehouse_id = w.id
		WHERE il.variant_id = $1
		ORDER BY w.name
	`
	rows, err := r.db.Pool.Query(ctx, query, variantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var levels []entity.InventoryLevel
	for rows.Next() {
		il := entity.InventoryLevel{Warehouse: &entity.Warehouse{}}
		if err := rows.Scan(
			&il.ID, &il.WarehouseID, &il.VariantID, &il.Quantity, &il.BatchNumber, &il.ExpiryDate,
			&il.Warehouse.ID, &il.Warehouse.Name, &il.Warehouse.Type,
		); err != nil {
			return nil, err
		}
		levels = append(levels, il)
	}
	return levels, rows.Err()
}

// SetLevel sets the inventory level
func (r *InventoryRepository) SetLevel(ctx context.Context, level *entity.InventoryLevel) error {
	query := `
		INSERT INTO inventory_levels (warehouse_id, variant_id, quantity, batch_number, expiry_date)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (warehouse_id, variant_id) DO UPDATE SET 
			quantity = $3, batch_number = $4, expiry_date = $5
		RETURNING id
	`
	return r.db.Pool.QueryRow(ctx, query,
		level.WarehouseID, level.VariantID, level.Quantity, level.BatchNumber, level.ExpiryDate,
	).Scan(&level.ID)
}

// AdjustLevel adjusts inventory level by a delta amount
func (r *InventoryRepository) AdjustLevel(ctx context.Context, warehouseID, variantID int64, quantityDelta decimal.Decimal) error {
	query := `
		INSERT INTO inventory_levels (warehouse_id, variant_id, quantity)
		VALUES ($1, $2, $3)
		ON CONFLICT (warehouse_id, variant_id) DO UPDATE SET 
			quantity = inventory_levels.quantity + $3
	`
	_, err := r.db.Pool.Exec(ctx, query, warehouseID, variantID, quantityDelta)
	return err
}

// CreateTransfer creates an inventory transfer
func (r *InventoryRepository) CreateTransfer(ctx context.Context, transfer *entity.InventoryTransfer) error {
	tx, err := r.db.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Insert transfer
	transferQuery := `
		INSERT INTO inventory_transfers (source_warehouse_id, destination_warehouse_id, authorized_by_user_id, transferred_at, status)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`
	err = tx.QueryRow(ctx, transferQuery,
		transfer.SourceWarehouseID, transfer.DestinationWarehouseID, transfer.AuthorizedByUserID,
		transfer.TransferredAt, transfer.Status,
	).Scan(&transfer.ID)
	if err != nil {
		return err
	}

	// Insert items
	itemQuery := `
		INSERT INTO inventory_transfer_items (transfer_id, variant_id, quantity)
		VALUES ($1, $2, $3)
		RETURNING id
	`
	for i := range transfer.Items {
		transfer.Items[i].TransferID = transfer.ID
		err = tx.QueryRow(ctx, itemQuery,
			transfer.ID, transfer.Items[i].VariantID, transfer.Items[i].Quantity,
		).Scan(&transfer.Items[i].ID)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

// GetTransferByID retrieves a transfer by ID
func (r *InventoryRepository) GetTransferByID(ctx context.Context, id int64) (*entity.InventoryTransfer, error) {
	query := `
		SELECT id, source_warehouse_id, destination_warehouse_id, authorized_by_user_id, transferred_at, status
		FROM inventory_transfers WHERE id = $1
	`
	t := &entity.InventoryTransfer{}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&t.ID, &t.SourceWarehouseID, &t.DestinationWarehouseID,
		&t.AuthorizedByUserID, &t.TransferredAt, &t.Status,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domainErrors.ErrTransferNotFound
	}
	if err != nil {
		return nil, err
	}

	// Get items
	itemQuery := `SELECT id, transfer_id, variant_id, quantity FROM inventory_transfer_items WHERE transfer_id = $1`
	rows, err := r.db.Pool.Query(ctx, itemQuery, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var item entity.InventoryTransferItem
		if err := rows.Scan(&item.ID, &item.TransferID, &item.VariantID, &item.Quantity); err != nil {
			return nil, err
		}
		t.Items = append(t.Items, item)
	}

	return t, rows.Err()
}

// ListTransfers retrieves all transfers with pagination
func (r *InventoryRepository) ListTransfers(ctx context.Context, offset, limit int) ([]entity.InventoryTransfer, int64, error) {
	var total int64
	if err := r.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM inventory_transfers`).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT id, source_warehouse_id, destination_warehouse_id, authorized_by_user_id, transferred_at, status
		FROM inventory_transfers
		ORDER BY transferred_at DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.db.Pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var transfers []entity.InventoryTransfer
	for rows.Next() {
		var t entity.InventoryTransfer
		if err := rows.Scan(
			&t.ID, &t.SourceWarehouseID, &t.DestinationWarehouseID,
			&t.AuthorizedByUserID, &t.TransferredAt, &t.Status,
		); err != nil {
			return nil, 0, err
		}
		transfers = append(transfers, t)
	}
	return transfers, total, rows.Err()
}

// UpdateTransferStatus updates the status of a transfer
func (r *InventoryRepository) UpdateTransferStatus(ctx context.Context, id int64, status entity.TransferStatus) error {
	query := `UPDATE inventory_transfers SET status = $1 WHERE id = $2`
	result, err := r.db.Pool.Exec(ctx, query, status, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domainErrors.ErrTransferNotFound
	}
	return nil
}

// GetExpiringStock retrieves inventory expiring within specified days
func (r *InventoryRepository) GetExpiringStock(ctx context.Context, daysUntilExpiry int) ([]entity.InventoryLevel, error) {
	expiryDate := time.Now().AddDate(0, 0, daysUntilExpiry)
	query := `
		SELECT id, warehouse_id, variant_id, quantity, batch_number, expiry_date
		FROM inventory_levels
		WHERE expiry_date IS NOT NULL AND expiry_date <= $1 AND quantity > 0
		ORDER BY expiry_date
	`
	rows, err := r.db.Pool.Query(ctx, query, expiryDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var levels []entity.InventoryLevel
	for rows.Next() {
		var il entity.InventoryLevel
		if err := rows.Scan(
			&il.ID, &il.WarehouseID, &il.VariantID, &il.Quantity, &il.BatchNumber, &il.ExpiryDate,
		); err != nil {
			return nil, err
		}
		levels = append(levels, il)
	}
	return levels, rows.Err()
}

// GetLowStock retrieves inventory below threshold
func (r *InventoryRepository) GetLowStock(ctx context.Context, threshold decimal.Decimal) ([]entity.InventoryLevel, error) {
	query := `
		SELECT id, warehouse_id, variant_id, quantity, batch_number, expiry_date
		FROM inventory_levels
		WHERE quantity < $1
		ORDER BY quantity
	`
	rows, err := r.db.Pool.Query(ctx, query, threshold)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var levels []entity.InventoryLevel
	for rows.Next() {
		var il entity.InventoryLevel
		if err := rows.Scan(
			&il.ID, &il.WarehouseID, &il.VariantID, &il.Quantity, &il.BatchNumber, &il.ExpiryDate,
		); err != nil {
			return nil, err
		}
		levels = append(levels, il)
	}
	return levels, rows.Err()
}

// List stores all inventory levels with pagination
func (r *InventoryRepository) List(ctx context.Context, offset, limit int) ([]entity.InventoryLevel, int64, error) {
	var total int64
	if err := r.db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM inventory_levels`).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT il.id, il.warehouse_id, il.variant_id, il.quantity, il.batch_number, il.expiry_date,
		       pv.id, pv.name, pv.sku,
		       w.id, w.name, w.type
		FROM inventory_levels il
		LEFT JOIN product_variants pv ON il.variant_id = pv.id
		LEFT JOIN warehouses w ON il.warehouse_id = w.id
		ORDER BY il.id DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.db.Pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var levels []entity.InventoryLevel
	for rows.Next() {
		il := entity.InventoryLevel{}
		il.Variant = &entity.ProductVariant{}
		il.Warehouse = &entity.Warehouse{}

		if err := rows.Scan(
			&il.ID, &il.WarehouseID, &il.VariantID, &il.Quantity, &il.BatchNumber, &il.ExpiryDate,
			&il.Variant.ID, &il.Variant.Name, &il.Variant.SKU,
			&il.Warehouse.ID, &il.Warehouse.Name, &il.Warehouse.Type,
		); err != nil {
			return nil, 0, err
		}
		levels = append(levels, il)
	}
	return levels, total, rows.Err()
}
