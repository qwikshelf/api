-- +migrate Up
ALTER TABLE sales ADD COLUMN customer_id INTEGER REFERENCES users(id);
CREATE INDEX idx_sales_customer_id ON sales(customer_id);

-- +migrate Down
DROP INDEX IF EXISTS idx_sales_customer_id;
ALTER TABLE sales DROP COLUMN IF EXISTS customer_id;
