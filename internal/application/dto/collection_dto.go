package dto

import (
	"time"

	"github.com/shopspring/decimal"
)

type RecordCollectionRequest struct {
	VariantID   int64           `json:"variant_id" binding:"required"`
	SupplierID  int64           `json:"supplier_id" binding:"required"`
	WarehouseID int64           `json:"warehouse_id"` // Optional, server can default to Main
	Weight      decimal.Decimal `json:"weight" binding:"required"`
	CollectedAt time.Time       `json:"collected_at"` // If nil, server uses now
	Notes       string          `json:"notes"`
}

type CollectionResponse struct {
	ID           int64           `json:"id"`
	VariantID    int64           `json:"variant_id"`
	VariantName  string          `json:"variant_name,omitempty"`
	SupplierID   int64           `json:"supplier_id"`
	SupplierName string          `json:"supplier_name,omitempty"`
	AgentID      int64           `json:"agent_id"`
	AgentName    string          `json:"agent_name,omitempty"`
	WarehouseID  int64           `json:"warehouse_id"`
	Weight       decimal.Decimal `json:"weight"`
	CollectedAt  time.Time       `json:"collected_at"`
	Notes        string          `json:"notes"`
}
