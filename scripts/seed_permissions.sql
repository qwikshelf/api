-- Seed script for all system permissions
-- This script ensures all defined permissions exist in the database and have up-to-date descriptions.

INSERT INTO permissions (slug, description) VALUES
    ('*', 'Superuser: Full access to every module and action in the system'),
    
    -- Identity & Access
    ('users.view', 'View the list of users and their profile details'),
    ('users.manage', 'Create, edit, activate/deactivate, and delete users'),
    ('roles.view', 'View available roles and the permissions assigned to them'),
    ('roles.manage', 'Create new roles and modify permission mappings'),
    
    -- Business Intelligence
    ('dashboard.view', 'View the main dashboard analytics and key metrics'),
    
    -- Inventory & Products
    ('products.view', 'View the product catalog and SKU details'),
    ('products.manage', 'Create, edit, and delete product variants/SKUs'),
    ('categories.view', 'View the list of product categories'),
    ('categories.manage', 'Create, edit, and delete categories'),
    ('families.view', 'View product families (groups of related variants)'),
    ('families.manage', 'Create, edit, and delete product families'),
    ('inventory.view', 'View current stock levels across all warehouses'),
    ('inventory.manage', 'Perform stock adjustments and inter-warehouse transfers'),
    ('warehouses.view', 'View physical storage locations'),
    ('warehouses.manage', 'Create, edit, and manage warehouse layouts'),
    
    -- Supply Chain & Operations
    ('suppliers.view', 'View the supplier registry and their product mappings'),
    ('suppliers.manage', 'Onboard new suppliers and manage vendor contracts'),
    ('procurement.view', 'View purchase orders and procurement history'),
    ('procurement.manage', 'Create purchase orders and record received stock'),
    ('collections.view', 'View payment and data collection records'),
    ('collections.manage', 'Record new field collections and reconcile payments'),
    ('serviceability.view', 'View delivery zones and serviceability maps'),
    ('serviceability.manage', 'Manage delivery zones, maps, and serviceable pincodes'),
    
    -- Sales & Subscriptions
    ('sales.view', 'View sales history and transaction records'),
    ('sales.manage', 'Process new POS transactions and generate invoices'),
    ('customers.view', 'View the CRM / customer registry'),
    ('customers.manage', 'Create, edit, and manage customer accounts'),
    ('subscriptions.view', 'View customer subscription plans and daily rosters'),
    ('subscriptions.manage', 'Create subscriptions and record daily fulfillments'),
    
    -- Finance
    ('expenses.view', 'View business expenditure reports'),
    ('expenses.create', 'Record new business expenses'),
    ('expenses.delete', 'Remove incorrect or duplicate expense records'),
    ('expense_categories.manage', 'Manage the classification list for expenses')

ON CONFLICT (slug) DO UPDATE 
SET description = EXCLUDED.description;

-- Optional: Assign everything to the Admin role (ID 1) if it exists
-- INSERT INTO role_permissions (role_id, permission_id)
-- SELECT 1, id FROM permissions ON CONFLICT DO NOTHING;
