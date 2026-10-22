import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import Ajv2020 from 'ajv/dist/2020.js'
import { Verifier } from '@pact-foundation/pact'
import { startDatabase, withSchema } from './database-fixture.mjs'
import { withApi } from './http-fixture.mjs'
import { orderFixture } from '../src/fixtures.ts'
import { fetchReceipt, readOrder, readV2 } from '../src/consumer.ts'

const schema = JSON.parse(await readFile(new URL('../schemas/order-v1.json', import.meta.url)))
const validate = new Ajv2020({ strict: true }).compile(schema)
const pactPath = fileURLToPath(new URL('../contracts/ReceiptWidget-OrdersApi.json', import.meta.url))
let database
test.before(async () => { database = await startDatabase() }, { timeout: 45000 })
test.after(async () => { await database?.close() })
const record = (value) => console.log('INTEGRATION_EVIDENCE ' + JSON.stringify(value))

async function expanded(fixture) {
  await fixture.pool.query(`ALTER TABLE ${fixture.table} ADD COLUMN label text`)
}

async function verifyPact(fixture, mode) {
  const states = []
  await withApi(fixture.repository, mode, async (origin) => {
    await new Verifier({
      provider: 'OrdersApi', providerBaseUrl: origin, pactUrls: [pactPath],
      providerVersion: 'local-lab', publishVerificationResult: false, logLevel: 'error',
      stateHandlers: {
        'a paid order exists': async () => {
          states.push('paid')
          await fixture.pool.query(`TRUNCATE ${fixture.table}`)
          await fixture.repository.insert(orderFixture())
          if (mode === 'additive') await fixture.pool.query(`UPDATE ${fixture.table} SET label='Libro'`)
        },
        'no orders exist': async () => {
          states.push('missing')
          await fixture.pool.query(`TRUNCATE ${fixture.table}`)
        },
      },
    }).verifyProvider()
  })
  assert.deepEqual([...new Set(states)].toSorted(), ['missing', 'paid'])
  return states
}

test('PostgreSQL real: SQL, constraints y puerto publicado solo en loopback', async () => {
  await withSchema(database, async (fixture) => {
    await fixture.repository.insert(orderFixture())
    assert.deepEqual(await fixture.repository.read('o-1'), orderFixture())
    await assert.rejects(fixture.repository.insert(orderFixture()), { code: '23505' })
    await assert.rejects(fixture.repository.insert({ ...orderFixture(), id: 'o-2', amountMinor: 0 }), { code: '23514' })
    const version = (await fixture.pool.query('SHOW server_version')).rows[0].server_version
    const inspect = JSON.parse(execFileSync('docker', ['inspect', database.container.getId()], { encoding: 'utf8' }))[0]
    assert.ok(inspect.NetworkSettings.Ports['5432/tcp'].every((port) => port.HostIp === '127.0.0.1'))
    assert.ok(inspect.Mounts.every((mount) => mount.Type !== 'bind' && mount.Type !== 'volume'))
    record({ case: 'database', server: version, uniqueCode: '23505', checkCode: '23514', loopback: true, hostVolumes: false })
  })
})

test('schemas: mismo ID en dos fixtures no mezcla importes', async () => {
  const [a, b] = await Promise.all([database.schema(), database.schema()])
  try {
    await Promise.all([a.repository.insert(orderFixture()), b.repository.insert(orderFixture({ amountMinor: 9900 }))])
    assert.notEqual(a.name, b.name)
    assert.deepEqual([(await a.repository.read('o-1')).amountMinor, (await b.repository.read('o-1')).amountMinor], [1250, 9900])
    record({ case: 'schemas', sameId: 'o-1', amounts: [1250, 9900], distinctNamespaces: true })
  } finally { await Promise.all([a.close(), b.close()]) }
})

