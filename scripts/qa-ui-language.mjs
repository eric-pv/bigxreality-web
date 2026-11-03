// Interface language checks for the three languages (npm run build first).
// 1. The UI dictionaries (src/content/ui/*.json): same keys, no empty / undefined / null values,
//    no English words in TW / JP labels unless they are brand, product or technical names.
// 2. The built pages (dist): interface text (navigation, labels, buttons, headings, cards,
//    placeholders, aria labels) on TW / JP pages uses the page language; no label repeats the
//    heading next to it; no card carries a second name or a domain code; product category
//    tags use one wording per language.
// Running prose is not checked: product copy may quote English terms on purpose.
// The allowlist below is the place to add a new brand, product or technical name.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import { CHROMIUM, DIST, startPreview } from "./lib/serve.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const LANGS = ["tw", "en", "jp"];
/** Words TW / JP pages may show in Latin script: brands, product names and codes, technical abbreviations. */
const ALLOW = [
  "Big x Reality", "BIG X REALITY", "BXR", "GPTT", "XR", "VR", "AR", "MR", "AI", "SUT", "UAV", "USV", "MUM-T", "NOVA", "BOX",
  "Police BOX", "On-sited", "HMMWV", "Email", "E-mail", "Google", "LINE", "JavaScript", "PDF", "FAQ", "GPS", "IoT", "CCTV",
  "TW", "EN", "JP", "English", "Serious Games", "Extended Reality", "CQB",
  // Brand tagline (site.json), kept in English in every language by the brand guidelines.
  "Turn Every Drill into Real",
  // Marker on TEST FIXTURE content (QA_DIST=dist-fixtures); never built for production.
  ...(process.env.QA_DIST?.includes("fixtures") ? ["TEST FIXTURE"] : []),
];
/** Latin runs that are allowed whatever they contain: e-mail addresses, domains, digits with units (3D, 16:9). */
const ALLOW_PATTERN = /^(?:[\w.+-]+@[\w.-]+|[\w-]+(?:\.[\w-]+)+|\d+[A-Za-z]{1,2}|[A-Za-z])$/;
/** Domain codes the card redesign removed (the category is the card's left border and its one name); compared as written in the source. */
const RETIRED = ["MILITARY", "POLICE", "FIRE & RESCUE", "SMART CITY", "OTHER"];

const errors = [], warnings = [];
const allowed = (run) => ALLOW_PATTERN.test(run) || ALLOW.some((w) => run.toLowerCase() === w.toLowerCase());
/** Latin-script runs that are not on the allowlist. */
function englishRuns(text) {
  const runs = text.match(/[A-Za-z][A-Za-z0-9&'’.@+-]*(?:[ /·-]+[A-Za-z0-9][A-Za-z0-9&'’.@+-]*)*/g) ?? [];
  return runs.map((r) => r.trim()).filter((r) => {
    if (allowed(r)) return false;
    // "SUT Small Unit …": an allowed name followed by more English is still English.
    const rest = ALLOW.filter((w) => w.includes(" ")).reduce((t, w) => t.split(w).join(" "), r);
    return !rest.split(/[ /·]+/).filter(Boolean).every(allowed);
  });
}

// 1. Dictionaries
const dict = Object.fromEntries(await Promise.all(LANGS.map(async (l) => [l, JSON.parse(await fs.readFile(path.join(ROOT, `src/content/ui/${l}.json`), "utf8"))])));
const flat = (o, p = "") => Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" && !Array.isArray(v) ? flat(v, p + k + ".") : [[p + k, v]]));
const entries = Object.fromEntries(LANGS.map((l) => [l, new Map(flat(dict[l]))]));
const keys = new Set(LANGS.flatMap((l) => [...entries[l].keys()]));
for (const k of keys) {
  for (const l of LANGS) {
    if (!entries[l].has(k)) { errors.push(`ui/${l}.json: missing key ${k}`); continue; }
    const v = entries[l].get(k);
    if (v === null || v === undefined || (typeof v === "string" && /^(?:undefined|null)$/.test(v.trim()))) errors.push(`ui/${l}.json: ${k} has no value`);
    // Empty is allowed for section labels (the title already says it) and for strings empty in every language.
    if (v === "" && !/\.eyebrow$/.test(k) && LANGS.some((o) => entries[o].get(k))) warnings.push(`ui/${l}.json: ${k} is empty (other languages have text)`);
    if (l !== "en" && typeof v === "string" && k !== "translationStatus" && !/\[待翻譯\]/.test(v)) {
      for (const run of englishRuns(v.replace(/\{\w+\}/g, ""))) errors.push(`ui/${l}.json: ${k} = "${v}" (English "${run}")`);
    }
  }
}

