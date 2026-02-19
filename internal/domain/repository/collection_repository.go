package repository

import (
	"context"

	"github.com/qwikshelf/api/internal/domain/entity"
)

type CollectionRepository interface {
	Create(ctx context.Context, collection *entity.Collection) error
	GetByID(ctx context.Context, id int64) (*entity.Collection, error)
	List(ctx context.Context, offset, limit int) ([]entity.Collection, int64, error)
}
