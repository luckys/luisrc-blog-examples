import { createServer } from 'node:http'
import { catalogueRequest, catalogueHeaders } from './catalogue.ts'
import type { Reader } from './catalogue.ts'
export function createCatalogueServer(read: Reader) {
  return createServer(async (req, res) => {
    try {
      const path = new URL(req.url ?? '/', 'http://catalogue').pathname
      const result = await catalogueRequest(req.method ?? 'GET', path, read)
      res.writeHead(result.statusCode, catalogueHeaders(result.statusCode)); res.end(JSON.stringify(result.body))
    } catch { res.writeHead(503, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'dependency_unavailable' })) }
  })
}
