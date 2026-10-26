import {editorialPath} from '../../scripts/editorial-path.mjs'
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import YAML from "yaml";
import { blogPath } from "../../scripts/blog-path.mjs";

const manifest = JSON.parse(
  await readFile(editorialPath("domain-design-series.json")),
);
const compact = (text) =>
  text
    .replace(/\s/g, "")
    .replaceAll('"', "'")
    .replaceAll(";", "")
    .replace(/,(?=[)}\]])/g, "");

test("dominio: diez drafts españoles con un concepto dominante y orden de prerrequisitos", async () => {
  assert.deepEqual(
    manifest.articles.map((post) => post.id),
    [
      "P044",
      "DOMAIN-CONTEXTS",
      "DOMAIN-ENTITIES",
      "DOMAIN-VALUES",
      "DOMAIN-AGGREGATES",
      "DOMAIN-SERVICES",
      "DOMAIN-REPOSITORIES",
      "DOMAIN-EVENTS",
      "P047",
      "ARCH-ADR",
    ],
  );
  const ids = new Set();
  for (const file of await readdir(blogPath("src/content/posts/es"))) {
    const source = await readFile(
      blogPath(`src/content/posts/es/${file}`),
      "utf8",
    );
    ids.add(YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1]).id);
  }
  const seriesIds = new Set(manifest.articles.map((entry) => entry.id));
  const seen = new Set();
  let lastDate = -Infinity;
  for (const entry of manifest.articles) {
    const source = await readFile(
      blogPath(`src/content/posts/es/${entry.slug}.md`),
      "utf8",
    );
    const meta = YAML.parse(source.match(/^---\n([\s\S]*?)\n---/)[1]);
    for (const key of ["id", "title", "slug", "prerequisites"])
      assert.deepEqual(meta[key], entry[key]);
    assert.equal(meta.locale, "es");
    assert.equal(meta.draft, true);
    assert.equal(meta.status, "draft");
    assert.equal(meta.author, "Luis Ramírez Calle");
    assert.equal(meta.series, manifest.name);
    for (const prerequisite of meta.prerequisites) {
      assert.ok(ids.has(prerequisite));
      if (seriesIds.has(prerequisite)) assert.ok(seen.has(prerequisite));
    }
    assert.ok(new Date(meta.published).valueOf() > lastDate);
    lastDate = new Date(meta.published).valueOf();
    seen.add(entry.id);
    assert.doesNotMatch(source, /—/);
    for (const section of ["## Garantías", "## Ejercicio", "## Referencias"])
      assert.ok(source.includes(section));
  }
});

test("dominio: quince extractos ejecutables, dos JSON y dos extractos ADR coinciden", async () => {
  const implementation = compact(
    (
      await Promise.all(
        [
          "src/contexts.ts",
          "src/domain.ts",
          "src/application.ts",
          "src/entities.ts",
          "src/return-policy.ts",
          "src/return-boundary.ts",
          "tests/domain.test.mjs",
          "tests/concepts.test.mjs",
        ].map((file) => readFile(`packages/domain-design/${file}`, "utf8")),
      )
    ).join("\n"),
  );
  const architecture = compact(
    (await readFile("packages/domain-design/docs/architecture.json", "utf8")) +
      (await readFile(
        "packages/domain-design/docs/language-examples.json",
        "utf8",
      )),
  );
  const adr = await readFile(
    "packages/domain-design/docs/adr/0001-refund-storage.md",
    "utf8",
  );
  const counts = { executable: 0, json: 0, markdown: 0 };
  for (const entry of manifest.articles) {
    const source = await readFile(
      blogPath(`src/content/posts/es/${entry.slug}.md`),
      "utf8",
    );
    for (const [, language, snippet] of source.matchAll(
      /```(typescript|javascript|json|markdown)\n([\s\S]*?)\n```/g,
    )) {
      if (language === "markdown") {
        assert.ok(adr.includes(snippet), entry.id);
        counts.markdown++;
      } else if (language === "json") {
        assert.ok(architecture.includes(compact(snippet)), entry.id);
        counts.json++;
      } else {
        assert.ok(
          implementation.includes(compact(snippet)),
          `${entry.id}: extracto distinto de la fuente probada`,
        );
        counts.executable++;
      }
    }
  }
  assert.deepEqual(counts, { executable: 15, json: 2, markdown: 2 });
});

test("dominio: doce SVG con dimensiones reales y visor de trazas accesible en el artículo", async () => {
  let images = 0;
  for (const entry of manifest.articles) {
    const source = await readFile(
      blogPath(`src/content/posts/es/${entry.slug}.md`),
      "utf8",
    );
    for (const [, path, alt, width, height] of source.matchAll(
      /<img src="([^"]+)" alt="([^"]+)" width="(\d+)" height="(\d+)"/g,
    )) {
      assert.ok(alt.length > 80);
      const svg = await readFile(blogPath(`public${path}`), "utf8");
      const [, , w, h] = svg
        .match(/viewBox="([^"]+)"/)[1]
        .split(/\s+/)
        .map(Number);
      assert.equal(+width, Math.ceil(w));
      assert.equal(+height, Math.ceil(h));
      const name = path.split("/").at(-1).replace(".svg", ".d2");
      await readFile(blogPath(`assets/domain-design/${name}`));
      images++;
    }
  }
  assert.equal(images, 12);
  const post = await readFile(
    blogPath(
      "src/content/posts/es/repositorios-eventos-dominio-concurrencia.md",
    ),
    "utf8",
  );
  assert.match(post, /<iframe[^>]+title="[^"]+"/);
  assert.ok(post.includes("/assets/interactive/domain-design/explorer.html"));
});

test("división: las cinco URLs originales se conservan y las explicaciones ya no se agrupan", async () => {
  const sources = new Map(
    await Promise.all(
      manifest.articles.map(async (entry) => [
        entry.id,
        await readFile(
          blogPath(`src/content/posts/es/${entry.slug}.md`),
          "utf8",
        ),
      ]),
    ),
  );
  assert.equal(
    manifest.articles.find((entry) => entry.id === "P044").slug,
    "ddd-lenguaje-bounded-contexts",
  );
  assert.equal(
    manifest.articles.find((entry) => entry.id === "DOMAIN-AGGREGATES").slug,
    "value-objects-agregados-invariantes",
  );
  assert.equal(
    manifest.articles.find((entry) => entry.id === "DOMAIN-REPOSITORIES").slug,
    "repositorios-eventos-dominio-concurrencia",
  );
  assert.doesNotMatch(sources.get("P044"), /## Un bounded context/);
  assert.doesNotMatch(sources.get("DOMAIN-AGGREGATES"), /export class Money/);
  assert.doesNotMatch(sources.get("DOMAIN-REPOSITORIES"), /## Un domain event/);
  assert.match(sources.get("DOMAIN-VALUES"), /export class Money/);
  assert.match(sources.get("DOMAIN-ENTITIES"), /export class Shipment/);
  assert.match(
    sources.get("DOMAIN-SERVICES"),
    /export function evaluateReturn/,
  );
  assert.match(sources.get("DOMAIN-EVENTS"), /event sourcing/);
});
