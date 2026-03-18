package dto

import "github.com/shopspring/decimal"

// --- Supplier DTOs ---

// CreateSupplierRequest represents a request to create a supplier.
// Name is required (2-100 chars). Phone and Location are optional.
type CreateSupplierRequest struct {
	Name      string  `json:"name" binding:"required,min=2,max=100"`
	Phone     string  `json:"phone,omitempty" binding:"omitempty,max=20"`
	Location  string  `json:"location,omitempty" binding:"omitempty,max=200"`
	Latitude  float64 `json:"latitude,omitempty"`
	Longitude float64 `json:"longitude,omitempty"`
	ZoneID    *int64  `json:"zone_id,omitempty"`
}

// UpdateSupplierRequest represents a request to update a supplier
type UpdateSupplierRequest struct {
	Name      string   `json:"name,omitempty" binding:"omitempty,min=2,max=100"`
	Phone     string   `json:"phone,omitempty" binding:"omitempty,max=20"`
	Location  string   `json:"location,omitempty" binding:"omitempty,max=200"`
	Latitude  *float64 `json:"latitude,omitempty"`
	Longitude *float64 `json:"longitude,omitempty"`
	ZoneID    *int64   `json:"zone_id,omitempty"`
}

// SupplierResponse represents a supplier in API responses
type SupplierResponse struct {
	ID        int64   `json:"id"`
	Name      string  `json:"name"`
	Phone     string  `json:"phone,omitempty"`
	Location  string  `json:"location,omitempty"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	ZoneID    *int64  `json:"zone_id,omitempty"`
	ZoneName  string  `json:"zone_name"`
}

// AddSupplierVariantRequest represents a request to add a variant to a supplier
type AddSupplierVariantRequest struct {
	VariantID   int64           `json:"variant_id" binding:"required"`
	AgreedCost  decimal.Decimal `json:"agreed_cost" binding:"required"`
	IsPreferred bool            `json:"is_preferred"`
}

// SupplierVariantResponse represents a supplier-variant relationship in API responses
type SupplierVariantResponse struct {
	SupplierID  int64                   `json:"supplier_id"`
	Supplier    *SupplierResponse       `json:"supplier,omitempty"`
	VariantID   int64                   `json:"variant_id"`
	Variant     *ProductVariantResponse `json:"variant,omitempty"`
	AgreedCost  decimal.Decimal         `json:"agreed_cost"`
	IsPreferred bool                    `json:"is_preferred"`
}
