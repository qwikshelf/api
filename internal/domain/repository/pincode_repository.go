package repository

import (
	"context"

	"github.com/qwikshelf/api/internal/domain/entity"
)

// PincodeRepository defines the interface for managing zones and pincode serviceability.
type PincodeRepository interface {
	// Serviceability
	GetByPincode(ctx context.Context, pincode string) (*entity.ServiceableArea, error)
	
	// Zones
	CreateZone(ctx context.Context, zone *entity.DeliveryZone) error
	GetZone(ctx context.Context, id int64) (*entity.DeliveryZone, error)
	ListZones(ctx context.Context, warehouseID int64) ([]entity.DeliveryZone, error)
	UpdateZone(ctx context.Context, zone *entity.DeliveryZone) error
	
	// Pincode Management
	MapPincodeToZone(ctx context.Context, pincode string, zoneID int64) error
	UnmapPincode(ctx context.Context, pincode string) error
	
	// GeoData
	SaveGeoData(ctx context.Context, geo *entity.PincodeGeoData) error
	ListGeoData(ctx context.Context) ([]entity.PincodeGeoData, error)
}
