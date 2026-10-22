import type { Order } from './fixtures.ts'
export type Mode = 'baseline' | 'additive' | 'renamed' | 'unit-drift' | 'v2'

export function represent(order: Order, mode: Mode = 'baseline'): Record<string, unknown> {
  const common = { id: order.id, status: order.status, createdAt: order.createdAt }
  if (mode === 'v2' || mode === 'renamed')
    return { ...common, money: { minorUnits: order.amountMinor, currency: order.currency } }
  return {
    ...common, amountMinor: mode === 'unit-drift' ? Math.floor(order.amountMinor / 100) : order.amountMinor,
    currency: order.currency, ...(mode === 'additive' ? { label: order.label ?? 'Pedido de laboratorio' } : {}),
  }
}
