import { parseShipment, quoteWith, standardRate } from "./rates.ts";
import type { Quote } from "./rates.ts";
import { formatQuote } from "./presentation.ts";

export function legacyPreview(input: unknown): { quote: Quote; text: string } {
  const shipment = parseShipment(input);
  const amountMinor =
    shipment.subtotalMinor >= 5000 ? 0 : shipment.zone === "local" ? 500 : 900;
  const quote = Object.freeze({ amountMinor, currency: "EUR" as const });
  return { quote, text: `Portes: ${(amountMinor / 100).toFixed(2)} EUR` };
}

export function preview(input: unknown): { quote: Quote; text: string } {
  const quote = quoteWith(standardRate, parseShipment(input));
  return { quote, text: formatQuote(quote) };
}
