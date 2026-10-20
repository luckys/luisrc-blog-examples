\set ON_ERROR_STOP off
SET search_path TO concept_examples;

BEGIN;
UPDATE inventory SET available = available - 2 WHERE sku = 'T_SHIRT';
-- CHECK rejects -1. COMMIT on this aborted transaction returns ROLLBACK.
COMMIT;
SELECT * FROM inventory;
