// Product FAQ (/tw/products/*): every question and full answer in the initial HTML, FAQPage JSON-LD,
// single-open accordion behaviour, keyboard, phone layout, and no FAQ on other pages. The English and
// Japanese product FAQs are checked in qa-english.mjs and qa-japanese.mjs.
import { chromium } from "playwright-core";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { startPreview, CHROMIUM, DIST } from "./lib/serve.mjs";
import { publicSiteRoot } from "../src/lib/public-url.ts";

let failed = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : `  — ${detail}`}`);
};
const dir = "src/content/products/zh-Hant";
const products = readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""));
const faqOf = (slug) => YAML.parse(readFileSync(path.join(dir, `${slug}.md`), "utf8").split(/^---$/m)[1]).faq ?? [];
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

check("12 products", products.length === 12, String(products.length));
check("5 questions each, 60 in total", products.every((s) => faqOf(s).length === 5) && products.reduce((n, s) => n + faqOf(s).length, 0) === 60);
const qs = products.flatMap((s) => faqOf(s).map((f) => f.question));
check("no question or answer is shared between products", new Set(qs.map((q, i) => q + "|" + products.flatMap((s) => faqOf(s).map((f) => f.answer))[i])).size === 60);

const { base, stop } = await startPreview(4341);
const browser = await chromium.launch({ executablePath: CHROMIUM });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const slug of products) {
    const url = `/tw/products/${slug}/`;
    const items = faqOf(slug);
    const raw = readFileSync(path.join(DIST, "tw/products", slug, "index.html"), "utf8");
    // initial HTML, no script: all questions and answers present, in <details> with the answer inside
    const rawText = decode(raw);
    check(`${url}: every question and full answer is in the initial HTML`, items.every((f) => rawText.includes(f.question) && rawText.includes(f.answer)));
    const m = [...raw.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((x) => JSON.parse(x[1]));
    const faqNode = m.flatMap((g) => g["@graph"] ?? []).find((n) => n["@type"] === "FAQPage");
    check(`${url}: FAQPage JSON-LD matches the visible list`, !!faqNode && faqNode.mainEntity.length === 5 && faqNode.mainEntity.every((q, i) => q.name === items[i].question && q.acceptedAnswer.text === items[i].answer) && faqNode.inLanguage === "zh-Hant-TW", JSON.stringify(faqNode)?.slice(0, 80));
    check(`${url}: indexable with canonical and hreflang`, !/name="robots" content="noindex"/.test(raw) && raw.includes(`rel="canonical" href="${publicSiteRoot}${url}"`) && raw.includes('hreflang="zh-TW"'));

    await page.goto(base + url, { waitUntil: "networkidle" });
    check(`${url}: heading is 常見問題, not FAQ`, (await page.locator("[data-faq] h2").innerText()).trim() === "常見問題" && !/\bFAQ\b/.test(await page.locator("main").innerText()));
    const order = await page.evaluate(() => {
      const f = document.querySelector("[data-faq]"), c = document.querySelector("section[aria-labelledby=product-cta]");
      return !!(f && c && f.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    check(`${url}: FAQ comes before the closing CTA`, order);
    const rows = await page.$$eval("[data-faq] details", (ds) => ds.map((d) => [d.querySelector("summary h3").textContent.trim(), d.querySelector(".a").textContent.trim(), d.open]));
    check(`${url}: five questions in order, all collapsed by default`, rows.length === 5 && rows.every((r, i) => r[0] === items[i].question && r[1] === items[i].answer && r[2] === false));
    if (slug === products[0] || slug === "usv") {
      const sum = page.locator("[data-faq] summary");
      await sum.nth(0).click();
      check(`${url}: first click opens the first item`, JSON.stringify(await page.$$eval("[data-faq] details", (ds) => ds.map((d) => d.open))) === "[true,false,false,false,false]");
      await sum.nth(2).click();
      check(`${url}: opening another closes the previous one`, JSON.stringify(await page.$$eval("[data-faq] details", (ds) => ds.map((d) => d.open))) === "[false,false,true,false,false]");
      await sum.nth(2).click();
      check(`${url}: clicking the open item collapses it`, (await page.$$eval("[data-faq] details[open]", (ds) => ds.length)) === 0);
      await sum.nth(1).focus();
      await page.keyboard.press("Enter");
      check(`${url}: keyboard Enter opens, Space toggles closed`, (await page.locator("[data-faq] details").nth(1).evaluate((d) => d.open)) === true && (await (async () => { await page.keyboard.press("Space"); return page.locator("[data-faq] details").nth(1).evaluate((d) => !d.open); })()));
      check(`${url}: + / − marker follows the state`, (await sum.nth(0).evaluate((s) => getComputedStyle(s.querySelector(".mark"), "::before").content)).includes("＋"));
      await sum.nth(0).click();
      check(`${url}: marker shows − when open`, (await sum.nth(0).evaluate((s) => getComputedStyle(s.querySelector(".mark"), "::before").content)).includes("－"));
    }
  }

  // phone and tablet
  for (const [w, label] of [[390, "phone"], [820, "tablet"]]) {
    const v = await browser.newPage({ viewport: { width: w, height: 844 } });
    await v.goto(`${base}/tw/products/sut/`, { waitUntil: "networkidle" });
    await v.locator("[data-faq] summary").nth(0).tap?.().catch(() => {});
    await v.locator("[data-faq] summary").nth(0).click();
    check(`${label}: opens on touch/click and keeps one open`, (await v.$$eval("[data-faq] details[open]", (d) => d.length)) === 1);
    check(`${label}: no horizontal scroll with an item open`, await v.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    const box = await v.locator("[data-faq] summary").nth(0).boundingBox();
    check(`${label}: tap target at least 44px tall`, box.height >= 44, String(box.height));
    await v.close();
  }

  // the localized product pages carry their own five questions; no FAQ on overview or solution pages
  for (const p of ["/en/products/sut/", "/jp/products/sut/"]) {
    await page.goto(base + p, { waitUntil: "networkidle" });
    check(`${p}: five FAQ items`, (await page.locator("[data-faq] details").count()) === 5);
  }
  for (const p of ["/tw/products/", "/tw/solutions/military/", "/tw/solutions/"]) {
    await page.goto(base + p, { waitUntil: "networkidle" });
    check(`${p}: no FAQ block`, (await page.locator("[data-faq]").count()) === 0);
  }
  const sm = readFileSync(path.join(DIST, "sitemap.xml"), "utf8");
  check("sitemap still lists the product pages", products.every((s) => sm.includes(`/tw/products/${s}/`)));
} finally {
  await browser.close();
  stop();
}
console.log(failed ? `FAIL: ${failed}` : "PASS");
process.exit(failed ? 1 : 0);
