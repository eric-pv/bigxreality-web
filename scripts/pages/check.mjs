#!/usr/bin/env node
// Checks dist-pages/ the way GitHub Pages serves it (under the base path of src/data/site.json's url:
// /bigxreality-web/ for the project site today, / for a custom domain):
// every internal link and asset resolves, public canonical URLs use the official mount, robots allows crawling,
// the sitemap is present, no TEST FIXTURE content is published, and search works.
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import { CHROMIUM, resolveUnder, startPages } from "../lib/serve.mjs";
import { publicSiteRoot, publicBasePath } from "../../src/lib/public-url.ts";
import { astroReferences } from "./astro-refs.mjs";

const base = (process.argv[2] ?? publicBasePath).replace(/\/?$/, "/");
const ROOT = path.resolve(import.meta.dirname, "../../dist-pages");
let failed = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : `  — ${detail}`}`);
};
const resolve = (urlPath) => resolveUnder(ROOT, base, urlPath);

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
const notFound=await readFile(path.join(ROOT,'404.html'),'utf8').catch(()=>'');
check('404.html is the built noindex page with TW/EN/JP return links',notFound.includes('data-not-found')&&/name="robots" content="noindex"/.test(notFound)&&['tw','en','jp'].every(l=>['',"products/","solutions/","contact/","search/"].every(r=>notFound.includes(`href="${base}${l}/${r}"`))));
check('404 is not in the sitemap',!locations.some(u=>/\/404(?:\.html|\/)?$/.test(u)));
const host=new URL(publicSiteRoot).hostname,githubIo=/\.github\.io$/i.test(host);
const cname=await readFile(path.join(ROOT,'CNAME'),'utf8').catch(()=>null);
check(githubIo?'no CNAME for a github.io address':`CNAME is ${host}`,githubIo?cname===null:cname?.trim()===host,String(cname));
check('base path is / or /name/ and agrees with the site URL',base===publicBasePath&&(base==='/'||githubIo));
const ignored=[];for(const f of ['_redirects','_headers'])if(await stat(path.join(ROOT,f)).then(()=>true,()=>false))ignored.push(f);
check('no _redirects/_headers (GitHub Pages ignores them)',ignored.length===0,ignored.join(' '));
check('CMS stays noindex',/name="robots" content="noindex"/.test(await readFile(path.join(ROOT,'admin/index.html'),'utf8')));
check("all three languages built", ["en", "tw", "jp"].every((l) => pages.some((p) => p.includes(`${path.sep}${l}${path.sep}products${path.sep}`))));

// browser checks
const server = await startPages({ root: ROOT, base, port: 4340 });
const origin = server.origin;
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
  // GitHub Pages answers every missing path with <base>404.html; the page picks the language.
  const expectLang = { "tw/no-such-page/": "tw", "en/no-such-page/": "en", "jp/products/no-such-product/": "jp", "no-such-page/": "tw" };
  const HTML_LANG = { tw: "zh-Hant-TW", en: "en", jp: "ja-JP" };
  for (const [p, lang] of Object.entries(expectLang)) {
    const res = await page.goto(`${origin}${base}${p}`, { waitUntil: "networkidle" });
    const state = await page.evaluate(() => ({ lang: document.documentElement.lang, visible: [...document.querySelectorAll("[data-nf-lang]")].filter((b) => !b.hidden).map((b) => b.dataset.nfLang), home: document.querySelector("[data-nf-lang]:not([hidden]) [data-nf-link=home]")?.getAttribute("href") }));
    check(`404 for /${p} shows ${lang.toUpperCase()}`, res.status() === 404 && state.lang === HTML_LANG[lang] && state.visible.join() === lang && state.home === `${base}${lang}/`, JSON.stringify({ status: res.status(), ...state }));
  }
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const plain = await noJs.newPage();
  await plain.goto(`${origin}${base}en/no-such-page/`);
  const homes = await plain.$$eval("[data-nf-lang]:not([hidden]) [data-nf-link=home]", (as) => as.map((a) => a.getAttribute("href")));
  check("404 without JavaScript shows TW/EN/JP return links", homes.join() === ["tw", "en", "jp"].map((l) => `${base}${l}/`).join(), JSON.stringify(homes));
  await noJs.close();
} finally {
  await browser.close();
  server.stop();
}
console.log(failed ? `FAIL: ${failed}` : "PASS");
process.exit(failed ? 1 : 0);
