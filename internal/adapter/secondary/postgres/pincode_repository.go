package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/qwikshelf/api/internal/domain/entity"
	"github.com/qwikshelf/api/internal/domain/repository"
)

type pincodeRepository struct {
	db *DB
}

// NewPincodeRepository creates a new instance of PincodeRepository.
func NewPincodeRepository(db *DB) repository.PincodeRepository {
	return &pincodeRepository{db: db}
}

func (r *pincodeRepository) GetByPincode(ctx context.Context, pincode string) (*entity.ServiceableArea, error) {
	query := `
		SELECT 
			sp.pincode, 
			dz.id as zone_id, 
			dz.name as zone_name, 
			dz.warehouse_id, 
			dz.is_active, 
			dz.min_order_amount, 
			dz.delivery_charge, 
			dz.estimated_delivery_text,
			pg.metadata,
			ST_AsGeoJSON(pg.boundary) as boundary,
			ST_AsGeoJSON(pg.center) as center
		FROM serviceable_pincodes sp
		JOIN delivery_zones dz ON sp.zone_id = dz.id
		LEFT JOIN pincode_geodata pg ON sp.pincode = pg.pincode
		WHERE sp.pincode = $1 AND sp.is_active = true AND dz.is_active = true
	`
	var area entity.ServiceableArea
	var geo entity.PincodeGeoData
	var boundary, center *string

	err := r.db.Pool.QueryRow(ctx, query, pincode).Scan(
		&area.Pincode,
		&area.ZoneID,
		&area.ZoneName,
		&area.WarehouseID,
		&area.IsActive,
		&area.MinOrderAmount,
		&area.DeliveryCharge,
		&area.EstimatedDeliveryText,
		&geo.Metadata,
		&boundary,
		&center,
	)

	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get serviceable area: %w", err)
	}

	if boundary != nil || center != nil {
		if boundary != nil {
			geo.Boundary = *boundary
		}
		if center != nil {
			geo.Center = *center
		}
		geo.Pincode = area.Pincode
		area.GeoData = &geo
	}

	return &area, nil
}

func (r *pincodeRepository) CreateZone(ctx context.Context, zone *entity.DeliveryZone) error {
	query := `
		INSERT INTO delivery_zones (name, warehouse_id, min_order_amount, delivery_charge, estimated_delivery_text, is_active)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at
	`
	return r.db.Pool.QueryRow(ctx, query,
		zone.Name,
		zone.WarehouseID,
		zone.MinOrderAmount,
		zone.DeliveryCharge,
		zone.EstimatedDeliveryText,
		zone.IsActive,
	).Scan(&zone.ID, &zone.CreatedAt)
}

func (r *pincodeRepository) GetZone(ctx context.Context, id int64) (*entity.DeliveryZone, error) {
	query := `
		SELECT id, name, warehouse_id, min_order_amount, delivery_charge, estimated_delivery_text, is_active, created_at
		FROM delivery_zones WHERE id = $1
	`
	var zone entity.DeliveryZone
	err := r.db.Pool.QueryRow(ctx, query, id).Scan(
		&zone.ID, &zone.Name, &zone.WarehouseID, &zone.MinOrderAmount,
		&zone.DeliveryCharge, &zone.EstimatedDeliveryText, &zone.IsActive, &zone.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &zone, err
}

func (r *pincodeRepository) ListZones(ctx context.Context) ([]entity.DeliveryZone, error) {
	query := `
		SELECT id, name, warehouse_id, min_order_amount, delivery_charge, estimated_delivery_text, is_active, created_at
		FROM delivery_zones ORDER BY name ASC
	`
	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var zones []entity.DeliveryZone
	for rows.Next() {
		var z entity.DeliveryZone
		if err := rows.Scan(&z.ID, &z.Name, &z.WarehouseID, &z.MinOrderAmount, &z.DeliveryCharge, &z.EstimatedDeliveryText, &z.IsActive, &z.CreatedAt); err != nil {
			return nil, err
		}
		zones = append(zones, z)
	}
	return zones, nil
}

func (r *pincodeRepository) UpdateZone(ctx context.Context, zone *entity.DeliveryZone) error {
	query := `
		UPDATE delivery_zones
		SET name = $1, warehouse_id = $2, min_order_amount = $3, delivery_charge = $4, estimated_delivery_text = $5, is_active = $6
		WHERE id = $7
	`
	_, err := r.db.Pool.Exec(ctx, query,
		zone.Name, zone.WarehouseID, zone.MinOrderAmount, zone.DeliveryCharge, zone.EstimatedDeliveryText, zone.IsActive, zone.ID,
	)
	return err
}

func (r *pincodeRepository) MapPincodeToZone(ctx context.Context, pincode string, zoneID int64) error {
	query := `
		INSERT INTO serviceable_pincodes (pincode, zone_id, is_active)
		VALUES ($1, $2, true)
		ON CONFLICT (pincode) DO UPDATE SET zone_id = EXCLUDED.zone_id, is_active = true
	`
	_, err := r.db.Pool.Exec(ctx, query, pincode, zoneID)
	return err
}

func (r *pincodeRepository) UnmapPincode(ctx context.Context, pincode string) error {
	query := `DELETE FROM serviceable_pincodes WHERE pincode = $1`
	_, err := r.db.Pool.Exec(ctx, query, pincode)
	return err
}

func (r *pincodeRepository) SaveGeoData(ctx context.Context, geo *entity.PincodeGeoData) error {
	query := `
		INSERT INTO pincode_geodata (pincode, boundary, center, metadata)
		VALUES (
			$1, 
			ST_GeomFromGeoJSON($2), 
			ST_Centroid(ST_GeomFromGeoJSON($2)), 
			$3
		)
		ON CONFLICT (pincode) DO UPDATE SET 
			boundary = EXCLUDED.boundary, 
			center = EXCLUDED.center, 
			metadata = EXCLUDED.metadata
	`
	_, err := r.db.Pool.Exec(ctx, query, geo.Pincode, geo.Boundary, geo.Metadata)
	return err
}
func (r *pincodeRepository) ListGeoData(ctx context.Context) ([]entity.PincodeGeoData, error) {
	query := `SELECT pincode, ST_AsGeoJSON(boundary), ST_AsGeoJSON(center), metadata FROM pincode_geodata`
	rows, err := r.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []entity.PincodeGeoData
	for rows.Next() {
		var g entity.PincodeGeoData
		if err := rows.Scan(&g.Pincode, &g.Boundary, &g.Center, &g.Metadata); err != nil {
			return nil, err
		}
		results = append(results, g)
	}
	return results, nil
}
