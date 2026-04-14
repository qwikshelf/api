-- +migrate Up
-- Create a wildcard permission slug and grant it to the Admin role
INSERT INTO permissions (slug, description) VALUES 
    ('*', 'Superuser wildcard permission - grants access to everything')
ON CONFLICT (slug) DO NOTHING;

-- Assign the wildcard to the Admin role (role_id = 1)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE slug = '*'
ON CONFLICT DO NOTHING;

-- +migrate Down
DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE slug = '*') AND role_id = 1;
