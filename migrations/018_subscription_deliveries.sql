-- +migrate Up
-- Create tables for Subscription Daily Deliveries

CREATE TABLE subscription_deliveries (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER NOT NULL REFERENCES customer_subscriptions(id) ON DELETE CASCADE,
    delivery_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('delivered', 'failed', 'skipped')),
    notes TEXT,
    recorded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (subscription_id, delivery_date)
);

CREATE INDEX idx_subscription_deliveries_subscription_date ON subscription_deliveries(subscription_id, delivery_date);
CREATE INDEX idx_subscription_deliveries_date ON subscription_deliveries(delivery_date);

-- +migrate Down
DROP TABLE IF EXISTS subscription_deliveries;
