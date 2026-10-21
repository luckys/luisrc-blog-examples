import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("modelo de documentación: IDs únicos, padres existentes y relaciones resueltas", async () => {
  const model = JSON.parse(
    await readFile(new URL("docs/architecture.json", root)),
  );
  assert.equal(model.status, "proposed-target-not-deployed");
  const nodes = [...model.context, ...model.containers, ...model.components];
  const ids = new Set(nodes.map((node) => node.id));
  assert.equal(ids.size, nodes.length);
  for (const node of model.containers) assert.equal(node.parent, "returns");
  for (const node of model.components) {
    assert.equal(node.parent, "api");
    await access(new URL(node.fixture, root));
  }
  for (const edge of model.relationships) {
    assert.ok(ids.has(edge.from));
    assert.ok(ids.has(edge.to));
    assert.ok(edge.label.length > 10);
  }
});

test("ADR y RFC: propuesta explícita, alternativas y evidencia limitada al fake", async () => {
  const adr = await readFile(
    new URL("docs/adr/0001-refund-storage.md", root),
    "utf8",
  );
  for (const heading of [
    "Estado",
    "Contexto",
    "Restricciones",
    "Alternativas",
    "Decisión propuesta",
    "Consecuencias",
    "Evidencia y pendientes",
    "Cuándo revisar",
  ])
    assert.ok(adr.includes(`## ${heading}`));
  assert.match(adr, /Propuesta educativa/);
  assert.match(adr, /No ejecuta PostgreSQL ni DynamoDB/);
  const rfc = await readFile(
    new URL("docs/rfc/refund-storage-review.md", root),
    "utf8",
  );
  assert.match(rfc, /sin aprobación/);
});
