// Footer checks against the normal build (npm run build): on every built page the Footer link
// columns are the same tree as the Header menu (labels, order, hierarchy, URLs), every Footer link
// resolves, the contact links are right for each language, no empty social block is shown, and
// the Footer fits at phone, tablet and desktop widths.
import { readdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import { startPreview, resolveDist, CHROMIUM, DIST } from "./lib/serve.mjs";

let failed = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failed++;
  if (!ok || process.env.VERBOSE) console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : `  — ${detail}`}`);
};

async function* htmlPages(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && e.name !== "admin") yield* htmlPages(p);
    else if (e.name === "index.html") yield "/" + path.relative(DIST, p).replace(/index\.html$/, "");
  }
}

// Text of an element without its screen-reader-only notes.
const TREES = () => {
  const text = (el) => {
    const c = el.cloneNode(true);
    c.querySelectorAll(".visually-hidden").forEach((n) => n.remove());
    return c.textContent.replace(/\s+/g, " ").trim();
  };
  const node = (el) => ({ label: text(el), href: el.tagName === "A" ? el.getAttribute("href") : null });
  const header = [...document.querySelectorAll(".site-header .nav-list > li")].map((li) => ({
    ...node(li.querySelector(":scope > .nav-heading > .nav-link")),
    children: [...li.querySelectorAll(":scope > .sub > li > .sub-link")].map(node),
  }));
  const footer = [...document.querySelectorAll(".site-footer .menu-list > li")].map((li) => ({
    ...node(li.querySelector(":scope > .item, :scope > details > summary.item")),
    href: li.querySelector(":scope > details > summary > a, :scope > a.item")?.getAttribute("href") ?? null,
    children: [...li.querySelectorAll(".sub > li > .sub-item")].map(node),
  }));
  const openGroups = document.querySelectorAll(".site-footer details[open]").length;
  const links = [...document.querySelectorAll(".site-footer a[href]")].map((a) => ({ href: a.getAttribute("href"), target: a.target, rel: a.rel }));
  return { header, footer, links, openGroups, lang: document.documentElement.lang };
};

const CONTACT = {
  tw: { phone: "02-8791-6811", address: "台北市大安區復興南路一段368號5樓" },
  en: { phone: "+886-2-8791-6811", address: "5F., No. 368, Sec. 1, Fuxing S. Rd., Da'an Dist., Taipei City, Taiwan" },
  jp: { phone: "+886-2-8791-6811", address: "台湾・台北市大安区復興南路一段368号5階" },
};
const MAP = "https://maps.app.goo.gl/JP7JfUAfWUWUu3FP9";

const { base, stop } = await startPreview(4335);
const browser = await chromium.launch({ executablePath: CHROMIUM });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pages = [];
  for await (const p of htmlPages(DIST)) if (/^\/(tw|en|jp)\//.test(p)) pages.push(p);
  const reference = {};
  let homeLinks = 0;
  for (const p of pages.sort()) {
    const l = p.split("/")[1];
    await page.goto(base + p, { waitUntil: "domcontentloaded" });
    const t = await page.evaluate(TREES);
    if (!t.header.length && !t.footer.length) continue; // redirect stubs
    check(`${p}: Footer columns = Header menu`, JSON.stringify(t.header) === JSON.stringify(t.footer), `header ${JSON.stringify(t.header)}\n      footer ${JSON.stringify(t.footer)}`);
    reference[l] ??= t.footer;
    check(`${p}: Footer desktop columns start expanded`, t.openGroups === t.footer.filter(group => group.children.length).length);
    check(`${p}: same Footer as the other ${l} pages`, JSON.stringify(t.footer) === JSON.stringify(reference[l]));
    for (const a of t.links) {
      if (/^(tel:|mailto:|https?:)/.test(a.href)) continue;
      // The logo links home like the Header logo and breadcrumbs; the home page is not built yet.
      if (a.href === `/${l}/`) { homeLinks++; continue; }
      check(`${p}: Footer link ${a.href} exists`, !!(await resolveDist(new URL(a.href, base + p).pathname)));
    }
    check(`${p}: no "#" links in the Footer`, !t.links.some((a) => a.href === "#" || a.href === ""));
  }
  for (const l of ["tw", "en", "jp"]) {
    console.log(`${l} footer menu: ${reference[l].map((c) => `${c.label}${c.children.length ? ` [${c.children.map((k) => k.label).join(", ")}]` : ""}`).join(" | ")}`);
    await page.goto(`${base}/${l}/products/`, { waitUntil: "domcontentloaded" });
    const f = page.locator(".site-footer");
    check(`${l}: phone link`, (await f.locator('a[href="tel:+886287916811"]').textContent())?.trim() === CONTACT[l].phone);
    check(`${l}: email link`, (await f.locator('a[href="mailto:service@gptt.com.tw"]').count()) === 1);
    const map = f.locator(`a[href="${MAP}"]`);
    check(`${l}: address opens Google Maps in a new tab`, (await map.count()) === 1 && (await map.getAttribute("target")) === "_blank" && /noopener/.test(await map.getAttribute("rel")) && (await map.textContent()).includes(CONTACT[l].address));
    check(`${l}: no empty social block`, (await f.locator(".social").count()) === 0 || (await f.locator(".social a[href^='http']").count()) > 0);
    check(`${l}: no pending marker in the Footer`, !(await f.textContent()).includes("[待提供]"));
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      check(`${l} @${width}: no horizontal scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  console.log(`checked ${pages.length} pages; logo → home page (not built yet, same as the Header logo): ${homeLinks} page(s)`);
} finally {
  await browser.close();
  stop();
}
console.log(failed ? `\n${failed} check(s) failed` : "\nall footer checks passed");
process.exit(failed ? 1 : 0);
