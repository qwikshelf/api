package repository

import (
	"context"

	"github.com/qwikshelf/api/internal/domain/entity"
)

// SaleRepository defines the interface for sale data access
type SaleRepository interface {
	Create(ctx context.Context, sale *entity.Sale) error
	GetByID(ctx context.Context, id int64) (*entity.Sale, error)
	List(ctx context.Context, warehouseID *int64, offset, limit int) ([]entity.Sale, int64, error)
}
