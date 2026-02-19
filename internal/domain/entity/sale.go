package entity

import (
	"time"

	"github.com/shopspring/decimal"
)

// Sale represents a POS transaction
type Sale struct {
	ID                int64           `json:"id"`
	WarehouseID       int64           `json:"warehouse_id"`
	Warehouse         *Warehouse      `json:"warehouse,omitempty"`
	CustomerName      string          `json:"customer_name"`
	TotalAmount       decimal.Decimal `json:"total_amount"`
	TaxAmount         decimal.Decimal `json:"tax_amount"`
	DiscountAmount    decimal.Decimal `json:"discount_amount"`
	PaymentMethod     string          `json:"payment_method"`
	ProcessedByUserID int64           `json:"processed_by_user_id"`
	ProcessedByUser   *User           `json:"processed_by_user,omitempty"`
	CreatedAt         time.Time       `json:"created_at"`
	Items             []SaleItem      `json:"items,omitempty"`
}

// SaleItem represents an item within a sale
type SaleItem struct {
	ID        int64           `json:"id"`
	SaleID    int64           `json:"sale_id"`
	VariantID int64           `json:"variant_id"`
	Variant   *ProductVariant `json:"variant,omitempty"`
	Quantity  decimal.Decimal `json:"quantity"`
	UnitPrice decimal.Decimal `json:"unit_price"`
	LineTotal decimal.Decimal `json:"line_total"`
}

// CalculateTotals updates the total amount based on items
func (s *Sale) CalculateTotals() {
	var total decimal.Decimal
	for i := range s.Items {
		s.Items[i].LineTotal = s.Items[i].Quantity.Mul(s.Items[i].UnitPrice)
		total = total.Add(s.Items[i].LineTotal)
	}
	s.TotalAmount = total.Add(s.TaxAmount).Sub(s.DiscountAmount)
}
