import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { httpRateProvider } from "../src/adapters/http-provider.ts";
import { createDeliveryQuote } from "../src/modules/shipping/public.ts";
import { memoryLedger } from "../src/adapters/ledger.ts";

async function server(t, handler) {
  const instance = createServer(handler);
  instance.listen(0, "127.0.0.1");
  await once(instance, "listening");
  t.after(async () => {
    instance.closeAllConnections();
    await new Promise((resolve, reject) =>
      instance.close((error) => (error ? reject(error) : resolve())),
    );
  });
  return `http://127.0.0.1:${instance.address().port}`;
}

test("HTTP real: traduce contrato remoto sin cambiar caso de uso", async (t) => {
  let observed;
  const origin = await server(t, async (req, res) => {
    assert.equal(req.method, "POST");
    assert.equal(req.url, "/rate");
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    observed = JSON.parse(Buffer.concat(chunks).toString());
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        price_minor: 500,
        currency_code: "EUR",
        quote_ref: "carrier-1",
      }),
    );
  });
  const ledger = memoryLedger();
  const quote = await createDeliveryQuote(
    httpRateProvider(origin),
    ledger,
    "q-1",
    { weightGrams: 1500, zone: "local" },
  );
  assert.deepEqual(observed, { grams: 1500, area: "local" });
  assert.equal(quote.amountMinor, 500);
  assert.equal(quote.providerReference, "carrier-1");
  assert.deepEqual(await ledger.find("q-1"), quote);
});

test("HTTP: error remoto no se guarda ni se reintenta", async (t) => {
  let calls = 0;
  const origin = await server(t, (req, res) => {
    calls++;
    res.writeHead(503);
    res.end("unavailable");
  });
  const ledger = memoryLedger();
  await assert.rejects(
    createDeliveryQuote(httpRateProvider(origin), ledger, "q-1", {
      weightGrams: 1500,
      zone: "local",
    }),
    /503/,
  );
  assert.equal(calls, 1);
  assert.equal(await ledger.find("q-1"), null);
});

test("HTTP: JSON inválido, moneda ajena y cuerpo excesivo se rechazan", async (t) => {
  for (const body of [
    "not-json",
    JSON.stringify({
      price_minor: 500,
      currency_code: "USD",
      quote_ref: "r-1",
    }),
    " ".repeat(4096),
  ]) {
    const origin = await server(t, (req, res) => {
      res.setHeader("content-type", "application/json");
      res.end(body);
    });
    await assert.rejects(
      httpRateProvider(origin).quote({ weightGrams: 1500, zone: "local" }),
    );
  }
});

test("HTTP: rechaza redirects sin contactar el destino", async (t) => {
  let redirected = 0;
  const destination = await server(t, (req, res) => {
    redirected++;
    res.end("{}");
  });
  const origin = await server(t, (req, res) => {
    res.writeHead(302, { location: destination + "/target" });
    res.end();
  });
  await assert.rejects(
    httpRateProvider(origin).quote({ weightGrams: 1500, zone: "local" }),
    /302/,
  );
  assert.equal(redirected, 0);
});

test("HTTP: timeout cancela la espera y no confirma", async (t) => {
  const origin = await server(t, () => {});
  const ledger = memoryLedger();
  await assert.rejects(
    createDeliveryQuote(httpRateProvider(origin, 25), ledger, "q-1", {
      weightGrams: 1500,
      zone: "local",
    }),
  );
  assert.equal(await ledger.find("q-1"), null);
});

test("harness: no permite configurar proveedores fuera de loopback IPv4 HTTP", () => {
  for (const origin of [
    "https://example.com",
    "http://localhost",
    "http://[::1]",
    "http://127.0.0.1/path",
    "http://user:pass@127.0.0.1",
  ])
    assert.throws(() => httpRateProvider(origin));
});

test("HTTP: el media type debe ser JSON, no texto o application/jsonp", async (t) => {
  for (const contentType of ["text/plain", "application/jsonp"]) {
    const origin = await server(t, (req, res) => {
      res.setHeader("content-type", contentType);
      res.end(
        JSON.stringify({
          price_minor: 500,
          currency_code: "EUR",
          quote_ref: "r-1",
        }),
      );
    });
    await assert.rejects(
      httpRateProvider(origin).quote({ weightGrams: 1500, zone: "local" }),
      /content type/,
    );
  }
});
