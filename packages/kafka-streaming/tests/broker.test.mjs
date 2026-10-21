import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { setTimeout } from 'node:timers/promises'
import { localKafka, localProducer } from '../src/client.ts'
import { collect } from '../src/collect.ts'
import { shipmentEvents } from '../src/fixtures.ts'
import { shipmentProjection } from '../src/projection.ts'
import { offsetLag } from '../src/offsets.ts'

const kafka = localKafka()
const admin = kafka.admin()
const producer = localProducer()
const prefix = `editorial-${randomUUID()}`
const topics = []
const groups = new Set()
const report = []
before(async () => { await admin.connect(); await producer.connect() })
after(async () => {
  await producer.disconnect()
  console.log('BROKER_EVIDENCE', JSON.stringify(report))
  // Only random, in-memory-owned topics/groups created by this invocation.
  try {
    if (groups.size) {
      try { await admin.deleteGroups([...groups]) }
      catch (error) { if (!error.groups?.every((entry) => entry.errorCode === 69)) throw error }
    }
    if (topics.length) await admin.deleteTopics({ topics })
  } finally { await admin.disconnect() }
})
async function topic(suffix, partitions = 1) {
  const name = `${prefix}-${suffix}`
  await admin.createTopics({ waitForLeaders: true, topics: [{ topic: name,
    numPartitions: partitions, replicationFactor: 1, configEntries: [
      { name: 'cleanup.policy', value: 'delete' }, { name: 'retention.ms', value: '3600000' },
    ] }] })
  topics.push(name)
  return name
}
function group(suffix) { const id = `${prefix}-${suffix}`; groups.add(id); return id }
const singleShipment = shipmentEvents.filter((event) => event.shipmentId === 's-1')
async function publish(name, events, partition) {
  for (const event of events) await producer.send({ topic: name, acks: -1,
    messages: [{ key: event.shipmentId, value: JSON.stringify(event), ...(partition === undefined ? {} : { partition }) }] })
}
async function position(groupId, name) {
  const result = await admin.fetchOffsets({ groupId, topics: [name], resolveOffsets: false })
  return result[0].partitions[0].offset
}
async function eventually(predicate, timeout = 15000) {
  const end = Date.now() + timeout
  do { if (await predicate()) return; await setTimeout(50) } while (Date.now() < end)
  throw new Error('condition_not_reached')
}

test('broker: dos groups leen el mismo log y reconstruyen el mismo estado', { timeout: 45000 }, async () => {
  const name = await topic('replay', 2)
  await publish(name, shipmentEvents)
  const live = shipmentProjection()
  const first = await collect({ topic: name, groupId: group('live'), expected: 6,
    onRecord: async ({ event }) => { live.apply(event) } })
  const rebuilt = shipmentProjection()
  const second = await collect({ topic: name, groupId: group('rebuild'), expected: 6,
    onRecord: async ({ event }) => { rebuilt.apply(event) } })
  assert.deepEqual(rebuilt.snapshot(), live.snapshot())
  assert.deepEqual(live.snapshot(), [
    { shipmentId: 's-1', version: 3, status: 'delivered' },
    { shipmentId: 's-2', version: 3, status: 'delivered' },
  ])
  for (const id of ['s-1', 's-2']) {
    const history = first.filter((record) => record.event.shipmentId === id)
    assert.equal(new Set(history.map((record) => record.partition)).size, 1)
    assert.deepEqual(history.map((record) => record.event.version), [1, 2, 3])
  }
  assert.deepEqual(second.map((r) => r.event.eventId).sort(), first.map((r) => r.event.eventId).sort())
  const config = await admin.describeConfigs({ resources: [{ type: 2, name, configNames: ['retention.ms', 'cleanup.policy'] }] })
  assert.equal(config.resources[0].configEntries.find((entry) => entry.configName === 'retention.ms').configValue, '3600000')
  report.push({ case: 'replay', records: first.map(({ partition, offset, event }) => ({ partition, offset, id: event.eventId })), snapshot: live.snapshot() })
})

test('broker: sin commit se repite; tras confirmar 1 se reanuda en offset 1', { timeout: 45000 }, async () => {
  const name = await topic('checkpoint')
  await publish(name, singleShipment)
  const groupId = group('checkpoint')
  const first = await collect({ topic: name, groupId, expected: 1, commit: false })
  assert.equal(first[0].offset, '0')
  assert.equal(await position(groupId, name), '-1')
  const repeated = await collect({ topic: name, groupId, expected: 1 })
  assert.equal(repeated[0].event.eventId, first[0].event.eventId)
  assert.equal(await position(groupId, name), '1')
  const resumed = await collect({ topic: name, groupId, expected: 2 })
  assert.deepEqual(resumed.map((record) => record.offset), ['1', '2'])
  assert.equal(await position(groupId, name), '3')
  report.push({ case: 'checkpoint', uncommitted: first[0].offset, repeated: repeated[0].offset,
    resumed: resumed.map((record) => record.offset), committed: '3' })
})

