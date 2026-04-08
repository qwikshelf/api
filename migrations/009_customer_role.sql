-- +migrate Up
-- Add Customer role
INSERT INTO roles (name, slug, description)
VALUES ('Customer', 'customer', 'Standard customer role for ordering')
ON CONFLICT (slug) DO NOTHING;

-- Assign permissions to Customer
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.slug = 'customer' AND p.slug IN (
    'products.view',
    'categories.view'
);

-- +migrate Down
-- Revoke permissions first
DELETE FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE slug = 'customer');
-- Delete the role
DELETE FROM roles WHERE slug = 'customer';