// 2. Built pages
const pages = [];
async function walk(dir) {
  for (const item of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) { if (!["_astro", "pagefind", "fonts", "media", "video", "admin"].includes(item.name)) await walk(file); }
    else if (item.name === "index.html" && !/http-equiv="refresh"/.test(await fs.readFile(file, "utf8"))) pages.push("/" + path.relative(DIST, path.dirname(file)).split(path.sep).join("/") + "/");
  }
}
await walk(DIST);
const server = await startPreview(4394);
const browser = await chromium.launch({ executablePath: CHROMIUM });
const tagWording = Object.fromEntries(LANGS.map((l) => [l, new Map()]));
try {
  const page = await browser.newPage();
  for (const url of pages.sort()) {
    const lang = url.split("/")[1];
    await page.goto(`http://localhost:4394${url}`);
    const found = await page.evaluate(() => {
      const UI = "header a, header button, footer a, footer h2, footer h3, footer p, nav, .eyebrow, .kicker, .t-label, .btn, button, label, legend, .title, .sector-tag, .placeholder, .empty-state, h1, h2, h3, h4, summary, .more, .view-all, th, figcaption";
      // textContent: the words as written (CSS uppercase would turn "Smart City" into a code).
      const text = [...document.querySelectorAll(UI)].map((e) => e.textContent.replace(/\s+/g, " ").trim()).filter(Boolean);
      for (const e of document.querySelectorAll("[aria-label], [placeholder], img[alt]")) for (const a of ["aria-label", "placeholder", "alt"]) if (e.getAttribute(a)) text.push(e.getAttribute(a));
      const near = (e) => e.parentElement?.querySelector("h1, h2, h3, .kicker")?.innerText.trim() ?? "";
      const labels = [...document.querySelectorAll(".eyebrow, .subtitle")].map((e) => [e.innerText.trim(), near(e)]);
      const cards = [...document.querySelectorAll("article.card")].map((a) => ({ titles: a.querySelectorAll(".title, .english").length, tags: [...a.querySelectorAll(".sector-tag")].map((t) => [[...t.classList].find((c) => c.startsWith("sector--")), t.innerText.trim()]) }));
      return { text, labels, cards };
    });
    for (const t of found.text) {
      for (const r of RETIRED) if (t === r || t.startsWith(r + " ")) errors.push(`${url}: retired label "${t}"`);
      if (lang !== "en" && !/\[待翻譯\]/.test(t)) for (const run of englishRuns(t)) errors.push(`${url}: English interface text "${run}" in "${t.slice(0, 60)}"`);
    }
    const key = (s) => s.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");
    for (const [label, heading] of found.labels) {
      const a = key(label), b = key(heading);
      if (a && b && (a === b || a.includes(b) || (b.includes(a) && b.length <= a.length * 2 + 6))) errors.push(`${url}: label "${label}" repeats "${heading}"`);
    }
    for (const c of found.cards) {
      if (c.titles > 1) errors.push(`${url}: card with a second name line`);
      for (const [domain, wording] of c.tags) tagWording[lang].set(domain, new Set([...(tagWording[lang].get(domain) ?? []), wording]));
    }
  }
  for (const l of LANGS) for (const [domain, set] of tagWording[l]) if (set.size > 1) errors.push(`${l}: product tag ${domain} uses ${set.size} wordings: ${[...set].join(" / ")}`);
} finally {
  await browser.close();
  server.close?.();
}
const unique = [...new Set(errors)];
console.log(JSON.stringify({ pages: pages.length, languages: Object.fromEntries(LANGS.map((l) => [l, pages.filter((p) => p.startsWith(`/${l}/`)).length])), errors: unique.length, warnings }, null, 2));
for (const e of unique.slice(0, 80)) console.log("FAIL", e);
assert.equal(unique.length, 0);
process.exit(0);
