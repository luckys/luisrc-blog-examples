import { parseQuote, validId } from "../modules/shipping/public.ts";
import type {
  DeliveryQuote,
  QuoteRecorded,
  QuoteWriter,
  QuoteReader,
} from "../modules/shipping/public.ts";

export function memoryLedger(): QuoteWriter &
  QuoteReader & {
    eventsAfter: (cursor: number) => QuoteRecorded[];
    failNextRecord: () => void;
  } {
  const quotes = new Map<string, DeliveryQuote>();
  const events: QuoteRecorded[] = [];
  let shouldFail = false;
  return {
    record: async (input) => {
      const quote = parseQuote(input);
      if (shouldFail) {
        shouldFail = false;
        throw new Error("failure before record");
      }
      if (quotes.has(quote.id)) throw new Error("duplicate quote id");
      const event: QuoteRecorded = Object.freeze({
        kind: "QuoteRecorded",
        sequence: events.length + 1,
        quote,
      });
      quotes.set(quote.id, quote);
      events.push(event);
    },
    find: async (id) => {
      validId(id);
      return quotes.get(id) ?? null;
    },
    eventsAfter: (cursor) => {
      if (!Number.isSafeInteger(cursor) || cursor < 0 || cursor > events.length)
        throw new Error("invalid cursor");
      return events.slice(cursor);
    },
    failNextRecord: () => {
      shouldFail = true;
    },
  };
}
