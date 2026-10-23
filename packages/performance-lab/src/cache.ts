export class RetainedEntry {
  readonly id: number
  readonly payload: number[]
  constructor(id: number) { this.id = id; this.payload = Array.from({ length: 1024 }, () => id) }
}
export class LabCache {
  readonly items: RetainedEntry[] = []
  readonly limit: number
  constructor(limit: number) {
    if (!(limit === Infinity || (Number.isInteger(limit) && limit > 0))) throw new RangeError('limit')
    this.limit = limit
  }
  add(id: number): void {
    this.items.push(new RetainedEntry(id))
    if (this.items.length > this.limit) this.items.shift()
  }
}
