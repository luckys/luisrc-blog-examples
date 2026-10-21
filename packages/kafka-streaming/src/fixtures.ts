import type { ShipmentEvent, Status } from './projection.ts'

const statuses: Status[] = ['created', 'shipped', 'delivered']
export const shipmentEvents: readonly ShipmentEvent[] = Object.freeze(
  statuses.flatMap((status, index) => ['s-1', 's-2'].map((shipmentId) => Object.freeze({
    schemaVersion: 1 as const, eventId: `${shipmentId}-v${index + 1}`,
    shipmentId, version: index + 1, status,
  }))),
)
