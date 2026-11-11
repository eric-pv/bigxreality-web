import {publicUrl,artifactPath,publicSiteRoot} from '../src/lib/public-url.ts';
// Scans every HTML file in dist/ for internal links and assets, and lists targets
// that do not exist. Pages planned for later phases are reported separately.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { DIST, resolveDist } from "./lib/serve.mjs";

const PLANNED = /^\/(en|tw|jp)\/(|solutions\/.*|technologies\/|insights\/|news\/|cases\/|company\/|contact\/|privacy\/|search\/)$/;

async function* htmlFiles(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* htmlFiles(p);
    else if (e.name.endsWith(".html")) yield p;
  }
}

const missing = new Map(); // target -> Set(source pages)
let checked = 0;
for await (const file of htmlFiles(DIST)) {
  const html = await readFile(file, "utf8");
  const page = "/" + path.relative(DIST, file).replace(/index\.html$/, "");
  for (const m of html.matchAll(/\s(?:href|src|srcset)="([^"]+)"/g)) {
    if (m[1].startsWith("data:")) continue; // inlined assets
    for (const raw of m[1].split(",").map((s) => s.trim().split(/\s+/)[0])) {
      let url;
      try { url = new URL(raw, publicUrl(page)); } catch { continue; }
      if (url.origin !== new URL(publicSiteRoot).origin || raw.startsWith("#")) continue;
      checked++;
      if (!(await resolveDist(artifactPath(url)))) {
        if (!missing.has(url.pathname)) missing.set(url.pathname, new Set());
        missing.get(url.pathname).add(page);
      }
    }
  }
}

const planned = [...missing].filter(([t]) => PLANNED.test(t));
const broken = [...missing].filter(([t]) => !PLANNED.test(t));
console.log(`checked ${checked} internal links/assets`);
console.log(`\nnot built yet (planned pages, ${planned.length}):`);
for (const [t, from] of planned.sort()) console.log(`  ${t}  ← ${from.size} page(s)`);
console.log(`\nbroken (${broken.length}):`);
for (const [t, from] of broken) console.log(`  ${t}  ← ${[...from].join(", ")}`);
process.exit(broken.length ? 1 : 0);
