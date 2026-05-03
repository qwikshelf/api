package service

import (
	"context"
	"fmt"
	"time"

	"github.com/shopspring/decimal"

	"github.com/qwikshelf/api/internal/application/dto"
	"github.com/qwikshelf/api/internal/domain/entity"
	domainErrors "github.com/qwikshelf/api/internal/domain/errors"
	"github.com/qwikshelf/api/internal/domain/repository"
)

// SubscriptionService handles business logic for customer subscriptions
type SubscriptionService struct {
	repo    repository.SubscriptionRepository
	variant repository.ProductVariantRepository
}

// NewSubscriptionService creates a new SubscriptionService
func NewSubscriptionService(repo repository.SubscriptionRepository, variant repository.ProductVariantRepository) *SubscriptionService {
	return &SubscriptionService{
		repo:    repo,
		variant: variant,
	}
}

// Create validates and persists a new subscription
func (s *SubscriptionService) Create(ctx context.Context, sub *entity.Subscription) (*entity.Subscription, error) {
	// Validate at least one item
	if len(sub.Items) == 0 {
		return nil, fmt.Errorf("subscription must have at least one item: %w", domainErrors.ErrInvalidInput)
	}

	// Validate quantities
	for _, item := range sub.Items {
		if item.Quantity.LessThanOrEqual(decimal.Zero) {
			return nil, fmt.Errorf("item quantity must be greater than zero: %w", domainErrors.ErrInvalidInput)
		}
	}

	// Default status to active
	if sub.Status == "" {
		sub.Status = entity.SubscriptionStatusActive
	}

	if err := s.repo.Create(ctx, sub); err != nil {
		return nil, fmt.Errorf("failed to create subscription: %w", err)
	}

	return sub, nil
}

// GetByID retrieves a single subscription with its items hydrated
func (s *SubscriptionService) GetByID(ctx context.Context, id int64) (*entity.Subscription, error) {
	sub, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return sub, nil
}

// ListFiltered retrieves subscriptions matching the filters
func (s *SubscriptionService) ListFiltered(ctx context.Context, filter dto.SubscriptionListFilter) ([]*entity.Subscription, error) {
	subs, err := s.repo.ListFiltered(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("failed to list subscriptions: %w", err)
	}
	return subs, nil
}

// Update replaces a subscription's fields and items
func (s *SubscriptionService) Update(ctx context.Context, sub *entity.Subscription) (*entity.Subscription, error) {
	// Validate at least one item if items are being replaced
	if len(sub.Items) == 0 {
		return nil, fmt.Errorf("subscription must have at least one item: %w", domainErrors.ErrInvalidInput)
	}

	for _, item := range sub.Items {
		if item.Quantity.LessThanOrEqual(decimal.Zero) {
			return nil, fmt.Errorf("item quantity must be greater than zero: %w", domainErrors.ErrInvalidInput)
		}
	}

	if err := s.repo.Update(ctx, sub); err != nil {
		return nil, err
	}

	return s.repo.GetByID(ctx, sub.ID)
}

// UpdateStatus changes only the status field of a subscription
func (s *SubscriptionService) UpdateStatus(ctx context.Context, id int64, status string) error {
	// Validate the status value
	switch entity.SubscriptionStatus(status) {
	case entity.SubscriptionStatusActive, entity.SubscriptionStatusPaused, entity.SubscriptionStatusCancelled:
		// valid
	default:
		return fmt.Errorf("invalid status value: %w", domainErrors.ErrInvalidInput)
	}

	return s.repo.UpdateStatus(ctx, id, status)
}

// Delete permanently removes a subscription
func (s *SubscriptionService) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}

// parseDate parses a "YYYY-MM-DD" string into a time.Time
func parseDate(dateStr string) (time.Time, error) {
	return time.Parse("2006-01-02", dateStr)
}

// ==========================================
// Deliveries
// ==========================================

// RecordDelivery validates and records a daily delivery status for a subscription
func (s *SubscriptionService) RecordDelivery(ctx context.Context, subID int64, dateStr, status, notes string, recordedBy *int64) (*entity.SubscriptionDelivery, error) {
	delDate, err := parseDate(dateStr)
	if err != nil {
		return nil, fmt.Errorf("invalid date format: %w", domainErrors.ErrInvalidInput)
	}

	sub, err := s.repo.GetByID(ctx, subID)
	if err != nil {
		return nil, err
	}
	if !sub.IsActive() {
		return nil, fmt.Errorf("cannot record delivery for an inactive subscription: %w", domainErrors.ErrInvalidInput)
	}

	switch entity.DeliveryStatus(status) {
	case entity.DeliveryStatusDelivered, entity.DeliveryStatusFailed, entity.DeliveryStatusSkipped:
		// valid
	default:
		return nil, fmt.Errorf("invalid delivery status: %w", domainErrors.ErrInvalidInput)
	}

	var notesPtr *string
	if notes != "" {
		notesPtr = &notes
	}

	delivery := &entity.SubscriptionDelivery{
		SubscriptionID: subID,
		DeliveryDate:   delDate,
		Status:         entity.DeliveryStatus(status),
		Notes:          notesPtr,
		RecordedBy:     recordedBy,
	}

	// Dynamic Pricing Snapshot: Capture the current selling price for the items in this subscription
	// For now, we use the first item's variant price if it's a simple subscription.
	// If it's multi-item, we'll need to store price per item in deliveries.
	// For the initial design, we'll store the price of the first variant.
	if len(sub.Items) > 0 {
		variant, err := s.variant.GetByID(ctx, sub.Items[0].VariantID)
		if err == nil {
			delivery.UnitPrice = variant.SellingPrice
		}
	}

	if err := s.repo.RecordDelivery(ctx, delivery); err != nil {
		return nil, err
	}

	return delivery, nil
}

