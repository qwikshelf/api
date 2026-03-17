-- +migrate Up
-- Sync the collections table primary key sequence
-- This fix is required when manual data insertion or bulk loads cause the sequence 
-- to fall behind the actual maximum ID in the table.
SELECT setval('collections_id_seq', (SELECT COALESCE(MAX(id), 1) FROM collections));

-- +migrate Down
-- No operation needed for down migration as it's a state correction
