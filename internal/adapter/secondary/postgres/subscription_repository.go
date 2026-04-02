package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"

	"github.com/qwikshelf/api/internal/application/dto"
	"github.com/qwikshelf/api/internal/domain/entity"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
)

// SubscriptionRepository is the PostgreSQL implementation for subscription data access
type SubscriptionRepository struct {
	pool *pgxpool.Pool
}

// NewSubscriptionRepository creates a new SubscriptionRepository
func NewSubscriptionRepository(db *DB) *SubscriptionRepository {
	return &SubscriptionRepository{pool: db.Pool}
}

// Create inserts a new subscription and its items within a transaction
func (r *SubscriptionRepository) Create(ctx context.Context, sub *entity.Subscription) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	query := `
		INSERT INTO customer_subscriptions (
			customer_id, status, frequency, start_date, end_date, delivery_instructions
		)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`
	err = tx.QueryRow(ctx, query,
		sub.CustomerID, sub.Status, sub.Frequency,
		sub.StartDate, sub.EndDate, sub.DeliveryInstructions,
	).Scan(&sub.ID, &sub.CreatedAt, &sub.UpdatedAt)
	if err != nil {
		return fmt.Errorf("failed to create subscription: %w", err)
	}

	// Insert items
	for i := range sub.Items {
		itemQuery := `
			INSERT INTO subscription_items (subscription_id, variant_id, quantity)
			VALUES ($1, $2, $3)
			RETURNING id
		`
		err = tx.QueryRow(ctx, itemQuery,
			sub.ID, sub.Items[i].VariantID, sub.Items[i].Quantity,
		).Scan(&sub.Items[i].ID)
		if err != nil {
			return fmt.Errorf("failed to insert subscription item: %w", err)
		}
		sub.Items[i].SubscriptionID = sub.ID
	}

	return tx.Commit(ctx)
}

// GetByID fetches a fully hydrated subscription by its ID
func (r *SubscriptionRepository) GetByID(ctx context.Context, id int64) (*entity.Subscription, error) {
	query := `
		SELECT 
			cs.id, cs.customer_id, c.name, cs.status, cs.frequency,
			cs.start_date, cs.end_date, cs.delivery_instructions,
			cs.created_at, cs.updated_at
		FROM customer_subscriptions cs
		JOIN customers c ON cs.customer_id = c.id
		WHERE cs.id = $1
	`
	row := r.pool.QueryRow(ctx, query, id)
	sub, err := mapSubscriptionRow(row)
	if err != nil {
		return nil, err
	}

	items, err := r.fetchItems(ctx, sub.ID)
	if err != nil {
		return nil, err
	}
	sub.Items = items

	return sub, nil
}

// ListFiltered returns subscriptions matching the provided criteria
func (r *SubscriptionRepository) ListFiltered(ctx context.Context, filter dto.SubscriptionListFilter) ([]*entity.Subscription, error) {
	query := `
		SELECT 
			cs.id, cs.customer_id, c.name, cs.status, cs.frequency,
			cs.start_date, cs.end_date, cs.delivery_instructions,
			cs.created_at, cs.updated_at
		FROM customer_subscriptions cs
		JOIN customers c ON cs.customer_id = c.id
		WHERE 1=1
	`
	
	args := []any{}
	argCount := 1

	if filter.CustomerID != nil {
		query += fmt.Sprintf(" AND cs.customer_id = $%d", argCount)
		args = append(args, *filter.CustomerID)
		argCount++
	}

	if filter.Status != nil && *filter.Status != "" && *filter.Status != "all" {
		query += fmt.Sprintf(" AND cs.status = $%d", argCount)
		args = append(args, *filter.Status)
		argCount++
	}

	if filter.Frequency != nil && *filter.Frequency != "" && *filter.Frequency != "all" {
		query += fmt.Sprintf(" AND cs.frequency = $%d", argCount)
		args = append(args, *filter.Frequency)
		argCount++
	}

	query += ` ORDER BY cs.created_at DESC`

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list subscriptions: %w", err)
	}
	defer rows.Close()

	var subs []*entity.Subscription
	for rows.Next() {
		sub, err := mapSubscriptionRow(rows)
		if err != nil {
			return nil, err
		}
		items, err := r.fetchItems(ctx, sub.ID)
		if err != nil {
			return nil, err
		}
		sub.Items = items
		subs = append(subs, sub)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return subs, nil
}

