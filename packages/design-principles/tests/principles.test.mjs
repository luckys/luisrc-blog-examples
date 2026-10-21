import test from "node:test";
import assert from "node:assert/strict";
import {
  parseShipment,
  quoteWith,
  standardRate,
  withSurcharge,
} from "../src/rates.ts";
import { legacyPreview, preview } from "../src/preview.ts";
import { formatQuote } from "../src/presentation.ts";
import { createQuote, readQuote } from "../src/application.ts";
import { memoryQuotes } from "../src/adapters/memory.ts";
import {
  parcelReturnAllowed,
  downloadRefundAllowed,
} from "../src/eligibility.ts";
import { assertRateContract } from "./rate-contract.mjs";
import { lightOnly } from "../src/type-examples.ts";

const shipment = { subtotalMinor: 3000, weightGrams: 1500, zone: "local" };

test("SRP: refactor preserva cotización y texto para la matriz válida", () => {
  for (const zone of ["local", "remote"])
    for (const subtotalMinor of [0, 4999, 5000, 9000]) {
      const input = { ...shipment, zone, subtotalMinor };
      assert.deepEqual(preview(input), legacyPreview(input));
    }
});

test("SRP: cambiar presentación no modifica la cotización", () => {
  const quote = quoteWith(standardRate, parseShipment(shipment));
  assert.equal(formatQuote(quote), "Portes: 5.00 EUR");
  assert.equal(formatQuote(quote, "Shipping"), "Shipping: 5.00 EUR");
  assert.deepEqual(quote, { amountMinor: 500, currency: "EUR" });
});

test("frontera: rechaza valores no soportados sin coerción", () => {
  for (const input of [
    null,
    [],
    {},
    { ...shipment, subtotalMinor: "3000" },
    { ...shipment, weightGrams: 0 },
    { ...shipment, weightGrams: 20001 },
    { ...shipment, weightGrams: 0.5 },
    { ...shipment, zone: "moon" },
    { ...shipment, subtotalMinor: -1 },
    { ...shipment, subtotalMinor: Infinity },
    { ...shipment, subtotalMinor: 1_000_000_001 },
  ])
    assert.throws(() => parseShipment(input));
});

test("OCP: composición añade recargo sin alterar tarifa ni entrada", () => {
  const input = parseShipment(shipment);
  assert.equal(
    quoteWith(withSurcharge(standardRate, 200), input).amountMinor,
    700,
  );
  assert.equal(quoteWith(standardRate, input).amountMinor, 500);
  assert.deepEqual(input, shipment);
  assert.equal(
    quoteWith(withSurcharge(standardRate, 200), {
      ...input,
      subtotalMinor: 5000,
    }).amountMinor,
    200,
  );
});

test("OCP: rechaza recargo y resultado fuera del contrato", () => {
  for (const amount of [-1, 0.5, NaN, Infinity])
    assert.throws(() => withSurcharge(standardRate, amount));
  for (const rate of [
    () => -1,
    () => 0.5,
    () => NaN,
    () => Number.MAX_SAFE_INTEGER,
  ])
    assert.throws(() => quoteWith(rate, shipment));
});

test("LSP: tarifa base y recargo cumplen el mismo contrato observable", () => {
  assertRateContract(standardRate);
  assertRateContract(withSurcharge(standardRate, 200));
});

test("LSP: detecta precondición más fuerte aunque la firma coincida", () => {
  assert.throws(() => assertRateContract(lightOnly), /too heavy/);
});

test("LSP: detecta poscondición rota y mutación de la entrada", () => {
  assert.throws(() => assertRateContract(() => -1));
  assert.throws(() =>
    assertRateContract((input) => {
      input.zone = "remote";
      return 500;
    }),
  );
});

test("ISP: lectura funciona con un objeto que solo tiene find", async () => {
  const quote = Object.freeze({ amountMinor: 500, currency: "EUR" });
  assert.equal(await readQuote({ find: async () => quote }, "q-1"), quote);
  assert.equal(await readQuote({ find: async () => null }, "missing"), null);
});

