import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Shipment } from "../src/entities.ts";
import { returnDeliveryFromShipment } from "../src/return-boundary.ts";
import { evaluateReturn } from "../src/return-policy.ts";
import { eligibilityFromShipment } from "../src/contexts.ts";
import { Money, Payment } from "../src/domain.ts";
import { InMemoryPayments, requestRefund } from "../src/application.ts";

const deliveredAtMs = Date.parse("2026-01-01T00:00:00.000Z");
const windowMs = 30 * 24 * 60 * 60 * 1000;

test("lenguaje: mismo cobro, distinto envío y distinta precondición logística", async () => {
  const cases = JSON.parse(
    await readFile(new URL("../docs/language-examples.json", import.meta.url)),
  );
  assert.equal(cases.length, 2);
  assert.equal(cases[0].paymentState, cases[1].paymentState);
  assert.notEqual(cases[0].shippingPrecondition, cases[1].shippingPrecondition);
  for (const example of cases)
    assert.equal(
      eligibilityFromShipment(example.shipment),
      example.shippingPrecondition,
    );
});

test("entidad: cambia el estado y la referencia, pero conserva la identidad", () => {
  const original = Shipment.start("s1", "o1");
  const delivered = original.markDelivered();
  assert.notStrictEqual(original, delivered);
  assert.ok(original.sameIdentityAs(delivered));
  assert.equal(original.state, "in_transit");
  assert.equal(delivered.state, "delivered");
  assert.strictEqual(delivered.markDelivered(), delivered);
});

test("entidad: mismo pedido no significa mismo envío; rechaza IDs vacíos", () => {
  const first = Shipment.start("s1", "o1");
  const second = Shipment.start("s2", "o1");
  assert.equal(first.orderId, second.orderId);
  assert.ok(!first.sameIdentityAs(second));
  assert.throws(() => Shipment.start("", "o1"), /id/);
  assert.throws(() => Shipment.start("s1", ""), /id/);
});

test("Value Object: equals no sustituye la igualdad por referencia de Map", () => {
  const first = new Money(500, "EUR");
  const second = new Money(500, "EUR");
  assert.ok(first.equals(second));
  assert.equal(new Map([[first, "price"]]).has(second), false);
  assert.equal(first.add(new Money(100, "EUR")).minor, 600);
  assert.equal(first.minor, 500);
});

test("frontera: traduce una entrega canónica a hechos de Returns", () => {
  assert.deepEqual(
    returnDeliveryFromShipment({
      orderId: "o1",
      state: "delivered",
      deliveredAt: "2026-01-01T00:00:00.000Z",
    }),
    { orderId: "o1", deliveredAtMs },
  );
  assert.deepEqual(
    returnDeliveryFromShipment({ orderId: "o1", state: "in_transit" }),
    { orderId: "o1", deliveredAtMs: null },
  );
});

test("frontera: rechaza estado ajeno, fecha normalizada, fecha ausente y objeto inválido", () => {
  for (const value of [
    null,
    [],
    { orderId: "", state: "in_transit" },
    { orderId: "o1", state: "paid" },
    { orderId: "o1", state: "delivered" },
    {
      orderId: "o1",
      state: "delivered",
      deliveredAt: "2026-02-30T00:00:00.000Z",
    },
    {
      orderId: "o1",
      state: "in_transit",
      deliveredAt: "2026-01-01T00:00:00.000Z",
    },
  ])
    assert.throws(() => returnDeliveryFromShipment(value));
});

test("Domain Service: acepta el límite exacto y rechaza un milisegundo después", () => {
  const delivery = { orderId: "o1", deliveredAtMs };
  assert.equal(evaluateReturn(delivery, deliveredAtMs, windowMs), "eligible");
  assert.equal(
    evaluateReturn(delivery, deliveredAtMs + windowMs, windowMs),
    "eligible",
  );
  assert.equal(
    evaluateReturn(delivery, deliveredAtMs + windowMs + 1, windowMs),
    "expired",
  );
});

test("Domain Service: no entrega, reloj anterior y parámetros inválidos son casos distintos", () => {
  assert.equal(
    evaluateReturn(
      { orderId: "o1", deliveredAtMs: null },
      deliveredAtMs,
      windowMs,
    ),
    "awaiting-delivery",
  );
  assert.throws(
    () =>
      evaluateReturn(
        { orderId: "o1", deliveredAtMs },
        deliveredAtMs - 1,
        windowMs,
      ),
    /clock/,
  );
  for (const now of [NaN, Infinity, -1, 0.5])
    assert.throws(
      () => evaluateReturn({ orderId: "o1", deliveredAtMs }, now, windowMs),
      /time/,
    );
  for (const window of [0, -1, 0.5, Infinity])
    assert.throws(
      () =>
        evaluateReturn({ orderId: "o1", deliveredAtMs }, deliveredAtMs, window),
      /window/,
    );
});

test("Domain Service: validar hechos externos no se sustituye por el tipo TypeScript", () => {
  for (const facts of [
    { orderId: "", deliveredAtMs },
    { orderId: "o1", deliveredAtMs: NaN },
    { orderId: "o1", deliveredAtMs: -1 },
  ])
    assert.throws(
      () => evaluateReturn(facts, deliveredAtMs, windowMs),
      /delivery/,
    );
});

test("Domain Event: construir candidato no lo confirma en el repositorio", () => {
  const payment = Payment.capture("p1", new Money(10000, "EUR"));
  const repository = new InMemoryPayments(payment);
  const decision = payment.requestRefund("r1", new Money(7000, "EUR"));
  assert.equal(decision.event.type, "RefundRequested");
  assert.equal(repository.events.length, 0);
  assert.equal(payment.reservedMinor, 0);
});

test("Domain Event: tras fallo previo al commit no se anuncia éxito ni evento confirmado", async () => {
  const repository = new InMemoryPayments(
    Payment.capture("p1", new Money(10000, "EUR")),
  );
  repository.failNextCommit = true;
  await assert.rejects(
    requestRefund(repository, "p1", "r1", new Money(7000, "EUR")),
    /storage/,
  );
  assert.equal(repository.events.length, 0);
  assert.equal((await repository.load("p1")).payment.reservedMinor, 0);
  const event = await requestRefund(
    repository,
    "p1",
    "r1",
    new Money(7000, "EUR"),
  );
  assert.deepEqual(repository.events, [event]);
});
