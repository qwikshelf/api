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
			COALESCE(pv.name, ''), COALESCE(pf.name, ''), COALESCE(pv.unit, ''), si.quantity
		FROM subscription_items si
		JOIN product_variants pv ON si.variant_id = pv.id
		LEFT JOIN product_families pf ON pv.family_id = pf.id
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
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	query := `
		INSERT INTO subscription_deliveries (
			subscription_id, delivery_date, status, notes, recorded_by, is_custom
		) VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (subscription_id, delivery_date) 
		DO UPDATE SET 
			status = EXCLUDED.status,
			notes = EXCLUDED.notes,
			recorded_by = EXCLUDED.recorded_by,
			is_custom = EXCLUDED.is_custom,
			recorded_at = NOW()
		RETURNING id, recorded_at
	`
	err = tx.QueryRow(ctx, query,
		d.SubscriptionID, d.DeliveryDate, d.Status, d.Notes, d.RecordedBy, d.IsCustom,
	).Scan(&d.ID, &d.RecordedAt)
	if err != nil {
		return fmt.Errorf("failed to record delivery: %w", err)
	}

	// Sync items: Delete existing and re-insert
	if _, err = tx.Exec(ctx, "DELETE FROM subscription_delivery_items WHERE delivery_id = $1", d.ID); err != nil {
		return err
	}

	for i := range d.Items {
		itemQuery := `
			INSERT INTO subscription_delivery_items (delivery_id, variant_id, quantity, unit_price)
			VALUES ($1, $2, $3, $4)
		`
		_, err = tx.Exec(ctx, itemQuery,
			d.ID, d.Items[i].VariantID, d.Items[i].Quantity, d.Items[i].UnitPrice,
		)
		if err != nil {
			return fmt.Errorf("failed to insert delivery item: %w", err)
		}
	}

	return tx.Commit(ctx)
}

// GetDeliveries returns the historical fulfillment records for a subscription
func (r *SubscriptionRepository) GetDeliveries(ctx context.Context, subscriptionID int64) ([]*entity.SubscriptionDelivery, error) {
	query := `
		SELECT id, subscription_id, delivery_date, status, notes, recorded_by, recorded_at, is_custom
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
			&d.Notes, &d.RecordedBy, &d.RecordedAt, &d.IsCustom,
		)
		if err != nil {
			return nil, err
		}

		// Fetch items for this delivery
		items, err := r.fetchDeliveryItems(ctx, d.ID)
		if err == nil {
			d.Items = items
		}

		deliveries = append(deliveries, &d)
	}
	return deliveries, nil
}

func (r *SubscriptionRepository) fetchDeliveryItems(ctx context.Context, deliveryID int64) ([]entity.SubscriptionDeliveryItem, error) {
	query := `
		SELECT sdi.id, sdi.delivery_id, sdi.variant_id, sdi.quantity, sdi.unit_price, COALESCE(pv.name, '') as variant_name
		FROM subscription_delivery_items sdi
		JOIN product_variants pv ON sdi.variant_id = pv.id
		WHERE sdi.delivery_id = $1
	`
	rows, err := r.pool.Query(ctx, query, deliveryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []entity.SubscriptionDeliveryItem
	for rows.Next() {
		var it entity.SubscriptionDeliveryItem
		var vName string
		err := rows.Scan(&it.ID, &it.DeliveryID, &it.VariantID, &it.Quantity, &it.UnitPrice, &vName)
		if err == nil {
			it.Variant = &entity.ProductVariant{ID: it.VariantID, Name: vName}
			items = append(items, it)
		}
	}
	return items, nil
}

// GetDailyRoster returns all active subscriptions eligible for delivery on the given date, alongside their current delivery log
func (r *SubscriptionRepository) GetDailyRoster(ctx context.Context, date string) ([]*entity.DailyRosterItem, error) {
	query := `
		SELECT 
			cs.id, cs.customer_id, c.name, cs.status, cs.frequency,
			cs.start_date, cs.end_date, cs.delivery_instructions,
			cs.created_at, cs.updated_at,
			sd.id, sd.status, sd.notes, sd.recorded_by, sd.recorded_at, sd.is_custom
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
		sub := new(entity.Subscription)
		var customerName string
		var sdID *int64
		var sdStatus *string
		var sdNotes *string
		var sdRecordedBy *int64
		var sdRecordedAt *time.Time
		var sdIsCustom *bool

		err := rows.Scan(
			&sub.ID, &sub.CustomerID, &customerName, &sub.Status, &sub.Frequency,
			&sub.StartDate, &sub.EndDate, &sub.DeliveryInstructions,
			&sub.CreatedAt, &sub.UpdatedAt,
			&sdID, &sdStatus, &sdNotes, &sdRecordedBy, &sdRecordedAt, &sdIsCustom,
		)
		if err != nil {
			return nil, err
		}

		sub.Customer = &entity.Customer{
			ID:   sub.CustomerID,
			Name: customerName,
		}

		item := &entity.DailyRosterItem{
			Subscription: sub,
		}

		// If a delivery record exists for this date, map it
		if sdID != nil {
			item.Delivery = &entity.SubscriptionDelivery{
				ID:             *sdID,
				SubscriptionID: sub.ID,
				Status:         entity.DeliveryStatus(*sdStatus),
				Notes:          sdNotes,
				IsCustom:       sdIsCustom != nil && *sdIsCustom,
				RecordedBy:     sdRecordedBy,
				RecordedAt:     *sdRecordedAt,
			}
		}

		roster = append(roster, item)
	}

	// Fetch items for each subscription and its delivery record
	for _, item := range roster {
		// 1. Subscription Items (the plan)
		items, err := r.fetchItems(ctx, item.Subscription.ID)
		if err == nil {
			item.Subscription.Items = items
		}

		// 2. Delivery Items (what actually happened today)
		if item.Delivery != nil {
			delItems, err := r.fetchDeliveryItems(ctx, item.Delivery.ID)
			if err == nil {
				item.Delivery.Items = delItems
			}
		}
	}

	return roster, nil
}

