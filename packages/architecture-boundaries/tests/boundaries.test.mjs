import test from "node:test";
import assert from "node:assert/strict";
import {
  checkImport,
  inspectSource,
  checkTree,
} from "../scripts/check-boundaries.mjs";

test("fronteras: imports y reexports reales cumplen la política", async () => {
  assert.equal(await checkTree(), 6);
});
test("fronteras: otro módulo solo entra por el API público", () => {
  assert.equal(
    checkImport(
      "src/modules/reporting/internal/projection.ts",
      "../../shipping/public.ts",
    ),
    "src/modules/shipping/public.ts",
  );
  assert.throws(
    () =>
      checkImport(
        "src/modules/reporting/internal/projection.ts",
        "../../shipping/domain.ts",
      ),
    /public.ts/,
  );
});
test("capas: dominio no conoce puertos, aplicación, Node o adaptadores", () => {
  for (const specifier of [
    "./ports.ts",
    "./application.ts",
    "node:fs",
    "../../adapters/http-provider.ts",
  ])
    assert.throws(() =>
      checkImport("src/modules/shipping/domain.ts", specifier),
    );
});
test("parser: inspecciona imports de tipos, reexports y rechaza imports dinámicos", () => {
  assert.throws(() =>
    inspectSource(
      "src/modules/shipping/domain.ts",
      "import type { X } from './ports.ts'",
    ),
  );
  assert.throws(() =>
    inspectSource(
      "src/modules/shipping/domain.ts",
      "export { X } from './ports.ts'",
    ),
  );
  assert.throws(() =>
    inspectSource(
      "src/modules/shipping/domain.ts",
      "const x = import('./ports.ts')",
    ),
  );
  assert.throws(() =>
    inspectSource(
      "src/modules/shipping/domain.ts",
      "const x = require('./ports.ts')",
    ),
  );
});
