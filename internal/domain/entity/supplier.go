package entity

import "github.com/shopspring/decimal"

// Supplier represents a product supplier
type Supplier struct {
	ID        int64    `json:"id"`
	Name      string   `json:"name"`
	Phone     string   `json:"phone,omitempty"`
	Location  string   `json:"location,omitempty"`
	Latitude  *float64 `json:"latitude,omitempty"`
	Longitude *float64 `json:"longitude,omitempty"`
	ZoneID    *int64   `json:"zone_id,omitempty"`
	ZoneName  string   `json:"zone_name"`
}

// SupplierVariant represents the relationship between a supplier and a product variant
type SupplierVariant struct {
	SupplierID  int64           `json:"supplier_id"`
	Supplier    *Supplier       `json:"supplier,omitempty"`
	VariantID   int64           `json:"variant_id"`
	Variant     *ProductVariant `json:"variant,omitempty"`
	AgreedCost  decimal.Decimal `json:"agreed_cost"`
	IsPreferred bool            `json:"is_preferred"`
}
