package entity

import "github.com/shopspring/decimal"

// Category represents a product category
type Category struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

// ProductFamily represents a group of related products
type ProductFamily struct {
	ID          int64     `json:"id"`
	CategoryID  int64     `json:"category_id"`
	Category    *Category `json:"category,omitempty"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
}

// ProductVariant represents a specific product SKU
type ProductVariant struct {
	ID             int64           `json:"id"`
	FamilyID       int64           `json:"family_id"`
	Family         *ProductFamily  `json:"family,omitempty"`
	FamilyName     string          `json:"family_name,omitempty"` // populated by JOINs
	Name           string          `json:"name"`
	SKU            string          `json:"sku"`
	Barcode        string          `json:"barcode,omitempty"`
	Unit           string          `json:"unit"`
	CostPrice      decimal.Decimal `json:"cost_price"`
	SellingPrice   decimal.Decimal `json:"selling_price"`
	IsManufactured bool            `json:"is_manufactured"`
}

// Margin calculates the profit margin percentage
func (pv *ProductVariant) Margin() decimal.Decimal {
	if pv.SellingPrice.IsZero() {
		return decimal.Zero
	}
	profit := pv.SellingPrice.Sub(pv.CostPrice)
	return profit.Div(pv.SellingPrice).Mul(decimal.NewFromInt(100))
}
