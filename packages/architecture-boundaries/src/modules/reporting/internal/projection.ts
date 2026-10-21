import { parseQuote } from "../../shipping/public.ts";
import type { QuoteRecorded } from "../../shipping/public.ts";

export function createSummary() {
  let cursor = 0;
  let count = 0;
  let totalMinor = 0;
  const fingerprints = new Map<number, string>();
  const quoteIds = new Set<string>();
  return {
    apply: (event: QuoteRecorded): boolean => {
      if (
        !event ||
        event.kind !== "QuoteRecorded" ||
        !Number.isSafeInteger(event.sequence) ||
        event.sequence < 1
      )
        throw new Error("invalid event");
      const quote = parseQuote(event.quote);
      const fingerprint = JSON.stringify(quote);
      if (event.sequence <= cursor) {
        if (fingerprints.get(event.sequence) !== fingerprint)
          throw new Error("conflicting replay");
        return false;
      }
      if (event.sequence !== cursor + 1) throw new Error("sequence gap");
      if (quoteIds.has(quote.id)) throw new Error("duplicate quote");
      const nextTotal = totalMinor + quote.amountMinor;
      if (!Number.isSafeInteger(nextTotal)) throw new Error("summary overflow");
      fingerprints.set(event.sequence, fingerprint);
      quoteIds.add(quote.id);
      totalMinor = nextTotal;
      count++;
      cursor = event.sequence;
      return true;
    },
    snapshot: () => Object.freeze({ cursor, count, totalMinor }),
  };
}
