export type PaymentRow = { currency: string; minor: number }
export type Rate = { currency: string; basisPoints: number }

export function makeDataset() {
  const rates: Rate[] = Array.from({ length: 1000 }, (_, i) => ({ currency: `C${i}`, basisPoints: 10000 + i }))
  const payments: PaymentRow[] = Array.from({ length: 5000 }, (_, i) => ({ currency: `C${i % 1000}`, minor: i + 1 }))
  return { rates, payments }
}

export function findRateSlow(rates: readonly Rate[], currency: string): Rate | undefined {
  for (const rate of rates) if (rate.currency === currency) return rate
  return undefined
}

export function calculateSlow(payments: readonly PaymentRow[], rates: readonly Rate[]): number {
  let sum = 0
  for (const payment of payments) {
    const rate = findRateSlow(rates, payment.currency)
    if (!rate) throw new Error('missing rate')
    sum += payment.minor * rate.basisPoints
  }
  return sum
}

export function calculateIndexed(payments: readonly PaymentRow[], rates: readonly Rate[]): number {
  const index = new Map<string, Rate>()
  for (const rate of rates) if (!index.has(rate.currency)) index.set(rate.currency, rate)
  let sum = 0
  for (const payment of payments) {
    const rate = index.get(payment.currency)
    if (!rate) throw new Error('missing rate')
    sum += payment.minor * rate.basisPoints
  }
  return sum
}
