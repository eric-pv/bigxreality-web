// axe-core (WCAG 2.0/2.1 A + AA) on the phase 1 QA pages and the 404 page at 1440 px and 390 px,
// plus a keyboard check of the mobile menu. Exits 1 on any serious/critical issue.
import { chromium } from "playwright-core";
import { AxeBuilder } from "@axe-core/playwright";
import { startPreview, CHROMIUM } from "./lib/serve.mjs";

// The 404 page is checked in each language it switches to (TW, EN, JP, no prefix → TW).
const PAGES = process.argv.slice(2).length ? process.argv.slice(2) : ["/tw/products/", "/tw/products/sut/", "/en/products/sut/", "/tw/no-such-page/", "/en/no-such-page/", "/jp/no-such-page/", "/no-such-page/"];
const WIDTHS = [1440, 390];
const { base, stop } = await startPreview(4330);
const browser = await chromium.launch({ executablePath: CHROMIUM });
let blocking = 0;
try {
  for (const width of WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    for (const p of PAGES) {
      await page.goto(base + p, { waitUntil: "networkidle" });
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
      for (const v of r.violations) counts[v.impact] += v.nodes.length;
      blocking += counts.critical + counts.serious;
      console.log(`${p} @${width}: critical ${counts.critical}, serious ${counts.serious}, moderate ${counts.moderate}, minor ${counts.minor}`);
      for (const v of r.violations) console.log(`   [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length}) → ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
    }
    if (width === 390) {
      // Mobile menu: opens with Enter, focus stays inside, Escape closes and returns focus.
      await page.goto(base + PAGES[0], { waitUntil: "networkidle" });
      const toggle = page.locator(".menu-toggle");
      await toggle.focus();
      await page.keyboard.press("Enter");
      const opened = (await toggle.getAttribute("aria-expanded")) === "true" && (await page.locator("#site-menu").isVisible());
      for (let i = 0; i < 20; i++) await page.keyboard.press("Tab");
      const inside = await page.evaluate(() => !!document.activeElement?.closest(".site-header"));
      await page.keyboard.press("Escape");
      const closed = (await toggle.getAttribute("aria-expanded")) === "false" && !(await page.locator("#site-menu").isVisible());
      const focusBack = await page.evaluate(() => document.activeElement?.classList.contains("menu-toggle"));
      const ok = opened && inside && closed && focusBack;
      if (!ok) blocking++;
      console.log(`mobile menu keyboard: open ${opened}, focus kept inside ${inside}, Esc closes ${closed}, focus returns ${focusBack}`);
    }
    await context.close();
  }
} finally {
  await browser.close();
  stop();
}
console.log(blocking ? `FAIL: ${blocking} blocking issue(s)` : "PASS: 0 serious/critical");
process.exit(blocking ? 1 : 0);
