package dto

import (
	"time"

	"github.com/shopspring/decimal"
)

// CreateSaleRequest represents a request to record a POS transaction
type CreateSaleRequest struct {
	WarehouseID    int64            `json:"warehouse_id" binding:"required"`
	CustomerName   string           `json:"customer_name"`
	TaxAmount      decimal.Decimal  `json:"tax_amount"`
	DiscountAmount decimal.Decimal  `json:"discount_amount"`
	PaymentMethod  string           `json:"payment_method" binding:"required,oneof=cash card upi credit other"`
	Items          []CreateSaleItem `json:"items" binding:"required,min=1,dive"`
}

// CreateSaleItem represents a single item in a sale request
type CreateSaleItem struct {
	VariantID int64           `json:"variant_id" binding:"required"`
	Quantity  decimal.Decimal `json:"quantity" binding:"required"`
	UnitPrice decimal.Decimal `json:"unit_price" binding:"required"`
}

// SaleResponse represents a sale in API responses
type SaleResponse struct {
	ID                int64              `json:"id"`
	WarehouseID       int64              `json:"warehouse_id"`
	WarehouseName     string             `json:"warehouse_name,omitempty"`
	CustomerName      string             `json:"customer_name"`
	TotalAmount       decimal.Decimal    `json:"total_amount"`
	TaxAmount         decimal.Decimal    `json:"tax_amount"`
	DiscountAmount    decimal.Decimal    `json:"discount_amount"`
	PaymentMethod     string             `json:"payment_method"`
	ProcessedByUserID int64              `json:"processed_by_user_id"`
	ProcessedByName   string             `json:"processed_by_name,omitempty"`
	CreatedAt         time.Time          `json:"created_at"`
	Items             []SaleItemResponse `json:"items,omitempty"`
}

// SaleItemResponse represents a sale item in API responses
type SaleItemResponse struct {
	ID          int64           `json:"id"`
	VariantID   int64           `json:"variant_id"`
	VariantName string          `json:"variant_name,omitempty"`
	VariantSKU  string          `json:"variant_sku,omitempty"`
	Quantity    decimal.Decimal `json:"quantity"`
	UnitPrice   decimal.Decimal `json:"unit_price"`
	LineTotal   decimal.Decimal `json:"line_total"`
}
