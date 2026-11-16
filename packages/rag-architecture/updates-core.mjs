import {createHash} from 'node:crypto';

export function generationTable(generation) {
  if (generation === 'v1') return 'documents';
  if (generation === 'v2') return 'documents_v2';
  throw new Error('Unknown generation');
}

export function canonicalDocuments(documents) {
  const ids = new Set();
  const keys = new Set();
  const rows = documents.map(document => {
    for (const field of ['id', 'tenant', 'key', 'body']) {
      if (typeof document[field] !== 'string') throw new Error('Invalid document field');
    }
    const key = JSON.stringify([document.tenant, document.key]);
    if (ids.has(document.id) || keys.has(key)) throw new Error('Duplicate document identity');
    ids.add(document.id);
    keys.add(key);
    if (!Number.isInteger(document.revision) || document.revision < 1 ||
        ![0, 1].includes(document.accessLevel)) throw new Error('Invalid document revision or stored level');
    return {id: document.id, tenant: document.tenant, key: document.key,
      revision: document.revision, accessLevel: document.accessLevel, body: document.body};
  });
  return rows.toSorted((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export function contentFingerprint(documents) {
  return createHash('sha256').update(JSON.stringify(canonicalDocuments(documents))).digest('hex');
}

export function validateGeneration(expected, actual) {
  const expectedIds = canonicalDocuments(expected).map(d => d.id);
  const actualIds = canonicalDocuments(actual).map(d => d.id);
  const missing = expectedIds.filter(id => !actualIds.includes(id));
  const unexpected = actualIds.filter(id => !expectedIds.includes(id));
  const expectedHash = contentFingerprint(expected);
  const actualHash = contentFingerprint(actual);
  return {accepted: !missing.length && !unexpected.length && expectedHash === actualHash,
    expectedIds, actualIds, missing, unexpected, expectedHash, actualHash};
}

export function sourceQuery(generation) {
  const table = generationTable(generation);
  return `SELECT d.id,d.tenant,d.document_key,d.revision,d.body,
    d.access_level AS stored_access_level,a.access_level,
    ts_rank(d.terms,plainto_tsquery('simple',$1),0) AS score
    FROM ${table} d JOIN document_acl a
      ON a.tenant=d.tenant AND a.document_key=d.document_key
    WHERE d.terms @@ plainto_tsquery('simple',$1)
    ORDER BY score DESC,d.id ASC LIMIT $2`;
}

export function citationQuery(generation) {
  const table = generationTable(generation);
  return `SELECT d.id,d.tenant,d.document_key,d.revision,d.body,
    d.access_level AS stored_access_level,a.access_level
    FROM ${table} d JOIN document_acl a
      ON a.tenant=d.tenant AND a.document_key=d.document_key
    WHERE d.id=$1 AND d.revision=$2`;
}
