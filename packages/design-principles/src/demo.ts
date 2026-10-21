import { createQuote, readQuote } from "./application.ts";
import { memoryQuotes } from "./adapters/memory.ts";
import { standardRate, withSurcharge } from "./rates.ts";
import { formatQuote } from "./presentation.ts";

const store = memoryQuotes();
const rate = withSurcharge(standardRate, 200);
const quote = await createQuote(store, rate, "q-1", {
  subtotalMinor: 3000,
  weightGrams: 1500,
  zone: "local",
});
console.log(formatQuote(quote));
console.log(await readQuote(store, "q-1"));
