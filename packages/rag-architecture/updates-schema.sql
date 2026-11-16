CREATE TABLE document_acl (
  tenant text NOT NULL,
  document_key text NOT NULL,
  access_level integer NOT NULL CHECK (access_level IN (0,1)),
  PRIMARY KEY (tenant,document_key)
);
ALTER TABLE document_acl ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_acl FORCE ROW LEVEL SECURITY;
CREATE POLICY own_acl ON document_acl FOR SELECT
  USING (EXISTS (SELECT 1 FROM principals p
                WHERE p.role_name=session_user AND p.tenant=document_acl.tenant));

ALTER POLICY eligible_documents ON documents
  USING (EXISTS (
    SELECT 1 FROM principals p JOIN document_acl a ON a.tenant=p.tenant
    WHERE p.role_name=session_user AND a.tenant=documents.tenant
      AND a.document_key=documents.document_key AND p.max_level>=a.access_level
  ));

CREATE TABLE documents_v2 (LIKE documents INCLUDING ALL);
ALTER TABLE documents_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents_v2 FORCE ROW LEVEL SECURITY;
CREATE POLICY eligible_documents ON documents_v2 FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM principals p JOIN document_acl a ON a.tenant=p.tenant
    WHERE p.role_name=session_user AND a.tenant=documents_v2.tenant
      AND a.document_key=documents_v2.document_key AND p.max_level>=a.access_level
  ));

CREATE TABLE index_state (
  singleton boolean PRIMARY KEY CHECK (singleton),
  generation text NOT NULL CHECK (generation IN ('v1','v2')),
  index_revision text NOT NULL,
  access_revision integer NOT NULL CHECK (access_revision>0)
);
