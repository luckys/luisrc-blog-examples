import { execFileSync } from 'node:child_process'
import { setTimeout } from 'node:timers/promises'
import { localKafka } from '../src/client.ts'

const name = 'luisrc-editorial-kafka-391'
const label = 'dev.luisrc.editorial=kafka-streaming'
const image = 'apache/kafka:3.9.1@sha256:4ceccc577f03f51f6af8dbfda55194d0d892f4fa7913ffbded567ce3895622ed'
const command = process.argv[2]
function inspect() {
  try { return JSON.parse(execFileSync('docker', ['inspect', name], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))[0] }
  catch (error) { if (error.status === 1) return null; throw error }
}
function owned(info) {
  if (info.Config.Labels?.['dev.luisrc.editorial'] !== 'kafka-streaming') throw new Error('container_not_owned_by_lab')
}
if (command === 'down') {
  const info = inspect()
  if (info) {
    owned(info)
    // Exact labeled, disposable container only. No host volume or user data.
    execFileSync('docker', ['stop', '--timeout', '10', name], { stdio: 'inherit' })
  }
} else if (command === 'up') {
  const info = inspect()
  if (info) owned(info)
  else execFileSync('docker', ['run', '--detach', '--rm', '--pull=never', '--name', name,
    '--label', label, '--memory', '1g', '--cpus', '2', '--network', 'bridge',
    '--publish', '127.0.0.1:19092:9092',
    '--env', 'KAFKA_NODE_ID=1', '--env', 'KAFKA_PROCESS_ROLES=broker,controller',
    '--env', 'KAFKA_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093',
    '--env', 'KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://127.0.0.1:19092',
    '--env', 'KAFKA_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT',
    '--env', 'KAFKA_CONTROLLER_LISTENER_NAMES=CONTROLLER',
    '--env', 'KAFKA_CONTROLLER_QUORUM_VOTERS=1@localhost:9093',
    '--env', 'KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR=1',
    '--env', 'KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR=1',
    '--env', 'KAFKA_TRANSACTION_STATE_LOG_MIN_ISR=1',
    '--env', 'KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS=0',
    '--env', 'KAFKA_AUTO_CREATE_TOPICS_ENABLE=false',
    '--env', 'KAFKA_LOG_RETENTION_CHECK_INTERVAL_MS=500',
    '--env', 'KAFKA_HEAP_OPTS=-Xms256m -Xmx512m', image], { stdio: 'inherit' })
  let ready = false
  for (let attempt = 0; attempt < 25; attempt++) {
    const admin = localKafka().admin()
    try { await admin.connect(); await admin.listTopics(); ready = true; break }
    catch { await setTimeout(400) }
    finally { await admin.disconnect() }
  }
  if (!ready) throw new Error('broker_not_ready; inspect logs and run broker:down')
  console.log(`Kafka 3.9.1 ready on 127.0.0.1:19092; disposable container ${name}`)
} else throw new Error('Usage: broker.mjs up|down')
