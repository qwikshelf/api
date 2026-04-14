-- +migrate Up
-- Reconcile all permission slugs used in router.go with the database
INSERT INTO permissions (slug, description) VALUES
    ('users.manage', 'Create, update, and delete users'),
    ('customers.view', 'View customer list and details'),
    ('customers.manage', 'Create, update, and delete customers'),
    ('categories.view', 'View product categories'),
    ('categories.manage', 'Manage product categories'),
    ('families.view', 'View product families'),
    ('families.manage', 'Manage product families'),
    ('products.manage', 'Create, update, and delete products'),
    ('inventory.manage', 'Adjust stock levels and perform transfers'),
    ('procurement.manage', 'Create POs and receive shipments'),
    ('production.manage', 'Manage production runs')
ON CONFLICT (slug) DO NOTHING;

-- Grant these reconciled permissions to the admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions 
WHERE slug IN (
    'users.manage', 'customers.view', 'customers.manage', 
    'categories.view', 'categories.manage', 'families.view', 'families.manage',
    'products.manage', 'inventory.manage', 'procurement.manage', 'production.manage'
)
ON CONFLICT DO NOTHING;

-- +migrate Down
-- Removal logic is usually omitted for core permissions to prevent breaking foreign keys, 
-- but we can remove the role assignments.
DELETE FROM role_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE slug IN (
        'users.manage', 'customers.view', 'customers.manage', 
        'categories.view', 'categories.manage', 'families.view', 'families.manage',
        'products.manage', 'inventory.manage', 'procurement.manage', 'production.manage'
    )
) AND role_id = 1;
