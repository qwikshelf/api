-- +migrate Up
-- 1. Rename 'staff' to 'cashier'
UPDATE roles SET name = 'cashier', description = 'Handles POS and simple inventory operations' WHERE name = 'staff';

-- 2. Add 'field agent'
INSERT INTO roles (name, description) VALUES ('field agent', 'Handles procurement and collection in the field');

-- 3. Assign basic permissions to the new 'field agent' role
-- The new role will likely get an ID (since it's SERIAL). Let's fetch the ID dynamically for safety.
DO $$
DECLARE
    field_agent_id INTEGER;
BEGIN
    SELECT id INTO field_agent_id FROM roles WHERE name = 'field agent';
    
    -- Assign view permissions for inventory, products, warehouses, suppliers, procurements
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT field_agent_id, id FROM permissions 
    WHERE slug IN (
        'inventory.view', 
        'products.view', 
        'warehouses.view', 
        'suppliers.view', 
        'procurement.view',
        'procurement.manage'  -- Assuming Field Agents can create/manage procurements or collections
    )
    ON CONFLICT DO NOTHING;
END $$;


-- +migrate Down
-- Reverse 'field agent'
DELETE FROM roles WHERE name = 'field agent';

-- Revert 'cashier' to 'staff'
UPDATE roles SET name = 'staff', description = 'Can view and perform basic operations' WHERE name = 'cashier';
