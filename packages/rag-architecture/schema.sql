REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE TABLE principals (
  role_name name PRIMARY KEY,
  tenant text NOT NULL,
  max_level integer NOT NULL CHECK (max_level IN (0, 1)),
  authorization_revision integer NOT NULL DEFAULT 1
);
ALTER TABLE principals ENABLE ROW LEVEL SECURITY;
ALTER TABLE principals FORCE ROW LEVEL SECURITY;
CREATE POLICY own_principal ON principals FOR SELECT
  USING (role_name = session_user);

CREATE TABLE documents (
  id text PRIMARY KEY,
  tenant text NOT NULL,
  document_key text NOT NULL,
  revision integer NOT NULL,
  access_level integer NOT NULL CHECK (access_level IN (0, 1)),
  body text NOT NULL,
  terms tsvector GENERATED ALWAYS AS (to_tsvector('simple', body)) STORED
);
CREATE INDEX documents_terms_gin ON documents USING gin (terms);
CREATE INDEX documents_scope ON documents (tenant, access_level);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
CREATE POLICY eligible_documents ON documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM principals p
    WHERE p.role_name = session_user
      AND p.tenant = documents.tenant
      AND p.max_level >= documents.access_level
  ));
