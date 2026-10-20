import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { blogPath } from "../../scripts/blog-path.mjs";

test("GitHub: todos los enlaces de los posts apuntan a archivos reales del nuevo repositorio", async () => {
  const index = JSON.parse(await readFile("posts/index.json", "utf8"));
  const blogCatalog = JSON.parse(
    await readFile(blogPath("assets/examples-migration/posts.json"), "utf8"),
  );
  assert.deepEqual(
    index.map(({ locale, slug, labs }) => ({ locale, slug, labs })),
    blogCatalog,
  );
  let count = 0;
  for (const { post } of index) {
    const source = await readFile(blogPath(post), "utf8");
    assert.doesNotMatch(source, /\/assets\/examples\//);
    for (const [, file] of source.matchAll(
      /https:\/\/github\.com\/luckys\/luisrc-blog-examples\/blob\/main\/([^\s)#`]+)/g,
    )) {
      const local = resolve(decodeURIComponent(file));
      assert.ok(!relative(resolve("."), local).startsWith(".."));
      await access(local);
      count++;
    }
  }
  assert.ok(count >= 264);
});

test("exportación: todos los visores y muestras del sitio coinciden con sus fuentes canónicas", async () => {
  const exports = JSON.parse(
    await readFile("metadata/blog-exports.json", "utf8"),
  );
  for (const { source, destination } of exports)
    assert.deepEqual(
      await readFile(blogPath(destination)),
      await readFile(source),
      destination,
    );
});
