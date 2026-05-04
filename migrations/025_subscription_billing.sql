-- +migrate Up
-- Add unit_price to subscription_deliveries to support dynamic pricing snapshots
ALTER TABLE subscription_deliveries 
ADD COLUMN unit_price DECIMAL(12,2);

-- Update existing deliveries with the current product price as a fallback
UPDATE subscription_deliveries sd
SET unit_price = pv.selling_price
FROM subscription_items si
JOIN product_variants pv ON si.variant_id = pv.id
WHERE sd.subscription_id = si.subscription_id
AND sd.unit_price IS NULL;

-- Invoice table for monthly billing
CREATE TABLE subscription_invoices (
    id SERIAL PRIMARY KEY,
    subscription_id INT NOT NULL REFERENCES customer_subscriptions(id) ON DELETE CASCADE,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    base_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    adjustment_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, finalized, paid, overdue, void
    due_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Itemized breakdown for invoices
CREATE TABLE subscription_invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INT NOT NULL REFERENCES subscription_invoices(id) ON DELETE CASCADE,
    variant_id INT NOT NULL REFERENCES product_variants(id),
    total_quantity DECIMAL(12,2) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL
);

-- Adjustments for disputes or one-time credits
CREATE TABLE invoice_adjustments (
    id SERIAL PRIMARY KEY,
    invoice_id INT NOT NULL REFERENCES subscription_invoices(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL, -- credit, debit
    amount DECIMAL(12,2) NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Constraints
CREATE INDEX idx_sub_invoices_date ON subscription_invoices(billing_period_start, billing_period_end);
CREATE INDEX idx_sub_invoices_status ON subscription_invoices(status);

-- +migrate Down
DROP TABLE IF EXISTS invoice_adjustments;
DROP TABLE IF EXISTS subscription_invoice_items;
DROP TABLE IF EXISTS subscription_invoices;
ALTER TABLE subscription_deliveries DROP COLUMN IF EXISTS unit_price;
