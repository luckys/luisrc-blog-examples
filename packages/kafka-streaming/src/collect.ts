import type { EachMessagePayload } from 'kafkajs'
import { localKafka } from './client.ts'
import { decodeEvent } from './projection.ts'
import type { ShipmentEvent } from './projection.ts'
import { nextOffset } from './offsets.ts'

type Record = Readonly<{ topic: string; partition: number; offset: string; event: ShipmentEvent }>
type Context = Pick<EachMessagePayload, 'pause' | 'heartbeat'>
type Options = {
  topic: string; groupId: string; expected: number; commit?: boolean
  onRecord?: (record: Record, context: Context) => Promise<void>
}

// A bounded test collector, not an always-on production worker.
export async function collect({ topic, groupId, expected, commit = true,
  onRecord = async () => {} }: Options): Promise<Record[]> {
  if (!/^editorial-[a-zA-Z0-9-]+$/.test(topic) || !/^editorial-[a-zA-Z0-9-]+$/.test(groupId) ||
      !Number.isSafeInteger(expected) || expected < 1 || expected > 1000) throw new Error('invalid_harness_options')
  const consumer = localKafka().consumer({ groupId, allowAutoTopicCreation: false,
    sessionTimeout: 10000, heartbeatInterval: 1000, maxBytesPerPartition: 65536, maxBytes: 131072 })
  const records: Record[] = []
  const done = Promise.withResolvers<void>()
  // An error can arrive while connect/run is still being awaited.
  void done.promise.catch(() => {})
  const timer = setTimeout(() => done.reject(new Error('collector_deadline')), 25000)
  const removeCrashListener = consumer.on(consumer.events.CRASH, ({ payload }) => done.reject(payload.error))
  try {
    await consumer.connect()
    await consumer.subscribe({ topic, fromBeginning: true })
    await consumer.run({ autoCommit: false, partitionsConsumedConcurrently: 1,
      eachMessage: async ({ topic, partition, message, pause, heartbeat }) => {
        try {
          const record = Object.freeze({ topic, partition, offset: message.offset,
            event: decodeEvent(message.key, message.value) })
          await onRecord(record, { pause, heartbeat })
          if (commit) await consumer.commitOffsets([
            { topic, partition, offset: nextOffset(message.offset) },
          ])
          records.push(record)
          if (records.length === expected) {
            consumer.pause([{ topic }])
            done.resolve()
          }
        } catch (error) { done.reject(error); throw error }
      },
    })
    await done.promise
    return records
  } finally {
    clearTimeout(timer)
    removeCrashListener()
    try { await consumer.stop() } finally { await consumer.disconnect() }
  }
}
