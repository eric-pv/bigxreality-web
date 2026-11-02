#!/usr/bin/env node
// Checks dist-pages/ the way GitHub Pages serves it (under /bigxreality-web/):
// every internal link and asset resolves, public canonical URLs use the official mount, robots allows crawling,
// the sitemap is present, no TEST FIXTURE content is published, and search works.
import { readFile, readdir, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { chromium } from "playwright-core";
import { CHROMIUM } from "../lib/serve.mjs";
import { publicSiteRoot, publicBasePath } from "../../src/lib/public-url.ts";
import { astroReferences } from "./astro-refs.mjs";

const base = (process.argv[2] ?? publicBasePath).replace(/\/?$/, "/");
const ROOT = path.resolve(import.meta.dirname, "../../dist-pages");
let failed = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : `  — ${detail}`}`);
};
const resolve = async (urlPath) => {
  let p = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  if (!p.startsWith(base)) return null;
  p = p.slice(base.length - 1);
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(ROOT, p);
  try { return file.startsWith(ROOT) && (await stat(file)).isFile() ? file : null; } catch { return null; }
};

// static checks
const pages = [];
async function walk(d) {
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!["_astro", "pagefind", "fonts", "media"].includes(e.name)) await walk(p); }
    else if (e.name.endsWith(".html")) pages.push(p);
  }
}
await walk(ROOT);
const broken = new Set();
let indexable = 0, fixtures = 0;
for (const f of pages) {
  const html = await readFile(f, "utf8");
  if (!/<meta name="robots" content="noindex"/.test(html)) indexable++;
  if ((html.includes("TEST FIXTURE") || html.includes("BXR CMS ISOLATED QA"))) fixtures++;
  for (const m of html.matchAll(/\b(?:href|src|action)="(\/[^"]*)"|\bsrcset="([^"]*)"/g)) {
    const urls = m[1] ? [m[1]] : m[2].split(",").map((s) => s.trim().split(/\s+/)[0]);
    for (const u of urls) if (u.startsWith("/") && !(await resolve(u))) broken.add(u);
  }
}
check(`${pages.length} HTML pages, public site has indexable content`, indexable>0, `${indexable} indexable`);
const info=JSON.parse(await readFile(path.join(ROOT,'build-info.json'),'utf8'));
check('artifact provenance uses main CMS and Git source',info.cmsBranch==='main'&&info.source==='git-markdown'&&/^[0-9a-f]{40}$/.test(info.commit)&&info.site===publicSiteRoot);
for(const lang of ['tw','en','jp']) {
 const home=await readFile(path.join(ROOT,lang,'index.html'),'utf8');
 check(`${lang} home canonical and indexing`,home.includes(`rel="canonical" href="${publicSiteRoot}/${lang}/"`)&&!home.includes('name="robots" content="noindex"'));
}
const badSeoUrls=[];
for(const f of pages){const html=await readFile(f,'utf8');if(!/\/(tw|en|jp)\//.test(f.replaceAll(path.sep,'/')))continue;
 for(const match of html.matchAll(/<(?:link[^>]*rel="(?:canonical|alternate)"[^>]*href|meta[^>]*property="og:url"[^>]*content)="([^"]+)"/g))if(!match[1].startsWith(publicSiteRoot+'/'))badSeoUrls.push(match[1]);
}
check('public SEO URLs stay on the Pages site',badSeoUrls.length===0,badSeoUrls.slice(0,5).join(' '));
check("no TEST FIXTURE content", fixtures === 0, `${fixtures} page(s)`);
check("every internal link and asset resolves under the base path", broken.size===0,[...broken].slice(0,10).join(" "));
// package.mjs copies only reachable _astro files: every /_astro/ reference in HTML, JS (static and
// dynamic imports, Vite preload/__vite__mapDeps lists) and CSS url() must exist in the artifact.
const astroRefs=await astroReferences(ROOT),astroMissing=[];
for(const r of astroRefs){try{if(!(await stat(path.join(ROOT,'_astro',r.name))).isFile())astroMissing.push(r);}catch{astroMissing.push(r);}}
check(`all ${new Set(astroRefs.map(r=>r.name)).size} referenced _astro files are present`,astroRefs.length>0&&astroMissing.length===0,astroMissing.slice(0,10).map(r=>`${r.from} → _astro/${r.name}`).join(" "));
const robots=await readFile(path.join(ROOT,'robots.txt'),'utf8');
check('robots permits the official website',!/^Disallow:\s*\/\s*$/m.test(robots)&&robots.includes(`Sitemap: ${publicSiteRoot}/sitemap.xml`));
const sitemap=await readFile(path.join(ROOT,'sitemap.xml'),'utf8'),locations=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
check('sitemap lists official URLs',locations.length>0&&locations.every(url=>url.startsWith(publicSiteRoot+'/')));
check('CMS stays noindex',/name="robots" content="noindex"/.test(await readFile(path.join(ROOT,'admin/index.html'),'utf8')));
check("all three languages built", ["en", "tw", "jp"].every((l) => pages.some((p) => p.includes(`${path.sep}${l}${path.sep}products${path.sep}`))));

// browser checks
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".woff2": "font/woff2", ".wasm": "application/wasm", ".txt": "text/plain", ".xml": "application/xml" };
const server = createServer(async (req, res) => {
  const file = await resolve(req.url ?? "/");
  if (!file) return res.writeHead(404).end("404");
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" }).end(await readFile(file));
});
await new Promise((r) => server.listen(4340, "127.0.0.1", r));
const origin = "http://127.0.0.1:4340";
const browser = await chromium.launch({ executablePath: CHROMIUM });
try {
  const page = await browser.newPage();
  const missing = [];
  page.on("response", (r) => { if (r.status() >= 400) missing.push(r.url()); });
  await page.goto(`${origin}${base}`, { waitUntil: "networkidle" });
  check("root opens the site", /\/(tw\/|tw\/products\/)$/.test(page.url()), page.url());
  for (const p of ["tw/products/", "tw/products/sut/", "tw/solutions/police/", "tw/news/", "jp/cases/", "en/solutions/"]) {
    await page.goto(`${origin}${base}${p}`, { waitUntil: "networkidle" });
  }
  check("no 404 while browsing (pages, images, fonts, scripts)", missing.length === 0, missing.slice(0, 5).join(" "));
  await page.goto(`${origin}${base}tw/products/`, { waitUntil: "networkidle" });
  check("hero image loads (products overview)", await page.locator(".page-hero img").evaluate((i) => i.complete && i.naturalWidth > 0).catch(() => false));
  await page.goto(`${origin}${base}tw/products/sut/`, { waitUntil: "networkidle" });
  check("CIS fonts load", await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].some((f) => f.status === "loaded"); }));
  await page.click('.langs a[hreflang="en"]');
  check("language switch stays inside the official site", page.url().startsWith(`${origin}${base}en/`), page.url());
  await page.goto(`${origin}${base}tw/search/?q=${encodeURIComponent("警勤模擬")}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("[data-status]")?.textContent !== "", null, { timeout: 10000 }).catch(() => {});
  const hrefs = await page.$$eval(".result a", (as) => as.map((a) => a.getAttribute("href")));
  check("search works and links stay inside the official site", hrefs.includes(`${base}tw/solutions/police/`), JSON.stringify(hrefs));
} finally {
  await browser.close();
  server.close();
}
console.log(failed ? `FAIL: ${failed}` : "PASS");
process.exit(failed ? 1 : 0);