// ListByCustomer returns all subscriptions for a given customer, newest first
func (r *SubscriptionRepository) ListByCustomer(ctx context.Context, customerID int64) ([]*entity.Subscription, error) {
	query := `
		SELECT 
			cs.id, cs.customer_id, c.name, cs.status, cs.frequency,
			cs.start_date, cs.end_date, cs.delivery_instructions,
			cs.created_at, cs.updated_at
		FROM customer_subscriptions cs
		JOIN customers c ON cs.customer_id = c.id
		WHERE cs.customer_id = $1
		ORDER BY cs.created_at DESC
	`
	rows, err := r.pool.Query(ctx, query, customerID)
	if err != nil {
		return nil, fmt.Errorf("failed to list subscriptions: %w", err)
	}
	defer rows.Close()

	var subs []*entity.Subscription
	for rows.Next() {
		sub, err := mapSubscriptionRow(rows)
		if err != nil {
			return nil, err
		}
		items, err := r.fetchItems(ctx, sub.ID)
		if err != nil {
			return nil, err
		}
		sub.Items = items
		subs = append(subs, sub)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("rows error: %w", err)
	}

	return subs, nil
}

// Update replaces the subscription header fields and its items
func (r *SubscriptionRepository) Update(ctx context.Context, sub *entity.Subscription) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	updateQuery := `
		UPDATE customer_subscriptions
		SET frequency = $1, start_date = $2, end_date = $3,
		    delivery_instructions = $4, updated_at = NOW()
		WHERE id = $5
		RETURNING updated_at
	`
	err = tx.QueryRow(ctx, updateQuery,
		sub.Frequency, sub.StartDate, sub.EndDate,
		sub.DeliveryInstructions, sub.ID,
	).Scan(&sub.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return domainErrors.ErrNotFound
		}
		return fmt.Errorf("failed to update subscription: %w", err)
	}

	// Replace all items: delete existing, re-insert new ones
	if _, err = tx.Exec(ctx, "DELETE FROM subscription_items WHERE subscription_id = $1", sub.ID); err != nil {
		return fmt.Errorf("failed to clear subscription items: %w", err)
	}

	for i := range sub.Items {
		itemQuery := `
			INSERT INTO subscription_items (subscription_id, variant_id, quantity)
			VALUES ($1, $2, $3)
			RETURNING id
		`
		err = tx.QueryRow(ctx, itemQuery,
			sub.ID, sub.Items[i].VariantID, sub.Items[i].Quantity,
		).Scan(&sub.Items[i].ID)
		if err != nil {
			return fmt.Errorf("failed to insert subscription item: %w", err)
		}
		sub.Items[i].SubscriptionID = sub.ID
	}

	return tx.Commit(ctx)
}