// GetDailyRoster returns the delivery roster for a specific date
func (s *SubscriptionService) GetDailyRoster(ctx context.Context, dateStr string) ([]*entity.DailyRosterItem, error) {
	_, err := parseDate(dateStr)
	if err != nil {
		return nil, fmt.Errorf("invalid date format: %w", domainErrors.ErrInvalidInput)
	}

	return s.repo.GetDailyRoster(ctx, dateStr)
}

// ==========================================
// Invoices & Billing
// ==========================================

// CreateMonthlyInvoice aggregates deliveries for a specific month and creates an invoice
func (s *SubscriptionService) CreateMonthlyInvoice(ctx context.Context, subID int64, year int, month time.Month) (*entity.SubscriptionInvoice, error) {
	sub, err := s.repo.GetByID(ctx, subID)
	if err != nil {
		return nil, err
	}

	start := time.Date(year, month, 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, -1)

	deliveries, err := s.repo.GetDeliveries(ctx, subID)
	if err != nil {
		return nil, err
	}

	// Filter for this month and status=delivered
	var monthDeliveries []*entity.SubscriptionDelivery
	for _, d := range deliveries {
		if (d.DeliveryDate.Equal(start) || d.DeliveryDate.After(start)) &&
			(d.DeliveryDate.Equal(end) || d.DeliveryDate.Before(end)) &&
			d.Status == entity.DeliveryStatusDelivered {
			monthDeliveries = append(monthDeliveries, d)
		}
	}

	if len(monthDeliveries) == 0 {
		return nil, fmt.Errorf("no delivered items found for this period: %w", domainErrors.ErrNotFound)
	}

	// Aggregate amounts
	var baseAmount decimal.Decimal
	itemsMap := make(map[int64]*entity.SubscriptionInvoiceItem)

	for _, d := range monthDeliveries {
		// Calculate for each item in the subscription
		for _, si := range sub.Items {
			lineTotal := d.UnitPrice.Mul(si.Quantity)
			baseAmount = baseAmount.Add(lineTotal)

			if item, exists := itemsMap[si.VariantID]; exists {
				item.TotalQuantity = item.TotalQuantity.Add(si.Quantity)
				item.Subtotal = item.Subtotal.Add(lineTotal)
			} else {
				itemsMap[si.VariantID] = &entity.SubscriptionInvoiceItem{
					VariantID:     si.VariantID,
					TotalQuantity: si.Quantity,
					UnitPrice:     d.UnitPrice,
					Subtotal:      lineTotal,
				}
			}
		}
	}

	invoice := &entity.SubscriptionInvoice{
		SubscriptionID:     subID,
		BillingPeriodStart: start,
		BillingPeriodEnd:   end,
		BaseAmount:         baseAmount,
		TotalAmount:        baseAmount,
		Status:             "draft",
		DueDate:            end.AddDate(0, 0, 5), // Default 5th of next month
	}

	for _, item := range itemsMap {
		invoice.Items = append(invoice.Items, *item)
	}

	if err := s.repo.CreateInvoice(ctx, invoice); err != nil {
		return nil, err
	}

	return invoice, nil
}

func (s *SubscriptionService) GetInvoice(ctx context.Context, id int64) (*entity.SubscriptionInvoice, error) {
	return s.repo.GetInvoiceByID(ctx, id)
}

func (s *SubscriptionService) ListInvoices(ctx context.Context, filter dto.InvoiceListFilter) ([]*entity.SubscriptionInvoice, error) {
	return s.repo.ListInvoices(ctx, filter)
}

func (s *SubscriptionService) AddAdjustment(ctx context.Context, adj *entity.InvoiceAdjustment) error {
	if adj.Amount.LessThanOrEqual(decimal.Zero) {
		return fmt.Errorf("adjustment amount must be positive: %w", domainErrors.ErrInvalidInput)
	}
	return s.repo.AddAdjustment(ctx, adj)
}

func (s *SubscriptionService) FinalizeInvoice(ctx context.Context, id int64) error {
	return s.repo.UpdateInvoiceStatus(ctx, id, "finalized")
}
