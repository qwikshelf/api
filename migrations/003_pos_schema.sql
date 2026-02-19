-- +migrate Up
-- Create tables for POS system

-- Sales table
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    customer_name VARCHAR(255),
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'card', 'upi', 'credit', 'other')),
    processed_by_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sales_warehouse_id ON sales(warehouse_id);
CREATE INDEX idx_sales_processed_by_user_id ON sales(processed_by_user_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);

-- Sale items table
CREATE TABLE sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    variant_id INTEGER NOT NULL REFERENCES product_variants(id),
    quantity DECIMAL(12, 3) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    line_total DECIMAL(12, 2) NOT NULL
);

CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_variant_id ON sale_items(variant_id);

-- Add new permissions (with sequence sync fix)
SELECT setval('permissions_id_seq', (SELECT MAX(id) FROM permissions));

INSERT INTO permissions (slug, description) VALUES
    ('sales.view', 'View sales history'),
    ('sales.manage', 'Process new sales (POS)')
ON CONFLICT (slug) DO NOTHING;

-- Assign POS permissions to admin, manager, and staff
-- Admin (role_id=1)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE slug IN ('sales.view', 'sales.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager (role_id=2)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE slug IN ('sales.view', 'sales.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Staff (role_id=3)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE slug IN ('sales.view', 'sales.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- +migrate Down
DROP TABLE IF EXISTS sale_items;
DROP TABLE IF EXISTS sales;
DELETE FROM permissions WHERE slug IN ('sales.view', 'sales.manage');
