export type Config = { batchSize: number; revision: number; guarded: boolean }
export function legacyBatchSize(value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 16) throw new RangeError('legacy batch range')
  return value
}
export function validatedBatchSize(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 16) throw new RangeError('batchSize must be integer 1..16')
  return value
}
export function selectBatch<T>(pending: readonly T[], batchSize: number): T[] {
  return pending.slice(0, batchSize)
}
export function requireScope(expected: string, actual: string) {
  if (!expected || expected !== actual) throw new Error('fixture scope mismatch')
}
export function applyConfig(current: Config, input: { batchSize?: number; guarded?: boolean; expectedRevision: number }): Config {
  if (input.expectedRevision !== current.revision) throw new Error('configuration changed; inspect again')
  const guarded = input.guarded ?? current.guarded
  const candidate = input.batchSize ?? current.batchSize
  const batchSize = guarded ? validatedBatchSize(candidate) : legacyBatchSize(candidate)
  return { batchSize, guarded, revision: current.revision + 1 }
}
