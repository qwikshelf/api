-- +migrate Up
-- Create table for agent collections
CREATE TABLE collections (
    id SERIAL PRIMARY KEY,
    variant_id INTEGER NOT NULL REFERENCES product_variants(id),
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
    agent_id INTEGER NOT NULL REFERENCES users(id),
    warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
    weight DECIMAL(12, 3) NOT NULL,
    collected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX idx_collections_variant_id ON collections(variant_id);
CREATE INDEX idx_collections_supplier_id ON collections(supplier_id);
CREATE INDEX idx_collections_agent_id ON collections(agent_id);
CREATE INDEX idx_collections_warehouse_id ON collections(warehouse_id);
CREATE INDEX idx_collections_collected_at ON collections(collected_at);

-- Add new permissions (with sequence sync fix)
SELECT setval('permissions_id_seq', (SELECT MAX(id) FROM permissions));

INSERT INTO permissions (slug, description) VALUES
    ('collections.view', 'View product collection history'),
    ('collections.manage', 'Record and manage product collections')
ON CONFLICT (slug) DO NOTHING;

-- Assign permissions to admin, manager, and staff
-- Admin (role_id=1)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE slug IN ('collections.view', 'collections.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager (role_id=2)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE slug IN ('collections.view', 'collections.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Staff (role_id=3) - Typically agents
INSERT INTO role_permissions (role_id, permission_id)
SELECT 3, id FROM permissions WHERE slug IN ('collections.view', 'collections.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- +migrate Down
DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE slug IN ('collections.view', 'collections.manage'));
DELETE FROM permissions WHERE slug IN ('collections.view', 'collections.manage');
DROP TABLE IF EXISTS collections;
