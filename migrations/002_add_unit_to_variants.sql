-- +migrate Up
-- Add unit column to product_variants table
ALTER TABLE product_variants ADD COLUMN unit VARCHAR(20) DEFAULT 'pc';

-- +migrate Down
ALTER TABLE product_variants DROP COLUMN IF EXISTS unit;
