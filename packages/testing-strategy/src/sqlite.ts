import { DatabaseSync } from 'node:sqlite'
import { assertId, assertJob, newJob } from './machine.ts'
import type { Job } from './machine.ts'
import type { JobRepository } from './service.ts'
import { validateChange } from './repository.ts'

export class SqliteJobs implements JobRepository {
  private readonly database: DatabaseSync

  constructor(path: string) {
    this.database = new DatabaseSync(path, { allowExtension: false })
    this.database.exec(`CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY NOT NULL,
      state TEXT NOT NULL CHECK (state IN ('queued','running','succeeded','failed','cancelled')),
      version INTEGER NOT NULL CHECK (version >= 0 AND version <= 9007199254740991)
    ) STRICT`)
  }

  async insert(id: string): Promise<Job> {
    const job = newJob(id)
    const result = this.database.prepare('INSERT INTO jobs VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING')
      .run(job.id, job.state, job.version)
    if (result.changes !== 1) throw new Error('duplicate')
    return job
  }

  async read(id: string): Promise<Job | null> {
    assertId(id)
    const row = this.database.prepare('SELECT id, state, version FROM jobs WHERE id = ?').get(id)
    if (!row) return null
    assertJob(row)
    return Object.freeze({ id: row.id, state: row.state, version: row.version })
  }

  async compareAndSet(next: Job, expectedVersion: number): Promise<boolean> {
    validateChange(next, expectedVersion)
    const result = this.database.prepare(
      'UPDATE jobs SET state = ?, version = ? WHERE id = ? AND version = ?',
    ).run(next.state, next.version, next.id, expectedVersion)
    return result.changes === 1
  }

  close(): void { this.database.close() }
}
