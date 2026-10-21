import { parseShipment, quoteWith } from "./rates.ts";
import type { Quote, RateRule } from "./rates.ts";

export type QuoteReader = { find: (id: string) => Promise<Quote | null> };
export type QuoteWriter = { save: (id: string, quote: Quote) => Promise<void> };

export function validId(id: string): void {
  if (typeof id !== "string" || !/^[a-zA-Z0-9-]{1,64}$/.test(id))
    throw new Error("invalid id");
}

export async function readQuote(
  reader: QuoteReader,
  id: string,
): Promise<Quote | null> {
  validId(id);
  return reader.find(id);
}

export async function createQuote(
  writer: QuoteWriter,
  rate: RateRule,
  id: string,
  input: unknown,
): Promise<Quote> {
  validId(id);
  const quote = quoteWith(rate, parseShipment(input));
  await writer.save(id, quote);
  return quote;
}
