package repository

import (
	"context"
	"time"

	"github.com/qwikshelf/api/internal/domain/entity"
)

// ExpenseRepository defines the interface for expense data access
type ExpenseRepository interface {
	Create(ctx context.Context, expense *entity.Expense) error
	GetByID(ctx context.Context, id int64) (*entity.Expense, error)
	Update(ctx context.Context, expense *entity.Expense) error
	Delete(ctx context.Context, id int64) error
	List(ctx context.Context, filter ExpenseFilter) ([]*entity.Expense, int64, error)
	GetTotalByDateRange(ctx context.Context, start, end time.Time) (float64, error)
}

// ExpenseCategoryRepository defines the interface for category data access
type ExpenseCategoryRepository interface {
	Create(ctx context.Context, category *entity.ExpenseCategory) error
	GetByID(ctx context.Context, id int64) (*entity.ExpenseCategory, error)
	GetByName(ctx context.Context, name string) (*entity.ExpenseCategory, error)
	Update(ctx context.Context, category *entity.ExpenseCategory) error
	Delete(ctx context.Context, id int64) error
	List(ctx context.Context) ([]*entity.ExpenseCategory, error)
}

// ExpenseFilter defines parameters for filtering expenses
type ExpenseFilter struct {
	CategoryID  *int64
	WarehouseID *int64
	UserID      *int64
	StartDate   *time.Time
	EndDate     *time.Time
	Limit       int
	Offset      int
}
