-- +migrate Up
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    address TEXT,
    gst_number VARCHAR(50),
    credit_limit DECIMAL(12,2) DEFAULT 0.00,
    payment_terms VARCHAR(50) DEFAULT 'cash',
    customer_category VARCHAR(50) DEFAULT 'retail',
    delivery_route VARCHAR(255),
    internal_notes TEXT,
    zone_id INTEGER REFERENCES delivery_zones(id) ON DELETE SET NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Migrate existing users that are customers to the new customers table, preserving IDs if possible
INSERT INTO customers (id, name, phone, email, created_at, updated_at)
SELECT u.id, 
       COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), u.username, 'Unknown Customer'), 
       COALESCE(NULLIF(TRIM(u.phone), ''), 'N/A-' || u.id), 
       u.email, 
       u.created_at, 
       u.updated_at
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE r.slug = 'customer'
ON CONFLICT (phone) DO NOTHING;

-- Sync the sequence so new inserts don't collide
SELECT setval('customers_id_seq', (SELECT COALESCE(MAX(id), 0) + 1 FROM customers), false);

-- Clean up sales references to prevent constraint errors
UPDATE sales SET customer_id = NULL WHERE customer_id NOT IN (SELECT id FROM customers);

-- Reassign the foreign key on sales
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_customer_id_fkey;
ALTER TABLE sales ADD CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

-- +migrate Down
ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_customer_id_fkey;
ALTER TABLE sales ADD CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE SET NULL;

DROP TABLE IF EXISTS customers CASCADE;