test('rollback: no revierte una escritura confirmada por otra conexión', async () => {
  await withSchema(database, async (fixture) => {
    const client = await fixture.pool.connect()
    try {
      await client.query('BEGIN')
      const pidA = (await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid
      const pidB = (await fixture.pool.query('SELECT pg_backend_pid() AS pid')).rows[0].pid
      assert.notEqual(pidA, pidB)
      await client.query(`INSERT INTO ${fixture.table} VALUES ('o-1',1250,'EUR','paid','2026-01-15T10:00:00Z')`)
      await withApi(fixture.repository, 'baseline', async (origin) => {
        assert.equal(await fetchReceipt(origin, 'o-1'), null)
        await fixture.repository.insert(orderFixture({ id: 'o-2', amountMinor: 9900 }))
        await client.query('ROLLBACK')
        assert.equal(await fetchReceipt(origin, 'o-1'), null)
        assert.equal((await fetchReceipt(origin, 'o-2')).amountMinor, 9900)
      })
      record({ case: 'rollback', distinctConnections: true, uncommittedVisible: false, ownRolledBack: true, otherCommittedSurvives: true })
    } finally { await client.query('ROLLBACK'); client.release() }
  })
})

test('fixture: un error del callback también elimina su schema propio', async () => {
  let name
  await assert.rejects(withSchema(database, async (fixture) => {
    name = fixture.name
    await fixture.repository.insert(orderFixture())
    throw new Error('planned_failure')
  }), /planned_failure/)
  const result = await database.admin.query('SELECT 1 FROM pg_namespace WHERE nspname=$1', [name])
  assert.equal(result.rowCount, 0)
  record({ case: 'cleanup', callbackError: 'planned_failure', schemaRemaining: false })
})

test('evolución: schema SQL aditivo, v1 conservado, v2 y ruptura controlada', async () => {
  await withSchema(database, async (fixture) => {
    await fixture.repository.insert(orderFixture())
    await withApi(fixture.repository, 'baseline', async (origin) => {
      const body = await (await fetch(origin + '/orders/o-1')).json()
      assert.equal(validate(body), true)
      assert.equal(readOrder(body).amountMinor, 1250)
    })
    await expanded(fixture)
    await fixture.pool.query(`UPDATE ${fixture.table} SET label=$1 WHERE id=$2`, ['Libro', 'o-1'])
    await withApi(fixture.repository, 'additive', async (origin) => {
      const body = await (await fetch(origin + '/orders/o-1')).json()
      assert.equal(validate(body), true)
      assert.equal(body.label, 'Libro')
      assert.equal(readOrder(body).amountMinor, 1250)
      assert.equal(readV2(await (await fetch(origin + '/v2/orders/o-1')).json()).amountMinor, 1250)
    })
    await withApi(fixture.repository, 'renamed', async (origin) => {
      const response = await fetch(origin + '/orders/o-1')
      assert.equal(response.status, 200)
      const body = await response.json()
      assert.equal(validate(body), false)
      assert.throws(() => readOrder(body), /consumer_contract/)
    })
    record({ case: 'evolution', baselineMinor: 1250, additiveMinor: 1250, v2Minor: 1250, label: 'Libro', renamedStatus: 200, renamedSchemaValid: false })
  })
})

test('Pact: proveedor baseline cumple las dos interacciones', async () => {
  await withSchema(database, async (fixture) => {
    await verifyPact(fixture, 'baseline')
    record({ case: 'pact-baseline', verified: true, states: ['missing', 'paid'] })
  })
})

test('Pact: proveedor aditivo con SQL migrado conserva el contrato anterior', async () => {
  await withSchema(database, async (fixture) => {
    await expanded(fixture)
    await verifyPact(fixture, 'additive')
    record({ case: 'pact-additive', verified: true, states: ['missing', 'paid'] })
  })
})

test('Pact: devolver money donde v1 espera amountMinor rompe el contrato', async () => {
  await withSchema(database, async (fixture) => {
    await fixture.repository.insert(orderFixture())
    await withApi(fixture.repository, 'renamed', async (origin) => {
      const response = await fetch(origin + '/orders/o-1')
      assert.equal(response.status, 200)
      const body = await response.json()
      assert.equal('amountMinor' in body, false)
      assert.equal(body.money.minorUnits, 1250)
    })
    await assert.rejects(verifyPact(fixture, 'renamed'), /verification.*fail|verifications.*fail/i)
    record({ case: 'pact-renamed', verified: false, reason: 'required amountMinor missing', httpStatus: 200 })
  })
})

test('semántica: integer y schema no conocen el valor monetario del escenario', async () => {
  await withSchema(database, async (fixture) => {
    await verifyPact(fixture, 'unit-drift')
    await fixture.pool.query(`TRUNCATE ${fixture.table}`)
    await fixture.repository.insert(orderFixture())
    await withApi(fixture.repository, 'unit-drift', async (origin) => {
      const body = await (await fetch(origin + '/orders/o-1')).json()
      assert.equal(validate(body), true)
      const receipt = readOrder(body)
      assert.equal(receipt.amountMinor, 12)
      assert.throws(() => assert.equal(receipt.amountMinor, 1250), { code: 'ERR_ASSERTION' })
    })
    record({ case: 'semantics', pactVerified: true, schemaValid: true, expectedMinor: 1250, actualMinor: 12, semanticAssertionRejects: true })
  })
})
