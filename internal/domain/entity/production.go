package entity

import (
	"time"

	"github.com/shopspring/decimal"
)

// ProductionRun represents a manufacturing/processing run
type ProductionRun struct {
	ID          int64           `json:"id"`
	WarehouseID int64           `json:"warehouse_id"`
	Warehouse   *Warehouse      `json:"warehouse,omitempty"`
	StaffID     int64           `json:"staff_id"`
	Staff       *User           `json:"staff,omitempty"`
	BatchCode   string          `json:"batch_code"`
	CreatedAt   time.Time       `json:"created_at"`
	Logs        []ProductionLog `json:"logs,omitempty"`
}

// ProductionLog represents input/output for a production run
type ProductionLog struct {
	ID              int64           `json:"id"`
	RunID           int64           `json:"run_id"`
	InputVariantID  int64           `json:"input_variant_id"`
	InputVariant    *ProductVariant `json:"input_variant,omitempty"`
	InputQty        decimal.Decimal `json:"input_qty"`
	OutputVariantID int64           `json:"output_variant_id"`
	OutputVariant   *ProductVariant `json:"output_variant,omitempty"`
	OutputQty       decimal.Decimal `json:"output_qty"`
}

// Yield calculates the production yield (output/input ratio)
func (pl *ProductionLog) Yield() decimal.Decimal {
	if pl.InputQty.IsZero() {
		return decimal.Zero
	}
	return pl.OutputQty.Div(pl.InputQty).Mul(decimal.NewFromInt(100))
}
