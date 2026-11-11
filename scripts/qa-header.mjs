// Header navigation checks against the normal build (npm run build): the five fixed items and the
// three-item Resources menu in all three languages, one-line layout at every desktop width,
// hover / click / keyboard / touch behaviour, Active states and the phone menu.
import { chromium } from "playwright-core";
import { startPreview, CHROMIUM } from "./lib/serve.mjs";

const LABELS = {
  tw: { top: ["解決方案", "產品介紹", "核心技術", "資源中心", "關於 BXR"], sub: ["最新消息", "技術專欄", "成功案例"] },
  en: { top: ["Solutions", "Products", "Core Technology", "Resources", "About BXR"], sub: ["News", "Insights", "Case Studies"] },
  jp: { top: ["ソリューション", "製品情報", "コア技術", "リソース", "BXRについて"], sub: ["ニュース", "技術コラム", "導入事例"] },
};
const SUB_HREFS = (l) => [`/${l}/news/`, `/${l}/insights/`, `/${l}/cases/`];
let failed = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : `  — ${detail}`}`);
};

const { base, stop } = await startPreview(4333);
const browser = await chromium.launch({ executablePath: CHROMIUM });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const metrics = {};
  for (const l of ["tw", "en", "jp"]) {
    const want = LABELS[l];
    for (const width of [1440, 1280, 1100, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${base}/${l}/products/`, { waitUntil: "networkidle" });
      const top = await page.$$eval(".nav-list > li", (lis) => lis.map((li) => { const el = li.querySelector("a,button,span.nav-link")?.cloneNode(true); el?.querySelectorAll(".visually-hidden").forEach((n) => n.remove()); return (el?.textContent ?? "").trim(); }));
      if (width === 1440) {
        check(`${l}: five top-level items in order`, JSON.stringify(top) === JSON.stringify(want.top), top.join(" | "));
        const sub = await page.$$eval("#sub-resources a", (as) => as.map((a) => [a.textContent.trim(), a.getAttribute("href")]));
        check(`${l}: Resources menu has three items in order`, JSON.stringify(sub.map((x) => x[0])) === JSON.stringify(want.sub) && JSON.stringify(sub.map((x) => x[1])) === JSON.stringify(SUB_HREFS(l)), JSON.stringify(sub));
        const about = await page.$$eval("#sub-company a", (as) => as.map((a) => [a.textContent.trim(), a.getAttribute("href")]));
        check(`${l}: About BXR menu has six items including CSR in order`, JSON.stringify(about.map((x) => x[1])) === JSON.stringify([`/${l}/company/`, `/${l}/company/csr/`, `/${l}/company/team/`, `/${l}/company/partners/`, `/${l}/company/investors/`, `/${l}/contact/`]) && (l !== "tw" || JSON.stringify(about.map((x) => x[0])) === JSON.stringify(["公司簡介", "企業社會責任", "經營團隊", "合作夥伴", "投資人專區", "聯絡 BXR"])), JSON.stringify(about));
      }
      const m = await page.evaluate(() => {
        const bar = document.querySelector(".site-header .bar");
        const links = [...document.querySelectorAll(".nav-list > li > .nav-heading > .nav-link:first-child")];
        const cs = getComputedStyle(links[0]);
        return {
          overflow: bar.scrollWidth > bar.clientWidth + 1 || document.documentElement.scrollWidth > window.innerWidth,
          heights: links.map((a) => Math.round(a.getBoundingClientRect().height)),
          tops: links.map((a) => Math.round(a.getBoundingClientRect().top)),
          font: `${cs.fontSize}/${cs.fontWeight}`,
          headerH: Math.round(document.querySelector(".site-header").getBoundingClientRect().height),
          tools: document.querySelector(".tools").getBoundingClientRect().right <= window.innerWidth,
        };
      });
      check(`${l} @${width}: single row, no overflow`, !m.overflow && new Set(m.tops).size === 1 && m.heights.every((h) => h <= 48) && m.tools, JSON.stringify(m));
      metrics[`${l}@${width}`] = `${m.font}/${m.headerH}/${m.heights[0]}`;
    }
  }
  const same = (w) => new Set(["tw", "en", "jp"].map((l) => metrics[`${l}@${w}`])).size === 1;
  check("same font size, weight, item height and header height in all languages", [1440, 1280, 1100, 1024].every(same), JSON.stringify(metrics));

  // behaviour (zh-TW, desktop)
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/tw/products/`, { waitUntil: "networkidle" });
  const toggle = page.locator('[aria-controls="sub-resources"]');
  const inView = (sel) => page.$$eval(sel, (els) => els.every((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.left >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight; }));
  await toggle.hover();
  await page.waitForTimeout(100);
  check("mouse: hover opens the menu with all three items visible", (await toggle.getAttribute("aria-expanded")) === "true" && (await page.locator("#sub-resources a").count()) === 3 && (await inView("#sub-resources a")));
  const tb = await toggle.boundingBox();
  const first = await page.locator("#sub-resources a").first().boundingBox();
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height - 1, { steps: 3 });
  await page.mouse.move(first.x + 20, first.y + first.height / 2, { steps: 12 });
  await page.waitForTimeout(400);
  check("mouse: moving from the button to the list does not close it", (await toggle.getAttribute("aria-expanded")) === "true");
  await page.mouse.move(700, 600, { steps: 5 });
  await page.waitForTimeout(400);
  check("mouse: leaving closes it", (await toggle.getAttribute("aria-expanded")) === "false");
  await toggle.click();
  await page.mouse.move(tb.x + tb.width / 2, tb.y - 40);
  await page.waitForTimeout(400);
  check("mouse: a click keeps it open until you click elsewhere", (await toggle.getAttribute("aria-expanded")) === "true");
  await page.mouse.click(700, 600);
  check("mouse: click outside closes", (await toggle.getAttribute("aria-expanded")) === "false");
  await toggle.focus();
  await page.keyboard.press("Enter");
  check("keyboard: Enter opens", (await toggle.getAttribute("aria-expanded")) === "true");
  await page.keyboard.press("Tab");
  check("keyboard: Tab moves into the list", await page.evaluate(() => !!document.activeElement?.closest("#sub-resources")));
  await page.keyboard.press("Escape");
  check("keyboard: Esc closes and returns focus", (await toggle.getAttribute("aria-expanded")) === "false" && (await page.evaluate(() => document.activeElement?.getAttribute("aria-controls") === "sub-resources")));

  // Active states
  const current = async (p) => {
    await page.goto(`${base}${p}`, { waitUntil: "networkidle" });
    return page.evaluate(() => [...document.querySelectorAll(".nav-list > li")].map((li) => {
      const el = li.querySelector("a,button,span.nav-link");
      return el.getAttribute("aria-current") === "page" || el.classList.contains("is-current") ? el.textContent.trim() : null;
    }).filter(Boolean));
  };
  check("Active: 產品介紹 on the products overview", JSON.stringify(await current("/tw/products/")) === '["產品介紹"]');
  check("Active: 產品介紹 on a product page", JSON.stringify(await current("/tw/products/sut/")) === '["產品介紹"]');
  check("Active: 解決方案 on a solution page", JSON.stringify(await current("/tw/solutions/military/")) === '["解決方案"]');
  await page.goto(`${base}/tw/company/`, { waitUntil: "networkidle" });
  check("company page: heading, three paragraphs and slogan", (await page.locator("h1").innerText()).trim() === "虛擬訓練．真實應變．守護未來" && (await page.locator(".page-hero .desc").count()) === 3 && (await page.locator("#company-slogan").innerText()).includes("Turn Every Drill into Real"));
  check("Active: 關於 BXR on a sub-page and on the contact page", JSON.stringify(await current("/tw/company/team/")) === '["關於 BXR"]' && JSON.stringify(await current("/tw/contact/")) === '["關於 BXR"]');
  await page.goto(`${base}/tw/company/investors/`, { waitUntil: "networkidle" });
  await page.locator('[aria-controls="sub-company"]').click();
  check("Active: the open About BXR menu marks 投資人專區", (await page.locator('#sub-company a[aria-current="page"]').textContent()).trim() === "投資人專區");
  await page.mouse.click(700, 600);
  check("Active: 關於 BXR on the company page", JSON.stringify(await current("/tw/company/")) === '["關於 BXR"]');
  check("Active: 資源中心 on the case list", JSON.stringify(await current("/tw/cases/")) === '["資源中心"]');
  check("Active: 資源中心 on the news list", JSON.stringify(await current("/tw/news/")) === '["資源中心"]');
  check("Active: 資源中心 on the insights list", JSON.stringify(await current("/tw/insights/")) === '["資源中心"]');
  await page.goto(`${base}/tw/cases/`, { waitUntil: "networkidle" });
  await page.locator('[aria-controls="sub-resources"]').click();
  check("Active: the open menu marks 成功案例", (await page.locator('#sub-resources a[aria-current="page"]').getAttribute("href")) === "/tw/cases/");

  // existing URLs unchanged
  check("links: the published direct items keep their URLs", (await page.locator('.nav-list > li > .nav-heading > a').evaluateAll((as) => as.map((a) => a.getAttribute("href")))).join() === "/tw/solutions/,/tw/products/,/tw/technologies/");
  check("links: published 核心技術 links to its built overview", (await page.locator('.nav-list > li > .nav-heading > a[href="/tw/technologies/"]').count()) === 1 && (await page.locator('.nav-list > li > span.nav-link.is-planned').count()) === 0);
  check("Active: 核心技術 on its overview and detail", JSON.stringify(await current("/tw/technologies/")) === '["核心技術"]' && JSON.stringify(await current("/tw/technologies/ai-simulation/")) === '["核心技術"]');

  // phone
  for (const l of ["tw", "en", "jp"]) {
    const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await phone.goto(`${base}/${l}/products/`, { waitUntil: "networkidle" });
    await phone.click(".menu-toggle");
    const top = await phone.$$eval(".nav-list > li", (lis) => lis.map((li) => { const el = li.querySelector("a,button,span.nav-link")?.cloneNode(true); el?.querySelectorAll(".visually-hidden").forEach((n) => n.remove()); return (el?.textContent ?? "").trim(); }));
    check(`phone ${l}: menu shows the five items`, JSON.stringify(top) === JSON.stringify(LABELS[l].top), top.join(" | "));
    await phone.tap('[aria-controls="sub-resources"]');
    const subs = await phone.$$eval("#sub-resources a", (as) => as.filter((a) => a.getBoundingClientRect().width > 0).map((a) => a.textContent.trim()));
    check(`phone ${l}: Resources expands to three items`, JSON.stringify(subs) === JSON.stringify(LABELS[l].sub), subs.join(" | "));
    check(`phone ${l}: no horizontal scroll`, await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await phone.close();
  }
} finally {
  await browser.close();
  stop();
}
console.log(failed ? `FAIL: ${failed}` : "PASS");
process.exit(failed ? 1 : 0);