// UpdateStatus changes only the status of a subscription
func (r *SubscriptionRepository) UpdateStatus(ctx context.Context, id int64, status string) error {
	tag, err := r.pool.Exec(ctx,
		"UPDATE customer_subscriptions SET status = $1, updated_at = NOW() WHERE id = $2",
		status, id,
	)
	if err != nil {
		return fmt.Errorf("failed to update subscription status: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainErrors.ErrNotFound
	}
	return nil
}

// Delete permanently removes a subscription and its cascade-deleted items
func (r *SubscriptionRepository) Delete(ctx context.Context, id int64) error {
	tag, err := r.pool.Exec(ctx, "DELETE FROM customer_subscriptions WHERE id = $1", id)
	if err != nil {
		return fmt.Errorf("failed to delete subscription: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domainErrors.ErrNotFound
	}
	return nil
}

// fetchItems loads all subscription items for a given subscription ID
func (r *SubscriptionRepository) fetchItems(ctx context.Context, subscriptionID int64) ([]entity.SubscriptionItem, error) {
	query := `
		SELECT 
			si.id, si.subscription_id, si.variant_id,
			pv.name, pf.name, pv.unit, si.quantity
		FROM subscription_items si
		JOIN product_variants pv ON si.variant_id = pv.id
		JOIN product_families pf ON pv.family_id = pf.id
		WHERE si.subscription_id = $1
		ORDER BY si.id ASC
	`
	rows, err := r.pool.Query(ctx, query, subscriptionID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch subscription items: %w", err)
	}
	defer rows.Close()

	var items []entity.SubscriptionItem
	for rows.Next() {
		var item entity.SubscriptionItem
		var variantName, familyName, unit string
		var qty decimal.Decimal

		err := rows.Scan(
			&item.ID, &item.SubscriptionID, &item.VariantID,
			&variantName, &familyName, &unit, &qty,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan subscription item: %w", err)
		}
		item.Quantity = qty
		item.Variant = &entity.ProductVariant{
			ID:         item.VariantID,
			Name:       variantName,
			FamilyName: familyName,
			Unit:       unit,
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("items rows error: %w", err)
	}

	return items, nil
}

type subscriptionRow interface {
	Scan(dest ...any) error
}

func mapSubscriptionRow(row subscriptionRow) (*entity.Subscription, error) {
	var sub entity.Subscription
	var customerName string

	err := row.Scan(
		&sub.ID, &sub.CustomerID, &customerName, &sub.Status, &sub.Frequency,
		&sub.StartDate, &sub.EndDate, &sub.DeliveryInstructions,
		&sub.CreatedAt, &sub.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, domainErrors.ErrNotFound
		}
		return nil, fmt.Errorf("failed to scan subscription: %w", err)
	}

	sub.Customer = &entity.Customer{
		ID:   sub.CustomerID,
		Name: customerName,
	}
	return &sub, nil
}

// ==========================================
// Deliveries
// ==========================================

// RecordDelivery saves or updates a daily fulfillment status for a subscription
func (r *SubscriptionRepository) RecordDelivery(ctx context.Context, d *entity.SubscriptionDelivery) error {
	query := `
		INSERT INTO subscription_deliveries (
			subscription_id, delivery_date, status, notes, recorded_by
		) VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (subscription_id, delivery_date) 
		DO UPDATE SET 
			status = EXCLUDED.status,
			notes = EXCLUDED.notes,
			recorded_by = EXCLUDED.recorded_by,
			recorded_at = NOW()
		RETURNING id, recorded_at
	`
	err := r.pool.QueryRow(ctx, query,
		d.SubscriptionID, d.DeliveryDate, d.Status, d.Notes, d.RecordedBy,
	).Scan(&d.ID, &d.RecordedAt)
	if err != nil {
		return fmt.Errorf("failed to record delivery: %w", err)
	}
	return nil
}

// GetDeliveries returns the historical fulfillment records for a subscription
func (r *SubscriptionRepository) GetDeliveries(ctx context.Context, subscriptionID int64) ([]*entity.SubscriptionDelivery, error) {
	query := `
		SELECT id, subscription_id, delivery_date, status, notes, recorded_by, recorded_at
		FROM subscription_deliveries
		WHERE subscription_id = $1
		ORDER BY delivery_date DESC
	`
	rows, err := r.pool.Query(ctx, query, subscriptionID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch deliveries: %w", err)
	}
	defer rows.Close()

	var deliveries []*entity.SubscriptionDelivery
	for rows.Next() {
		var d entity.SubscriptionDelivery
		err := rows.Scan(
			&d.ID, &d.SubscriptionID, &d.DeliveryDate, &d.Status,
			&d.Notes, &d.RecordedBy, &d.RecordedAt,
		)
		if err != nil {
			return nil, err
		}
		deliveries = append(deliveries, &d)
	}
	return deliveries, nil
}

// GetDailyRoster returns all active subscriptions eligible for delivery on the given date, alongside their current delivery log
func (r *SubscriptionRepository) GetDailyRoster(ctx context.Context, date string) ([]*entity.DailyRosterItem, error) {
	query := `
		SELECT 
			cs.id, cs.customer_id, c.name, cs.status, cs.frequency,
			cs.start_date, cs.end_date, cs.delivery_instructions,
			cs.created_at, cs.updated_at,
			sd.id, sd.status, sd.notes, sd.recorded_by, sd.recorded_at
		FROM customer_subscriptions cs
		JOIN customers c ON cs.customer_id = c.id
		LEFT JOIN subscription_deliveries sd ON cs.id = sd.subscription_id AND sd.delivery_date = $1::date
		WHERE cs.status = 'active'
		  AND cs.start_date <= $1::date
		  AND (cs.end_date IS NULL OR cs.end_date >= $1::date)
		ORDER BY c.name ASC
	`
	rows, err := r.pool.Query(ctx, query, date)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch daily roster: %w", err)
	}
	defer rows.Close()

	var roster []*entity.DailyRosterItem
	for rows.Next() {
		var sub entity.Subscription
		var customerName string
		var sdID *int64
		var sdStatus *string
		var sdNotes *string
		var sdRecordedBy *int64
		var sdRecordedAt *time.Time

		err := rows.Scan(
			&sub.ID, &sub.CustomerID, &customerName, &sub.Status, &sub.Frequency,
			&sub.StartDate, &sub.EndDate, &sub.DeliveryInstructions,
			&sub.CreatedAt, &sub.UpdatedAt,
			&sdID, &sdStatus, &sdNotes, &sdRecordedBy, &sdRecordedAt,
		)
		if err != nil {
			return nil, err
		}

		sub.Customer = &entity.Customer{
			ID:   sub.CustomerID,
			Name: customerName,
		}

		item := &entity.DailyRosterItem{
			Subscription: &sub,
		}

		// If a delivery record exists for this date, map it
		if sdID != nil {
			item.Delivery = &entity.SubscriptionDelivery{
				ID:             *sdID,
				SubscriptionID: sub.ID,
				Status:         entity.DeliveryStatus(*sdStatus),
				Notes:          sdNotes,
				RecordedBy:     sdRecordedBy,
				RecordedAt:     *sdRecordedAt,
			}
		}

		roster = append(roster, item)
	}

	// Fetch items for each subscription (n+1 problem mitigated if we load items, but this might be thousands. For now, looping to keep interface small, or just omit if UI doesn't need to show them in the daily roster right away. Roster mainly needs name and maybe sub items. We will fetch items per subscription)
	// We'll hydrate the items
	for _, item := range roster {
		items, err := r.fetchItems(ctx, item.Subscription.ID)
		if err == nil {
			item.Subscription.Items = items
		}
	}

	return roster, nil
}
