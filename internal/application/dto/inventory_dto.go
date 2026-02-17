package dto

import (
	"time"

	"github.com/shopspring/decimal"

	"github.com/qwikshelf/api/internal/domain/entity"
)

// --- Warehouse DTOs ---

// CreateWarehouseRequest represents a request to create a warehouse.
// Name must be between 2 and 100 characters.
// Type must be one of: store, factory, distribution_center.
type CreateWarehouseRequest struct {
	Name    string               `json:"name" binding:"required,min=2,max=100"`
	Type    entity.WarehouseType `json:"type" binding:"required,oneof=store factory distribution_center"`
	Address string               `json:"address,omitempty"`
}

// UpdateWarehouseRequest represents a request to update a warehouse.
// All fields are optional but must adhere to validation rules if provided.
type UpdateWarehouseRequest struct {
	Name    string               `json:"name,omitempty" binding:"omitempty,min=2,max=100"`
	Type    entity.WarehouseType `json:"type,omitempty" binding:"omitempty,oneof=store factory distribution_center"`
	Address string               `json:"address,omitempty"`
}

// WarehouseResponse represents a warehouse in API responses
type WarehouseResponse struct {
	ID      int64                `json:"id"`
	Name    string               `json:"name"`
	Type    entity.WarehouseType `json:"type"`
	Address string               `json:"address,omitempty"`
}

// --- Inventory DTOs ---

// InventoryLevelResponse represents inventory level in API responses
type InventoryLevelResponse struct {
	ID          int64                   `json:"id"`
	WarehouseID int64                   `json:"warehouse_id"`
	Warehouse   *WarehouseResponse      `json:"warehouse,omitempty"`
	VariantID   int64                   `json:"variant_id"`
	Variant     *ProductVariantResponse `json:"variant,omitempty"`
	Quantity    decimal.Decimal         `json:"quantity"`
	BatchNumber *string                 `json:"batch_number,omitempty"`
	ExpiryDate  *time.Time              `json:"expiry_date,omitempty"`
}

// AdjustInventoryRequest represents a request to manually adjust inventory quantities.
// Used for corrections, shrinkage, or stocktaking adjustments.
type AdjustInventoryRequest struct {
	WarehouseID   int64           `json:"warehouse_id" binding:"required"`
	VariantID     int64           `json:"variant_id" binding:"required"`
	QuantityDelta decimal.Decimal `json:"quantity_delta"`
	Reason        string          `json:"reason,omitempty"`
}

// CreateTransferRequest represents a request to move inventory between warehouses.
// Source and Destination must be different. Items list cannot be empty.
type CreateTransferRequest struct {
	SourceWarehouseID      int64                 `json:"source_warehouse_id" binding:"required"`
	DestinationWarehouseID int64                 `json:"destination_warehouse_id" binding:"required"`
	Items                  []TransferItemRequest `json:"items" binding:"required,min=1,dive"`
}

// TransferItemRequest represents a specific product variant and quantity to transfer.
// Quantity must be greater than zero.
type TransferItemRequest struct {
	VariantID int64           `json:"variant_id" binding:"required"`
	Quantity  decimal.Decimal `json:"quantity"`
}

// TransferResponse represents an inventory transfer in API responses
type TransferResponse struct {
	ID                     int64                  `json:"id"`
	SourceWarehouseID      int64                  `json:"source_warehouse_id"`
	SourceWarehouse        *WarehouseResponse     `json:"source_warehouse,omitempty"`
	DestinationWarehouseID int64                  `json:"destination_warehouse_id"`
	DestinationWarehouse   *WarehouseResponse     `json:"destination_warehouse,omitempty"`
	AuthorizedByUserID     int64                  `json:"authorized_by_user_id"`
	TransferredAt          time.Time              `json:"transferred_at"`
	Status                 entity.TransferStatus  `json:"status"`
	Items                  []TransferItemResponse `json:"items,omitempty"`
}

// TransferItemResponse represents a transfer item in API responses
type TransferItemResponse struct {
	ID        int64                   `json:"id"`
	VariantID int64                   `json:"variant_id"`
	Variant   *ProductVariantResponse `json:"variant,omitempty"`
	Quantity  decimal.Decimal         `json:"quantity"`
}