// ==========================================
// Invoices & Billing
// ==========================================

func (r *SubscriptionRepository) CreateInvoice(ctx context.Context, inv *entity.SubscriptionInvoice) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	query := `
		INSERT INTO subscription_invoices (
			subscription_id, billing_period_start, billing_period_end,
			base_amount, adjustment_amount, total_amount, status, due_date, notes
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, created_at, updated_at
	`
	err = tx.QueryRow(ctx, query,
		inv.SubscriptionID, inv.BillingPeriodStart, inv.BillingPeriodEnd,
		inv.BaseAmount, inv.AdjustmentAmount, inv.TotalAmount,
		inv.Status, inv.DueDate, inv.Notes,
	).Scan(&inv.ID, &inv.CreatedAt, &inv.UpdatedAt)
	if err != nil {
		return err
	}

	for _, item := range inv.Items {
		itemQuery := `
			INSERT INTO subscription_invoice_items (
				invoice_id, variant_id, total_quantity, unit_price, subtotal
			) VALUES ($1, $2, $3, $4, $5)
		`
		_, err = tx.Exec(ctx, itemQuery,
			inv.ID, item.VariantID, item.TotalQuantity, item.UnitPrice, item.Subtotal,
		)
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *SubscriptionRepository) GetInvoiceByID(ctx context.Context, id int64) (*entity.SubscriptionInvoice, error) {
	query := `
		SELECT 
			si.id, si.subscription_id, si.billing_period_start, si.billing_period_end,
			si.base_amount, si.adjustment_amount, si.total_amount, si.status,
			si.due_date, si.notes, si.created_at, si.updated_at,
			c.name as customer_name
		FROM subscription_invoices si
		JOIN customer_subscriptions cs ON si.subscription_id = cs.id
		JOIN customers c ON cs.customer_id = c.id
		WHERE si.id = $1
	`
	var inv entity.SubscriptionInvoice
	var customerName string
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&inv.ID, &inv.SubscriptionID, &inv.BillingPeriodStart, &inv.BillingPeriodEnd,
		&inv.BaseAmount, &inv.AdjustmentAmount, &inv.TotalAmount, &inv.Status,
		&inv.DueDate, &inv.Notes, &inv.CreatedAt, &inv.UpdatedAt,
		&customerName,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, domainErrors.ErrNotFound
		}
		return nil, err
	}

	// Fetch Items
	itemRows, err := r.pool.Query(ctx, `
		SELECT id, variant_id, total_quantity, unit_price, subtotal
		FROM subscription_invoice_items WHERE invoice_id = $1
	`, id)
	if err == nil {
		defer itemRows.Close()
		for itemRows.Next() {
			var it entity.SubscriptionInvoiceItem
			if err := itemRows.Scan(&it.ID, &it.VariantID, &it.TotalQuantity, &it.UnitPrice, &it.Subtotal); err == nil {
				inv.Items = append(inv.Items, it)
			}
		}
	}

	// Fetch Adjustments
	adjRows, err := r.pool.Query(ctx, `
		SELECT id, type, amount, reason, created_at
		FROM invoice_adjustments WHERE invoice_id = $1
	`, id)
	if err == nil {
		defer adjRows.Close()
		for adjRows.Next() {
			var ad entity.InvoiceAdjustment
			if err := adjRows.Scan(&ad.ID, &ad.Type, &ad.Amount, &ad.Reason, &ad.CreatedAt); err == nil {
				inv.Adjustments = append(inv.Adjustments, ad)
			}
		}
	}

	return &inv, nil
}

