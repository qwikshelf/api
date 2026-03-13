-- +migrate Up
-- Enable PostGIS extension in the public schema
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA public;

-- Ensure public is in the search path
SET search_path TO public;

-- 1. Create delivery_zones table
CREATE TABLE delivery_zones (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL,
    min_order_amount DECIMAL(12, 2) DEFAULT 0,
    delivery_charge DECIMAL(12, 2) DEFAULT 0,
    estimated_delivery_text VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create a default zone to migrate existing data
INSERT INTO delivery_zones (name, warehouse_id, min_order_amount, delivery_charge, estimated_delivery_text)
VALUES ('Default Central Zone', 1, 0, 0, 'Standard Delivery');

-- 2. Refactor serviceable_pincodes
-- Add zone_id column
ALTER TABLE serviceable_pincodes ADD COLUMN zone_id INTEGER REFERENCES delivery_zones(id) ON DELETE CASCADE;

-- Update existing pincodes to point to the default zone
UPDATE serviceable_pincodes SET zone_id = (SELECT id FROM delivery_zones WHERE name = 'Default Central Zone');

-- Remove redundant columns from serviceable_pincodes (legacy)
ALTER TABLE serviceable_pincodes DROP COLUMN warehouse_id;
ALTER TABLE serviceable_pincodes DROP COLUMN min_order_amount;
ALTER TABLE serviceable_pincodes DROP COLUMN delivery_charge;
ALTER TABLE serviceable_pincodes DROP COLUMN estimated_delivery_text;

-- Set zone_id to NOT NULL after migration
ALTER TABLE serviceable_pincodes ALTER COLUMN zone_id SET NOT NULL;

-- 3. Create pincode_geodata table for spatial lookups
CREATE TABLE pincode_geodata (
    pincode VARCHAR(10) PRIMARY KEY,
    boundary geometry(Polygon, 4326),
    center geometry(Point, 4326),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Spatial Indices
CREATE INDEX idx_pincode_geodata_boundary ON pincode_geodata USING GIST (boundary);
CREATE INDEX idx_pincode_geodata_center ON pincode_geodata USING GIST (center);
CREATE INDEX idx_serviceable_pincodes_zone_id ON serviceable_pincodes(zone_id);

-- 4. Permissions
INSERT INTO permissions (name, slug, description) 
VALUES ('Manage Serviceability', 'serviceability.manage', 'Allows managing delivery zones, pincode mapping and geodata')
ON CONFLICT (slug) DO NOTHING;

-- Assign to Admin role (ID 1 assumed)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE slug = 'serviceability.manage'
ON CONFLICT DO NOTHING;

-- +migrate Down
-- Note: Reversing PostGIS might be risky if other tables use it, but including it for completeness
DROP TABLE IF EXISTS pincode_geodata;

-- To reverse serviceable_pincodes, we'd need to add back the columns and migrate data back,
-- but typically Down migrations are used for cleanup in this context.
ALTER TABLE serviceable_pincodes ADD COLUMN warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL;
ALTER TABLE serviceable_pincodes ADD COLUMN min_order_amount DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE serviceable_pincodes ADD COLUMN delivery_charge DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE serviceable_pincodes ADD COLUMN estimated_delivery_text VARCHAR(100);

ALTER TABLE serviceable_pincodes DROP COLUMN zone_id;

DROP TABLE IF EXISTS delivery_zones;
