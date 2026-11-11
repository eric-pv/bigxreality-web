import { artifactPath, publicSiteRoot } from '../src/lib/public-url.ts';
// The sitemap must list exactly the built pages that can be indexed (no robots
// noindex), with no search page and no fixture content (docs/PHASE-2-PLAN.md §6).
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { DIST } from "./lib/serve.mjs";

const xml = await readFile(path.join(DIST, "sitemap.xml"), "utf8");
const locations=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
const foreign=locations.filter(url=>!url.startsWith(publicSiteRoot+'/'));
const listed=new Set(locations.map(artifactPath));
const indexable = new Set();
async function* walk(d) {
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!["_astro", "pagefind", "fonts", "media"].includes(e.name)) yield* walk(p); }
    else if (e.name === "index.html") yield p;
  }
}
for await (const f of walk(DIST)) {
  const html = await readFile(f, "utf8");
  if (/http-equiv="refresh"/.test(html)) continue;
  if (!/<meta name="robots" content="noindex"/.test(html)) indexable.add("/" + path.relative(DIST, path.dirname(f)).split(path.sep).join("/") + "/");
}
const missing = [...indexable].filter((u) => !listed.has(u));
const extra = [...listed].filter((u) => !indexable.has(u));
for (const u of missing) console.log(`not in sitemap but indexable: ${u}`);
for (const u of extra) console.log(`in sitemap but noindex or missing: ${u}`);
const bad = [...listed].filter((u) => /\/search\/$/.test(u));
for (const u of bad) console.log(`search page in sitemap: ${u}`);
for(const url of foreign)console.log('sitemap URL outside official site: '+url);
const failed = missing.length + extra.length + bad.length + foreign.length;
console.log(failed ? `FAIL: ${failed}` : `PASS (${listed.size} URLs)`);
process.exit(failed ? 1 : 0);
