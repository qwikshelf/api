package entity

// ServiceableArea represents a combined view of a pincode and its delivery zone rules.
type ServiceableArea struct {
	Pincode               string          `json:"pincode"`
	ZoneID                int64           `json:"zone_id"`
	ZoneName              string          `json:"zone_name"`
	WarehouseID           *int64          `json:"warehouse_id"`
	IsActive              bool            `json:"is_active"`
	MinOrderAmount        float64         `json:"min_order_amount"`
	DeliveryCharge        float64         `json:"delivery_charge"`
	EstimatedDeliveryText string          `json:"estimated_delivery_text"`
	GeoData               *PincodeGeoData `json:"geo_data,omitempty"`
}
