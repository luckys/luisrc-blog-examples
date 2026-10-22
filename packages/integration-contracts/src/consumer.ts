export type Receipt = Readonly<{ id: string; amountMinor: number; currency: 'EUR'; status: 'paid' | 'pending' }>

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('consumer_contract')
  return value as Record<string, unknown>
}

export function readOrder(value: unknown): Receipt {
  const row = object(value)
  if (typeof row.id !== 'string' || !/^o-[a-z0-9]{1,32}$/.test(row.id) ||
    !Number.isSafeInteger(row.amountMinor) || (row.amountMinor as number) <= 0 || row.currency !== 'EUR' ||
    !['paid', 'pending'].includes(row.status as string)) throw new Error('consumer_contract')
  return Object.freeze({ id: row.id, amountMinor: row.amountMinor as number, currency: 'EUR', status: row.status as Receipt['status'] })
}

export function readV2(value: unknown): Receipt {
  const row = object(value)
  const money = object(row.money)
  return readOrder({ id: row.id, status: row.status, amountMinor: money.minorUnits, currency: money.currency })
}

export function readMissing(value: unknown): { error: 'not_found' } {
  if (object(value).error !== 'not_found') throw new Error('consumer_contract')
  return { error: 'not_found' }
}

export async function fetchReceipt(origin: string, id = 'o-1'): Promise<Receipt | null> {
  if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('local_only')
  if (!/^o-[a-z0-9]{1,32}$/.test(id)) throw new Error('consumer_contract')
  const response = await fetch(`${origin}/orders/${id}`, { signal: AbortSignal.timeout(5000) })
  if (response.status === 404) { readMissing(await response.json()); return null }
  if (response.status !== 200) throw new Error('unexpected_status')
  return readOrder(await response.json())
}
