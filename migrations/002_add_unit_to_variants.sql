-- Add unit of measure to product_variants
ALTER TABLE product_variants ADD COLUMN unit VARCHAR(20) NOT NULL DEFAULT 'piece';
