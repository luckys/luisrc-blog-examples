import { createDeliveryQuote } from "./modules/shipping/public.ts";
import { createSummary } from "./modules/reporting/public.ts";
import { fixtureProvider } from "./adapters/fixture-provider.ts";
import { memoryLedger } from "./adapters/ledger.ts";

const ledger = memoryLedger();
const summary = createSummary();
await createDeliveryQuote(fixtureProvider(), ledger, "q-1", {
  weightGrams: 1500,
  zone: "local",
});
console.log("before", summary.snapshot());
for (const event of ledger.eventsAfter(summary.snapshot().cursor))
  summary.apply(event);
console.log("after", summary.snapshot());
