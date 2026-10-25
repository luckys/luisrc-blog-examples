import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
export const files = [
  "package.json",
  "tsconfig.json",
  "src/model.ts",
  "tests/model.test.mjs",
  "scenarios.json",
  "scripts/calculate.mjs",
  "scripts/exercise.mjs",
  "scripts/verify.mjs",
  "scripts/hashes.mjs",
];
export async function hashes() {
  return Object.fromEntries(
    await Promise.all(
      files.map(async (f) => [
        f,
        createHash("sha256")
          .update(await readFile(f))
          .digest("hex"),
      ]),
    ),
  );
}
