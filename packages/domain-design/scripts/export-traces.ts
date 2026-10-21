import { writeFile } from "node:fs/promises";
import { buildScenarios } from "../src/scenarios.ts";

await writeFile(
  new URL("../scenarios.json", import.meta.url),
  JSON.stringify(await buildScenarios(), null, 2) + "\n",
);
