CREATE TABLE products (
  id text PRIMARY KEY,
  name text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents BETWEEN 0 AND 1000000)
);
INSERT INTO products VALUES ('book-1', 'Libro ficticio', 10000), ('book-2', 'Otra muestra', 99);
