// Phase 2 behaviour checks against the TEST FIXTURE build (npm run build:fixtures).
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { startPreview, CHROMIUM, DIST } from "./lib/serve.mjs";
import { publicSiteRoot } from "../src/lib/public-url.ts";

if (!DIST.includes("fixtures")) {
  console.error("Run with QA_DIST=dist-fixtures after `npm run build:fixtures`.");
  process.exit(2);
}
const html = (p) => readFileSync(path.join(DIST, p, "index.html"), "utf8");
const robots = (p) => /<meta name="robots" content="noindex"/.test(html(p));
let failed = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : `  — ${detail}`}`);
};

// static output
check("news page 1 has one spotlight plus ten rows", (html("tw/news").match(/data-news-id=/g) ?? []).length === 11 && html("tw/news").includes("data-news-featured"));
check("news page 2 exists, no /page/1/", existsSync(path.join(DIST, "tw/news/page/2/index.html")) && !existsSync(path.join(DIST, "tw/news/page/1")));
check("page 2 canonical points to itself", html("tw/news/page/2").includes(`rel="canonical" href="${publicSiteRoot}/tw/news/page/2/"`));
check("page 2 hreflang only for languages with a page 2", !html("tw/news/page/2").includes('rel="alternate" hreflang="en"'));
check("case studies are not paged", !existsSync(path.join(DIST, "tw/cases/page")));
check("unapproved case study not built", !existsSync(path.join(DIST, "tw/cases/fixture-case-unapproved")));
check("empty-body and future news not built", !existsSync(path.join(DIST, "tw/news/fixture-news-empty")) && !existsSync(path.join(DIST, "tw/news/fixture-news-future")));
check("empty list: noindex + empty state", robots("jp/news") && html("jp/news").includes('class="empty"'));
check("cases url segment is /cases/, not /case-studies/", existsSync(path.join(DIST, "tw/cases/index.html")) && !existsSync(path.join(DIST, "tw/case-studies")));
check("tag with ≥3 articles: indexable rules (only fixture noindex)", html("tw/tags/xr-training").includes("TEST FIXTURE"));
check("every fixture page is noindex", robots("tw/news/fixture-news-01") && robots("tw/products/sut"));
check("fixture robots.txt blocks crawlers", readFileSync(path.join(DIST, "robots.txt"), "utf8").includes("Disallow: /"));
check("NewsArticle JSON-LD without placeholders", /"@type":"NewsArticle"/.test(html("tw/news/fixture-news-01")));
check("article og:type + published_time", html("tw/news/fixture-news-01").includes('property="article:published_time"'));
check("a news article lists its related case (relation stored on the news side or the case side)", html("tw/news/fixture-news-01").includes("/tw/cases/fixture-case-1/"));
check("solution page lists reverse-linked case study and product", html("tw/solutions/police").includes("/tw/cases/fixture-case-1/"));
check("search page noindex", robots("tw/search"));

// browser behaviour
const { base, stop } = await startPreview(4331);
const browser = await chromium.launch({ executablePath: CHROMIUM });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/tw/news/fixture-news-01/`, { waitUntil: "networkidle" });
  const toggle = page.locator('[aria-controls="sub-resources"]');
  check("Resources marked current on an article", (await toggle.getAttribute("class")).includes("is-current"));
  await toggle.focus();
  await page.keyboard.press("Enter");
  check("Enter opens the Resources menu", (await toggle.getAttribute("aria-expanded")) === "true" && (await page.locator("#sub-resources").isVisible()));
  check("current list marked in submenu", (await page.locator('#sub-resources a[aria-current="page"]').getAttribute("href")) === "/tw/news/");
  await page.keyboard.press("Tab");
  check("Tab moves into the submenu", await page.evaluate(() => !!document.activeElement?.closest("#sub-resources")));
  await page.keyboard.press("Escape");
  check("Esc closes and returns focus", (await toggle.getAttribute("aria-expanded")) === "false" && (await page.evaluate(() => document.activeElement?.getAttribute("aria-controls") === "sub-resources")));
  await toggle.click();
  await page.mouse.click(1000, 600);
  check("click outside closes", (await toggle.getAttribute("aria-expanded")) === "false");

  await page.goto(`${base}/tw/news/fixture-news-05/`, { waitUntil: "networkidle" });
  check("language switch falls back to the list page", (await page.locator('.langs a[hreflang="ja"]').getAttribute("href")) === "/jp/news/");

  // ---- success cases (docs: 成功案例)
  await page.goto(`${base}/tw/cases/`, { waitUntil: "networkidle" });
  const cards = () => page.locator("#case-grid > li:not([hidden])").count();
  check("cases list: 3 published cards, unapproved one absent", (await page.locator("#case-grid > li").count()) === 3 && !(await page.content()).includes("未授權"));
  check("cases list: only used filters are offered", JSON.stringify(await page.$$eval('[data-group=domain] [data-value]:not([data-value=""])', (b) => b.map((x) => x.dataset.value))) === JSON.stringify(["military", "police", "other"])
    && (await page.locator('[data-group=product] [data-value]:not([data-value=""])').count()) === 3 && (await page.locator('[data-group=solution] [data-value]:not([data-value=""])').count()) === 2);
  const text = await page.locator("#case-grid").innerText();
  check("client: anonymised case shows the unit type, public case the name", text.includes("縣市警察單位") && !text.includes("某市警察局") && text.includes("公開客戶") && !text.includes("不應顯示的單位類型"));
  await page.click('[data-group=domain] [data-value="military"]');
  check("cases list: domain filter", (await cards()) === 1 && page.url().includes("domain=military"));
  await page.click('[data-group=domain] [data-value=""]');
  await page.click('[data-group=product] [data-value="sut"]');
  check("cases list: product filter (a case may relate to several products)", (await cards()) === 2);
  await page.click('[data-group=solution] [data-value="police"]');
  check("cases list: groups combine", (await cards()) === 1);
  check("header: 成功案例 is in the 資源中心 menu, not a top-level link", (await page.locator('#sub-resources a[href="/tw/cases/"]').count()) === 1 && (await page.locator('.nav-list > li > a[href="/tw/cases/"]').count()) === 0);
  check("header: 資源中心 is current on the case list page", (await page.locator('[aria-controls="sub-resources"]').getAttribute("class")).includes("is-current"));

  await page.goto(`${base}/tw/cases/fixture-case-1/`, { waitUntil: "networkidle" });
  const heads = await page.$$eval("main h2", (hs) => hs.map((h) => h.id));
  check("case page: sections with data are shown in order", JSON.stringify(heads.filter((h) => ["h-background", "h-challenge", "h-solution", "h-application", "h-results"].includes(h))) === JSON.stringify(["h-background", "h-challenge", "h-solution", "h-application", "h-results"]), heads.join(","));
  check("case page: links back to its product and solution", (await page.locator('a[href="/tw/products/sut/"]').count()) > 0 && (await page.locator('a[href="/tw/solutions/police/"]').count()) > 0);
  await page.goto(`${base}/tw/cases/fixture-case-2/`, { waitUntil: "networkidle" });
  const heads2 = await page.$$eval("main h2", (hs) => hs.map((h) => h.id));
  check("case page: sections without data are not rendered", !["h-background", "h-challenge", "h-solution", "h-application", "h-results", "h-gallery"].some((h) => heads2.includes(h)), heads2.join(","));
  check("case page: no empty headings", (await page.locator("main h2:empty").count()) === 0);

  await page.goto(`${base}/tw/products/sut/`, { waitUntil: "networkidle" });
  check("product with 2 cases: cards + link to the list", (await page.locator("[data-related-cases] .smart-grid > li").count()) === 2 && (await page.locator('[data-related-cases] a[href="/tw/cases/"]').count()) === 1);
  const order = await page.$$eval("main section[aria-labelledby]", (ss) => ss.map((x) => x.getAttribute("aria-labelledby")));
  check("product page: cases come after values and before related", order.indexOf("h-cases") > order.indexOf("h-values") && order.indexOf("h-cases") < order.indexOf("h-related"), order.join(","));
  await page.goto(`${base}/tw/products/uav/`, { waitUntil: "networkidle" });
  check("product with 1 case: wide feature layout, no list link", (await page.locator("[data-related-cases] .feature").count()) === 1 && (await page.locator('[data-related-cases] a[href="/tw/cases/"]').count()) === 0);
  await page.goto(`${base}/tw/products/machine-gun-simulator/`, { waitUntil: "networkidle" });
  check("product-specific cases description is shown", (await page.locator("[data-related-cases]").innerText()).includes("了解機槍模擬系統如何應用於實際訓練需求"));
  await page.goto(`${base}/tw/products/usv/`, { waitUntil: "networkidle" });
  check("product without cases: block hidden", (await page.locator("[data-related-cases]").count()) === 0 && !(await page.content()).includes("實際應用案例"));
  await page.goto(`${base}/tw/solutions/military/`, { waitUntil: "networkidle" });
  check("solution page shares the cases block", (await page.locator("[data-related-cases]").count()) === 1);

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(`${base}/tw/news/`, { waitUntil: "networkidle" });
  await mobile.click(".menu-toggle");
  await mobile.click('[aria-controls="sub-resources"]');
  check("mobile: Resources expands inside the menu", await mobile.locator("#sub-resources a").first().isVisible());
  check("mobile: 成功案例 is in the expanded 資源中心", await mobile.locator('#sub-resources a[href="/tw/cases/"]').isVisible());
  await mobile.goto(`${base}/tw/cases/`, { waitUntil: "networkidle" });
  check("mobile: cases grid is one column, no horizontal scroll", (await mobile.locator("#case-grid > li").evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().left))).size)) === 1 && (await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)));
} finally {
  await browser.close();
  stop();
}
console.log(failed ? `FAIL: ${failed}` : "PASS");
process.exit(failed ? 1 : 0);
