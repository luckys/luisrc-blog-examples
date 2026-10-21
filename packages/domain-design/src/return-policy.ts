export type ReturnDelivery = Readonly<{
  orderId: string;
  deliveredAtMs: number | null;
}>;

export function evaluateReturn(
  delivery: ReturnDelivery,
  nowMs: number,
  windowMs: number,
): "awaiting-delivery" | "eligible" | "expired" {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0)
    throw new Error("invalid current time");
  if (!Number.isSafeInteger(windowMs) || windowMs <= 0)
    throw new Error("invalid window");
  if (
    typeof delivery.orderId !== "string" ||
    !/^[a-zA-Z0-9-]{1,64}$/.test(delivery.orderId)
  )
    throw new Error("invalid delivery");
  if (delivery.deliveredAtMs === null) return "awaiting-delivery";
  if (
    !Number.isSafeInteger(delivery.deliveredAtMs) ||
    delivery.deliveredAtMs < 0
  )
    throw new Error("invalid delivery time");
  if (nowMs < delivery.deliveredAtMs)
    throw new Error("clock precedes delivery");
  return nowMs - delivery.deliveredAtMs <= windowMs ? "eligible" : "expired";
}
