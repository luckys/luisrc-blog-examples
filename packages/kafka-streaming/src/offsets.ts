const maximum = 9223372036854775807n
function offset(value: string): bigint {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value)) throw new Error('invalid_offset')
  const parsed = BigInt(value)
  if (parsed > maximum) throw new Error('invalid_offset')
  return parsed
}

export function nextOffset(current: string): string {
  const next = offset(current) + 1n
  if (next > maximum) throw new Error('offset_overflow')
  return next.toString()
}

export function offsetLag(end: string, committed: string | null): string | null {
  const high = offset(end)
  if (committed === null) return null
  const low = offset(committed)
  if (low > high) throw new Error('commit_ahead_of_end')
  return (high - low).toString()
}
