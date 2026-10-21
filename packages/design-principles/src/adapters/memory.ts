import { validId } from "../application.ts";
import type { QuoteReader, QuoteWriter } from "../application.ts";
import { validAmount } from "../rates.ts";
import type { Quote } from "../rates.ts";

export function memoryQuotes(): QuoteReader & QuoteWriter {
  const quotes = new Map<string, Quote>();
  return {
    find: async (id) => {
      validId(id);
      return quotes.get(id) ?? null;
    },
    save: async (id, quote) => {
      validId(id);
      if (quote.currency !== "EUR") throw new Error("invalid currency");
      const copy: Quote = Object.freeze({
        amountMinor: validAmount(quote.amountMinor),
        currency: "EUR",
      });
      if (quotes.has(id)) throw new Error("duplicate id");
      quotes.set(id, copy);
    },
  };
}
