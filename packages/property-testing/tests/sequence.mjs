import assert from 'node:assert/strict'
import fc from 'fast-check'

export const sequenceArbitrary = fc.array(
  fc.constantFrom('submit', 'confirm', 'decline'),
  { minLength: 0, maxLength: 40 },
)

// Independent specification table, not the implementation's transition method.
const specification = {
  created: { submit: 'processing', confirm: 'created', decline: 'created' },
  processing: { submit: 'processing', confirm: 'succeeded', decline: 'failed' },
  succeeded: { submit: 'succeeded', confirm: 'succeeded', decline: 'succeeded' },
  failed: { submit: 'failed', confirm: 'failed', decline: 'failed' },
}

export function assertSequence(events, createPayment) {
  const payment = createPayment()
  let expected = 'created'
  let expectedCaptures = 0
  for (const event of events) {
    const next = specification[expected][event]
    if (expected === 'processing' && next === 'succeeded') expectedCaptures++
    expected = next
    payment.apply(event)
    assert.equal(payment.state, expected, `state after ${event}`)
    assert.equal(payment.captures, expectedCaptures, `captures after ${event}`)
  }
}
