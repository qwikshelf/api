-- +migrate Up
-- Add is_active column to warehouses table
ALTER TABLE warehouses ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- Update existing records to be active
UPDATE warehouses SET is_active = TRUE;

-- +migrate Down
ALTER TABLE warehouses DROP COLUMN IF EXISTS is_active;