import assert from 'node:assert/strict'
import fc from 'fast-check'
import { FakeProvider, PaymentService, InjectedFault } from '../src/recovery.ts'

export const faultsArbitrary = fc.array(
  fc.constantFrom('before-effect', 'after-effect', 'after-confirm', 'none'),
  { maxLength: 12 },
)

export function assertRecovery(faults, stableKey = true) {
  const provider = new FakeProvider()
  const journal = { confirmed: false, attempts: 0 }
  for (const fault of faults) {
    const service = new PaymentService(provider, journal, stableKey)
    try { service.pay('payment-1', fault) }
    catch (error) { assert.ok(error instanceof InjectedFault) }
    assert.ok(provider.effects <= 1, 'at most one external effect')
    if (journal.confirmed) assert.equal(provider.effects, 1)
  }
  new PaymentService(provider, journal, stableKey).pay('payment-1', 'none')
  assert.equal(journal.confirmed, true)
  assert.equal(provider.effects, 1)
}
