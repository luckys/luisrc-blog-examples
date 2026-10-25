CREATE TABLE notes (
  id text PRIMARY KEY CHECK (id ~ '^[a-z0-9-]{1,40}$'),
  text text NOT NULL CHECK (length(btrim(text)) BETWEEN 1 AND 200)
);
