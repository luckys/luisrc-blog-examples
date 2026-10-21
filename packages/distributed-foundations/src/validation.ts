export function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max)
    throw new Error('invalid_integer')
}

export function label(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(value))
    throw new Error('invalid_label')
}
