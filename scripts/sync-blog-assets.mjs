import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve, relative, isAbsolute } from "node:path";
import { createHash } from "node:crypto";
import { blogPath } from "./blog-path.mjs";

const exports = JSON.parse(
  await readFile("metadata/blog-exports.json", "utf8"),
);
const root = resolve(".");
const pending = [];
// Validate the whole allowlist before touching the blog. No executable servers,
// credentials, arbitrary directories or ZIPs can be exported by this tool.
for (const entry of exports) {
  if (
    !/^packages\/[a-z0-9-]+\/(?:results\/)?[a-zA-Z0-9.-]+$/.test(entry.source)
  )
    throw new Error("Origen de exportación no permitido");
  if (
    !/^(public\/assets\/interactive\/[a-z0-9-]+\/|assets\/evidence\/[a-z0-9-]+\/results\/)[a-zA-Z0-9.-]+$/.test(
      entry.destination,
    )
  )
    throw new Error("Destino de exportación no permitido");
  const source = resolve(entry.source);
  const subpath = relative(root, source);
  if (subpath.startsWith("..") || isAbsolute(subpath))
    throw new Error("Origen fuera del monorepo");
  const data = await readFile(source);
  pending.push({
    ...entry,
    data,
    sha256: createHash("sha256").update(data).digest("hex"),
  });
}
for (const { destination, data } of pending) {
  const output = blogPath(destination);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, data);
}
const provenance = {
  repository: "https://github.com/luckys/luisrc-blog-examples",
  ref: "main",
  files: pending.map(({ data, ...entry }) => entry),
};
await writeFile(
  blogPath("assets/examples-migration/provenance.json"),
  JSON.stringify(provenance, null, 2) + "\n",
);
console.log(
  `${pending.length} recursos del sitio sincronizados; no se exportan laboratorios ni ZIPs`,
);
