import { mkdir, writeFile } from "node:fs/promises";
import { run } from "../packages/data-structures-algorithms/benchmark.mjs";

// Recalcula explícitamente el archivo observado; el benchmark normal solo imprime.
const result = run();
await mkdir("packages/data-structures-algorithms/results", { recursive: true });
await writeFile(
  "packages/data-structures-algorithms/results/benchmark.json",
  JSON.stringify(result, null, 2) + "\n",
);
for (const row of result.cases) console.log(row.n, row.pattern, row.medians_ms);
