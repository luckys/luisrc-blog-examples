import { spawnSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'

const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', 'tests/broker.test.mjs'],
  { encoding: 'utf8', timeout: 120000 })
process.stdout.write(result.stdout ?? '')
process.stderr.write(result.stderr ?? '')
if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)
const line = result.stdout.split('\n').find((line) => line.includes('BROKER_EVIDENCE '))
if (!line) throw new Error('missing_evidence')
const cases = JSON.parse(line.slice(line.indexOf('BROKER_EVIDENCE ') + 'BROKER_EVIDENCE '.length))
if (cases.length !== 5) throw new Error('incomplete_evidence')
const evidence = {
  node: process.version, kafka: '3.9.1', client: 'KafkaJS 2.2.4',
  imageDigest: 'sha256:4ceccc577f03f51f6af8dbfda55194d0d892f4fa7913ffbded567ce3895622ed',
  topology: 'one disposable KRaft broker/controller; RF=1; TCP loopback; no TLS or SASL',
  limits: ['no failover or RF>1', 'no timed-retention/compaction test', 'no process kill',
    'read model and dedup in memory; no external effects or exactly-once claim'],
  cases,
}
await mkdir('evidence', { recursive: true })
await writeFile('evidence/broker.json', JSON.stringify(evidence, null, 2) + '\n')
console.log('Evidence saved: evidence/broker.json')
