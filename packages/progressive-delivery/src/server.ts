import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import pg from 'pg'
import { parseProduct, priceForResponse } from './product.ts'

const release: { revision: string; expanded: boolean; divisor: number } = JSON.parse(await readFile(new URL('../release.json', import.meta.url), 'utf8'))
const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3,
  connectionTimeoutMillis: 700, query_timeout: 700, statement_timeout: 700 })
db.on('error', () => console.error('postgres_connection_error'))
const server = createServer(async (req, res) => {
  const reply = (status: number, value: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'X-Release': release.revision })
    res.end(JSON.stringify(value))
  }
  const path = new URL(req.url ?? '/', 'http://api').pathname
  try {
    if (req.method === 'GET' && path === '/live') return reply(200, { live: true, revision: release.revision })
    if (req.method === 'GET' && path === '/ready') { await db.query('SELECT 1'); return reply(200, { ready: true, revision: release.revision }) }
    if (req.method === 'GET' && /^\/products\/[a-z0-9-]{1,40}$/.test(path)) {
      const name = release.expanded ? 'COALESCE(display_name, name)' : 'name'
      const result = await db.query(`SELECT id, ${name} AS name, price_cents FROM products WHERE id = $1`, [path.slice(10)])
      const row = result.rows[0]
      if (!row) return reply(404, { error: 'not_found' })
      const enabled = req.headers['x-lab-price-v2'] === '1'
      return reply(200, { id: row.id, name: row.name,
        priceCents: priceForResponse(row.price_cents, enabled, release.divisor), revision: release.revision, featureEnabled: enabled })
    }
    if (req.method === 'POST' && path === '/products') {
      const chunks: Buffer[] = []; let size = 0
      for await (const chunk of req) {
        size += chunk.length; if (size > 2048) return reply(413, { error: 'body_too_large' })
        chunks.push(chunk)
      }
      let product
      try { product = parseProduct(JSON.parse(Buffer.concat(chunks).toString('utf8'))) } catch { return reply(400, { error: 'invalid_product' }) }
      if (release.expanded)
        await db.query('INSERT INTO products(id,name,display_name,price_cents) VALUES($1,$2,$2,$3)', [product.id, product.name, product.priceCents])
      else await db.query('INSERT INTO products(id,name,price_cents) VALUES($1,$2,$3)', [product.id, product.name, product.priceCents])
      return reply(201, { ...product, revision: release.revision })
    }
    reply(404, { error: 'not_found' })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') return reply(409, { error: 'id_exists' })
    console.error('request_dependency_error'); reply(503, { error: 'dependency_unavailable' })
  }
})
server.requestTimeout = 3000; server.listen(3000, '0.0.0.0')
process.once('SIGTERM', () => {
  server.close(() => { void db.end().finally(() => process.exit(0)) })
  setTimeout(() => process.exit(1), 4000).unref()
})
