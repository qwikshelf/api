package repository

import (
	"context"

	"github.com/qwikshelf/api/internal/domain/entity"
)

// WarehouseRepository defines the interface for warehouse data access
type WarehouseRepository interface {
	Create(ctx context.Context, warehouse *entity.Warehouse) error
	GetByID(ctx context.Context, id int64) (*entity.Warehouse, error)
	List(ctx context.Context) ([]entity.Warehouse, error)
	ListByType(ctx context.Context, warehouseType entity.WarehouseType) ([]entity.Warehouse, error)
	Update(ctx context.Context, warehouse *entity.Warehouse) error
	Delete(ctx context.Context, id int64) error
}

// SupplierRepository defines the interface for supplier data access
type SupplierRepository interface {
	Create(ctx context.Context, supplier *entity.Supplier) error
	GetByID(ctx context.Context, id int64) (*entity.Supplier, error)
	List(ctx context.Context, offset, limit int) ([]entity.Supplier, int64, error)
	Update(ctx context.Context, supplier *entity.Supplier) error
	Delete(ctx context.Context, id int64) error

	// Supplier-Variant relationships
	AddVariant(ctx context.Context, sv *entity.SupplierVariant) error
	GetVariants(ctx context.Context, supplierID int64) ([]entity.SupplierVariant, error)
	GetPreferredSupplierForVariant(ctx context.Context, variantID int64) (*entity.SupplierVariant, error)
	RemoveVariant(ctx context.Context, supplierID, variantID int64) error
}
