-- +migrate Up
-- Create tables for Customer Product Subscriptions

-- Customer subscriptions table
CREATE TABLE customer_subscriptions (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled')),
    frequency VARCHAR(30) NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'alternate_days', 'weekly', 'monthly')),
    start_date DATE NOT NULL,
    end_date DATE,
    delivery_instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customer_subscriptions_customer_id ON customer_subscriptions(customer_id);
CREATE INDEX idx_customer_subscriptions_status ON customer_subscriptions(status);

-- Subscription line items table
CREATE TABLE subscription_items (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL REFERENCES customer_subscriptions(id) ON DELETE CASCADE,
    variant_id INTEGER NOT NULL REFERENCES product_variants(id),
    quantity DECIMAL(10, 3) NOT NULL CHECK (quantity > 0),
    UNIQUE (subscription_id, variant_id)
);

CREATE INDEX idx_subscription_items_subscription_id ON subscription_items(subscription_id);
CREATE INDEX idx_subscription_items_variant_id ON subscription_items(variant_id);

-- Add subscription permissions
INSERT INTO permissions (slug, description) VALUES
    ('subscriptions.view', 'View customer subscriptions'),
    ('subscriptions.manage', 'Create and manage customer subscriptions')
ON CONFLICT (slug) DO NOTHING;

-- Assign subscription permissions to admin (role_id=1) and manager (role_id=2)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE slug IN ('subscriptions.view', 'subscriptions.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 2, id FROM permissions WHERE slug IN ('subscriptions.view', 'subscriptions.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- +migrate Down
DROP TABLE IF EXISTS subscription_items;
DROP TABLE IF EXISTS customer_subscriptions;
DELETE FROM permissions WHERE slug IN ('subscriptions.view', 'subscriptions.manage');
