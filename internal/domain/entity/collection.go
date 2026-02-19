package entity

import (
	"time"

	"github.com/shopspring/decimal"
)

// Collection represents a product receipt recorded by an agent
type Collection struct {
	ID          int64           `json:"id"`
	VariantID   int64           `json:"variant_id"`
	SupplierID  int64           `json:"supplier_id"`
	AgentID     int64           `json:"agent_id"`
	WarehouseID int64           `json:"warehouse_id"` // Defaults to Main Warehouse
	Weight      decimal.Decimal `json:"weight"`
	CollectedAt time.Time       `json:"collected_at"`
	Notes       string          `json:"notes"`

	// Optional nested data
	Variant  *ProductVariant `json:"variant,omitempty"`
	Supplier *Supplier       `json:"supplier,omitempty"`
	Agent    *User           `json:"agent,omitempty"`
}
