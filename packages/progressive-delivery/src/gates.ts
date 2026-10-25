export function checkSmoke(response: { status: number; body: Record<string, unknown> }, id: string, expectedCents: number) {
  return response.status === 200 && response.body.id === id && response.body.priceCents === expectedCents
}

export function imagePolicy(input: { user: string; base: string; high: number; critical: number }) {
  return ['node', '1000'].includes(input.user) && /@sha256:[a-f0-9]{64}$/.test(input.base)
    && input.high === 0 && input.critical === 0
}
