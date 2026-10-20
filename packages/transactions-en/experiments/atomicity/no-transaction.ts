import type { Pool } from 'pg'
import type { CreationInput } from './types.js'

// INCORRECT EXAMPLE: only to reproduce the partial-write failure.
export async function createWithoutTransaction(
  pool: Pool,
  input: CreationInput,
  failAfterOrder = false,
) {
  await pool.query('INSERT INTO orders (id, total_minor, currency) VALUES ($1, $2, $3)', [
    input.orderId,
    input.amountMinor,
    input.currency,
  ])
  if (failAfterOrder) throw new Error('Induced failure after creating the order')
  await pool.query(
    'INSERT INTO payments (id, order_id, amount_minor, currency) VALUES ($1, $2, $3, $4)',
    [input.paymentId, input.orderId, input.amountMinor, input.currency],
  )
}
