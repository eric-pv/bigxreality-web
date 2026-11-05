import {contentLocale} from "../../src/lib/content-locale.ts";
import {publicUrl} from '../../src/lib/public-url.ts';
// Shared checks for the English and Japanese product and solution pages (qa-english.mjs, qa-japanese.mjs).
// The Traditional Chinese pages are the master: every localized page must render its own content file
// (headline, hero button, name), keep the same sections and item counts as the Chinese page, carry the
// five product FAQs with FAQPage JSON-LD, keep the scope statements, and show no Chinese placeholder text.
import { chromium } from "playwright-core";
import { readFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { startPreview, CHROMIUM, DIST } from "./serve.mjs";

export const PRODUCTS = ["sut", "uav", "usv", "wargaming-table", "mortar-observation", "sniper-simulator", "machine-gun-simulator", "hmmwv-simulator", "tactical-boat-simulator", "full-scale-police-training", "police-box", "fire-extinguisher-simulator"];
export const SOLUTIONS = ["military", "mum-t", "nova", "police", "fire-rescue", "smart-city"];
const MILITARY_PRODUCTS = ["sut", "uav", "wargaming-table", "mortar-observation", "sniper-simulator", "machine-gun-simulator", "hmmwv-simulator", "tactical-boat-simulator", "usv"];

const content = (kind, lang, slug) => YAML.parse(readFileSync(path.join("src/content", kind, contentLocale(lang), `${slug}.md`), "utf8").split(/^---$/m)[1]);

/**
 * @param {object} o
 * @param {"en"|"jp"} o.lang
 * @param {number} o.port
 * @param {RegExp} o.foreign text that must not appear in the page body (Chinese characters for English)
 * @param {object} o.nav expected top navigation labels, Resources items and contact button
 * @param {Record<string, string[]>} o.scope product slug → statements that must appear on its page
 * @param {string} o.htmlLang
 */
export async function runLocalizedQa({ lang, port, foreign, nav, scope, htmlLang }) {
  let failed = 0;
  const check = (name, ok, detail = "") => {
    if (!ok) failed++;
    console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : `  — ${detail}`}`);
  };
  const { base, stop } = await startPreview(port);
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  const html = (p) => readFileSync(path.join(DIST, p, "index.html"), "utf8");
  const outline = (page) =>
    page.locator("main > section").evaluateAll((ss) => ss.map((s) => [s.querySelectorAll("h3, h4").length, s.querySelectorAll("li").length, s.querySelectorAll("img, [role=img]").length]));
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    // navigation labels
    await page.goto(`${base}/${lang}/solutions/`, { waitUntil: "networkidle" });
    const top = await page.$$eval(".nav-list > li", (lis) => lis.map((li) => { const el = li.querySelector("a,button,span.nav-link")?.cloneNode(true); el?.querySelectorAll(".visually-hidden").forEach((n) => n.remove()); return (el?.textContent ?? "").trim(); }));
    check("nav: top-level labels", JSON.stringify(top) === JSON.stringify(nav.top), top.join(" | "));
    check("nav: Resources items", JSON.stringify(await page.$$eval("#sub-resources a", (as) => as.map((a) => a.textContent.trim()))) === JSON.stringify(nav.resources));
    check("nav: contact button", (await page.locator("a.contact").innerText()).trim() === nav.contact);

    // solutions landing: same blocks as the Chinese page, four category cards, no closing band (the master has none)
    const overview = YAML.parse(readFileSync(`src/content/pages/${contentLocale(lang)}/solutions.md`, "utf8").split(/^---$/m)[1]);
    check("landing: headline", (await page.locator("h1").innerText()).trim() === overview.hero.title);
    const cards = await page.$$eval("#solution-list article.card .title", (hs) => hs.map((h) => h.textContent.trim()));
    check("landing: four category cards in order", JSON.stringify(cards) === JSON.stringify(["military", "police", "fire-rescue", "smart-city"].map((s) => content("solutions", lang, s).name)), cards.join(" | "));
    check("landing: four approach items, no closing band", (await page.locator("section[aria-labelledby=h-highlights] .value").count()) === 4 && (await page.locator("section[aria-labelledby=solutions-cta]").count()) === 0);
    const twOverview = await (async () => { const p = await browser.newPage(); await p.goto(`${base}/tw/solutions/`, { waitUntil: "networkidle" }); const o = await outline(p); await p.close(); return o; })();
    check("landing: same sections and items as the Chinese page", JSON.stringify(await outline(page)) === JSON.stringify(twOverview));

    const pages = [...SOLUTIONS.map((s) => ["solutions", s]), ...PRODUCTS.map((p) => ["products", p])];
    for (const [kind, slug] of pages) {
      const url = `/${lang}/${kind}/${slug}/`;
      const d = content(kind, lang, slug);
      const name = kind === "products" ? d.hero.name : d.name;
      const tw = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await tw.goto(`${base}/tw/${kind}/${slug}/`, { waitUntil: "networkidle" });
      await page.goto(base + url, { waitUntil: "networkidle" });
      const body = await page.locator("main").innerText();
      check(`${url}: product/solution identity in H1 and value headline retained`, (await page.locator("h1").innerText()).trim() === name && (await page.locator(".landing-overview h2").innerText()).trim() === d.landing.headline);
      check(`${url}: hero button label`, (await page.locator(".page-hero a.btn").first().innerText()).trim() === d.landing.ctaLabel);
      check(`${url}: approved SEO title (or name) in title`, (await page.title()).startsWith((d.seo?.title ?? name).replace(/\s*[|｜]\s*(?:Big\s*x\s*Reality|BXR)\s*$/i, "")));
      check(`${url}: no Chinese or placeholder text`, !foreign.test(body) && !body.includes("[待"), (body.match(foreign)?.[0] ?? "") + (body.includes("[待") ? " [待" : ""));
      const [o, t] = [await outline(page), await outline(tw)];
      check(`${url}: same sections and items as the Chinese page`, JSON.stringify(o) === JSON.stringify(t), `${JSON.stringify(o)} vs ${JSON.stringify(t)}`);
      check(`${url}: no back link (the Chinese page has none)`, (await page.locator(".back a").count()) === 0);
      const raw = html(`${lang}/${kind}/${slug}`);
      check(`${url}: indexable, canonical and hreflang`, !/name="robots" content="noindex"/.test(raw) && raw.includes(`rel="canonical" href="${publicUrl(url).href}"`) && raw.includes('hreflang="zh-TW"') && !raw.includes("translation-banner"));
      const empties = await page.locator("main section").evaluateAll((ss) => ss.filter((s) => !s.innerText.trim()).length);
      check(`${url}: no empty sections`, empties === 0);
      if (kind === "products") {
        const items = await page.$$eval("[data-faq] details", (ds) => ds.map((x) => [x.querySelector("summary h3").textContent.trim(), x.querySelector(".a").textContent.trim(), x.open]));
        check(`${url}: five FAQ items from the content file, all collapsed`, items.length === 5 && items.every((r, i) => r[0] === d.faq[i].question && r[1] === d.faq[i].answer && !r[2]));
        const ld = [...raw.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap((x) => JSON.parse(x[1])["@graph"] ?? []).find((n) => n["@type"] === "FAQPage");
        check(`${url}: FAQPage JSON-LD in ${htmlLang}`, !!ld && ld.mainEntity.length === 5 && ld.inLanguage === htmlLang);
        // FAQ answers sit in collapsed <details>, so read the full text content rather than the rendered text.
        const all = await page.locator("main").textContent();
        for (const s of scope[slug] ?? []) check(`${url}: scope statement kept — ${s.slice(0, 40)}…`, all.includes(s));
      }
      await tw.close();
    }

    // single-open accordion on a localized page
    await page.goto(`${base}/${lang}/products/sut/`, { waitUntil: "networkidle" });
    const sum = page.locator("[data-faq] summary");
    await sum.nth(0).click();
    await sum.nth(2).click();
    check("faq: opening another closes the previous one", JSON.stringify(await page.$$eval("[data-faq] details", (ds) => ds.map((x) => x.open))) === "[false,false,true,false,false]");

    // relations
    const rel = async (url, sel = "main section[aria-labelledby=h-related] a") => { await page.goto(base + url, { waitUntil: "networkidle" }); return page.locator(sel).evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")))]); };
    const mil = await rel(`/${lang}/solutions/military/`, `main a[href^='/${lang}/products/']`);
    check("military: its nine products are linked", MILITARY_PRODUCTS.every((s) => mil.includes(`/${lang}/products/${s}/`)));
    const milFeat = await page.locator(".featured .feat a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    check("military: MUM-T and NOVA are its two sub-solutions", JSON.stringify(milFeat) === JSON.stringify([`/${lang}/solutions/mum-t/`, `/${lang}/solutions/nova/`]));
    const pol = await rel(`/${lang}/solutions/police/`);
    check("police: both police products are related", ["full-scale-police-training", "police-box"].every((s) => pol.includes(`/${lang}/products/${s}/`)));
    check("fire: related product", (await rel(`/${lang}/solutions/fire-rescue/`)).includes(`/${lang}/products/fire-extinguisher-simulator/`));
    check("smart city: no product cards", (await rel(`/${lang}/solutions/smart-city/`, `main a[href^='/${lang}/products/']`)).length === 0);
    check("no case study blocks without published cases", (await page.locator("[data-related-cases]").count()) === 0);

    // products overview: no integrated training block
    await page.goto(`${base}/${lang}/products/`, { waitUntil: "networkidle" });
    check("products overview: twelve cards, no integrated block", (await page.locator("#product-grid article.card").count()) === 12 && (await page.locator("#integrated").count()) === 0);

    // sitemap and phone / tablet
    const sm = readFileSync(path.join(DIST, "sitemap.xml"), "utf8");
    check("sitemap lists the solutions and products", pages.every(([k, s]) => sm.includes(`/${lang}/${k}/${s}/`)) && sm.includes(`/${lang}/solutions/`));
    for (const [w, label] of [[390, "phone"], [820, "tablet"]]) {
      const v = await browser.newPage({ viewport: { width: w, height: 900 } });
      for (const p of [`/${lang}/solutions/`, `/${lang}/solutions/military/`, `/${lang}/solutions/police/`, `/${lang}/solutions/smart-city/`, `/${lang}/products/sut/`, `/${lang}/products/usv/`, `/${lang}/products/fire-extinguisher-simulator/`]) {
        await v.goto(base + p, { waitUntil: "networkidle" });
        check(`${label} ${p}: no horizontal scroll`, await v.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      }
      await v.close();
    }
  } finally {
    await browser.close();
    stop();
  }
  console.log(failed ? `FAIL: ${failed}` : "PASS");
  process.exit(failed ? 1 : 0);
}
