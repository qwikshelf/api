-- +migrate Up
-- Add Customer role
INSERT INTO roles (name, description)
VALUES ('Customer', 'Standard customer role for ordering')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to Customer
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Customer' AND p.slug IN (
    'products.view',
    'categories.view'
);

-- +migrate Down
-- Revoke permissions first
DELETE FROM role_permissions WHERE role_id = (SELECT id FROM roles WHERE name = 'Customer');
-- Delete the role
DELETE FROM roles WHERE name = 'Customer';
