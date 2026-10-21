import test from "node:test";
import assert from "node:assert/strict";
import { Money, Payment } from "../src/domain.ts";
import { eligibilityFromShipment } from "../src/contexts.ts";
import { InMemoryPayments, requestRefund } from "../src/application.ts";

test("Money: identidad de valor, unidades menores y monedas distintas", () => {
  assert.ok(new Money(500, "EUR").equals(new Money(500, "EUR")));
  assert.ok(!new Money(500, "EUR").equals(new Money(500, "USD")));
  assert.throws(
    () => new Money(500, "EUR").add(new Money(500, "USD")),
    /currency/,
  );
  assert.equal(new Money(500, "EUR").add(new Money(400, "EUR")).minor, 900);
});

test("Money: rechaza negativos, fracciones, no finitos, overflow y moneda desconocida", () => {
  for (const value of [-1, 0.1, NaN, Infinity, 2 ** 53])
    assert.throws(() => new Money(value, "EUR"), /minor/);
  assert.throws(() => new Money(1, "GBP"), /currency/);
  assert.throws(
    () => new Money(Number.MAX_SAFE_INTEGER, "EUR").add(new Money(1, "EUR")),
    /minor/,
  );
});

test("contextos: un pedido cobrado no demuestra entrega física", () => {
  assert.equal(
    eligibilityFromShipment({ orderId: "o1", state: "in_transit" }),
    "awaiting-delivery",
  );
  assert.equal(
    eligibilityFromShipment({ orderId: "o1", state: "delivered" }),
    "eligible",
  );
  assert.throws(
    () => eligibilityFromShipment({ orderId: "o1", state: "paid" }),
    /shipment/,
  );
  assert.throws(
    () => eligibilityFromShipment({ orderId: "", state: "delivered" }),
    /order/,
  );
});

test("agregado: reservar 70 y después 40 sobre 100 se rechaza sin mutar el original", () => {
  const original = Payment.capture("p1", new Money(10000, "EUR"));
  const first = original.requestRefund("r1", new Money(7000, "EUR"));
  assert.equal(original.reservedMinor, 0);
  assert.equal(first.next.reservedMinor, 7000);
  assert.throws(
    () => first.next.requestRefund("r2", new Money(4000, "EUR")),
    /limit/,
  );
  assert.equal(first.next.reservedMinor, 7000);
  assert.equal(
    first.next.requestRefund("r2", new Money(3000, "EUR")).next.reservedMinor,
    10000,
  );
});

test("agregado: IDs, importe cero, moneda y repetición tienen contratos explícitos", () => {
  assert.throws(() => Payment.capture("", new Money(1, "EUR")), /id/);
  assert.throws(() => Payment.capture("p1", new Money(0, "EUR")), /positive/);
  const payment = Payment.capture("p1", new Money(10000, "EUR"));
  assert.throws(
    () => payment.requestRefund("r1", new Money(0, "EUR")),
    /positive/,
  );
  assert.throws(
    () => payment.requestRefund("r1", new Money(1, "USD")),
    /currency/,
  );
  assert.throws(() => payment.requestRefund("", new Money(1, "EUR")), /id/);
  const next = payment.requestRefund("r1", new Money(200, "EUR")).next;
  assert.throws(
    () => next.requestRefund("r1", new Money(200, "EUR")),
    /duplicate/,
  );
});

test("identidad: dos pagos por el mismo importe no son el mismo pago", () => {
  const first = Payment.capture("p1", new Money(100, "EUR"));
  const second = Payment.capture("p2", new Money(100, "EUR"));
  assert.notEqual(first.id, second.id);
  assert.ok(first.captured.equals(second.captured));
});

test("evento: describe una solicitud aceptada, no un reembolso realizado", () => {
  const decision = Payment.capture("p1", new Money(10000, "EUR")).requestRefund(
    "r1",
    new Money(7000, "EUR"),
  );
  assert.deepEqual(decision.event, {
    type: "RefundRequested",
    paymentId: "p1",
    refundId: "r1",
    minor: 7000,
    currency: "EUR",
  });
  assert.ok(Object.isFrozen(decision.event));
});

test("dos copias del agregado por sí solas admiten 70 y 40; falta coordinación", () => {
  const payment = Payment.capture("p1", new Money(10000, "EUR"));
  const a = payment.requestRefund("r1", new Money(7000, "EUR"));
  const b = payment.requestRefund("r2", new Money(4000, "EUR"));
  assert.equal(a.event.minor + b.event.minor, 11000);
  assert.equal(payment.reservedMinor, 0);
});

test("repositorio: dos decisiones con revisión 0, solo una se confirma", async () => {
  const repository = new InMemoryPayments(
    Payment.capture("p1", new Money(10000, "EUR")),
  );
  const outcomes = await Promise.allSettled([
    requestRefund(repository, "p1", "r1", new Money(7000, "EUR")),
    requestRefund(repository, "p1", "r2", new Money(4000, "EUR")),
  ]);
  assert.equal(
    outcomes.filter((item) => item.status === "fulfilled").length,
    1,
  );
  assert.match(
    outcomes.find((item) => item.status === "rejected").reason.message,
    /conflict/,
  );
  assert.equal(repository.events.length, 1);
  assert.equal((await repository.load("p1")).payment.reservedMinor, 7000);
  await assert.rejects(
    requestRefund(repository, "p1", "r2", new Money(4000, "EUR")),
    /limit/,
  );
});

test("repositorio: fallo de confirmación no persiste cambio ni evento", async () => {
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
  assert.equal((await repository.load("p1")).revision, 0);
  await assert.rejects(repository.load("unknown"), /not found/);
});

test("repositorio: devuelve copia de eventos y bloquea revisiones incorrectas", async () => {
  const repository = new InMemoryPayments(
    Payment.capture("p1", new Money(10000, "EUR")),
  );
  await requestRefund(repository, "p1", "r1", new Money(7000, "EUR"));
  const events = repository.events;
  events.length = 0;
  assert.equal(repository.events.length, 1);
  const row = await repository.load("p1");
  const decision = row.payment.requestRefund("r2", new Money(3000, "EUR"));
  await assert.rejects(repository.commit(0, decision), /conflict/);
  assert.equal(repository.events.length, 1);
});
