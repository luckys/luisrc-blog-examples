export function amountMinor(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 1_000_000)
    throw new RangeError('amount must be an integer between 1 and 1000000')
  return value
}

export function splitAmount(total: number, parts: number): number[] {
  amountMinor(total)
  if (!Number.isInteger(parts) || parts < 1 || parts > 20) throw new RangeError('parts')
  const base = Math.floor(total / parts)
  const remainder = total % parts
  return Array.from({ length: parts }, (_, index) => base + (index < remainder ? 1 : 0))
}
