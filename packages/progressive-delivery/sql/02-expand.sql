BEGIN;
SET LOCAL lock_timeout = '1s';
ALTER TABLE products ADD COLUMN display_name text;
UPDATE products SET display_name = name;
COMMIT;
