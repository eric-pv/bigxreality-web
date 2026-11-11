#!/usr/bin/env node
// After `astro build`: builds the site search index (Pagefind, custom records) and
// guards production output against TEST FIXTURE content (docs/PHASE-2-PLAN.md §5.2,
// §11.5, §12.4).
//
// Only pages whose <main> carries data-pagefind-body are indexed: detail pages of
// products, solutions and articles that are published, translated and indexable.
// Results are shown from the stored meta (title, summary, type, date); Pagefind's
// own excerpts are not used because CJK text is stored encoded.
import { readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import * as pagefind from "pagefind";
import { tokenize, searchLanguage } from "../src/lib/search-tokenize.ts";

const fixtures = process.env.BXR_CONTENT_SOURCE === "fixtures";
const ROOT = path.resolve(import.meta.dirname, "..", fixtures ? "dist-fixtures" : "dist");

const decode = (s) =>
  s.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const text = (html) => decode(html.replace(/<(script|style|nav|svg|figure)\b[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const attr = (html, re) => decode(html.match(re)?.[1] ?? "");

async function* pages(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== "pagefind" && e.name !== "_astro") yield* pages(p); }
    else if (e.name === "index.html") yield p;
  }
}

const leaks = [];
const { index } = await pagefind.createIndex();
let records = 0;
for await (const file of pages(ROOT)) {
  const html = await readFile(file, "utf8");
  const url = "/" + path.relative(ROOT, path.dirname(file)).split(path.sep).join("/") + "/";
  if (!fixtures && html.includes("TEST FIXTURE")) leaks.push(url);
  const main = html.match(/<main\b([^>]*)>([\s\S]*)<\/main>/);
  if (!main || !/data-pagefind-body/.test(main[1])) continue;
  const lang = attr(html, /<html[^>]*\blang="([^"]+)"/);
  const meta = {
    title: text(attr(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/)),
    summary: attr(html, /<meta name="description" content="([^"]*)"/),
    type: attr(main[1], /data-search-type="([^"]+)"/),
    date: attr(main[1], /data-search-date="([^"]+)"/),
  };
  const body = `${meta.title} ${text(main[2])}`;
  await index.addCustomRecord({
    url,
    content: lang === "en" ? body : tokenize(body),
    language: searchLanguage(lang),
    meta: Object.fromEntries(Object.entries(meta).filter(([, v]) => v)),
    filters: { type: [meta.type] },
  });
  records++;
}
if (leaks.length) {
  await pagefind.close();
  console.error(`TEST FIXTURE content found in the production build:\n  ${leaks.join("\n  ")}`);
  process.exit(1);
}
await rm(path.join(ROOT, "pagefind"), { recursive: true, force: true });
await index.writeFiles({ outputPath: path.join(ROOT, "pagefind") });
await pagefind.close();
console.log(`search index: ${records} page(s) → ${path.relative(process.cwd(), ROOT)}/pagefind`);
