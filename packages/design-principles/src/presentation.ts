import type { Quote } from "./rates.ts";

export function formatQuote(quote: Quote, label = "Portes"): string {
  return `${label}: ${(quote.amountMinor / 100).toFixed(2)} ${quote.currency}`;
}
