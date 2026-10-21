export type ShipmentSnapshot = Readonly<{
  orderId: string;
  state: "in_transit" | "delivered";
}>;

// This boundary accepts unknown because a TypeScript type cannot validate JSON.
export function eligibilityFromShipment(
  input: unknown,
): "awaiting-delivery" | "eligible" {
  if (!input || typeof input !== "object") throw new Error("invalid shipment");
  const data = input as Record<string, unknown>;
  if (
    typeof data.orderId !== "string" ||
    !/^[a-zA-Z0-9-]{1,64}$/.test(data.orderId)
  )
    throw new Error("invalid order id");
  if (data.state === "delivered") return "eligible";
  if (data.state === "in_transit") return "awaiting-delivery";
  throw new Error("unknown shipment state");
}
