import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import { PullPolicy } from 'testcontainers'
import { OrdersRepository, qualifiedOrders } from '../src/repository.ts'

export const image = 'postgres:18-alpine@sha256:9a8afca54e7861fd90fab5fdf4c42477a6b1cb7d293595148e674e0a3181de15'

class LoopbackPostgres extends PostgreSqlContainer {
  async beforeContainerCreated() {
    this.hostConfig.PortBindings = { '5432/tcp': [{ HostIp: '127.0.0.1', HostPort: '0' }] }
  }
}

export async function startDatabase() {
  const runId = process.env.EDITORIAL_CONTRACT_RUN
  assert.match(runId ?? '', /^[0-9a-f-]{36}$/, 'Usa node scripts/verify.mjs')
  assert.ok(!process.env.DOCKER_HOST || process.env.DOCKER_HOST.startsWith('unix://'), 'Solo Docker local')
  assert.ok(!process.env.TESTCONTAINERS_HOST_OVERRIDE || ['localhost', '127.0.0.1'].includes(process.env.TESTCONTAINERS_HOST_OVERRIDE))
  const endpoint = execFileSync('docker', ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'], { encoding: 'utf8' }).trim()
  assert.ok(endpoint.startsWith('unix://'), 'No usar un daemon remoto')
  const container = await new LoopbackPostgres(image)
    .withName(`blog-contracts-${runId}`)
    .withLabels({ 'dev.luisrc.contracts': 'integration-contracts', 'dev.luisrc.contract-run': runId })
    .withDatabase('contracts_lab').withUsername('lab').withPassword('local-only-lab')
    .withAutoCleanup(false).withPullPolicy(PullPolicy.neverPull())
    .withTmpFs({ '/var/lib/postgresql': 'rw,size=256m' })
    .withResourcesQuota({ memory: 0.5, cpu: 1 }).withStartupTimeout(30000)
    .start()
  const schemas = new Set()
  let admin
  try {
    assert.ok(['localhost', '127.0.0.1'].includes(container.getHost()))
    const config = {
      host: container.getHost(), port: container.getPort(), database: container.getDatabase(),
      user: container.getUsername(), password: container.getPassword(),
      connectionTimeoutMillis: 3000, query_timeout: 5000,
    }
    admin = new pg.Pool({ ...config, max: 2 })
    await admin.query('SELECT 1')
    const schemaSQL = await readFile(new URL('../sql/001_orders.sql', import.meta.url), 'utf8')
    return {
      container, admin,
      async schema() {
        const name = `test_${randomUUID().replaceAll('-', '')}`
        qualifiedOrders(name)
        await admin.query(`CREATE SCHEMA "${name}"`)
        schemas.add(name)
        const pool = new pg.Pool({ ...config, max: 2 })
        let closed = false
        const close = async () => {
          if (closed) return
          await pool.end()
          assert.ok(schemas.has(name))
          await admin.query(`DROP SCHEMA "${name}" CASCADE`)
          schemas.delete(name)
          closed = true
        }
        try {
          await pool.query(schemaSQL.replaceAll('__SCHEMA__', `"${name}"`))
          return { name, table: qualifiedOrders(name), pool, repository: new OrdersRepository(pool, name), close }
        } catch (error) { await close(); throw error }
      },
      async close() {
        try { await admin.end() }
        finally { await container.stop() }
      },
    }
  } catch (error) {
    try { await admin?.end() }
    finally { await container.stop() }
    throw error
  }
}

export async function withSchema(database, run) {
  const fixture = await database.schema()
  try { return await run(fixture) }
  finally { await fixture.close() }
}
