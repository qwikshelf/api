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
	repo repository.SubscriptionRepository
}

// NewSubscriptionService creates a new SubscriptionService
func NewSubscriptionService(repo repository.SubscriptionRepository) *SubscriptionService {
	return &SubscriptionService{repo: repo}
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
