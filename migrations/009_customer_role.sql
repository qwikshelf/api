-- Add customer role
INSERT INTO roles (name, description) VALUES ('customer', 'Storefront customer with order history access');

-- Add customer permission
INSERT INTO permissions (slug, description) VALUES ('customer', 'Access to customer-specific storefront features');

-- Assign basic public permissions to customer role (v1.public equivalent)
-- Not strictly necessary if public routes are unauthenticated, but good for "GetMyOrders" guards.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.name = 'customer' AND p.slug = 'customer';

-- Add profile fields to users table
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
ALTER TABLE users ADD COLUMN address TEXT;
ALTER TABLE users ADD COLUMN full_name VARCHAR(255);

-- +migrate Down
ALTER TABLE users DROP COLUMN IF EXISTS phone;
ALTER TABLE users DROP COLUMN IF EXISTS address;
ALTER TABLE users DROP COLUMN IF EXISTS full_name;
DELETE FROM permissions WHERE slug = 'customer';
DELETE FROM roles WHERE name = 'customer';
