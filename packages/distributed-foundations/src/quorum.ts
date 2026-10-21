import { integer, label } from './validation.ts'
import type { Register } from './replication.ts'

export function subsets(members: readonly string[], size: number): string[][] {
  integer(members.length, 1, 16)
  integer(size, 1, members.length)
  members.forEach(label)
  if (new Set(members).size !== members.length) throw new Error('duplicate_member')
  const result: string[][] = []
  function visit(start: number, group: string[]) {
    if (group.length === size) { result.push(group); return }
    for (let index = start; index < members.length; index++)
      visit(index + 1, [...group, members[index]!])
  }
  visit(0, [])
  return result
}

export const overlaps = (left: readonly string[], right: readonly string[]) =>
  left.some((member) => right.includes(member))

// Assumes one writer with comparable, unique versions. No concurrent-write protocol.
export function newest(values: readonly Register[]): Register {
  if (values.length === 0) throw new Error('empty_read')
  const seen = new Map<number, string>()
  for (const { version, value } of values) {
    integer(version)
    label(value)
    if (seen.has(version) && seen.get(version) !== value)
      throw new Error('conflicting_version')
    seen.set(version, value)
  }
  const selected = values.reduce((a, b) => a.version > b.version ? a : b)
  return Object.freeze({ ...selected })
}
