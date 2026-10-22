import { apply, assertId, parseCommand } from './machine.ts'
import type { Command, Job } from './machine.ts'

export interface JobRepository {
  read(id: string): Promise<Job | null>
  compareAndSet(next: Job, expectedVersion: number): Promise<boolean>
}

export async function execute(repository: JobRepository, id: string, command: Command, expectedVersion: number): Promise<Job> {
  assertId(id)
  parseCommand(command)
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) throw new Error('invalid_input')
  const current = await repository.read(id)
  if (!current) throw new Error('not_found')
  if (current.version !== expectedVersion) throw new Error('version_conflict')
  const next = apply(current, command)
  if (next.version === current.version) return current
  if (!await repository.compareAndSet(next, expectedVersion)) throw new Error('version_conflict')
  return next
}
