-- Dangerous: This script will wipe all data and reset sequences.
-- Use only for development/reset purposes.

-- 1. Truncate all tables and reset their auto-increment sequences
-- CASCADE ensures that foreign key dependencies are handled automatically.
-- RESTART IDENTITY resets the sequences to their starting value (usually 1).

TRUNCATE TABLE 
    audit_logs,
    categories,
    collections,
    customer_subscriptions,
    customers,
    delivery_zones,
    expenses,
    expense_categories,
    inventory_levels,
    inventory_transfer_items,
    inventory_transfers,
    permissions,
    pincode_geodata,
    procurement_items,
    procurements,
    product_families,
    product_variants,
    production_logs,
    production_runs,
    role_permissions,
    roles,
    sale_items,
    sales,
    schema_migrations,
    serviceable_pincodes,
    spatial_ref_sys,
    subscription_deliveries,
    subscription_items,
    supplier_variants,
    suppliers,
    user_permissions,
    user_sessions,
    users,
    warehouses

RESTART IDENTITY CASCADE;

-- 2. Manually reset specific sequences if RESTART IDENTITY missed any (Postgres specific)
-- Note: RESTART IDENTITY 1 sets the next value to 1.
ALTER SEQUENCE audit_logs_id_seq RESTART WITH 1;
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE roles_id_seq RESTART WITH 1;
ALTER SEQUENCE permissions_id_seq RESTART WITH 1;

-- 3. Verification
-- SELECT nextval('audit_logs_id_seq'); -- This would return 1 and consume it, so don't run in production.
