-- +migrate Up
ALTER TABLE product_variants
  ADD COLUMN conversion_factor DECIMAL(12,3) NOT NULL DEFAULT 1;

-- +migrate Down
ALTER TABLE product_variants
  DROP COLUMN IF EXISTS conversion_factor;
