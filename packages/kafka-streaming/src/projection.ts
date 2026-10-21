export type Status = 'created' | 'shipped' | 'delivered'
export type ShipmentEvent = Readonly<{
  schemaVersion: 1; eventId: string; shipmentId: string; version: number; status: Status
}>
type Shipment = Readonly<{ shipmentId: string; version: number; status: Status }>
const stages: readonly Status[] = ['created', 'shipped', 'delivered']
function id(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(value)) throw new Error('invalid_id')
}
function parseEvent(value: unknown): ShipmentEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_event')
  const e = value as Record<string, unknown>
  id(e.eventId)
  id(e.shipmentId)
  if (e.schemaVersion !== 1 || !Number.isSafeInteger(e.version) || (e.version as number) < 1 ||
      !stages.includes(e.status as Status)) throw new Error('invalid_event')
  return Object.freeze({ schemaVersion: 1, eventId: e.eventId, shipmentId: e.shipmentId,
    version: e.version as number, status: e.status as Status })
}

export function decodeEvent(key: Buffer | null, value: Buffer | null): ShipmentEvent {
  if (!key || !value || value.length > 4096) throw new Error('invalid_record')
  const decoder = new TextDecoder('utf-8', { fatal: true })
  const event = parseEvent(JSON.parse(decoder.decode(value)))
  if (decoder.decode(key) !== event.shipmentId) throw new Error('key_mismatch')
  return event
}

// This read model has no external side effects. Checkpoints live in Kafka, not here.
export function shipmentProjection() {
  const shipments = new Map<string, Shipment>()
  const fingerprints = new Map<string, string>()
  return {
    apply(input: unknown): boolean {
      const event = parseEvent(input)
      const fingerprint = JSON.stringify(event)
      const prior = fingerprints.get(event.eventId)
      if (prior !== undefined) {
        if (prior !== fingerprint) throw new Error('conflicting_event')
        return false
      }
      const current = shipments.get(event.shipmentId)
      if (event.version !== (current?.version ?? 0) + 1) throw new Error('unexpected_version')
      if (event.status !== stages[event.version - 1]) throw new Error('invalid_transition')
      shipments.set(event.shipmentId, Object.freeze({ shipmentId: event.shipmentId,
        version: event.version, status: event.status }))
      fingerprints.set(event.eventId, fingerprint)
      return true
    },
    snapshot: (): Shipment[] => [...shipments.values()].sort((a, b) => a.shipmentId.localeCompare(b.shipmentId)),
  }
}
