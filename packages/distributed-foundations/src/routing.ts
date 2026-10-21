import { createHash } from 'node:crypto'
import { integer, label } from './validation.ts'

type Route = Readonly<{ key: string; bucket: number; owner: string; revision: number }>

export function bucketFor(key: string, count: number): number {
  label(key)
  integer(count, 1, 65536)
  const hash = createHash('sha256').update(key, 'utf8').digest().readUInt32BE(0)
  return hash % count
}

// Models routing metadata only; move() does not transfer or replicate records.
export function routingTable(initialOwners: readonly string[]) {
  integer(initialOwners.length, 1, 65536)
  initialOwners.forEach(label)
  const owners = [...initialOwners]
  let revision = 1
  function route(key: string): Route {
    const bucket = bucketFor(key, owners.length)
    return Object.freeze({ key, bucket, owner: owners[bucket]!, revision })
  }
  return {
    route,
    move(bucket: number, owner: string, expectedRevision: number): void {
      integer(bucket, 0, owners.length - 1)
      label(owner)
      integer(expectedRevision, 1)
      if (expectedRevision !== revision) throw new Error('stale_revision')
      integer(revision + 1)
      owners[bucket] = owner
      revision++
    },
    validate(candidate: Route): void {
      const current = route(candidate.key)
      if (candidate.bucket !== current.bucket || candidate.owner !== current.owner ||
          candidate.revision !== current.revision) throw new Error('stale_route')
    },
  }
}
