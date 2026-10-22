export type Order = Readonly<{
  id: string; amountMinor: number; currency: 'EUR'; status: 'paid' | 'pending'; createdAt: string; label?: string
}>

export function orderFixture(overrides: Partial<Order> = {}): Order {
  const order = {
    id: 'o-1', amountMinor: 1250, currency: 'EUR', status: 'paid',
    createdAt: '2026-01-15T10:00:00.000Z', ...overrides,
  }
  if (!/^o-[a-z0-9]{1,32}$/.test(order.id) || !Number.isSafeInteger(order.amountMinor) || order.amountMinor <= 0 ||
    order.currency !== 'EUR' || !['paid', 'pending'].includes(order.status) ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(order.createdAt) ||
    !Number.isFinite(Date.parse(order.createdAt)) || new Date(order.createdAt).toISOString() !== order.createdAt)
    throw new Error('invalid_fixture')
  return Object.freeze(order) as Order
}

export function isRecent(order: Order, now: Date): boolean {
  if (!Number.isFinite(now.valueOf())) throw new Error('invalid_clock')
  const age = now.valueOf() - Date.parse(order.createdAt)
  return age >= 0 && age <= 7 * 24 * 60 * 60 * 1000
}
