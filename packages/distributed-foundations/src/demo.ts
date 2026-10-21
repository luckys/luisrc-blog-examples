import { replicaPair } from './replication.ts'
import { subsets, overlaps } from './quorum.ts'
import { bucketFor } from './routing.ts'

const pair = replicaPair()
const receipt = pair.write('shipped')
console.log('confirmed', receipt)
console.log('before delivery', pair.readFollower())
try { pair.readFollower(receipt.version) }
catch (error) { console.log('freshness', (error as Error).message) }
pair.deliver(0)
console.log('after delivery', pair.readFollower())
const groups = subsets(['A', 'B', 'C'], 2)
console.log('intersecting pairs', groups.flatMap((w) => groups.map((r) => overlaps(w, r))).filter(Boolean).length)
const keys = Array.from({ length: 1000 }, (_, i) => `shipment-${i}`)
console.log('modulo remapped 2 to 3', keys.filter((key) => bucketFor(key, 2) !== bucketFor(key, 3)).length)
