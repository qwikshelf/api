package entity

import "time"

// DeliveryZone represents a set of rules for a delivery area.
type DeliveryZone struct {
	ID                    int64     `json:"id"`
	Name                  string    `json:"name"`
	WarehouseID           *int64    `json:"warehouse_id"`
	WarehouseName         string    `json:"warehouse_name,omitempty"`
	MinOrderAmount        float64   `json:"min_order_amount"`
	DeliveryCharge        float64   `json:"delivery_charge"`
	EstimatedDeliveryText string    `json:"estimated_delivery_text"`
	IsActive              bool      `json:"is_active"`
	CreatedAt             time.Time `json:"created_at"`
}

// PincodeMapping represents the association between a pincode and a delivery zone.
type PincodeMapping struct {
	ID        int64     `json:"id"`
	Pincode   string    `json:"pincode"`
	ZoneID    int64     `json:"zone_id"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

// PincodeGeoData represents the spatial and metadata for a pincode.
type PincodeGeoData struct {
	Pincode   string                 `json:"pincode"`
	Boundary  string                 `json:"boundary,omitempty"` // Well-Known Text (WKT) or GeoJSON string
	Center    string                 `json:"center,omitempty"`   // WKT Point
	Metadata  map[string]interface{} `json:"metadata"`
	CreatedAt time.Time              `json:"created_at"`
}
