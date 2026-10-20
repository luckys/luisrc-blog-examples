import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

const result = JSON.parse(
  execFileSync("python3", ["experiments.py"], {
    cwd: "packages/mathematics-statistics",
    encoding: "utf8",
  }),
);
await mkdir("packages/mathematics-statistics/results", { recursive: true });
await writeFile(
  "packages/mathematics-statistics/results/calculations.json",
  JSON.stringify(result, null, 2) + "\n",
);
console.log(
  `Python ${result.python}; datos ${result.data}; semilla ${result.seed}`,
);
