import { integer } from './validation.ts'

export function logicalClock(initial = 0) {
  integer(initial)
  let counter = initial
  function advance(remote: number) {
    integer(remote)
    const next = Math.max(counter, remote) + 1
    integer(next)
    counter = next
    return counter
  }
  return {
    tick: () => advance(0),
    receive: (timestamp: number) => advance(timestamp),
    value: () => counter,
  }
}
