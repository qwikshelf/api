package service

import (
	"context"
	"time"

	"github.com/qwikshelf/api/internal/domain/entity"
	"github.com/qwikshelf/api/internal/domain/errors"
	"github.com/qwikshelf/api/internal/domain/repository"
)

// ExpenseService handles business logic for expenses
type ExpenseService struct {
	expenseRepo        repository.ExpenseRepository
	categoryRepo        repository.ExpenseCategoryRepository
}

// NewExpenseService creates a new expense service
func NewExpenseService(expenseRepo repository.ExpenseRepository, categoryRepo repository.ExpenseCategoryRepository) *ExpenseService {
	return &ExpenseService{
		expenseRepo:        expenseRepo,
		categoryRepo:        categoryRepo,
	}
}

// --- Categories ---

func (s *ExpenseService) CreateCategory(ctx context.Context, category *entity.ExpenseCategory) error {
	if category.Name == "" {
		return errors.ErrInvalidInput
	}
	return s.categoryRepo.Create(ctx, category)
}

func (s *ExpenseService) GetCategory(ctx context.Context, id int64) (*entity.ExpenseCategory, error) {
	return s.categoryRepo.GetByID(ctx, id)
}

func (s *ExpenseService) ListCategories(ctx context.Context) ([]*entity.ExpenseCategory, error) {
	return s.categoryRepo.List(ctx)
}

func (s *ExpenseService) UpdateCategory(ctx context.Context, category *entity.ExpenseCategory) error {
	if category.Name == "" {
		return errors.ErrInvalidInput
	}
	return s.categoryRepo.Update(ctx, category)
}

func (s *ExpenseService) DeleteCategory(ctx context.Context, id int64) error {
	// In a real app, we check if expenses exist for this category
	return s.categoryRepo.Delete(ctx, id)
}

// --- Expenses ---

func (s *ExpenseService) CreateExpense(ctx context.Context, expense *entity.Expense) error {
	if expense.CategoryID == 0 || expense.Amount <= 0 {
		return errors.ErrInvalidInput
	}
	if expense.Date.IsZero() {
		expense.Date = time.Now()
	}
	return s.expenseRepo.Create(ctx, expense)
}

func (s *ExpenseService) GetExpense(ctx context.Context, id int64) (*entity.Expense, error) {
	return s.expenseRepo.GetByID(ctx, id)
}

func (s *ExpenseService) UpdateExpense(ctx context.Context, expense *entity.Expense) error {
	if expense.CategoryID == 0 || expense.Amount <= 0 {
		return errors.ErrInvalidInput
	}
	return s.expenseRepo.Update(ctx, expense)
}

func (s *ExpenseService) DeleteExpense(ctx context.Context, id int64) error {
	return s.expenseRepo.Delete(ctx, id)
}

func (s *ExpenseService) ListExpenses(ctx context.Context, filter repository.ExpenseFilter) ([]*entity.Expense, int64, error) {
	if filter.Limit <= 0 {
		filter.Limit = 10
	}
	return s.expenseRepo.List(ctx, filter)
}

func (s *ExpenseService) GetSummary(ctx context.Context, start, end time.Time) (float64, error) {
	return s.expenseRepo.GetTotalByDateRange(ctx, start, end)
}
