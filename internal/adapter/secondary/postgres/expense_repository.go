package postgres

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/qwikshelf/api/internal/domain/entity"
	"github.com/qwikshelf/api/internal/domain/errors"
	"github.com/qwikshelf/api/internal/domain/repository"
)

// PostgresExpenseCategoryRepository implements repository.ExpenseCategoryRepository
type PostgresExpenseCategoryRepository struct {
	db *DB
}

// NewPostgresExpenseCategoryRepository creates a new expense category repository
func NewPostgresExpenseCategoryRepository(db *DB) *PostgresExpenseCategoryRepository {
	return &PostgresExpenseCategoryRepository{db: db}
}

func (r *PostgresExpenseCategoryRepository) Create(ctx context.Context, category *entity.ExpenseCategory) error {
	query := `
		INSERT INTO expense_categories (name, description)
		VALUES ($1, $2)
		RETURNING id
	`
	return r.db.Pool.QueryRow(ctx, query, category.Name, category.Description).Scan(&category.ID)
}

func (r *PostgresExpenseCategoryRepository) GetByID(ctx context.Context, id int64) (*entity.ExpenseCategory, error) {
	query := `SELECT id, name, description FROM expense_categories WHERE id = $1`
	category := &entity.ExpenseCategory{}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(&category.ID, &category.Name, &category.Description)
	if err != nil {
		return nil, errors.ErrExpenseCategoryNotFound
	}
	return category, nil
}

func (r *PostgresExpenseCategoryRepository) GetByName(ctx context.Context, name string) (*entity.ExpenseCategory, error) {
	query := `SELECT id, name, description FROM expense_categories WHERE name = $1`
	category := &entity.ExpenseCategory{}
	err := r.db.Pool.QueryRow(ctx, query, name).Scan(&category.ID, &category.Name, &category.Description)
	if err != nil {
		return nil, errors.ErrExpenseCategoryNotFound
	}
	return category, nil
}

func (r *PostgresExpenseCategoryRepository) Update(ctx context.Context, category *entity.ExpenseCategory) error {
	query := `UPDATE expense_categories SET name = $1, description = $2 WHERE id = $3`
	result, err := r.db.Pool.Exec(ctx, query, category.Name, category.Description, category.ID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return errors.ErrExpenseCategoryNotFound
	}
	return nil
}

func (r *PostgresExpenseCategoryRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM expense_categories WHERE id = $1`
	result, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return errors.ErrExpenseCategoryNotFound
	}
	return nil
}

func (r *PostgresExpenseCategoryRepository) List(ctx context.Context) ([]*entity.ExpenseCategory, error) {
	query := `SELECT id, name, description FROM expense_categories ORDER BY name ASC`
	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var categories []*entity.ExpenseCategory
	for rows.Next() {
		category := &entity.ExpenseCategory{}
		if err := rows.Scan(&category.ID, &category.Name, &category.Description); err != nil {
			return nil, err
		}
		categories = append(categories, category)
	}
	return categories, nil
}

// PostgresExpenseRepository implements repository.ExpenseRepository
type PostgresExpenseRepository struct {
	db *DB
}

// NewPostgresExpenseRepository creates a new expense repository
func NewPostgresExpenseRepository(db *DB) *PostgresExpenseRepository {
	return &PostgresExpenseRepository{db: db}
}

func (r *PostgresExpenseRepository) Create(ctx context.Context, expense *entity.Expense) error {
	query := `
		INSERT INTO expenses (category_id, amount, description, date, recorded_by_user_id, warehouse_id, attachment_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at
	`
	return r.db.Pool.QueryRow(ctx, query,
		expense.CategoryID, expense.Amount, expense.Description, expense.Date,
		expense.RecordedByUserID, expense.WarehouseID, expense.AttachmentURL,
	).Scan(&expense.ID, &expense.CreatedAt)
}

func (r *PostgresExpenseRepository) GetByID(ctx context.Context, id int64) (*entity.Expense, error) {
	query := `
		SELECT e.id, e.category_id, ec.name as category_name, e.amount, e.description, e.date, 
		       e.recorded_by_user_id, u.username as recorded_by_username, e.warehouse_id, w.name as warehouse_name, 
		       e.attachment_url, e.created_at
		FROM expenses e
		JOIN expense_categories ec ON e.category_id = ec.id
		JOIN users u ON e.recorded_by_user_id = u.id
		LEFT JOIN warehouses w ON e.warehouse_id = w.id
		WHERE e.id = $1
	`
	expense := &entity.Expense{}
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&expense.ID, &expense.CategoryID, &expense.CategoryName, &expense.Amount, &expense.Description, &expense.Date,
		&expense.RecordedByUserID, &expense.RecordedByUsername, &expense.WarehouseID, &expense.WarehouseName,
		&expense.AttachmentURL, &expense.CreatedAt,
	)
	if err != nil {
		return nil, errors.ErrExpenseNotFound
	}
	return expense, nil
}

func (r *PostgresExpenseRepository) Update(ctx context.Context, expense *entity.Expense) error {
	query := `
		UPDATE expenses 
		SET category_id = $1, amount = $2, description = $3, date = $4, warehouse_id = $5, attachment_url = $6
		WHERE id = $7
	`
	result, err := r.db.Pool.Exec(ctx, query,
		expense.CategoryID, expense.Amount, expense.Description, expense.Date,
		expense.WarehouseID, expense.AttachmentURL, expense.ID,
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return errors.ErrExpenseNotFound
	}
	return nil
}

func (r *PostgresExpenseRepository) Delete(ctx context.Context, id int64) error {
	query := `DELETE FROM expenses WHERE id = $1`
	result, err := r.db.Pool.Exec(ctx, query, id)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return errors.ErrExpenseNotFound
	}
	return nil
}

func (r *PostgresExpenseRepository) List(ctx context.Context, filter repository.ExpenseFilter) ([]*entity.Expense, int64, error) {
	var conditions []string
	var args []interface{}
	argID := 1

	if filter.CategoryID != nil {
		conditions = append(conditions, fmt.Sprintf("e.category_id = $%d", argID))
		args = append(args, *filter.CategoryID)
		argID++
	}
	if filter.WarehouseID != nil {
		conditions = append(conditions, fmt.Sprintf("e.warehouse_id = $%d", argID))
		args = append(args, *filter.WarehouseID)
		argID++
	}
	if filter.UserID != nil {
		conditions = append(conditions, fmt.Sprintf("e.recorded_by_user_id = $%d", argID))
		args = append(args, *filter.UserID)
		argID++
	}
	if filter.StartDate != nil {
		conditions = append(conditions, fmt.Sprintf("e.date >= $%d", argID))
		args = append(args, *filter.StartDate)
		argID++
	}
	if filter.EndDate != nil {
		conditions = append(conditions, fmt.Sprintf("e.date <= $%d", argID))
		args = append(args, *filter.EndDate)
		argID++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	query := fmt.Sprintf(`
		SELECT e.id, e.category_id, ec.name as category_name, e.amount, e.description, e.date, 
		       e.recorded_by_user_id, u.username as recorded_by_username, e.warehouse_id, w.name as warehouse_name, 
		       e.attachment_url, e.created_at, COUNT(*) OVER()
		FROM expenses e
		JOIN expense_categories ec ON e.category_id = ec.id
		JOIN users u ON e.recorded_by_user_id = u.id
		LEFT JOIN warehouses w ON e.warehouse_id = w.id
		%s
		ORDER BY e.date DESC, e.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argID, argID+1)

	args = append(args, filter.Limit, filter.Offset)

	rows, err := r.db.Pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var expenses []*entity.Expense
	var total int64
	for rows.Next() {
		exp := &entity.Expense{}
		err := rows.Scan(
			&exp.ID, &exp.CategoryID, &exp.CategoryName, &exp.Amount, &exp.Description, &exp.Date,
			&exp.RecordedByUserID, &exp.RecordedByUsername, &exp.WarehouseID, &exp.WarehouseName,
			&exp.AttachmentURL, &exp.CreatedAt, &total,
		)
		if err != nil {
			return nil, 0, err
		}
		expenses = append(expenses, exp)
	}
	return expenses, total, nil
}

func (r *PostgresExpenseRepository) GetTotalByDateRange(ctx context.Context, start, end time.Time) (float64, error) {
	query := `SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE date >= $1 AND date <= $2`
	var total float64
	err := r.db.Pool.QueryRow(ctx, query, start, end).Scan(&total)
	return total, err
}
