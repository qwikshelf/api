-- +migrate Up
-- Sync sequences for core tables to prevent duplicate key violations
-- These tables are frequent targets for bulk data operations

SELECT setval('sales_id_seq', (SELECT COALESCE(MAX(id), 1) FROM sales));
SELECT setval('sale_items_id_seq', (SELECT COALESCE(MAX(id), 1) FROM sale_items));
SELECT setval('products_id_seq', (SELECT COALESCE(MAX(id), 1) FROM products));
SELECT setval('product_variants_id_seq', (SELECT COALESCE(MAX(id), 1) FROM product_variants));
SELECT setval('product_categories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM product_categories));
SELECT setval('suppliers_id_seq', (SELECT COALESCE(MAX(id), 1) FROM suppliers));
SELECT setval('warehouses_id_seq', (SELECT COALESCE(MAX(id), 1) FROM warehouses));
SELECT setval('inventories_id_seq', (SELECT COALESCE(MAX(id), 1) FROM inventories));

-- +migrate Down
-- No operation needed
