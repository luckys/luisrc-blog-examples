export type Shipment = Readonly<{
  weightGrams: number;
  zone: "local" | "remote";
}>;
export type Rate = Readonly<{
  amountMinor: number;
  currency: "EUR";
  providerReference: string;
}>;
export type DeliveryQuote = Readonly<Rate & { id: string }>;
export type QuoteRecorded = Readonly<{
  kind: "QuoteRecorded";
  sequence: number;
  quote: DeliveryQuote;
}>;

export function validId(id: unknown): asserts id is string {
  if (typeof id !== "string" || !/^[a-zA-Z0-9-]{1,64}$/.test(id))
    throw new Error("invalid id");
}

function record(input: unknown): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input))
    throw new Error("invalid object");
  return input as Record<string, unknown>;
}

export function parseShipment(input: unknown): Shipment {
  const data = record(input);
  if (
    typeof data.weightGrams !== "number" ||
    !Number.isSafeInteger(data.weightGrams) ||
    data.weightGrams < 1 ||
    data.weightGrams > 20000
  )
    throw new Error("invalid weight");
  if (data.zone !== "local" && data.zone !== "remote")
    throw new Error("invalid zone");
  return Object.freeze({ weightGrams: data.weightGrams, zone: data.zone });
}

export function parseRate(input: unknown): Rate {
  const data = record(input);
  if (
    typeof data.amountMinor !== "number" ||
    !Number.isSafeInteger(data.amountMinor) ||
    data.amountMinor < 0 ||
    data.amountMinor > 1_000_000_000
  )
    throw new Error("invalid amount");
  if (data.currency !== "EUR") throw new Error("invalid currency");
  validId(data.providerReference);
  return Object.freeze({
    amountMinor: data.amountMinor,
    currency: "EUR",
    providerReference: data.providerReference,
  });
}

export function parseQuote(input: unknown): DeliveryQuote {
  const data = record(input);
  validId(data.id);
  return Object.freeze({ id: data.id, ...parseRate(data) });
}
