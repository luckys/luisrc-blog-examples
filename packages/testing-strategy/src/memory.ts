import { assertId, newJob } from './machine.ts'
import type { Job } from './machine.ts'
import type { JobRepository } from './service.ts'
import { validateChange } from './repository.ts'

export class MemoryJobs implements JobRepository {
  private readonly jobs = new Map<string, Job>()

  async insert(id: string): Promise<Job> {
    const job = newJob(id)
    if (this.jobs.has(id)) throw new Error('duplicate')
    this.jobs.set(id, job)
    return job
  }

  async read(id: string): Promise<Job | null> {
    assertId(id)
    return this.jobs.get(id) ?? null
  }

  async compareAndSet(next: Job, expectedVersion: number): Promise<boolean> {
    validateChange(next, expectedVersion)
    if (this.jobs.get(next.id)?.version !== expectedVersion) return false
    this.jobs.set(next.id, Object.freeze({ id: next.id, state: next.state, version: next.version }))
    return true
  }
}
