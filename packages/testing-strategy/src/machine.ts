import { transition, isState } from './transitions.ts'
import type { State, Command } from './transitions.ts'
export { transition } from './transitions.ts'
export type { State, Command } from './transitions.ts'
export type Job = Readonly<{ id: string; state: State; version: number }>

export function parseCommand(value: unknown): Command {
  if (typeof value !== 'string' || !['start', 'succeed', 'fail', 'cancel'].includes(value))
    throw new Error('invalid_input')
  return value as Command
}

export function assertId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || !/^j-[a-z0-9]{1,32}$/.test(id)) throw new Error('invalid_input')
}

export function assertJob(value: unknown): asserts value is Job {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_input')
  const row = value as Record<string, unknown>
  assertId(row.id)
  if (!isState(row.state)) throw new Error('invalid_input')
  if (!Number.isSafeInteger(row.version) || (row.version as number) < 0) throw new Error('invalid_input')
}

export function newJob(id: string): Job {
  assertId(id)
  return Object.freeze({ id, state: 'queued', version: 0 })
}

export function apply(job: Job, command: Command): Job {
  assertJob(job)
  const state = transition(job.state, command)
  if (state === job.state) return job
  if (job.version === Number.MAX_SAFE_INTEGER) throw new Error('version_overflow')
  return Object.freeze({ id: job.id, state, version: job.version + 1 })
}
