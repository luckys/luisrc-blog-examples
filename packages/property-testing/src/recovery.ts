export type Fault = 'none' | 'before-effect' | 'after-effect' | 'after-confirm'
export class InjectedFault extends Error {}
export class FakeProvider {
  readonly keys = new Set<string>()
  get effects() { return this.keys.size }
  has(key: string) { return this.keys.has(key) }
  charge(key: string): void { this.keys.add(key) }
}
export type Journal = { confirmed: boolean; attempts: number }

export class PaymentService {
  readonly provider: FakeProvider
  readonly journal: Journal
  readonly stableKey: boolean
  constructor(provider: FakeProvider, journal: Journal, stableKey = true) {
    this.provider = provider
    this.journal = journal
    this.stableKey = stableKey
  }
  pay(id: string, fault: Fault): void {
    if (this.journal.confirmed) return
    const key = this.stableKey ? id : `${id}-${++this.journal.attempts}`
    if (fault === 'before-effect') throw new InjectedFault('before-effect')
    this.provider.charge(key)
    if (fault === 'after-effect') throw new InjectedFault('after-effect')
    this.journal.confirmed = true
    if (fault === 'after-confirm') throw new InjectedFault('after-confirm')
  }
}
