import test from "node:test";
import assert from "node:assert/strict";
import { createDeliveryQuote } from "../src/modules/shipping/public.ts";
import { memoryLedger } from "../src/adapters/ledger.ts";
import { fixtureProvider } from "../src/adapters/fixture-provider.ts";
import { createSummary } from "../src/modules/reporting/public.ts";
import { parseShipment, parseRate } from "../src/modules/shipping/public.ts";

const request = { weightGrams: 1500, zone: "local" };

test("representación: límites exactos de peso e importe y ausencia de coerción", () => {
  assert.equal(
    parseShipment({ weightGrams: 20000, zone: "local" }).weightGrams,
    20000,
  );
  for (const weightGrams of [20001, NaN, Infinity, 0.5])
    assert.throws(() => parseShipment({ weightGrams, zone: "local" }));
  const rate = { amountMinor: 500, currency: "EUR", providerReference: "r-1" };
  for (const amountMinor of [NaN, Infinity, 0.5, "500", 1_000_000_001])
    assert.throws(() => parseRate({ ...rate, amountMinor }));
});

test("proyección: eventos inválidos o ID repetido en secuencia nueva no cambian el resumen", () => {
  const quote = {
    id: "q-1",
    amountMinor: 500,
    currency: "EUR",
    providerReference: "r-1",
  };
  const event = { kind: "QuoteRecorded", sequence: 1, quote };
  const summary = createSummary();
  for (const invalid of [
    null,
    { ...event, kind: "Other" },
    { ...event, sequence: 0 },
    { ...event, sequence: 0.5 },
    { ...event, quote: {} },
  ])
    assert.throws(() => summary.apply(invalid));
  assert.deepEqual(summary.snapshot(), { cursor: 0, count: 0, totalMinor: 0 });
  summary.apply(event);
  assert.throws(
    () => summary.apply({ ...event, sequence: 2 }),
    /duplicate quote/,
  );
  assert.deepEqual(summary.snapshot(), {
    cursor: 1,
    count: 1,
    totalMinor: 500,
  });
});

test("ledger: cursores inválidos y estado de otra instancia no se comparten", async () => {
  const ledger = memoryLedger();
  await createDeliveryQuote(fixtureProvider(), ledger, "q-1", request);
  for (const cursor of [-1, 0.5, NaN, 2])
    assert.throws(() => ledger.eventsAfter(cursor));
  assert.deepEqual(ledger.eventsAfter(1), []);
  assert.equal(await memoryLedger().find("q-1"), null);
});

test("puerto: el mismo caso de uso funciona sin HTTP con un proveedor de fixture", async () => {
  const ledger = memoryLedger();
  const quote = await createDeliveryQuote(
    fixtureProvider(),
    ledger,
    "q-1",
    request,
  );
  assert.deepEqual(quote, {
    id: "q-1",
    amountMinor: 500,
    currency: "EUR",
    providerReference: "fixture-local",
  });
  assert.deepEqual(await ledger.find("q-1"), quote);
});

test("frontera: entrada inválida no llama al proveedor ni guarda", async () => {
  let calls = 0;
  const provider = {
    quote: async () => {
      calls++;
      throw new Error("unexpected call");
    },
  };
  for (const input of [
    null,
    [],
    {},
    { ...request, zone: "moon" },
    { ...request, weightGrams: 0 },
    { ...request, weightGrams: "1500" },
  ])
    await assert.rejects(
      createDeliveryQuote(provider, memoryLedger(), "q-1", input),
    );
  await assert.rejects(
    createDeliveryQuote(provider, memoryLedger(), "", request),
  );
  assert.equal(calls, 0);
});

test("puerto: respuesta inválida del proveedor no se confirma", async () => {
  const ledger = memoryLedger();
  const invalidRates = [
    null,
    { amountMinor: -1, currency: "EUR", providerReference: "r-1" },
    { amountMinor: 500, currency: "USD", providerReference: "r-1" },
    { amountMinor: 500, currency: "EUR", providerReference: "" },
  ];
  for (const rate of invalidRates)
    await assert.rejects(
      createDeliveryQuote({ quote: async () => rate }, ledger, "q-1", request),
    );
  assert.equal(await ledger.find("q-1"), null);
  assert.deepEqual(ledger.eventsAfter(0), []);
});

test("confirmación: fallo previo no registra cotización ni evento", async () => {
  const ledger = memoryLedger();
  ledger.failNextRecord();
  await assert.rejects(
    createDeliveryQuote(fixtureProvider(), ledger, "q-1", request),
    /before record/,
  );
  assert.equal(await ledger.find("q-1"), null);
  assert.deepEqual(ledger.eventsAfter(0), []);
});

test("ownership: rechaza duplicados y no expone arrays o objetos mutables", async () => {
  const ledger = memoryLedger();
  const quote = await createDeliveryQuote(
    fixtureProvider(),
    ledger,
    "q-1",
    request,
  );
  await assert.rejects(
    createDeliveryQuote(fixtureProvider(), ledger, "q-1", request),
    /duplicate/,
  );
  assert.throws(() => {
    quote.amountMinor = 1;
  });
  const events = ledger.eventsAfter(0);
  events.length = 0;
  assert.equal(ledger.eventsAfter(0).length, 1);
  assert.throws(() => {
    ledger.eventsAfter(0)[0].quote.amountMinor = 1;
  });
});

test("CQRS: escritura confirmada no implica proyección actualizada", async () => {
  const ledger = memoryLedger();
  const summary = createSummary();
  await createDeliveryQuote(fixtureProvider(), ledger, "q-1", request);
  assert.equal((await ledger.find("q-1")).amountMinor, 500);
  assert.deepEqual(summary.snapshot(), { cursor: 0, count: 0, totalMinor: 0 });
  for (const event of ledger.eventsAfter(summary.snapshot().cursor))
    summary.apply(event);
  assert.deepEqual(summary.snapshot(), {
    cursor: 1,
    count: 1,
    totalMinor: 500,
  });
});

test("CQRS: replay no cuenta dos veces y una proyección nueva se reconstruye", async () => {
  const ledger = memoryLedger();
  await createDeliveryQuote(fixtureProvider(), ledger, "q-1", request);
  await createDeliveryQuote(fixtureProvider(), ledger, "q-2", {
    ...request,
    zone: "remote",
  });
  const summary = createSummary();
  for (const event of ledger.eventsAfter(0))
    assert.equal(summary.apply(event), true);
  for (const event of ledger.eventsAfter(0))
    assert.equal(summary.apply(event), false);
  assert.deepEqual(summary.snapshot(), {
    cursor: 2,
    count: 2,
    totalMinor: 1400,
  });
  const rebuilt = createSummary();
  for (const event of ledger.eventsAfter(0)) rebuilt.apply(event);
  assert.deepEqual(rebuilt.snapshot(), summary.snapshot());
});

test("CQRS: hueco o repetición contradictoria no avanza ni modifica el resumen", async () => {
  const ledger = memoryLedger();
  await createDeliveryQuote(fixtureProvider(), ledger, "q-1", request);
  await createDeliveryQuote(fixtureProvider(), ledger, "q-2", request);
  const [first, second] = ledger.eventsAfter(0);
  const summary = createSummary();
  assert.throws(() => summary.apply(second), /gap/);
  summary.apply(first);
  assert.throws(
    () =>
      summary.apply({ ...first, quote: { ...first.quote, amountMinor: 900 } }),
    /conflicting replay/,
  );
  assert.deepEqual(summary.snapshot(), {
    cursor: 1,
    count: 1,
    totalMinor: 500,
  });
});
