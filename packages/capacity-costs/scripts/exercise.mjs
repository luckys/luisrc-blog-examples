import { readFile, writeFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { calculate } from "./calculate.mjs";
import { hashes } from "./hashes.mjs";
const input = JSON.parse(await readFile("scenarios.json"));
const report = {
  generatedAt: new Date().toISOString(),
  kind: "calculated_scenarios_and_fluid_simulation_not_measurements",
  runtime: process.version,
  input,
  sources: await hashes(),
  results: calculate(input),
  limitations: {
    cloudMeasured: false,
    latencyDistributionMeasured: false,
    hpaEmulated: false,
    invoiceValidated: false,
    monthlyAutoscalingSimulated: false,
  },
};
await writeFile(
  "model.mjs",
  stripTypeScriptTypes(await readFile("src/model.ts", "utf8")),
);
for (const path of ["evidence/calculations.json", "comparison.json"])
  await writeFile(path, JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify(
    report.results.cases.map((c) => ({
      id: c.id,
      ...c.result,
      cpuDouble: c.cpuDouble.subtotal,
      payloadTenfold: c.payloadTenfold.subtotal,
      commitments: c.commitments,
    })),
    null,
    2,
  ),
);
console.log(
  "Rechazos calculados:",
  Object.fromEntries(
    Object.entries(report.results.traces).map(([k, v]) => [
      k,
      v.at(-1).rejected,
    ]),
  ),
);
