package dto

import (
	"time"

	"github.com/shopspring/decimal"
)

// --- Procurement DTOs ---

// CreateProcurementRequest represents a request to create a purchase order
type CreateProcurementRequest struct {
	SupplierID       int64                          `json:"supplier_id" binding:"required"`
	WarehouseID      int64                          `json:"warehouse_id" binding:"required"`
	ExpectedDelivery *time.Time                     `json:"expected_delivery,omitempty"`
	Items            []CreateProcurementItemRequest `json:"items" binding:"required,min=1,dive"`
}

// CreateProcurementItemRequest represents a line item in a procurement request
type CreateProcurementItemRequest struct {
	VariantID int64           `json:"variant_id" binding:"required"`
	Quantity  decimal.Decimal `json:"quantity"`
	UnitCost  decimal.Decimal `json:"unit_cost"`
}

// UpdateProcurementStatusRequest represents a request to update procurement status
type UpdateProcurementStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=pending approved ordered partial received cancelled"`
}

// ReceiveProcurementItemRequest represents a request to receive items
type ReceiveProcurementItemRequest struct {
	Items []ReceiveItemRequest `json:"items" binding:"required,min=1,dive"`
}

// ReceiveItemRequest represents a single item being received
type ReceiveItemRequest struct {
	ItemID           int64           `json:"item_id" binding:"required"`
	QuantityReceived decimal.Decimal `json:"quantity_received"`
}

// ProcurementResponse represents a procurement in API responses
type ProcurementResponse struct {
	ID               int64                     `json:"id"`
	SupplierID       int64                     `json:"supplier_id"`
	SupplierName     string                    `json:"supplier_name,omitempty"`
	WarehouseID      int64                     `json:"warehouse_id"`
	WarehouseName    string                    `json:"warehouse_name,omitempty"`
	OrderedByUserID  int64                     `json:"ordered_by_user_id"`
	CreatedAt        time.Time                 `json:"created_at"`
	ExpectedDelivery *time.Time                `json:"expected_delivery,omitempty"`
	Status           string                    `json:"status"`
	TotalCost        decimal.Decimal           `json:"total_cost"`
	Items            []ProcurementItemResponse `json:"items,omitempty"`
}

// ProcurementItemResponse represents a procurement item in API responses
type ProcurementItemResponse struct {
	ID               int64           `json:"id"`
	VariantID        int64           `json:"variant_id"`
	VariantName      string          `json:"variant_name,omitempty"`
	VariantSKU       string          `json:"variant_sku,omitempty"`
	VariantUnit      string          `json:"variant_unit,omitempty"`
	QuantityOrdered  decimal.Decimal `json:"quantity_ordered"`
	QuantityReceived decimal.Decimal `json:"quantity_received"`
	UnitCost         decimal.Decimal `json:"unit_cost"`
	LineTotal        decimal.Decimal `json:"line_total"`
}
