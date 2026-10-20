import { resolve, relative, isAbsolute } from "node:path";

// Only integration checks need the blog. Normal lab tests have no sibling dependency.
export function blogPath(file) {
  if (!process.env.BLOG_ROOT)
    throw new Error(
      "Indica BLOG_ROOT con la ruta del checkout del blog para esta integración",
    );
  const root = resolve(process.env.BLOG_ROOT);
  const result = resolve(root, file);
  const subpath = relative(root, result);
  if (subpath === ".." || subpath.startsWith("../") || isAbsolute(subpath))
    throw new Error("Ruta fuera de BLOG_ROOT");
  return result;
}
