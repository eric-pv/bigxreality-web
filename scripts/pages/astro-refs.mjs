// Which files under _astro/ an artifact really uses. Shared by package.mjs (copy only these)
// and check.mjs (every reference must exist). Hashed file names make a name match precise.
import { readFile, readdir } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import path from "node:path";

const TEXT = /\.(?:html?|css|m?js|json|xml|txt|ya?ml|webmanifest|svg)$/i;
const NAME = String.raw`[^\s"'\x60()<>,\\/?#]+`;
// "/_astro/x", "_astro/x" (Vite __vite__mapDeps / preload lists), with or without a base prefix.
const PREFIXED = new RegExp(String.raw`_astro\/([^\s"'\x60()<>,\\?#]+)`, "g");
// Inside _astro chunks Vite/Rollup refer to siblings relatively: import"./x.js", from"./x.js",
// import("./x.js"), url(./x.woff2), new URL("x.png",import.meta.url).
const RELATIVE = new RegExp(String.raw`(?:^|[\s"'\x60(=,])\.\/(${NAME})`, "g");
const LITERAL = new RegExp(String.raw`["'\x60](${NAME}\.[a-z0-9]{2,5})["'\x60]`, "gi");

const decode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
const names = (text, patterns) => {
  const out = new Set();
  for (const re of patterns) for (const m of text.matchAll(re)) out.add(decode(m[1].replace(/&amp;/g, "&")));
  return out;
};
/** References a file outside _astro/ makes into _astro/. */
export const rootRefs = (text) => names(text, [PREFIXED]);
/** References an _astro/ chunk or stylesheet makes to its siblings. */
export const chunkRefs = (text) => names(text, [PREFIXED, RELATIVE, LITERAL]);
// Only real module/stylesheet syntax, for check.mjs, which must not guess.
const IMPORTS = new RegExp(String.raw`(?:\bimport\s*\(?|\bfrom)\s*["'\x60]\.\/(${NAME})["'\x60]|url\(\s*["']?\.\/(${NAME})["']?\s*\)`, "g");
/** Explicit references that must resolve (check.mjs). */
export const explicitChunkRefs = (text) => {
  const out = names(text, [PREFIXED]);
  for (const m of text.matchAll(IMPORTS)) out.add(decode(m[1] ?? m[2]));
  return out;
};

async function* files(dir, skip = () => false) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (skip(p)) continue;
    if (e.isDirectory()) yield* files(p, skip); else yield p;
  }
}
async function readText(file) {
  if (file.endsWith(".pf_fragment") || file.endsWith(".pf_meta") || file.endsWith(".pf_index")) {
    // Pagefind keeps result metadata (e.g. images) in gzip fragments.
    try { return gunzipSync(await readFile(file)).toString("utf8"); } catch { return ""; }
  }
  return TEXT.test(file) ? readFile(file, "utf8") : null;
}

/**
 * Walks from every text file outside _astro/ (HTML, public/admin, CSS, JS, JSON, pagefind
 * fragments) and recursively through each reached chunk/stylesheet.
 * Returns { reachable, unreachable } as sets of file names relative to _astro/.
 */
export async function reachableAstro(root) {
  const astroDir = path.join(root, "_astro");
  const available = new Set();
  for await (const f of files(astroDir)) available.add(path.relative(astroDir, f).split(path.sep).join("/"));
  const reachable = new Set(), queue = [];
  const add = (refs) => { for (const r of refs) if (available.has(r) && !reachable.has(r)) { reachable.add(r); queue.push(r); } };
  for await (const f of files(root, (p) => p === astroDir)) {
    const text = await readText(f);
    if (text) add(rootRefs(text));
  }
  while (queue.length) {
    const name = queue.pop();
    if (!/\.(?:m?js|css|svg|json|html)$/i.test(name)) continue;
    add(chunkRefs(await readFile(path.join(astroDir, name), "utf8")));
  }
  return { reachable, unreachable: new Set([...available].filter((n) => !reachable.has(n))) };
}

/** Every _astro reference in an artifact, with the file that makes it. */
export async function astroReferences(root) {
  const astroDir = path.join(root, "_astro"), refs = [];
  for await (const f of files(root, (p) => p === path.join(root, "pagefind"))) {
    if (!/\.(?:html|css|m?js)$/i.test(f)) continue;
    const text = await readFile(f, "utf8"), inAstro = f.startsWith(astroDir + path.sep);
    for (const name of inAstro ? explicitChunkRefs(text) : rootRefs(text)) refs.push({ from: path.relative(root, f), name });
  }
  return refs;
}
