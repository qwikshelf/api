-- +migrate Up
-- Add geo-spatial columns to suppliers table
ALTER TABLE suppliers ADD COLUMN latitude DECIMAL(12, 9);
ALTER TABLE suppliers ADD COLUMN longitude DECIMAL(12, 9);
ALTER TABLE suppliers ADD COLUMN zone_id INTEGER REFERENCES delivery_zones(id) ON DELETE SET NULL;
ALTER TABLE suppliers ADD COLUMN geom geometry(Point, 4326);

-- Create index for spatial queries
CREATE INDEX idx_suppliers_geom ON suppliers USING GIST (geom);
CREATE INDEX idx_suppliers_zone_id ON suppliers(zone_id);

-- Trigger function to update geometry from lat/lon
CREATE OR REPLACE FUNCTION update_supplier_geom() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    ELSE
        NEW.geom := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Set up the trigger
CREATE TRIGGER trg_update_supplier_geom
BEFORE INSERT OR UPDATE OF latitude, longitude ON suppliers
FOR EACH ROW EXECUTE FUNCTION update_supplier_geom();

-- +migrate Down
DROP TRIGGER IF EXISTS trg_update_supplier_geom ON suppliers;
DROP FUNCTION IF EXISTS update_supplier_geom();
ALTER TABLE suppliers DROP COLUMN geom;
ALTER TABLE suppliers DROP COLUMN zone_id;
ALTER TABLE suppliers DROP COLUMN longitude;
ALTER TABLE suppliers DROP COLUMN latitude;
