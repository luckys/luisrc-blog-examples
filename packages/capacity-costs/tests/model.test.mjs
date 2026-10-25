import test from "node:test";
import assert from "node:assert/strict";
import {
  meanInFlight,
  replicasFor,
  bottleneck,
  simulate,
  estimate,
  commitment,
  allocate,
} from "../src/model.ts";
const shape = { cpuMs: 10, cpuCores: 1, target: 0.6, spare: 1, min: 2, max: 8 };
const rates = {
  replicaHour: "60000",
  fixedMonth: "30000000",
  requestMillion: "1000000",
  storageGiBMonth: "100000",
  egressGiB: "90000",
};
const profile = [{ hours: 24, rps: 8 }];
const pricing = {
  days: 30,
  bytesPerRequest: 10000,
  storageGiB: 50,
  successBps: 9990,
};
test("Little: medias compatibles, unidades y validación", () => {
  assert.equal(meanInFlight(100, 200), 20);
  assert.equal(meanInFlight(100, 800), 80);
  for (const v of [-1, NaN, Infinity])
    assert.throws(() => meanInFlight(v, 200));
});
test("CPU y réplica de margen: el cálculo no certifica HA ni latencia", () => {
  assert.deepEqual(replicasFor(300, shape), {
    required: 6,
    provisioned: 6,
    feasible: true,
    cpuUtilization: 0.5,
    afterLossUtilization: 0.6,
  });
  assert.equal(replicasFor(600, shape).feasible, false);
  assert.equal(replicasFor(0, shape).provisioned, 2);
  assert.throws(() => replicasFor(30, { ...shape, target: 0 }));
});
test("límite global: añadir API no aumenta la capacidad de la dependencia", () => {
  assert.deepEqual(
    bottleneck(6, { ...shape, dbSlots: 4, dbMs: 20, visits: 1 }),
    { appRps: 600, databaseRps: 200, ceilingRps: 200, limiting: "database" },
  );
  assert.equal(
    bottleneck(2, { ...shape, dbSlots: 4, dbMs: 5, visits: 1 }).limiting,
    "app",
  );
});
const policy = {
  ...shape,
  interval: 15,
  startup: 30,
  downHold: 60,
  queueLimit: 1000,
  dbRps: 800,
};
test("traza fluida: conservación, reacción tardía, límite y recuperación", () => {
  const rows = simulate(policy);
  assert.equal(rows.length, 60);
  assert.equal(rows[12].time, 60);
  assert.equal(rows[12].ready, 2);
  assert.equal(rows[12].desired, 6);
  assert.equal(rows[18].ready, 6);
  for (const r of rows) {
    assert.equal(r.arrived, r.served + r.rejected + r.queue);
    assert.ok(r.queue <= 1000 && r.ready >= 2 && r.ready <= 8);
  }
  assert.ok(rows.at(-1).rejected > 0);
  assert.equal(rows.at(-1).queue, 0);
  assert.equal(rows.at(-1).ready, 2);
  assert.equal(simulate({ ...policy, min: 6 }).at(-1).rejected, 0);
  assert.ok(
    simulate({ ...policy, dbRps: 200 }).at(-1).rejected > rows.at(-1).rejected,
  );
  assert.throws(() => simulate({ ...policy, startup: -1 }));
});
test("dinero exacto, total de líneas, denominadores y redondeo explícito", () => {
  const r = estimate(profile, shape, rates, pricing);
  assert.equal(r.requests, 20736000);
  assert.equal(r.replicaHours, 1440);
  assert.equal(r.lines.compute, "86400000");
  assert.equal(r.lines.requests, "20736000");
  assert.equal(
    BigInt(r.subtotal),
    Object.values(r.lines).reduce((a, v) => a + BigInt(v), 0n),
  );
  assert.equal(r.goodRequests, Math.floor(r.requests * 0.999));
  assert.ok(BigInt(r.perMillionGood) > BigInt(r.perMillionOffered));
  assert.equal(
    estimate([{ hours: 24, rps: 0 }], shape, rates, pricing).perMillionGood,
    null,
  );
  assert.throws(() => estimate([{ hours: 23, rps: 8 }], shape, rates, pricing));
  assert.throws(() =>
    estimate(profile, shape, { ...rates, replicaHour: "0.06" }, pricing),
  );
});
test("compromiso: pagar unidades ociosas puede superar on-demand", () => {
  assert.equal(
    commitment(profile, shape, 30, 2, "60000", "42000").cost,
    "60480000",
  );
  assert.equal(
    commitment(profile, shape, 30, 6, "60000", "42000").cost,
    "181440000",
  );
  assert.equal(
    commitment(profile, shape, 30, 6, "60000", "42000").unusedUnitHours,
    2880,
  );
});
test("asignación reconcilia hasta la última microunidad y conserva resto", () => {
  assert.deepEqual(allocate("100", [2, 1]), ["67", "33"]);
  assert.equal(
    allocate("159516714", [5, 3, 2]).reduce((a, v) => a + BigInt(v), 0n),
    159516714n,
  );
  assert.throws(() => allocate("100", [0, 0]));
});
