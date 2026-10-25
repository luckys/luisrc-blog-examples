import { createServer } from 'node:http'
import pg from 'pg'
import { createClient } from '@redis/client'
import { parseNote, readNote } from './notes.ts'

const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3,
  connectionTimeoutMillis: 700, query_timeout: 700, statement_timeout: 700 })
db.on('error', () => console.error('postgres_connection_error'))
const redis = createClient({ url: process.env.REDIS_URL ?? 'redis://redis:6379',
  disableOfflineQueue: true, socket: { connectTimeout: 500, reconnectStrategy: () => 200 } })
redis.on('error', () => console.error('redis_connection_error'))
void redis.connect().catch(() => console.error('redis_initial_connection_error'))
const cacheClient = () => redis.withAbortSignal(AbortSignal.timeout(500))

const server = createServer(async (req, res) => {
  const reply = (status: number, value: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value))
  }
  const path = new URL(req.url ?? '/', 'http://api').pathname
  try {
    if (req.method === 'GET' && path === '/live') return reply(200, { live: true })
    if (req.method === 'GET' && path === '/ready') {
      await db.query('SELECT 1')
      return reply(200, { ready: true, cacheConnected: redis.isReady })
    }
    if (req.method === 'POST' && path === '/notes') {
      const chunks: Buffer[] = []; let size = 0
      for await (const chunk of req) {
        size += chunk.length
        if (size > 2048) return reply(413, { error: 'body_too_large' })
        chunks.push(chunk)
      }
      let note
      try { note = parseNote(JSON.parse(Buffer.concat(chunks).toString('utf8'))) } catch { return reply(400, { error: 'invalid_note' }) }
      await db.query('INSERT INTO notes (id, text) VALUES ($1, $2)', [note.id, note.text])
      return reply(201, note)
    }
    if (req.method === 'GET' && /^\/notes\/[a-z0-9-]{1,40}$/.test(path)) {
      const id = path.slice('/notes/'.length)
      const result = await readNote(id, {
        cached: (key) => cacheClient().get(`note:${key}`),
        load: async (key) => (await db.query('SELECT id, text FROM notes WHERE id = $1', [key])).rows[0] ?? null,
        cache: async (note) => { await cacheClient().set(`note:${note.id}`, JSON.stringify(note), { EX: 60 }) },
      })
      return reply(result.note ? 200 : 404, result)
    }
    reply(404, { error: 'not_found' })
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505')
      return reply(409, { error: 'id_exists' })
    console.error('request_dependency_error'); reply(503, { error: 'dependency_unavailable' })
  }
})
server.requestTimeout = 3000
server.listen(3000, '0.0.0.0')
process.once('SIGTERM', () => {
  server.close(() => {
    if (redis.isOpen) redis.destroy()
    void db.end().finally(() => process.exit(0))
  })
  setTimeout(() => process.exit(1), 4000).unref()
})
