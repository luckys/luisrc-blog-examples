export type Product = { id: string; name: string; priceCents: number }

export function parseProduct(value: unknown): Product {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('invalid_product')
  const v = value as Record<string, unknown>
  if (Object.keys(v).sort().join(',') !== 'id,name,priceCents' || typeof v.id !== 'string'
    || !/^[a-z0-9-]{1,40}$/.test(v.id) || typeof v.name !== 'string'
    || !v.name.trim() || v.name.length > 100 || !Number.isSafeInteger(v.priceCents)
    || (v.priceCents as number) < 0 || (v.priceCents as number) > 1000000) throw Error('invalid_product')
  return { id: v.id, name: v.name, priceCents: v.priceCents as number }
}

// El divisor100 del artefacto candidato es una regresión intencional del fixture.
export function priceForResponse(cents: number, enabled: boolean, divisor: number) {
  return enabled ? Math.round(cents / divisor) : cents
}
