export type Shipment = Readonly<{
  subtotalMinor: number;
  weightGrams: number;
  zone: "local" | "remote";
}>;
export type Quote = Readonly<{ amountMinor: number; currency: "EUR" }>;
export type RateRule = (shipment: Shipment) => number;

export function parseShipment(input: unknown): Shipment {
  if (typeof input !== "object" || input === null || Array.isArray(input))
    throw new Error("invalid shipment");
  const data = input as Record<string, unknown>;
  if (
    typeof data.subtotalMinor !== "number" ||
    !Number.isSafeInteger(data.subtotalMinor) ||
    data.subtotalMinor < 0 ||
    data.subtotalMinor > 1_000_000_000
  )
    throw new Error("invalid subtotal");
  if (
    typeof data.weightGrams !== "number" ||
    !Number.isSafeInteger(data.weightGrams) ||
    data.weightGrams < 1 ||
    data.weightGrams > 20000
  )
    throw new Error("invalid weight");
  if (data.zone !== "local" && data.zone !== "remote")
    throw new Error("invalid zone");
  return Object.freeze({
    subtotalMinor: data.subtotalMinor,
    weightGrams: data.weightGrams,
    zone: data.zone,
  });
}

export function validAmount(amount: number): number {
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 1_000_000_000)
    throw new Error("invalid amount");
  return amount;
}

export function standardRate(shipment: Shipment): number {
  if (shipment.subtotalMinor >= 5000) return 0;
  return shipment.zone === "local" ? 500 : 900;
}

export function withSurcharge(
  base: RateRule,
  surchargeMinor: number,
): RateRule {
  validAmount(surchargeMinor);
  return (shipment) =>
    validAmount(validAmount(base(shipment)) + surchargeMinor);
}

export function quoteWith(rate: RateRule, shipment: Shipment): Quote {
  const valid = parseShipment(shipment);
  return Object.freeze({
    amountMinor: validAmount(rate(valid)),
    currency: "EUR",
  });
}
