import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createLabDatabase } from '../../experiments/atomicity/database.js'
import { createWithoutTransaction } from '../../experiments/atomicity/no-transaction.js'
import { createWithTransaction } from '../../experiments/atomicity/with-transaction.js'

let database: Awaited<ReturnType<typeof createLabDatabase>>
const input = () => ({
  orderId: randomUUID(),
  paymentId: randomUUID(),
  amountMinor: '2500',
  currency: 'EUR',
})
async function counts() {
  const result = await database.pool.query<{ orders: number; payments: number }>(
    'SELECT (SELECT count(*)::int FROM orders) AS orders, (SELECT count(*)::int FROM payments) AS payments',
  )
  return result.rows[0]
}

beforeAll(async () => {
  database = await createLabDatabase()
})
beforeEach(async () => {
  await database.pool.query('TRUNCATE payments, orders')
})
afterAll(async () => {
  await database?.close()
})

describe('Transactions: persisted effects, not just function responses', () => {
  it('reproduces an order without a payment when separate writes fail', async () => {
    await expect(createWithoutTransaction(database.pool, input(), true)).rejects.toThrow(
      'Induced failure',
    )
    expect(await counts()).toEqual({ orders: 1, payments: 0 })
  })
  it('leaves no rows when a failure occurs between transactional writes', async () => {
    await expect(createWithTransaction(database.pool, input(), true)).rejects.toThrow(
      'Induced failure',
    )
    expect(await counts()).toEqual({ orders: 0, payments: 0 })
  })
  it('commits both rows with matching amounts and currency', async () => {
    const request = input()
    await createWithTransaction(database.pool, request)
    expect(await counts()).toEqual({ orders: 1, payments: 1 })
    const { rows } = await database.pool.query(
      'SELECT p.order_id, o.total_minor, p.amount_minor, p.currency, p.status FROM payments p JOIN orders o ON o.id = p.order_id',
    )
    expect(rows).toEqual([
      {
        order_id: request.orderId,
        total_minor: '2500',
        amount_minor: '2500',
        currency: 'EUR',
        status: 'created',
      },
    ])
  })
  it('rolls back the order if the second write fails in PostgreSQL', async () => {
    await expect(
      createWithTransaction(database.pool, {
        ...input(),
        amountMinor: '9223372036854775807',
      }),
    ).resolves.toBeUndefined()
    // Reusing a paymentId causes a PK violation after inserting another order.
    const payment = await database.pool.query<{ id: string }>('SELECT id FROM payments')
    await expect(
      createWithTransaction(database.pool, {
        ...input(),
        paymentId: payment.rows[0]!.id,
      }),
    ).rejects.toMatchObject({ code: '23505' })
    expect(await counts()).toEqual({ orders: 1, payments: 1 })
  })
  it('an observer session does not see uncommitted writes', async () => {
    const client = await database.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        'INSERT INTO orders (id, total_minor, currency) VALUES ($1, 2500, $2)',
        [randomUUID(), 'EUR'],
      )
      expect(await counts()).toEqual({ orders: 0, payments: 0 })
    } finally {
      await client.query('ROLLBACK')
      client.release()
    }
  })
  it('an SQL error blocks the transaction until rollback or rollback to a savepoint', async () => {
    const client = await database.pool.connect()
    const request = input()
    try {
      await client.query('BEGIN')
      await client.query(
        'INSERT INTO orders (id, total_minor, currency) VALUES ($1, 2500, $2)',
        [request.orderId, 'EUR'],
      )
      await client.query('SAVEPOINT optional_work')
      await expect(client.query('SELECT 1 / 0')).rejects.toMatchObject({ code: '22012' })
      await expect(client.query('SELECT 1')).rejects.toMatchObject({ code: '25P02' })
      await client.query('ROLLBACK TO SAVEPOINT optional_work')
      await client.query(
        'INSERT INTO payments (id, order_id, amount_minor, currency) VALUES ($1, $2, 2500, $3)',
        [request.paymentId, request.orderId, 'EUR'],
      )
      await client.query('RELEASE SAVEPOINT optional_work')
      expect(await counts()).toEqual({ orders: 0, payments: 0 })
      await client.query('COMMIT')
      expect(await counts()).toEqual({ orders: 1, payments: 1 })
    } finally {
      await client.query('ROLLBACK')
      client.release()
    }
  })
  it('closing a session before COMMIT discards its writes', async () => {
    const client = await database.pool.connect()
    const { rows } = await client.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')
    try {
      await client.query('BEGIN')
      await client.query(
        'INSERT INTO orders (id, total_minor, currency) VALUES ($1, 2500, $2)',
        [randomUUID(), 'EUR'],
      )
    } finally {
      client.release(true)
    }
    // Waiting for the backend to close distinguishes invisibility from completed rollback.
    await expect
      .poll(
        async () => {
          const result = await database.pool.query(
            'SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE pid = $1) AS active',
            [rows[0]!.pid],
          )
          return result.rows[0].active
        },
        { timeout: 3000 },
      )
      .toBe(false)
    expect(await counts()).toEqual({ orders: 0, payments: 0 })
  })
  it('a transaction can commit a negative amount if no rule forbids it', async () => {
    await createWithTransaction(database.pool, { ...input(), amountMinor: '-2500' })
    const result = await database.pool.query('SELECT amount_minor FROM payments')
    expect(result.rows).toEqual([{ amount_minor: '-2500' }])
  })
  it('COMMIT on an aborted transaction returns ROLLBACK rather than committing', async () => {
    const client = await database.pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        'INSERT INTO orders (id, total_minor, currency) VALUES ($1, 2500, $2)',
        [randomUUID(), 'EUR'],
      )
      await expect(client.query('SELECT 1 / 0')).rejects.toMatchObject({ code: '22012' })
      const result = await client.query('COMMIT')
      expect(result.command).toBe('ROLLBACK')
      expect(await counts()).toEqual({ orders: 0, payments: 0 })
    } finally {
      await client.query('ROLLBACK')
      client.release()
    }
  })
})
