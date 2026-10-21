import { parseShipment, parseRate, validId } from "./domain.ts";
import type { DeliveryQuote } from "./domain.ts";
import type { RateProvider, QuoteWriter } from "./ports.ts";

export async function createDeliveryQuote(
  provider: RateProvider,
  writer: QuoteWriter,
  id: string,
  input: unknown,
): Promise<DeliveryQuote> {
  validId(id);
  const shipment = parseShipment(input);
  const rate = parseRate(await provider.quote(shipment));
  const quote = Object.freeze({ id, ...rate });
  await writer.record(quote);
  return quote;
}
