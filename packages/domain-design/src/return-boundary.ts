import type { ReturnDelivery } from "./return-policy.ts";

export function returnDeliveryFromShipment(input: unknown): ReturnDelivery {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("invalid shipment");
  const data = input as Record<string, unknown>;
  if (
    typeof data.orderId !== "string" ||
    !/^[a-zA-Z0-9-]{1,64}$/.test(data.orderId)
  )
    throw new Error("invalid order id");
  if (data.state === "in_transit" && data.deliveredAt === undefined)
    return Object.freeze({ orderId: data.orderId, deliveredAtMs: null });
  if (data.state !== "delivered" || typeof data.deliveredAt !== "string")
    throw new Error("invalid delivered shipment");
  const deliveredAtMs = Date.parse(data.deliveredAt);
  if (
    !Number.isSafeInteger(deliveredAtMs) ||
    deliveredAtMs < 0 ||
    new Date(deliveredAtMs).toISOString() !== data.deliveredAt
  )
    throw new Error("invalid canonical delivery timestamp");
  return Object.freeze({ orderId: data.orderId, deliveredAtMs });
}
