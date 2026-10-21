import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { buildScenarios } from "../src/scenarios.ts";

test("trazas: el visor reproduce estados calculados por el repositorio real del fixture", async () => {
  const generated = await buildScenarios();
  assert.deepEqual(
    JSON.parse(await readFile(new URL("../scenarios.json", import.meta.url))),
    generated,
  );
  const [over, within] = generated.scenarios;
  assert.deepEqual(
    over.frames.map((frame) => frame.revision),
    [0, 1, 1, 1],
  );
  assert.deepEqual(
    within.frames.map((frame) => frame.revision),
    [0, 1, 1, 2],
  );
  assert.equal(over.frames.at(-1).reservedMinor, 7000);
  assert.equal(within.frames.at(-1).reservedMinor, 5000);
  assert.equal(over.frames.at(-1).events, 1);
  assert.equal(within.frames.at(-1).events, 2);
});
