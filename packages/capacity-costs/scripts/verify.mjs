import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { hashes } from "./hashes.mjs";
import { calculate } from "./calculate.mjs";
const read = async (f) => JSON.parse(await readFile(f));
const report = await read("evidence/calculations.json"),
  input = await read("scenarios.json");
assert.equal(
  report.kind,
  "calculated_scenarios_and_fluid_simulation_not_measurements",
);
assert.deepEqual(report.sources, await hashes());
assert.deepEqual(report.input, input);
assert.deepEqual(report.results, calculate(input));
assert.equal(
  await readFile("model.mjs", "utf8"),
  stripTypeScriptTypes(await readFile("src/model.ts", "utf8")),
);
assert.deepEqual(await read("comparison.json"), report);
console.log(
  "Tres escenarios, sensibilidades, compromisos, trazas y hashes recalculados; sin desplegar ni medir un proveedor.",
);
