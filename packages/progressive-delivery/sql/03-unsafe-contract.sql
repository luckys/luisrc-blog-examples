BEGIN;
SET LOCAL lock_timeout = '1s';
ALTER TABLE products DROP COLUMN name;
DO $$
BEGIN
  PERFORM name FROM products;
  RAISE EXCEPTION 'La consulta antigua debía fallar';
EXCEPTION WHEN undefined_column THEN
  RAISE NOTICE 'expected_undefined_column_42703';
END $$;
ROLLBACK;
