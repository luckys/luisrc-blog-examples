import { mkdir, writeFile } from "node:fs/promises";
import { run } from "../packages/computing-networks/experiments.mjs";

await mkdir("packages/computing-networks/results", { recursive: true });
await writeFile(
  "packages/computing-networks/results/experiments.json",
  JSON.stringify(await run(), null, 2) + "\n",
);
console.log(
  "Guardadas muestras y observaciones; no sustituirlas para ocultar una regresión",
);