func (r *SubscriptionRepository) ListInvoices(ctx context.Context, filter dto.InvoiceListFilter) ([]*entity.SubscriptionInvoice, error) {
	query := `
		SELECT 
			si.id, si.subscription_id, si.billing_period_start, si.billing_period_end,
			si.base_amount, si.adjustment_amount, si.total_amount, si.status,
			si.due_date, si.notes, si.created_at, si.updated_at
		FROM subscription_invoices si
		JOIN customer_subscriptions cs ON si.subscription_id = cs.id
		WHERE 1=1
	`
	args := []any{}
	argCount := 1

	if filter.CustomerID != nil {
		query += fmt.Sprintf(" AND cs.customer_id = $%d", argCount)
		args = append(args, *filter.CustomerID)
		argCount++
	}

	if filter.SubscriptionID != nil {
		query += fmt.Sprintf(" AND si.subscription_id = $%d", argCount)
		args = append(args, *filter.SubscriptionID)
		argCount++
	}

	if filter.Status != nil && *filter.Status != "" {
		query += fmt.Sprintf(" AND si.status = $%d", argCount)
		args = append(args, *filter.Status)
		argCount++
	}

	if filter.Month != nil && *filter.Month != "" {
		// filter.Month is "YYYY-MM"
		query += fmt.Sprintf(" AND TO_CHAR(si.billing_period_start, 'YYYY-MM') = $%d", argCount)
		args = append(args, *filter.Month)
		argCount++
	}

	query += " ORDER BY si.billing_period_start DESC"

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invoices []*entity.SubscriptionInvoice
	for rows.Next() {
		var inv entity.SubscriptionInvoice
		err := rows.Scan(
			&inv.ID, &inv.SubscriptionID, &inv.BillingPeriodStart, &inv.BillingPeriodEnd,
			&inv.BaseAmount, &inv.AdjustmentAmount, &inv.TotalAmount, &inv.Status,
			&inv.DueDate, &inv.Notes, &inv.CreatedAt, &inv.UpdatedAt,
		)
		if err == nil {
			invoices = append(invoices, &inv)
		}
	}
	return invoices, nil
}

func (r *SubscriptionRepository) UpdateInvoiceStatus(ctx context.Context, id int64, status string) error {
	_, err := r.pool.Exec(ctx, "UPDATE subscription_invoices SET status = $1, updated_at = NOW() WHERE id = $2", status, id)
	return err
}

func (r *SubscriptionRepository) AddAdjustment(ctx context.Context, adj *entity.InvoiceAdjustment) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Insert Adjustment
	query := `
		INSERT INTO invoice_adjustments (invoice_id, type, amount, reason)
		VALUES ($1, $2, $3, $4) RETURNING id, created_at
	`
	err = tx.QueryRow(ctx, query, adj.InvoiceID, adj.Type, adj.Amount, adj.Reason).Scan(&adj.ID, &adj.CreatedAt)
	if err != nil {
		return err
	}

	// Update Invoice Totals
	updateQuery := `
		UPDATE subscription_invoices 
		SET adjustment_amount = (
			SELECT COALESCE(SUM(CASE WHEN type = 'credit' THEN -amount ELSE amount END), 0)
			FROM invoice_adjustments WHERE invoice_id = $1
		),
		updated_at = NOW()
		WHERE id = $1
	`
	_, err = tx.Exec(ctx, updateQuery, adj.InvoiceID)
	if err != nil {
		return err
	}

	// Final sum update
	_, err = tx.Exec(ctx, "UPDATE subscription_invoices SET total_amount = base_amount + adjustment_amount WHERE id = $1", adj.InvoiceID)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}
