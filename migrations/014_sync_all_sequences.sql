-- +migrate Up
-- Sync sequences for core tables to prevent duplicate key violations
-- These tables are frequent targets for bulk data operations

-- 1. POS Tables
SELECT setval('sales_id_seq', (SELECT COALESCE(MAX(id), 1) FROM sales));
SELECT setval('sale_items_id_seq', (SELECT COALESCE(MAX(id), 1) FROM sale_items));

-- 2. Core Catalog
SELECT setval('product_variants_id_seq', (SELECT COALESCE(MAX(id), 1) FROM product_variants));
SELECT setval('categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM categories));

-- 3. Infrastructure
SELECT setval('suppliers_id_seq', (SELECT COALESCE(MAX(id), 1) FROM suppliers));
SELECT setval('warehouses_id_seq', (SELECT COALESCE(MAX(id), 1) FROM warehouses));

-- 4. Inventory
SELECT setval('inventory_levels_id_seq', (SELECT COALESCE(MAX(id), 1) FROM inventory_levels));

-- +migrate Down
-- No operation needed
