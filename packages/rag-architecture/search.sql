SELECT id, tenant, document_key, revision, access_level, body,
       ts_rank(terms, plainto_tsquery('simple', $1), 0) AS score
FROM documents
WHERE terms @@ plainto_tsquery('simple', $1)
ORDER BY score DESC, id ASC
LIMIT $2;