test("DIP: un writer mínimo basta; el éxito espera su confirmación", async () => {
  let release;
  const confirmation = new Promise((resolve) => {
    release = resolve;
  });
  let saved;
  let completed = false;
  const operation = createQuote(
    {
      save: async (id, quote) => {
        saved = { id, quote };
        await confirmation;
      },
    },
    standardRate,
    "q-1",
    shipment,
  ).then((quote) => {
    completed = true;
    return quote;
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(completed, false);
  assert.equal(saved.id, "q-1");
  release();
  assert.equal((await operation).amountMinor, 500);
});

test("DIP: fallo de escritura no se convierte en éxito ni se reintenta", async () => {
  let calls = 0;
  await assert.rejects(
    createQuote(
      {
        save: async () => {
          calls++;
          throw new Error("disk unavailable");
        },
      },
      standardRate,
      "q-1",
      shipment,
    ),
    /disk unavailable/,
  );
  assert.equal(calls, 1);
});

test("aplicación: entrada o ID inválidos no llegan al writer", async () => {
  let calls = 0;
  const writer = {
    save: async () => {
      calls++;
    },
  };
  await assert.rejects(createQuote(writer, standardRate, "", shipment));
  await assert.rejects(createQuote(writer, standardRate, "q-1", {}));
  assert.equal(calls, 0);
});

test("adapter: memoria confirma antes de retornar y rechaza ID duplicado", async () => {
  const store = memoryQuotes();
  assert.equal(await store.find("q-1"), null);
  const quote = await createQuote(store, standardRate, "q-1", shipment);
  assert.deepEqual(await readQuote(store, "q-1"), quote);
  await assert.rejects(
    createQuote(store, standardRate, "q-1", shipment),
    /duplicate/,
  );
  assert.deepEqual(await store.find("q-1"), quote);
});

test("adapter: no retiene referencia mutable ajena ni expone escritura interna", async () => {
  const store = memoryQuotes();
  const quote = { amountMinor: 500, currency: "EUR" };
  await store.save("q-1", quote);
  quote.amountMinor = 900;
  const loaded = await store.find("q-1");
  assert.equal(loaded.amountMinor, 500);
  assert.throws(() => {
    loaded.amountMinor = 1;
  });
  await assert.rejects(store.save("q-2", { amountMinor: -1, currency: "EUR" }));
});

test("KISS: frontera exacta del envío gratuito y ambas zonas", () => {
  assert.equal(
    standardRate(parseShipment({ ...shipment, subtotalMinor: 4999 })),
    500,
  );
  assert.equal(
    standardRate(parseShipment({ ...shipment, subtotalMinor: 5000 })),
    0,
  );
  assert.equal(
    standardRate(parseShipment({ ...shipment, zone: "remote" })),
    900,
  );
});

test("DRY: políticas parecidas tienen condiciones distintas", () => {
  assert.equal(parcelReturnAllowed(30, true), true);
  assert.equal(parcelReturnAllowed(31, true), false);
  assert.equal(parcelReturnAllowed(0, false), false);
  assert.equal(downloadRefundAllowed(14, false), true);
  assert.equal(downloadRefundAllowed(15, false), false);
  assert.equal(downloadRefundAllowed(0, true), false);
  for (const invalid of [-1, NaN, Infinity, 0.5]) {
    assert.throws(() => parcelReturnAllowed(invalid, true));
    assert.throws(() => downloadRefundAllowed(invalid, false));
  }
});

test("OCP: recargo valida límite superior, suma y resultado base", () => {
  assert.throws(() => withSurcharge(standardRate, 1_000_000_001));
  assert.throws(() => withSurcharge(() => 1_000_000_000, 1)(shipment));
  assert.throws(() => withSurcharge(() => -200, 200)(shipment));
});

test("ISP: un fallo de lectura no se transforma en ausencia", async () => {
  await assert.rejects(
    readQuote(
      {
        find: async () => {
          throw new Error("unavailable");
        },
      },
      "q-1",
    ),
    /unavailable/,
  );
});

test("memoria: dos instancias no comparten datos y la moneda se valida", async () => {
  const first = memoryQuotes();
  const second = memoryQuotes();
  await first.save("q-1", { amountMinor: 500, currency: "EUR" });
  assert.equal(await second.find("q-1"), null);
  await assert.rejects(
    first.save("q-2", { amountMinor: 500, currency: "USD" }),
  );
});

test("DRY: flags inválidos no se convierten a boolean mediante truthiness", () => {
  assert.throws(() => parcelReturnAllowed(1, "true"));
  assert.throws(() => downloadRefundAllowed(1, 0));
});
