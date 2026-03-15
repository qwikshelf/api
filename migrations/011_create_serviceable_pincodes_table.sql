-- +migrate Up
CREATE TABLE serviceable_pincodes (
    id SERIAL PRIMARY KEY,
    pincode VARCHAR(10) UNIQUE NOT NULL,
    warehouse_id INTEGER REFERENCES warehouses(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    min_order_amount DECIMAL(12, 2) DEFAULT 0,
    delivery_charge DECIMAL(12, 2) DEFAULT 0,
    estimated_delivery_text VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_serviceable_pincodes_lookup ON serviceable_pincodes(pincode) WHERE is_active = true;

-- Seed with some initial data (example local pincodes)
INSERT INTO serviceable_pincodes (pincode, warehouse_id, is_active, min_order_amount, delivery_charge, estimated_delivery_text)
VALUES 
('110001', 1, true, 299.00, 20.00, 'Within 3 Hours'),
('110002', 1, true, 299.00, 20.00, 'Within 3 Hours'),
('110003', 1, true, 499.00, 0.00, 'Same Day');

-- +migrate Down
DROP TABLE IF EXISTS serviceable_pincodes;
