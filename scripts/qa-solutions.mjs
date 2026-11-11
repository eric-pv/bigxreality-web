// Solutions section checks against the normal build (npm run build): four categories, the two
// solutions under Military Simulation, relations, honest wording and layout on phone.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import path from "node:path";
import { startPreview, CHROMIUM, DIST } from "./lib/serve.mjs";

let failed = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : `  — ${detail}`}`);
};
const PAGES = [
  ["military", "從單兵戰技到聯合作戰，建立多層級軍事模擬訓練體系", "洽詢軍事模擬解決方案", "軍事模擬"],
  ["mum-t", "讓小隊成員掌握共同任務，建立更緊密的戰術協同", "洽詢 MUM-T 解決方案", "MUM-T 小隊戰術協同訓練"],
  ["nova", "整合不同訓練系統，延伸更大規模的聯戰模擬能力", "洽詢 NOVA 解決方案", "NOVA 聯戰模擬整合"],
  ["police", "讓警勤訓練更貼近真實勤務，從操作熟練走向情境應變", "洽詢警勤模擬解決方案", "警勤模擬"],
  ["fire-rescue", "讓消防與防災教育，從知識學習走向實際操作", "洽詢消防防災解決方案", "消防防災"],
  ["smart-city", "讓城市資訊更直觀，讓數位模擬延伸更多智慧應用", "洽詢智慧城市解決方案", "智慧城市"],
];
// Wording that is an instruction to the builders and must never reach the public pages.
const LEAK = ["不得", "待提供", "待翻譯", "TEST FIXTURE", "請勿", "不可將"];

const { base, stop } = await startPreview(4336);
const browser = await chromium.launch({ executablePath: CHROMIUM });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/tw/solutions/`, { waitUntil: "networkidle" });
  const cards = await page.$$eval("#solution-list article.card", (as) => as.map((a) => ({ name: a.querySelector(".title")?.textContent.trim(), href: a.querySelector(".title a")?.getAttribute("href"), more: a.querySelector(".more")?.textContent.replace(/\s+/g, " ").trim() })));
  check("overview: exactly the four categories in order", JSON.stringify(cards.map((c) => c.name)) === JSON.stringify(["軍事模擬", "警勤模擬", "消防防災", "智慧城市"]), JSON.stringify(cards.map((c) => c.name)));
  check("overview: card buttons", JSON.stringify(cards.map((c) => c.more)) === JSON.stringify(["探索軍事模擬 →", "探索警勤模擬 →", "探索消防防災 →", "探索智慧城市 →"]), JSON.stringify(cards.map((c) => c.more)));
  check("overview: MUM-T and NOVA are not cards (not a fifth category)", !cards.some((c) => /mum-t|nova/.test(c.href ?? "")));
  check("overview: heading and sub-heading", (await page.locator("h1").innerText()).includes("從專業訓練到智慧應用") && (await page.locator(".page-hero .lead").innerText()).includes("滿足軍事、警勤、消防防災及智慧城市"));
  check("overview: four principle cards", (await page.locator("#h-highlights").count()) === 1 && (await page.locator("section[aria-labelledby=h-highlights] .value").count()) === 4);
  const overviewText = await page.locator("main").innerText();
  check("overview: no placeholder or instruction wording", !LEAK.some((w) => overviewText.includes(w)), LEAK.filter((w) => overviewText.includes(w)).join(","));

  for (const [slug, h1, cta, name] of PAGES) {
    await page.goto(`${base}/tw/solutions/${slug}/`, { waitUntil: "networkidle" });
    check(`${slug}: H1 identifies solution and retains value headline`, (await page.locator("h1").innerText()).trim() === name && (await page.locator(".landing-overview h2").innerText()).trim() === h1);
    const hrefs = await page.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    check(`${slug}: CTA goes to the contact page with the solution name`, hrefs.some((h) => h.startsWith("/tw/contact/?topic=solution&item=")) && (await page.locator(`.page-hero a.btn`).first().innerText()).trim() === cta);
    const text = await page.locator("main").innerText();
    check(`${slug}: no placeholder or instruction wording`, !LEAK.some((w) => text.includes(w)), LEAK.filter((w) => text.includes(w)).join(","));
    check(`${slug}: breadcrumb`, (await page.locator(".breadcrumb, nav[aria-label] ol").first().innerText()).includes(name));
    check(`${slug}: Solutions is the current header item`, (await page.locator('.nav-list a.nav-link[aria-current="page"]').innerText()).trim() === "解決方案");
    const noCases = (await page.locator("[data-related-cases]").count()) === 0;
    check(`${slug}: no cases block without published cases`, noCases);
  }

  // military: two integration solutions side by side, links to their own pages
  await page.goto(`${base}/tw/solutions/military/`, { waitUntil: "networkidle" });
  const feat = await page.$$eval(".featured .feat", (els) => els.map((e) => ({ top: Math.round(e.getBoundingClientRect().top), left: Math.round(e.getBoundingClientRect().left), href: e.querySelector("a")?.getAttribute("href"), title: e.querySelector("h3")?.textContent.trim() })));
  check("military: MUM-T and NOVA cards are side by side with links", feat.length === 2 && feat[0].top === feat[1].top && feat[0].left < feat[1].left && feat[0].href === "/tw/solutions/mum-t/" && feat[1].href === "/tw/solutions/nova/", JSON.stringify(feat));
  const milProducts = await page.$$eval("section[aria-labelledby=h-related] a[href^='/tw/products/']", (as) => [...new Set(as.map((a) => a.getAttribute("href")))]);
  check("military: related products come from the CMS relations", ["sut", "uav", "usv", "wargaming-table", "mortar-observation", "sniper-simulator", "machine-gun-simulator", "hmmwv-simulator", "tactical-boat-simulator"].every((s) => milProducts.includes(`/tw/products/${s}/`)), milProducts.join(","));
  // MUM-T / NOVA
  await page.goto(`${base}/tw/solutions/mum-t/`, { waitUntil: "networkidle" });
  const mumt = await page.$$eval("section[aria-labelledby=h-related] a", (as) => as.map((a) => a.getAttribute("href")));
  check("mum-t: related SUT, UAV, USV and its parent solution", ["/tw/products/sut/", "/tw/products/uav/", "/tw/products/usv/", "/tw/solutions/military/"].every((h) => mumt.includes(h)), mumt.join(","));
  check("mum-t: breadcrumb goes through Military Simulation", (await page.locator(".breadcrumb a[href='/tw/solutions/military/'], nav a[href='/tw/solutions/military/']").count()) > 0);
  await page.goto(`${base}/tw/solutions/nova/`, { waitUntil: "networkidle" });
  check("nova: approved context Hero and text-led sections replace missing concept pictures", (await page.locator(".page-hero img").count()) === 1 && (await page.locator("main .brand-default:visible").count()) === 0);
  // police / fire / smart city products
  await page.goto(`${base}/tw/solutions/police/`, { waitUntil: "networkidle" });
  const pol = await page.$$eval("section[aria-labelledby=h-related] a[href^='/tw/products/']", (as) => as.map((a) => a.getAttribute("href")));
  check("police: full-scale and portable products", pol.includes("/tw/products/full-scale-police-training/") && pol.includes("/tw/products/police-box/"));
  await page.goto(`${base}/tw/solutions/fire-rescue/`, { waitUntil: "networkidle" });
  check("fire: the VR extinguisher product", (await page.locator("section[aria-labelledby=h-related] a[href='/tw/products/fire-extinguisher-simulator/']").count()) > 0);
  check("fire: six fire scenes and three mode steps", (await page.locator(".scenarios .card").count()) === 6 && (await page.locator(".flow .step").count()) === 3);
  await page.goto(`${base}/tw/solutions/smart-city/`, { waitUntil: "networkidle" });
  check("smart city: no product cards, only the related solution", (await page.locator("section[aria-labelledby=h-related] a[href^='/tw/products/']").count()) === 0 && (await page.locator("section[aria-labelledby=h-related] a[href='/tw/solutions/fire-rescue/']").count()) > 0);
  check("smart city: seven application areas", (await page.locator(".feature, .plain .cap").count()) === 7);

  // sitemap, phone
  const sm = readFileSync(path.join(DIST, "sitemap.xml"), "utf8");
  check("sitemap lists all six solution pages (tw)", PAGES.every(([s]) => sm.includes(`/tw/solutions/${s}/`)));
  for (const [slug] of PAGES) {
    const phone = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await phone.goto(`${base}/tw/solutions/${slug}/`, { waitUntil: "networkidle" });
    check(`phone ${slug}: no horizontal scroll`, await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await phone.close();
  }
  const tablet = await browser.newPage({ viewport: { width: 820, height: 1000 } });
  for (const [slug] of PAGES) {
    await tablet.goto(`${base}/tw/solutions/${slug}/`, { waitUntil: "networkidle" });
    check(`tablet ${slug}: no horizontal scroll`, await tablet.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  }
} finally {
  await browser.close();
  stop();
}
console.log(failed ? `FAIL: ${failed}` : "PASS");
process.exit(failed ? 1 : 0);
