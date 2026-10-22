import { assertJob } from './machine.ts'
import type { Job } from './machine.ts'

export function validateChange(next: Job, expectedVersion: number): void {
  assertJob(next)
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0 || next.version !== expectedVersion + 1)
    throw new Error('invalid_version')
}