test('broker: dos miembros reparten particiones y una salida provoca reasignación', { timeout: 45000 }, async () => {
  const name = await topic('members', 2)
  const groupId = group('members')
  const one = kafka.consumer({ groupId, sessionTimeout: 10000, heartbeatInterval: 1000, allowAutoTopicCreation: false })
  const two = kafka.consumer({ groupId, sessionTimeout: 10000, heartbeatInterval: 1000, allowAutoTopicCreation: false })
  const assignments = new Map()
  const received = []
  for (const [id, consumer] of [['one', one], ['two', two]]) {
    consumer.on(consumer.events.GROUP_JOIN, ({ payload }) => { assignments.set(id, payload.memberAssignment[name] ?? []) })
  }
  try {
    for (const consumer of [one, two]) {
      await consumer.connect()
      await consumer.subscribe({ topic: name, fromBeginning: true })
      await consumer.run({ autoCommit: false, eachMessage: async ({ partition }) => {
        received.push({ member: consumer === one ? 'one' : 'two', partition })
      } })
    }
    await eventually(() => assignments.get('one')?.length === 1 && assignments.get('two')?.length === 1)
    assert.notEqual(assignments.get('one')[0], assignments.get('two')[0])
    await publish(name, [shipmentEvents[0]], 0)
    await publish(name, [shipmentEvents[1]], 1)
    await eventually(() => received.length === 2)
    assert.equal(new Set(received.map((record) => record.member)).size, 2)
    const before = Object.fromEntries(assignments)
    await two.stop(); await two.disconnect()
    await eventually(() => assignments.get('one')?.length === 2)
    assert.deepEqual([...assignments.get('one')].sort(), [0, 1])
    report.push({ case: 'group', before, after: assignments.get('one'), received })
  } finally {
    await Promise.allSettled([one.stop(), two.stop()])
    await Promise.allSettled([one.disconnect(), two.disconnect()])
  }
})

test('broker: pause/resume limita el avance y deja visible el lag del checkpoint', { timeout: 45000 }, async () => {
  const name = await topic('pressure')
  await publish(name, singleShipment)
  const groupId = group('pressure')
  await admin.setOffsets({ groupId, topic: name, partitions: [{ partition: 0, offset: '0' }] })
  const entered = Promise.withResolvers()
  const release = Promise.withResolvers()
  let resume
  let seen = 0
  const consuming = collect({ topic: name, groupId, expected: 3,
    onRecord: async (record, context) => {
      seen++
      if (record.offset === '0') { resume = context.pause(); entered.resolve(); await release.promise }
    } })
  try {
    await Promise.race([entered.promise, consuming.then(() => { throw new Error('consumer_finished_before_gate') })])
    const high = (await admin.fetchTopicOffsets(name))[0].high
    assert.equal(offsetLag(high, await position(groupId, name)), '3')
    assert.equal(seen, 1)
    release.resolve()
    await eventually(async () => await position(groupId, name) === '1')
    assert.equal(seen, 1)
    assert.equal(offsetLag(high, await position(groupId, name)), '2')
    resume()
    await consuming
    assert.equal(offsetLag(high, await position(groupId, name)), '0')
    report.push({ case: 'pressure', high, initialLag: '3', pausedLag: '2', finalLag: '0' })
  } finally { release.resolve(); resume?.(); await consuming.catch(() => {}) }
})

test('broker: un log cuyo inicio avanzó no permite reconstruir transiciones eliminadas', { timeout: 45000 }, async () => {
  const name = await topic('floor')
  await publish(name, singleShipment)
  // KafkaJS DeleteRecords resolves leaders from its local metadata cache first.
  await admin.fetchTopicMetadata({ topics: [name] })
  await admin.deleteTopicRecords({ topic: name, partitions: [{ partition: 0, offset: '2' }] })
  const [{ low, high }] = await admin.fetchTopicOffsets(name)
  assert.equal(low, '2')
  assert.equal(high, '3')
  const remaining = await collect({ topic: name, groupId: group('floor'), expected: 1 })
  assert.equal(remaining[0].offset, '2')
  assert.throws(() => shipmentProjection().apply(remaining[0].event), /unexpected_version/)
  report.push({ case: 'floor', mechanism: 'explicit DeleteRecords, not timed retention', low, high, survivingVersion: remaining[0].event.version })
})
