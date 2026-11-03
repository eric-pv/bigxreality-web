// Site search checks against the TEST FIXTURE build (npm run build:fixtures first):
// drives the real /[lang]/search/ page in Chromium (docs/PHASE-2-PLAN.md §5.2, §12).
import { chromium } from "playwright-core";
import { startPreview, CHROMIUM } from "./lib/serve.mjs";

if (!process.env.QA_DIST?.includes("fixtures")) {
  console.error("Run with QA_DIST=dist-fixtures after `npm run build:fixtures`.");
  process.exit(2);
}
const { base, stop } = await startPreview();
const browser = await chromium.launch({ executablePath: CHROMIUM });
let failed = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `  — ${detail}`}`);
};
async function search(lang, q, type = "") {
  const page = await browser.newPage();
  await page.goto(`${base}/${lang}/search/?q=${encodeURIComponent(q)}${type ? `&type=${type}` : ""}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("[data-status]")?.textContent !== "", null, { timeout: 10000 });
  const r = await page.$$eval(".result", (els) => els.map((e) => ({ url: e.querySelector("a").getAttribute("href"), title: e.querySelector("a").textContent })));
  await page.close();
  return r;
}
try {
  let r = await search("tw", "數位雙生");
  check("tw: CJK phrase finds the insight", r.some((x) => x.url === "/tw/insights/fixture-insight-1/"), JSON.stringify(r));
  r = await search("tw", "警勤模擬");
  check("tw: solution text is searchable", r.some((x) => x.url === "/tw/solutions/police/"), JSON.stringify(r));
  check("tw: results show readable titles (not encoded tokens)", r.every((x) => !/qz[a-z]{4}/.test(x.title)), JSON.stringify(r));
  r = await search("tw", "TEST FIXTURE", "news");
  check("type filter keeps only news", r.length > 0 && r.every((x) => x.url.startsWith("/tw/news/")), JSON.stringify(r));
  r = await search("tw", "TEST FIXTURE");
  check("tw results never link to other languages", r.length > 0 && r.every((x) => x.url.startsWith("/tw/")), JSON.stringify(r));
  check("list pages are not indexed", r.every((x) => !/\/(news|insights|cases|tags)\/(page\/\d+\/)?$/.test(x.url)), JSON.stringify(r));
  r = await search("en", "English body");
  check("en: English article found", r.some((x) => x.url === "/en/news/fixture-news-01/"), JSON.stringify(r));
  r = await search("jp", "TEST FIXTURE");
  // The fixture articles exist in Japanese only as pending translations, so none of them may be found. Translated
  // solution pages can match the single letter "T" of "MUM-T" in Pagefind, which is not a pending translation.
  check("jp: pending translations are not indexed", r.every((x) => !/\/(news|insights|cases)\//.test(x.url)), JSON.stringify(r));
  for (const [q, why] of [["未授權", "case study without client approval"], ["未來消息", "future-dated news"], ["空白消息", "news with empty body"]]) {
    r = await search("tw", q);
    check(`not searchable: ${why}`, r.length === 0, JSON.stringify(r));
  }
} finally {
  await browser.close();
  stop();
}
console.log(failed ? `FAIL: ${failed}` : "PASS");
process.exit(failed ? 1 : 0);
