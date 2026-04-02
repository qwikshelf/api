package entity

import (
	"time"

	"github.com/shopspring/decimal"
)

// SubscriptionStatus represents the lifecycle state of a subscription
type SubscriptionStatus string

const (
	SubscriptionStatusActive    SubscriptionStatus = "active"
	SubscriptionStatusPaused    SubscriptionStatus = "paused"
	SubscriptionStatusCancelled SubscriptionStatus = "cancelled"
)

// SubscriptionFrequency represents how often deliveries occur
type SubscriptionFrequency string

const (
	SubscriptionFrequencyDaily        SubscriptionFrequency = "daily"
	SubscriptionFrequencyAlternateDays SubscriptionFrequency = "alternate_days"
	SubscriptionFrequencyWeekly       SubscriptionFrequency = "weekly"
	SubscriptionFrequencyMonthly      SubscriptionFrequency = "monthly"
)

// Subscription represents a standing recurring product order for a customer
type Subscription struct {
	ID                   int64              `json:"id"`
	CustomerID           int64              `json:"customer_id"`
	Customer             *Customer          `json:"customer,omitempty"`
	Status               SubscriptionStatus `json:"status"`
	Frequency            SubscriptionFrequency `json:"frequency"`
	StartDate            time.Time          `json:"start_date"`
	EndDate              *time.Time         `json:"end_date,omitempty"`
	DeliveryInstructions *string            `json:"delivery_instructions,omitempty"`
	Items                []SubscriptionItem `json:"items,omitempty"`
	CreatedAt            time.Time          `json:"created_at"`
	UpdatedAt            time.Time          `json:"updated_at"`
}

// SubscriptionItem represents one product line within a subscription
type SubscriptionItem struct {
	ID             int64           `json:"id"`
	SubscriptionID int64           `json:"subscription_id"`
	VariantID      int64           `json:"variant_id"`
	Variant        *ProductVariant `json:"variant,omitempty"`
	Quantity       decimal.Decimal `json:"quantity"`
}

// IsActive returns true if the subscription is currently active
func (s *Subscription) IsActive() bool {
	return s.Status == SubscriptionStatusActive
}

// IsExpired returns true if the subscription has passed its end date
func (s *Subscription) IsExpired() bool {
	if s.EndDate == nil {
		return false
	}
	return time.Now().After(*s.EndDate)
}

// DeliveryStatus represents the status of a specific daily delivery
type DeliveryStatus string

const (
	DeliveryStatusDelivered DeliveryStatus = "delivered"
	DeliveryStatusFailed    DeliveryStatus = "failed"
	DeliveryStatusSkipped   DeliveryStatus = "skipped"
)

// SubscriptionDelivery records a daily fulfillment tracking log for a subscription
type SubscriptionDelivery struct {
	ID             int64          `json:"id"`
	SubscriptionID int64          `json:"subscription_id"`
	Subscription   *Subscription  `json:"subscription,omitempty"`
	DeliveryDate   time.Time      `json:"delivery_date"`
	Status         DeliveryStatus `json:"status"`
	Notes          *string        `json:"notes,omitempty"`
	RecordedBy     *int64         `json:"recorded_by,omitempty"`
	RecordedAt     time.Time      `json:"recorded_at"`
}

// DailyRosterItem holds the aggregation of a subscription and its delivery record for a specific date
type DailyRosterItem struct {
	Subscription *Subscription         `json:"subscription"`
	Delivery     *SubscriptionDelivery `json:"delivery,omitempty"`
}
