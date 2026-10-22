import type { Scheduler } from 'fast-check'

export async function runRace(scheduler: Scheduler, atomic: boolean) {
  let value = 0
  const pause = (label: string) => scheduler.schedule(Promise.resolve(), label)
  async function increment() {
    if (atomic) {
      await pause('increment')
      value++
      return
    }
    await pause('read')
    const snapshot = value
    await pause('write')
    value = snapshot + 1
  }
  const both = Promise.all([increment(), increment()])
  await scheduler.waitFor(both)
  return { value, report: scheduler.report() }
}
