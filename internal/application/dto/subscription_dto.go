package dto

import "time"

// SubscriptionItemRequest is a line item within a create/update subscription request
type SubscriptionItemRequest struct {
	VariantID int64   `json:"variant_id" binding:"required"`
	Quantity  float64 `json:"quantity" binding:"required,gt=0"`
}

// CreateSubscriptionRequest is the payload for creating a new customer subscription
type CreateSubscriptionRequest struct {
	CustomerID           int64                     `json:"customer_id" binding:"required"`
	Frequency            string                    `json:"frequency" binding:"required,oneof=daily alternate_days weekly monthly"`
	StartDate            string                    `json:"start_date" binding:"required"` // "YYYY-MM-DD"
	EndDate              *string                   `json:"end_date"`
	DeliveryInstructions *string                   `json:"delivery_instructions"`
	Items                []SubscriptionItemRequest `json:"items" binding:"required,min=1,dive"`
}

// UpdateSubscriptionRequest is the payload for updating an existing subscription
type UpdateSubscriptionRequest struct {
	Frequency            string                    `json:"frequency" binding:"omitempty,oneof=daily alternate_days weekly monthly"`
	StartDate            string                    `json:"start_date"`
	EndDate              *string                   `json:"end_date"`
	DeliveryInstructions *string                   `json:"delivery_instructions"`
	Items                []SubscriptionItemRequest `json:"items" binding:"omitempty,min=1,dive"`
}

// UpdateSubscriptionStatusRequest is the payload for changing subscription status only
type UpdateSubscriptionStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=active paused cancelled"`
}

// SubscriptionItemResponse represents a line item in a subscription response
type SubscriptionItemResponse struct {
	ID          int64   `json:"id"`
	VariantID   int64   `json:"variant_id"`
	VariantName string  `json:"variant_name"`
	FamilyName  string  `json:"family_name"`
	Unit        string  `json:"unit"`
	Quantity    float64 `json:"quantity"`
}

// SubscriptionResponse is the full response shape for a subscription
type SubscriptionResponse struct {
	ID                   int64                      `json:"id"`
	CustomerID           int64                      `json:"customer_id"`
	CustomerName         string                     `json:"customer_name"`
	Status               string                     `json:"status"`
	Frequency            string                     `json:"frequency"`
	StartDate            time.Time                  `json:"start_date"`
	EndDate              *time.Time                 `json:"end_date,omitempty"`
	DeliveryInstructions *string                    `json:"delivery_instructions,omitempty"`
	Items                []SubscriptionItemResponse `json:"items"`
	CreatedAt            time.Time                  `json:"created_at"`
	UpdatedAt            time.Time                  `json:"updated_at"`
}

// SubscriptionListFilter parameters for filtering subscriptions
type SubscriptionListFilter struct {
	CustomerID *int64  `form:"customer_id"`
	Status     *string `form:"status"`
	Frequency  *string `form:"frequency"`
}

// RecordDeliveryRequest is the payload for recording a specific daily delivery
type RecordDeliveryRequest struct {
	Date   string  `json:"date" binding:"required"` // "YYYY-MM-DD"
	Status string  `json:"status" binding:"required,oneof=delivered failed skipped"`
	Notes  *string `json:"notes"`
}

// SubscriptionDeliveryResponse is the response format for a delivery log
type SubscriptionDeliveryResponse struct {
	ID             int64     `json:"id"`
	SubscriptionID int64     `json:"subscription_id"`
	DeliveryDate   time.Time `json:"delivery_date"`
	Status         string    `json:"status"`
	Notes          *string   `json:"notes,omitempty"`
	RecordedBy     *int64    `json:"recorded_by,omitempty"`
	RecordedAt     time.Time `json:"recorded_at"`
}

// DailyRosterItemResponse pairs a subscription with its delivery status for a given day
type DailyRosterItemResponse struct {
	Subscription SubscriptionResponse          `json:"subscription"`
	Delivery     *SubscriptionDeliveryResponse `json:"delivery,omitempty"`
}
