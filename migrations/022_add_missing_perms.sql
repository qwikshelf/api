-- +migrate Up
-- Add missing permissions for the new modules (Dashboard, Sales, Collections, Expenses, Subscriptions, Serviceability)
INSERT INTO permissions (slug, description) VALUES
    ('dashboard.view', 'View dashboard analytics'),
    ('sales.view', 'View sales history'),
    ('sales.manage', 'Process sales and POS transactions'),
    ('collections.view', 'View field collections'),
    ('collections.manage', 'Record and manage field collections'),
    ('expenses.view', 'View business expenses'),
    ('expenses.create', 'Create new expenses'),
    ('expenses.delete', 'Delete expenses'),
    ('expense_categories.manage', 'Manage expense categories'),
    ('subscriptions.view', 'View customer subscriptions and daily roster'),
    ('subscriptions.manage', 'Manage subscriptions and record deliveries'),
    ('serviceability.manage', 'Manage delivery zones and pincode serviceability')
ON CONFLICT (slug) DO NOTHING;

-- Assign all new permissions to the admin role (role_id = 1)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions 
WHERE slug IN (
    'dashboard.view', 'sales.view', 'sales.manage', 
    'collections.view', 'collections.manage', 
    'expenses.view', 'expenses.create', 'expenses.delete', 'expense_categories.manage',
    'subscriptions.view', 'subscriptions.manage', 
    'serviceability.manage'
)
ON CONFLICT DO NOTHING;

-- +migrate Down
-- Permissions stay for historical data, but we can remove the role assignments if needed.
-- Removing these is generally safe in down migrations.
DELETE FROM role_permissions WHERE permission_id IN (
    SELECT id FROM permissions WHERE slug IN (
        'dashboard.view', 'sales.view', 'sales.manage', 
        'collections.view', 'collections.manage', 
        'expenses.view', 'expenses.create', 'expenses.delete', 'expense_categories.manage',
        'subscriptions.view', 'subscriptions.manage', 
        'serviceability.manage'
    )
) AND role_id = 1;
