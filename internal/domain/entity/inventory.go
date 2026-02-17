package entity

import (
	"time"

	"github.com/shopspring/decimal"
)

// InventoryLevel represents the stock level of a product variant at a warehouse
type InventoryLevel struct {
	ID          int64           `json:"id"`
	WarehouseID int64           `json:"warehouse_id"`
	Warehouse   *Warehouse      `json:"warehouse,omitempty"`
	VariantID   int64           `json:"variant_id"`
	Variant     *ProductVariant `json:"variant,omitempty"`
	Quantity    decimal.Decimal `json:"quantity"`
	BatchNumber *string         `json:"batch_number,omitempty"`
	ExpiryDate  *time.Time      `json:"expiry_date,omitempty"`
}

// IsExpired checks if the inventory batch has expired
func (il *InventoryLevel) IsExpired() bool {
	if il.ExpiryDate == nil {
		return false
	}
	return time.Now().After(*il.ExpiryDate)
}

// IsLowStock checks if the quantity is below the threshold
func (il *InventoryLevel) IsLowStock(threshold decimal.Decimal) bool {
	return il.Quantity.LessThan(threshold)
}

// TransferStatus represents the status of an inventory transfer
type TransferStatus string

const (
	TransferStatusPending   TransferStatus = "pending"
	TransferStatusInTransit TransferStatus = "in_transit"
	TransferStatusCompleted TransferStatus = "completed"
	TransferStatusCancelled TransferStatus = "cancelled"
)

// InventoryTransfer represents a transfer between warehouses
type InventoryTransfer struct {
	ID                     int64                   `json:"id"`
	SourceWarehouseID      int64                   `json:"source_warehouse_id"`
	SourceWarehouse        *Warehouse              `json:"source_warehouse,omitempty"`
	DestinationWarehouseID int64                   `json:"destination_warehouse_id"`
	DestinationWarehouse   *Warehouse              `json:"destination_warehouse,omitempty"`
	AuthorizedByUserID     int64                   `json:"authorized_by_user_id"`
	AuthorizedBy           *User                   `json:"authorized_by,omitempty"`
	TransferredAt          time.Time               `json:"transferred_at"`
	Status                 TransferStatus          `json:"status"`
	Items                  []InventoryTransferItem `json:"items,omitempty"`
}

// InventoryTransferItem represents a line item in an inventory transfer
type InventoryTransferItem struct {
	ID         int64           `json:"id"`
	TransferID int64           `json:"transfer_id"`
	VariantID  int64           `json:"variant_id"`
	Variant    *ProductVariant `json:"variant,omitempty"`
	Quantity   decimal.Decimal `json:"quantity"`
}
