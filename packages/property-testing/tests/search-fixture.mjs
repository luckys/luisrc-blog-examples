import fc from 'fast-check'
import { Payment } from '../src/payment.ts'
import { assertSequence, sequenceArbitrary } from './sequence.mjs'

export function paymentProperty(variant) {
  return fc.property(sequenceArbitrary, (events) => {
    assertSequence(events, () => new Payment(variant))
  })
}
