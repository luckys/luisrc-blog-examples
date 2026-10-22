import type pg from 'pg'
import type { Order } from './fixtures.ts'

export function qualifiedOrders(schema: string): string {
  if (!/^test_[0-9a-f]{32}$/.test(schema)) throw new Error('invalid_schema')
  return `"${schema}".orders`
}

export class OrdersRepository {
  private readonly table: string
  private readonly pool: pg.Pool
  constructor(pool: pg.Pool, schema: string) {
    this.pool = pool
    this.table = qualifiedOrders(schema)
  }

  async insert(order: Order): Promise<void> {
    await this.pool.query(`INSERT INTO ${this.table}
      (id, amount_minor, currency, status, created_at) VALUES ($1,$2,$3,$4,$5)`,
    [order.id, order.amountMinor, order.currency, order.status, order.createdAt])
  }

  async read(id: string): Promise<Order | null> {
    const result = await this.pool.query(`SELECT id, amount_minor, currency, status, created_at,
      to_jsonb(o)->>'label' AS label FROM ${this.table} o WHERE id=$1`, [id])
    const row = result.rows[0]
    if (!row) return null
    return Object.freeze({
      id: row.id, amountMinor: row.amount_minor, currency: row.currency, status: row.status,
      createdAt: row.created_at.toISOString(), ...(row.label === null ? {} : { label: row.label }),
    })
  }
}
