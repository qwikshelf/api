-- Migration: 026_subscription_delivery_items.sql
-- Description: Supports granular itemized tracking for subscription deliveries

CREATE TABLE IF NOT EXISTS subscription_delivery_items (
    id BIGSERIAL PRIMARY KEY,
    delivery_id BIGINT NOT NULL REFERENCES subscription_deliveries(id) ON DELETE CASCADE,
    variant_id BIGINT NOT NULL REFERENCES product_variants(id),
    quantity DECIMAL(12, 4) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 4) NOT NULL, -- Snapshot of price at delivery time
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sub_del_items_delivery_id ON subscription_delivery_items(delivery_id);

-- Optional: Add a column to track if a delivery was "Modified" from standard
ALTER TABLE subscription_deliveries ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE;
