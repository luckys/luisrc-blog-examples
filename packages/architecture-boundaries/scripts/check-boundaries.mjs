import { readdir, readFile } from "node:fs/promises";
import { posix } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

export function checkImport(from, specifier) {
  if (!specifier.startsWith("."))
    throw new Error("module cannot import infrastructure or external packages");
  const target = posix.normalize(posix.join(posix.dirname(from), specifier));
  const owner = from.match(/^src\/modules\/([^/]+)\//)?.[1];
  const targetOwner = target.match(/^src\/modules\/([^/]+)\//)?.[1];
  if (!owner || !targetOwner) throw new Error("dependency outside modules");
  if (
    owner !== targetOwner &&
    target !== `src/modules/${targetOwner}/public.ts`
  )
    throw new Error("cross-module import must use public.ts");
  const rules = {
    "src/modules/shipping/domain.ts": [],
    "src/modules/shipping/ports.ts": ["src/modules/shipping/domain.ts"],
    "src/modules/shipping/application.ts": [
      "src/modules/shipping/domain.ts",
      "src/modules/shipping/ports.ts",
    ],
    "src/modules/shipping/public.ts": [
      "src/modules/shipping/domain.ts",
      "src/modules/shipping/ports.ts",
      "src/modules/shipping/application.ts",
    ],
  };
  if (rules[from] && !rules[from].includes(target))
    throw new Error("layer direction violated");
  return target;
}

export function inspectSource(file, source) {
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const imports = [];
  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier
    ) {
      if (!ts.isStringLiteral(node.moduleSpecifier))
        throw new Error("nonliteral import");
      imports.push(checkImport(file, node.moduleSpecifier.text));
    }
    if (
      ts.isImportTypeNode(node) ||
      (ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          node.expression.getText(tree) === "require"))
    )
      throw new Error("dynamic imports are outside this module policy");
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return imports;
}

export async function checkTree(root = "src/modules") {
  let files = 0;
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = `${directory}/${entry.name}`;
      if (entry.isDirectory()) await walk(file);
      else if (file.endsWith(".ts")) {
        inspectSource(file, await readFile(file, "utf8"));
        files++;
      }
    }
  }
  await walk(root);
  return files;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  console.log(`${await checkTree()} module files checked`);
