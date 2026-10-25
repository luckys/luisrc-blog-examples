import { validateCounts } from './budget.ts'
export type MinuteBin = { minute: number; total: number; bad: number; present: boolean }
export class WindowIndex {
  #total = [0]
  #bad = [0]
  #present = [0]
  constructor(bins: readonly MinuteBin[]) {
    for (const [i, bin] of bins.entries()) {
      if (bin.minute !== i || typeof bin.present !== 'boolean' || (!bin.present && (bin.total !== 0 || bin.bad !== 0))) throw new Error('grid or gap invalid')
      validateCounts(bin.total, bin.bad, 999000)
      const total = this.#total[i]! + bin.total
      validateCounts(total, 0, 999000)
      this.#total.push(total)
      this.#bad.push(this.#bad[i]! + bin.bad)
      this.#present.push(this.#present[i]! + Number(bin.present))
    }
  }
  read(start: number, end: number) {
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end >= this.#total.length) throw new RangeError('window bounds')
    const coveredMinutes = this.#present[end]! - this.#present[start]!
    return { total: this.#total[end]! - this.#total[start]!, bad: this.#bad[end]! - this.#bad[start]!,
      coveredMinutes, windowMinutes: end - start, complete: coveredMinutes === end - start }
  }
}
