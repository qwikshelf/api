package service

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/qwikshelf/api/internal/domain/entity"
	"github.com/qwikshelf/api/internal/domain/repository"
)

type DeliveryService struct {
	pincodeRepo repository.PincodeRepository
}

// NewDeliveryService creates a new instance of DeliveryService.
func NewDeliveryService(pincodeRepo repository.PincodeRepository) *DeliveryService {
	return &DeliveryService{pincodeRepo: pincodeRepo}
}

// CheckServiceability returns the combined zone and pincode details.
func (s *DeliveryService) CheckServiceability(ctx context.Context, pincode string) (*entity.ServiceableArea, error) {
	return s.pincodeRepo.GetByPincode(ctx, pincode)
}

// Zones Management
func (s *DeliveryService) CreateZone(ctx context.Context, zone *entity.DeliveryZone) error {
	return s.pincodeRepo.CreateZone(ctx, zone)
}

func (s *DeliveryService) ListZones(ctx context.Context) ([]entity.DeliveryZone, error) {
	return s.pincodeRepo.ListZones(ctx)
}

func (s *DeliveryService) UpdateZone(ctx context.Context, zone *entity.DeliveryZone) error {
	return s.pincodeRepo.UpdateZone(ctx, zone)
}

// Mapping
func (s *DeliveryService) MapPincodeToZone(ctx context.Context, pincode string, zoneID int64) error {
	return s.pincodeRepo.MapPincodeToZone(ctx, pincode, zoneID)
}

// GeoData
func (s *DeliveryService) SaveGeoData(ctx context.Context, geo *entity.PincodeGeoData) error {
	return s.pincodeRepo.SaveGeoData(ctx, geo)
}
// Import
func (s *DeliveryService) ImportPincodesFromGeoJSON(ctx context.Context, data []byte, zoneID int64) error {
	var geoJSON struct {
		Features []struct {
			Properties map[string]interface{} `json:"properties"`
			Geometry   interface{}            `json:"geometry"`
		} `json:"features"`
	}

	if err := json.Unmarshal(data, &geoJSON); err != nil {
		return fmt.Errorf("failed to parse GeoJSON: %w", err)
	}

	for _, feat := range geoJSON.Features {
		pincode, ok := feat.Properties["Pincode"].(string)
		if !ok {
			pincode, ok = feat.Properties["pincode"].(string)
			if !ok {
				continue
			}
		}

		geomJSON, _ := json.Marshal(feat.Geometry)
		geoData := &entity.PincodeGeoData{
			Pincode:  pincode,
			Boundary: string(geomJSON),
			Metadata: feat.Properties,
		}

		// Save Geodata
		if err := s.pincodeRepo.SaveGeoData(ctx, geoData); err != nil {
			continue // Skip or log? 
		}

		// Map to Zone
		if zoneID > 0 {
			_ = s.pincodeRepo.MapPincodeToZone(ctx, pincode, zoneID)
		}
	}

	return nil
}

func (s *DeliveryService) ListGeoData(ctx context.Context) ([]entity.PincodeGeoData, error) {
	return s.pincodeRepo.ListGeoData(ctx)
}
