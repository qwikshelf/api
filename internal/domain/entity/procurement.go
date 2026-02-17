package entity

import (
	"time"

	"github.com/shopspring/decimal"
)

// ProcurementStatus represents the status of a procurement
type ProcurementStatus string

const (
	ProcurementStatusPending   ProcurementStatus = "pending"
	ProcurementStatusApproved  ProcurementStatus = "approved"
	ProcurementStatusOrdered   ProcurementStatus = "ordered"
	ProcurementStatusPartial   ProcurementStatus = "partial"
	ProcurementStatusReceived  ProcurementStatus = "received"
	ProcurementStatusCancelled ProcurementStatus = "cancelled"
)

// IsValid checks if the procurement status is valid
func (s ProcurementStatus) IsValid() bool {
	switch s {
	case ProcurementStatusPending, ProcurementStatusApproved, ProcurementStatusOrdered,
		ProcurementStatusPartial, ProcurementStatusReceived, ProcurementStatusCancelled:
		return true
	}
	return false
}

// Procurement represents a purchase order from a supplier
type Procurement struct {
	ID               int64             `json:"id"`
	SupplierID       int64             `json:"supplier_id"`
	Supplier         *Supplier         `json:"supplier,omitempty"`
	WarehouseID      int64             `json:"warehouse_id"`
	Warehouse        *Warehouse        `json:"warehouse,omitempty"`
	OrderedByUserID  int64             `json:"ordered_by_user_id"`
	OrderedByUser    *User             `json:"ordered_by_user,omitempty"`
	CreatedAt        time.Time         `json:"created_at"`
	ExpectedDelivery *time.Time        `json:"expected_delivery,omitempty"`
	Status           ProcurementStatus `json:"status"`
	Items            []ProcurementItem `json:"items,omitempty"`
}

// ProcurementItem represents a line item in a procurement
type ProcurementItem struct {
	ID               int64           `json:"id"`
	ProcurementID    int64           `json:"procurement_id"`
	VariantID        int64           `json:"variant_id"`
	Variant          *ProductVariant `json:"variant,omitempty"`
	QuantityOrdered  decimal.Decimal `json:"quantity_ordered"`
	QuantityReceived decimal.Decimal `json:"quantity_received"`
	UnitCost         decimal.Decimal `json:"unit_cost"`
}

// LineTotal calculates the total cost for this line item
func (pi *ProcurementItem) LineTotal() decimal.Decimal {
	return pi.QuantityOrdered.Mul(pi.UnitCost)
}

// CalculateTotalCost calculates the total cost of all items in the procurement
func (p *Procurement) CalculateTotalCost() decimal.Decimal {
	total := decimal.Zero
	for _, item := range p.Items {
		total = total.Add(item.LineTotal())
	}
	return total
}
