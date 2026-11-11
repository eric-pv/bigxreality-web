// Checks the built pages behave as specified: filtering, language switch,
// hreflang/canonical, noindex on pending translations, structured data,
// reverse product relations and contact request links. Exits 1 on failure.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import path from "node:path";
import { startPreview, CHROMIUM, DIST } from "./lib/serve.mjs";
import { publicSiteRoot } from "../src/lib/public-url.ts";
import { currentEntry, publishedSlugs } from "./lib/cms-content.mjs";

// Products, their copy, counts and relations are edited in Sveltia: expected values come from
// the current Git content (TW is the structural source), never from a snapshot of old copy.
const products = publishedSlugs("products").map((slug) => ({ slug, ...currentEntry("products", slug) }));
const inDomain = (d) => products.filter((p) => p.domains?.includes(d)).length;
const solutions = new Set(publishedSlugs("solutions"));
// Same rule as ProductLanding: integrations in either direction, listed related products, related solutions.
const relatedOf = (p) => [
  ...products.filter((o) => o.slug !== p.slug && ((p.integratedOps?.products ?? []).includes(o.slug) || (o.integratedOps?.products ?? []).includes(p.slug) || (p.relatedProducts ?? []).includes(o.slug))).map((o) => `/tw/products/${o.slug}/`),
  ...(p.relatedSolutions ?? []).filter((s) => solutions.has(s)).map((s) => `/tw/solutions/${s}/`),
];

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
  check(`overview lists ${products.length} products`, (await visibleCards()) === products.length);
  await page.getByRole("button", { name: "警勤" }).click();
  check(`domain filter: Police → ${inDomain("police")} cards`, (await visibleCards()) === inDomain("police"));
  check("filter state announced", (await page.locator("[data-status]").textContent()) === `共 ${inDomain("police")} 項產品`);
  check("filter state in URL", new URL(page.url()).searchParams.get("domain") === "police");
  await page.getByRole("button", { name: "消防防災" }).click();
  check(`domain filter: Fire & rescue → ${inDomain("fire-rescue")} card(s)`, (await visibleCards()) === inDomain("fire-rescue"));
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

  const sut = products.find((p) => p.slug === "sut"), S = sut.landing;
  const sutCaps = S.capabilities?.items?.length ?? 0, sutFlow = S.flow?.steps?.length ?? 0, sutScen = S.scenarios?.items?.length ?? 0, sutValues = S.values?.cards?.length ?? 0;
  await page.goto(`${base}/tw/products/sut/`, { waitUntil: "networkidle" });
  const alt = await page.$$eval('link[rel=alternate][hreflang]', (ls) => ls.map((l) => `${l.hreflang} ${l.href}`));
  check("hreflang en / zh-TW / ja / x-default", ["en", "zh-TW", "ja", "x-default"].every((h) => alt.some((a) => a.startsWith(h + " "))), alt.join(", "));
  check("canonical", (await page.$eval("link[rel=canonical]", (l) => l.href)) === `${publicSiteRoot}/tw/products/sut/`);
  check("html lang zh-Hant-TW", (await page.getAttribute("html", "lang")) === "zh-Hant-TW");
  check("source page is indexable", (await page.locator('meta[name=robots]').count()) === 0);
  const ld = JSON.parse(await page.$eval('script[type="application/ld+json"]', (s) => s.textContent));
  const types = ld["@graph"].map((g) => g["@type"]);
  check("JSON-LD Organization + BreadcrumbList + Product", ["Organization", "BreadcrumbList", "Product"].every((t) => types.includes(t)), types.join(", "));
  check("JSON-LD has no placeholder text", !JSON.stringify(ld).includes("[待"));
  check("language switch keeps the page", (await page.locator(".langs a", { hasText: "EN" }).getAttribute("href")) === "/en/products/sut/");
  const heroCta = await page.locator(".page-hero a.btn--primary").getAttribute("href");
  const footCta = await page.locator(".cta-band a.btn--primary").getAttribute("href");
  check("hero CTA opens the contact page for this product", heroCta === `/tw/contact/?topic=product&${new URLSearchParams({ item: sut.hero.code ?? sut.hero.name })}`, heroCta);
  check("closing CTA = hero CTA (shared definition)", footCta === heroCta, footCta);
  check("one red button in the hero", (await page.locator(".page-hero .btn--primary").count()) === 1 && (await page.locator(".site-header .btn--primary").count()) === 0);
  const toc = await page.$$eval("[data-toc] a", (as) => as.map((a) => a.hash));
  const ids = await page.$$eval("main section[id]", (ss) => ss.map((s) => "#" + s.id));
  check("in-page nav matches rendered sections", JSON.stringify(toc) === JSON.stringify(ids), toc.join(" "));
  // Product content only: the hidden inline inquiry form (InlineInquiry.astro) has its own heading and is checked separately.
  check("landing sections in order", JSON.stringify(await page.$$eval("main h2:not([data-inline-inquiry] h2)", (hs) => hs.map((h) => h.id))) === JSON.stringify(["landing-overview-title", "h-challenge", "h-approach", "h-capabilities", "h-scenarios", "h-block-0", "h-block-1", "h-block-2", "h-values", "h-related", "product-faq-title", "h-related-technologies", "product-cta"]));
  check("inline inquiry form follows product content, hidden until opened", await page.$eval("[data-inline-inquiry]", (s) => s.hidden && !!s.querySelector("h2#inline-inquiry-title")));
  const related = await page.locator("section[aria-labelledby=h-related] .smart-grid a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  check("related products and solution link to existing pages", relatedOf(sut).every((h) => related.includes(h)), related.join(" "));
  check("no UAV / USV card shows an English-name placeholder", (await page.locator("section[aria-labelledby=h-related] mark.pending").count()) === 0);
  const pillarTitle = await page.locator(".pillar h3").first().evaluate((h) => getComputedStyle(h).color);
  check("pillar titles are light on the dark card", pillarTitle === "rgb(255, 255, 255)", pillarTitle);
  check("each capability shows a training-value line", (await page.locator(".cap .value, .feature .value").count()) === sutCaps);
  const pillars = await page.locator(".pillar h3").allTextContents();
  check("value pillars are titled by value, not by technology", JSON.stringify(pillars.map((t) => t.trim())) === JSON.stringify((S.approach?.pillars ?? []).map((x) => x.title)), pillars.join(" | "));
  check("pillar text has no trailing full stop", (await page.locator(".pillar .text").allTextContents()).every((t) => !/[。.]$/.test(t.trim())));
  check("supplied Hero remains visible and missing body photos use text-led cards", (await page.locator('.page-hero img').count()) === 1 && (await page.locator('main .brand-default:visible').count()) === 0);
  check(`all ${sutCaps} capabilities remain present`, (await page.locator('.feature, .plain .cap').count()) === sutCaps);
  check("approach renders every assigned image", (await page.locator('.pair .media').count()) === (S.approach?.images ?? []).filter(image => image.src && image.alt && image.status !== "withheld").length);
  check("flow steps carry an icon each", (await page.locator(".flow .node svg").count()) === sutFlow);
  const widths = await page.locator(".scenarios .card").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
  check(`${sutScen} scenario cards, all the same width`, widths.length === sutScen && new Set(widths).size === 1, widths.join(","));
  const before = await page.locator(".scenarios .card").first().evaluate((e) => !e.querySelector("figure") || e.firstElementChild.classList.contains("media"));
  check("provided scenario images sit above text; missing images keep text cards", before);
  check("flow steps, scenarios and values match the Git content", (await page.locator(".flow .step").count()) === sutFlow && (await page.locator(".scenarios .card").count()) === sutScen && (await page.locator("section[aria-labelledby=h-values] .values .value").count()) === sutValues);
  check("review cards retain every training step", (await page.locator("section[aria-labelledby=h-block-0] .values .value").count()) === S.blocks[0].items.length);
  check("every target has its assigned image", (await page.locator(".scenarios .card img").count()) === sutScen);
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

  for (const p of products.filter((p) => p.landing)) {
    const { slug, landing: L } = p;
    const h1 = L.headline, scen = L.scenarios?.items?.length ?? 0, flowCount = L.flow?.steps?.length ?? 0, capCount = L.capabilities?.items?.length ?? 0;
    const cta = p.hero.code ?? p.hero.name;
    const related = relatedOf(p);
    await page.goto(`${base}/tw/products/${slug}/`, { waitUntil: "networkidle" });
    check(`${slug}: product identity in H1; V2.0 value headline retained`, !!(await page.locator("h1").innerText()).trim() && (await page.locator(".landing-overview h2").innerText()).trim() === h1);
    check(`${slug}: ${scen} scenario cards`, (await page.locator(".scenarios .card").count()) === scen);
    const galleryItems = (L.blocks ?? []).filter(b => b.kind === "media").flatMap(b => b.items ?? []);
    check(`${slug}: ${galleryItems.length} media-gallery cards`, (await page.locator(".media-gallery .card").count()) === galleryItems.length);
    check(`${slug}: all approved gallery images are rendered`, (await page.locator(".media-gallery .card img").count()) === galleryItems.filter(item => item.image?.src && item.image.alt && item.image.status !== "withheld").length);
    check(`${slug}: ${flowCount} flow steps, ${capCount} capabilities`, (await page.locator(".flow .step").count()) === flowCount && (await page.locator(".feature, .plain .cap").count()) === capCount);
    const hrefs = await page.locator("a[href]").evaluateAll((els) => els.map((e) => e.getAttribute("href")));
    check(`${slug}: related links`, related.every((h) => hrefs.includes(h)), related.filter((h) => !hrefs.includes(h)).join(" "));
    check(`${slug}: CTA goes to the contact page with the product code`, hrefs.some((h) => h.includes(`/tw/contact/?topic=product&${new URLSearchParams({ item: cta })}`)));
    check(`${slug}: no visible 待提供 text`, (await page.locator("main section:not(.cta-band):not(#related-products) mark.pending").count()) === 0);
    check(`${slug}: approved primary hero image loads`, await page.locator(".page-hero img[data-primary-image]").evaluate(img => img.complete && img.naturalWidth > 0));
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
  for (const { slug } of products) {
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

  // English and Japanese solution, product and company pages are translated; the search page copy is not yet.
  await page.goto(`${base}/en/search/`, { waitUntil: "networkidle" });
  check("pending translation → noindex", (await page.getAttribute('meta[name=robots]', "content")) === "noindex");
  check("pending translation banner", await page.locator(".translation-banner").isVisible());
  check("html lang en", (await page.getAttribute("html", "lang")) === "en");

  const sitemap = await (await fetch(`${base}/sitemap.xml`)).text();
  check("sitemap excludes pending pages", !sitemap.includes("/en/search/</loc>") && !sitemap.includes("/jp/search/</loc>") && sitemap.includes("/en/company/</loc>") && sitemap.includes("/jp/company/</loc>") && sitemap.includes("/en/products/</loc>") && sitemap.includes("/jp/news/") && sitemap.includes("/tw/products/sut/") && sitemap.includes("/jp/products/sut/"));
  // Static build: / is a meta-refresh page (the Pages packager replaces it with the published start page).
  const root = readFileSync(path.join(DIST, "index.html"), "utf8");
  check("/ redirects to /en/ (meta refresh)", /<meta http-equiv="refresh" content="0;\s*url=\/en\/"/i.test(root));
} finally {
  await browser.close();
  stop();
}
console.log(failed ? `FAIL: ${failed}` : "PASS");
process.exit(failed ? 1 : 0);
