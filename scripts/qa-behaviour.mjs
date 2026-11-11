// Checks the built pages behave as specified: filtering, language switch,
// hreflang/canonical, noindex on pending translations, structured data,
// reverse product relations and disabled form buttons. Exits 1 on failure.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import path from "node:path";
import { startPreview, CHROMIUM, DIST } from "./lib/serve.mjs";

const { base, stop } = await startPreview(4331);
const browser = await chromium.launch({ executablePath: CHROMIUM });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
let failed = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
};
const visibleCards = () => page.locator("#product-grid > li:not([hidden])").count();

try {
  await page.goto(`${base}/tw/products/`, { waitUntil: "networkidle" });
  check("overview lists 12 products", (await visibleCards()) === 12);
  await page.getByRole("button", { name: "警勤" }).click();
  check("domain filter: Police → 2 cards", (await visibleCards()) === 2);
  check("filter state announced", (await page.locator("[data-status]").textContent()) === "共 2 項產品");
  check("filter state in URL", new URL(page.url()).searchParams.get("domain") === "police");
  await page.getByRole("button", { name: "消防防災" }).click();
  check("domain filter: Fire & rescue → 1 card", (await visibleCards()) === 1);
  await page.getByLabel("搜尋產品").fill("zzz");
  check("no match → empty message", (await visibleCards()) === 0 && (await page.locator("[data-filter-empty]").isVisible()));
  await page.getByLabel("搜尋產品").fill("");
  await page.getByRole("button", { name: "軍事" }).click();
  check("domain filter: Military → 9 cards", (await visibleCards()) === 9);
  check("pressed state", (await page.getByRole("button", { name: "軍事" }).getAttribute("aria-pressed")) === "true");
  await page.getByLabel("搜尋產品").fill("usv");
  check("text filter: 'usv' → 1 card", (await visibleCards()) === 1);
  await page.getByLabel("搜尋產品").fill("無人機");
  check("text filter: '無人機' → 1 card (UAV)", (await visibleCards()) === 1);
  await page.goto(`${base}/tw/products/?domain=police`, { waitUntil: "networkidle" });
  check("filter restored from URL", (await visibleCards()) === 2);
  await page.goto(`${base}/tw/products/?domain=smart-city`, { waitUntil: "networkidle" });
  check("?domain=smart-city is not a product category → all 12 shown", (await visibleCards()) === 12);

  // Products overview: the twelve products and the three product categories only. Integration
  // solutions (MUM-T, NOVA) and Smart City live under Solutions, never on this page.
  const CHIPS = {
    tw: ["軍事訓練", "警勤訓練", "消防防災"],
    en: ["Military Training", "Police Training", "Fire & Disaster Prevention"],
    jp: ["軍事訓練", "警察訓練", "消防・防災"],
  };
  for (const l of ["tw", "en", "jp"]) {
    await page.goto(`${base}/${l}/products/`, { waitUntil: "networkidle" });
    check(`${l} overview: 12 products`, (await page.locator("#product-grid > li").count()) === 12);
    const domains = await page.$$eval("[data-filter-bar] button[data-domain]", (bs) => bs.map((b) => b.dataset.domain));
    check(`${l} overview: filter = all + military / police / fire-rescue`, JSON.stringify(domains) === JSON.stringify(["", "military", "police", "fire-rescue"]), domains.join(","));
    const chips = await page.$$eval("[data-filter-bar] button[data-domain]:not([data-domain=''])", (bs) => bs.map((b) => b.textContent.trim()));
    check(`${l} overview: product category labels`, JSON.stringify(chips) === JSON.stringify(CHIPS[l]), chips.join(","));
    // The header and footer link to the Solutions pages (Smart City, MUM-T, NOVA); only the page body and head are checked.
    // "Counter-UAS" may appear only inside the product grid (it is part of the UAV product's English name).
    const head = await page.$eval("head", (h) => h.innerHTML);
    const main = await page.$eval("main", (m) => m.outerHTML);
    const outsideGrid = await page.$eval("main", (m) => { const c = m.cloneNode(true); c.querySelector("#product-grid")?.remove(); return c.outerHTML; });
    const leaked = ["Integrated Training", "整合訓練情境", "MUM-T", "NOVA", "smart-city", "SMART CITY", "智慧城市", "Smart City", "スマートシティ", "#integrated"].filter((w) => (head + main).includes(w));
    if ((head + outsideGrid).includes("Counter-UAS")) leaked.push("Counter-UAS");
    check(`${l} overview: no integrated training block or Smart City category`, leaked.length === 0, leaked.join(","));
  }

  await page.goto(`${base}/tw/products/sut/`, { waitUntil: "networkidle" });
  const alt = await page.$$eval('link[rel=alternate][hreflang]', (ls) => ls.map((l) => `${l.hreflang} ${l.href}`));
  check("hreflang en / zh-Hant-TW / ja / x-default", ["en", "zh-Hant-TW", "ja", "x-default"].every((h) => alt.some((a) => a.startsWith(h + " "))), alt.join(", "));
  check("canonical", (await page.$eval("link[rel=canonical]", (l) => l.href)) === "https://www.bigxreality.com/tw/products/sut/");
  check("html lang zh-Hant-TW", (await page.getAttribute("html", "lang")) === "zh-Hant-TW");
  check("source page is indexable", (await page.locator('meta[name=robots]').count()) === 0);
  const ld = JSON.parse(await page.$eval('script[type="application/ld+json"]', (s) => s.textContent));
  const types = ld["@graph"].map((g) => g["@type"]);
  check("JSON-LD Organization + BreadcrumbList + Product", ["Organization", "BreadcrumbList", "Product"].every((t) => types.includes(t)), types.join(", "));
  check("JSON-LD has no placeholder text", !JSON.stringify(ld).includes("[待"));
  check("language switch keeps the page", (await page.locator(".langs a", { hasText: "EN" }).getAttribute("href")) === "/en/products/sut/");
  const heroCta = await page.locator(".page-hero a.btn--primary").getAttribute("href");
  const footCta = await page.locator(".cta-band a.btn--primary").getAttribute("href");
  check("hero CTA opens the contact page for this product", heroCta === "/tw/contact/?topic=product&item=SUT", heroCta);
  check("closing CTA = hero CTA (shared definition)", footCta === heroCta, footCta);
  check("one red button in the hero", (await page.locator(".page-hero .btn--primary").count()) === 1 && (await page.locator(".site-header .btn--primary").count()) === 0);
  const toc = await page.$$eval("[data-toc] a", (as) => as.map((a) => a.hash));
  const ids = await page.$$eval("main section[id]", (ss) => ss.map((s) => "#" + s.id));
  check("in-page nav matches rendered sections", JSON.stringify(toc) === JSON.stringify(ids), toc.join(" "));
  check("landing sections in order", JSON.stringify(await page.$$eval("main h2", (hs) => hs.map((h) => h.id))) === JSON.stringify(["h-challenge", "h-approach", "h-capabilities", "h-flow", "h-scenarios", "h-values", "h-related", "product-faq-title", "h-related-technologies", "product-cta"]));
  const related = await page.locator("section[aria-labelledby=h-related] .smart-grid a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  check("related products and solution link to existing pages", ["/tw/products/uav/", "/tw/products/usv/", "/tw/solutions/military/"].every((h) => related.includes(h)), related.join(" "));
  check("no UAV / USV card shows an English-name placeholder", (await page.locator("section[aria-labelledby=h-related] mark.pending").count()) === 0);
  const pillarTitle = await page.locator(".pillar h3").first().evaluate((h) => getComputedStyle(h).color);
  check("pillar titles are light on the dark card", pillarTitle === "rgb(255, 255, 255)", pillarTitle);
  check("each capability shows a training-value line", (await page.locator(".cap .value, .feature .value").count()) === 5);
  const pillars = await page.locator(".pillar h3").allTextContents();
  check("value pillars are titled by value, not by technology", JSON.stringify(pillars) === JSON.stringify(["沉浸式戰術訓練", "任務資訊與空間判讀", "動態情境與應變訓練"]), pillars.join(" | "));
  check("pillar text has no trailing full stop", (await page.locator(".pillar .text").allTextContents()).every((t) => !/[。.]$/.test(t.trim())));
  const slots = await page.locator("main .placeholder").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label")));
  const need = slots.filter((l) => l.startsWith("素材需求｜"));
  check("10 image positions on the page, each names the material needed", need.length === 10, `${need.length} of ${slots.length}`);
  check("capability rows: 3 picture rows and 2 text-only rows (02 and 05)", (await page.locator(".feature").count()) === 3 && (await page.locator(".plain .cap").count()) === 2);
  check("capability picture rows alternate sides", (await page.locator(".feature.flip").count()) === 1);
  check("approach shows a physical + virtual image pair", (await page.locator(".pair .media").count()) === 2);
  check("flow steps carry an icon each", (await page.locator(".flow .node svg").count()) === 4);
  const widths = await page.locator(".scenarios .card").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
  check("four scenario cards, all the same width", widths.length === 4 && new Set(widths).size === 1, widths.join(","));
  const before = await page.locator(".scenarios .card").first().evaluate((e) => e.firstElementChild.classList.contains("media"));
  check("scenario image sits above the title", before);
  check("flow has four steps, scenarios four, values four", (await page.locator(".flow .step").count()) === 4 && (await page.locator(".scenarios .card").count()) === 4 && (await page.locator(".values .value").count()) === 4);
  check("no AIDA wording shown on the page", !/\bAIDA\b|Attention|Desire/.test(await page.locator("main").innerText()));
  check("no pending markers on the landing page body", (await page.locator("main section:not(.cta-band) mark.pending").count()) === 0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/tw/products/sut/`, { waitUntil: "networkidle" });
  check("phone: no horizontal scroll", (await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)));
  const cta = await page.locator(".page-hero a.btn--primary").boundingBox();
  check("phone: hero CTA is in the first screen and at least 44 px tall", cta && cta.y + cta.height < 844 && cta.height >= 44, JSON.stringify(cta));
  check("phone: pair, features and cards stack to one column", (await page.locator(".scenarios .card").evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().left))).size)) === 1);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/tw/contact/?topic=product&item=SUT`, { waitUntil: "networkidle" });
  const mail = await page.locator("[data-mailto]").getAttribute("href");
  check("contact page: topic + product in the e-mail subject", mail.startsWith("mailto:") && decodeURIComponent(mail).includes("產品洽詢 – SUT"), mail);

  for (const [slug, h1, scen, related, cta, flowCount = 4, capCount = 5] of [
    ["uav", "從掌握空中任務，到應對低空威脅", 5, ["/tw/products/sut/", "/tw/products/usv/", "/tw/solutions/military/"], "UAV"],
    ["usv", "讓無人船任務訓練，從虛擬海域開始", 3, ["/tw/products/sut/", "/tw/products/uav/", "/tw/solutions/military/"], "USV"],
    ["wargaming-table", "整合多元訓練資訊，建構更完整的指揮決策視野", 4, ["/tw/products/sut/", "/tw/solutions/military/"], "兵棋圖台系統", 0],
    ["mortar-observation", "讓砲兵觀測訓練，不再受限於單一戰場情境", 4, ["/tw/products/wargaming-table/", "/tw/solutions/military/"], "迫擊砲觀測模擬系統"],
    ["sniper-simulator", "精準射擊的訓練，從理解每一項環境變因開始", 4, ["/tw/products/machine-gun-simulator/", "/tw/products/sut/", "/tw/solutions/military/"], "狙擊槍模擬系統"],
    ["machine-gun-simulator", "讓射擊訓練，從操作熟悉延伸至任務判斷", 4, ["/tw/products/sniper-simulator/", "/tw/products/sut/", "/tw/solutions/military/"], "機槍模擬系統"],
    ["hmmwv-simulator", "讓軍用車輛駕駛訓練，延伸至更多任務情境", 4, ["/tw/products/tactical-boat-simulator/", "/tw/products/sut/", "/tw/solutions/military/"], "悍馬車載具訓練系統"],
    ["tactical-boat-simulator", "讓海上操艇訓練，從可控的模擬環境開始", 4, ["/tw/products/usv/", "/tw/products/hmmwv-simulator/", "/tw/solutions/military/"], "快艇載具訓練系統"],
    ["full-scale-police-training", "讓警勤訓練走進更接近真實的勤務現場", 4, ["/tw/products/police-box/", "/tw/products/sut/", "/tw/solutions/police/"], "全配式警勤訓練系統（On-sited）"],
    ["police-box", "讓警勤模擬訓練，不再受限於固定場域", 4, ["/tw/products/full-scale-police-training/", "/tw/products/sut/", "/tw/solutions/police/"], "攜帶式警勤訓練器（BOX）"],
    ["fire-extinguisher-simulator", "從認識火災到實際操作，讓滅火訓練更接近真實應變", 6, ["/tw/solutions/fire-rescue/"], "VR 虛擬滅火訓練系統", 4, 6],
  ]) {
    await page.goto(`${base}/tw/products/${slug}/`, { waitUntil: "networkidle" });
    check(`${slug}: H1 is the V2.0 headline`, (await page.locator("h1").innerText()).trim() === h1);
    check(`${slug}: ${scen} scenario cards`, (await page.locator(".scenarios .card").count()) === scen);
    check(`${slug}: ${flowCount} flow steps, ${capCount} capabilities`, (await page.locator(".flow .step").count()) === flowCount && (await page.locator(".feature, .plain .cap").count()) === capCount);
    const hrefs = await page.locator("a[href]").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
    check(`${slug}: related links`, related.every((h) => hrefs.includes(h)), related.filter((h) => !hrefs.includes(h)).join(" "));
    check(`${slug}: CTA goes to the contact page with the product code`, hrefs.some((h) => h.includes(`/tw/contact/?topic=product&${new URLSearchParams({ item: cta })}`)));
    check(`${slug}: no visible 待提供 text`, (await page.locator("main section:not(.cta-band):not(#related-products) mark.pending").count()) === 0);
    check(`${slug}: hero image placeholder is designed`, (await page.locator(".page-hero [role=img]").count()) >= 1);
    await page.setViewportSize({ width: 390, height: 844 });
    check(`${slug}: phone has no horizontal scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    await page.setViewportSize({ width: 1440, height: 900 });
  }

  // success cases: no real case is published yet, so the section must open cleanly and stay honest
  await page.goto(`${base}/tw/products/`, { waitUntil: "networkidle" });
  check("header: 成功案例 sits in the 資源中心 menu", (await page.locator('#sub-resources a[href="/tw/cases/"]').textContent()).trim() === "成功案例" && (await page.locator('.nav-list > li > a[href="/tw/cases/"]').count()) === 0);
  await page.goto(`${base}/tw/cases/`, { waitUntil: "networkidle" });
  check("cases list opens with an empty state and no cards", (await page.locator("[data-case-empty]").isVisible()) && (await page.locator("article.card").count()) === 0);
  check("cases list without cases is noindex", (await page.getAttribute('meta[name=robots]', "content")) === "noindex");
  check("cases list heading and sub-heading", (await page.locator("h1").innerText()).trim() === "成功案例" && (await page.locator(".page-hero .lead").innerText()).includes("從實際導入經驗，看見沉浸式模擬訓練的應用價值"));
  for (const slug of ["sut", "uav", "usv", "wargaming-table", "mortar-observation", "sniper-simulator", "machine-gun-simulator", "hmmwv-simulator", "tactical-boat-simulator", "full-scale-police-training", "police-box", "fire-extinguisher-simulator"]) {
    await page.goto(`${base}/tw/products/${slug}/`, { waitUntil: "networkidle" });
    if ((await page.locator("[data-related-cases]").count()) !== 0 || (await page.content()).includes("實際應用案例")) check(`${slug}: no cases block without cases`, false);
  }
  check("product pages show no cases block without published cases", true);
  await page.goto(`${base}/tw/products/`, { waitUntil: "networkidle" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click(".menu-toggle");
  await page.click('[aria-controls="sub-resources"]');
  check("header: 成功案例 link in the phone menu", await page.locator('#sub-resources a[href="/tw/cases/"]').isVisible());
  await page.setViewportSize({ width: 1440, height: 900 });
  check("sitemap has no cases url while no case is published", !readFileSync(path.join(DIST, "sitemap.xml"), "utf8").includes("/cases/"));

  // English and Japanese solution and product pages and the product index are translated; the company page is not yet.
  await page.goto(`${base}/en/company/`, { waitUntil: "networkidle" });
  check("pending translation → noindex", (await page.getAttribute('meta[name=robots]', "content")) === "noindex");
  check("pending translation banner", await page.locator(".translation-banner").isVisible());
  check("html lang en", (await page.getAttribute("html", "lang")) === "en");

  const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
  check("sitemap excludes pending pages", !sitemap.includes("/en/company/</loc>") && !sitemap.includes("/jp/company/</loc>") && sitemap.includes("/en/products/</loc>") && !sitemap.includes("/jp/news/") && sitemap.includes("/tw/products/sut/") && sitemap.includes("/jp/products/sut/"));
  // Cloudflare serves dist/client/_redirects; the static QA server does not, so check the rule itself.
  const redirects = readFileSync(path.join(DIST, "_redirects"), "utf8");
  check("/ redirects to /en/ (301)", /^\/\s+\/en\/\s+301$/m.test(redirects));
} finally {
  await browser.close();
  stop();
}
console.log(failed ? `FAIL: ${failed}` : "PASS");
process.exit(failed ? 1 : 0);
