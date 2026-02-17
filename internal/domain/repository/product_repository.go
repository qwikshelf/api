package repository

import (
	"context"

	"github.com/qwikshelf/api/internal/domain/entity"
)

// CategoryRepository defines the interface for category data access
type CategoryRepository interface {
	Create(ctx context.Context, category *entity.Category) error
	GetByID(ctx context.Context, id int64) (*entity.Category, error)
	List(ctx context.Context) ([]entity.Category, error)
	Update(ctx context.Context, category *entity.Category) error
	Delete(ctx context.Context, id int64) error
}

// ProductFamilyRepository defines the interface for product family data access
type ProductFamilyRepository interface {
	Create(ctx context.Context, family *entity.ProductFamily) error
	GetByID(ctx context.Context, id int64) (*entity.ProductFamily, error)
	List(ctx context.Context, offset, limit int) ([]entity.ProductFamily, int64, error)
	ListByCategory(ctx context.Context, categoryID int64) ([]entity.ProductFamily, error)
	Update(ctx context.Context, family *entity.ProductFamily) error
	Delete(ctx context.Context, id int64) error
}

// ProductVariantRepository defines the interface for product variant data access
type ProductVariantRepository interface {
	Create(ctx context.Context, variant *entity.ProductVariant) error
	GetByID(ctx context.Context, id int64) (*entity.ProductVariant, error)
	GetBySKU(ctx context.Context, sku string) (*entity.ProductVariant, error)
	GetByBarcode(ctx context.Context, barcode string) (*entity.ProductVariant, error)
	List(ctx context.Context, offset, limit int) ([]entity.ProductVariant, int64, error)
	ListByFamily(ctx context.Context, familyID int64) ([]entity.ProductVariant, error)
	Update(ctx context.Context, variant *entity.ProductVariant) error
	Delete(ctx context.Context, id int64) error
	ExistsBySKU(ctx context.Context, sku string) (bool, error)
	ExistsByBarcode(ctx context.Context, barcode string) (bool, error)
}
