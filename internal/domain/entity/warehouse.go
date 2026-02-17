package entity

// WarehouseType represents the type of warehouse
type WarehouseType string

const (
	WarehouseTypeStore              WarehouseType = "store"
	WarehouseTypeFactory            WarehouseType = "factory"
	WarehouseTypeDistributionCenter WarehouseType = "distribution_center"
)

// Warehouse represents a storage location
type Warehouse struct {
	ID      int64         `json:"id"`
	Name    string        `json:"name"`
	Type    WarehouseType `json:"type"`
	Address string        `json:"address,omitempty"`
}

// IsValid checks if the warehouse type is valid
func (wt WarehouseType) IsValid() bool {
	return wt == WarehouseTypeStore || wt == WarehouseTypeFactory || wt == WarehouseTypeDistributionCenter
}
