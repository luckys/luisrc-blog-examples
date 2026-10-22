CREATE TABLE __SCHEMA__.orders (
  id text PRIMARY KEY CHECK (id ~ '^o-[a-z0-9]{1,32}$'),
  amount_minor integer NOT NULL CHECK (amount_minor > 0),
  currency text NOT NULL CHECK (currency = 'EUR'),
  status text NOT NULL CHECK (status IN ('paid','pending')),
  created_at timestamptz NOT NULL
);
