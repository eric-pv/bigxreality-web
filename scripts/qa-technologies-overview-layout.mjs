// Regression check for the /{lang}/technologies/ overview list: when the decorative thumbnail is shown
// (hover or keyboard focus, ≥ 1280 px), it must never overlap the index, title, description or "explore" link.
// Below the breakpoint the thumbnail may stay hidden, but text and link must remain visible and readable.
// Usage: node scripts/qa-technologies-overview-layout.mjs
//   QA_SHOTS=<dir> QA_SHOTS_PREFIX=<before|after> additionally writes hover screenshots per language/width.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { startPreview, CHROMIUM } from './lib/serve.mjs';

const languages = ['tw', 'en', 'jp'];
const widths = [390, 768, 1024, 1280, 1440];
const shots = process.env.QA_SHOTS;
const prefix = process.env.QA_SHOTS_PREFIX ?? 'shot';
if (shots) mkdirSync(shots, { recursive: true });

let failed = 0, checked = 0;
const check = (name, ok, detail = '') => {
  checked++;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${!ok && detail ? ` — ${detail}` : ''}`);
};

// Collects the rendered geometry of one list row. Text boxes use Range client rects so the
// measurement follows the actual glyph lines rather than the (wider) block box.
const measure = (li) => {
  const rect = (r) => ({ left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
  const textRects = (el) => { if (!el) return []; const range = document.createRange(); range.selectNodeContents(el); return [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0).map(rect); };
  const thumb = li.querySelector('.thumb');
  const ts = thumb ? getComputedStyle(thumb) : null;
  const p = li.querySelector('.copy p');
  const explore = li.querySelector('.explore');
  return {
    id: li.dataset.technologyId,
    thumb: thumb ? { ...rect(thumb.getBoundingClientRect()), display: ts.display, opacity: Number(ts.opacity), transition: ts.transitionDuration } : null,
    parts: {
      index: textRects(li.querySelector('.index')),
      title: textRects(li.querySelector('h2')),
      description: textRects(p),
      explore: explore ? [rect(explore.getBoundingClientRect())] : [],
    },
    li: rect(li.getBoundingClientRect()),
    pFont: p ? parseFloat(getComputedStyle(p).fontSize) : 0,
    pVisible: p ? p.getBoundingClientRect().width > 0 && getComputedStyle(p).visibility !== 'hidden' : false,
    exploreVisible: explore ? explore.getBoundingClientRect().width > 0 && getComputedStyle(explore).visibility !== 'hidden' : true,
    pClipped: p ? p.scrollWidth > p.clientWidth + 1 : false,
  };
};
const overlaps = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
const settle = (page) => page.waitForTimeout(450);

const { base, stop } = await startPreview(4361);
const browser = await chromium.launch({ executablePath: CHROMIUM });
try {
  for (const reduced of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    for (const lang of languages) {
      await page.goto(`${base}/${lang}/technologies/`, { waitUntil: 'networkidle' });
      for (const width of reduced ? [1280] : widths) {
        await page.setViewportSize({ width, height: 900 });
        const label = `/${lang}/technologies/ ${width}px${reduced ? ' reduced-motion' : ''}`;
        const rows = page.locator('.technology-list > li.technology');
        const count = await rows.count();
        check(`${label}: seven technology rows`, count === 7);
        check(`${label}: no horizontal scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
        const problems = [];
        let shown = 0;
        for (let i = 0; i < count; i++) {
          const row = rows.nth(i);
          for (const mode of ['hover', 'focus']) {
            await page.mouse.move(0, 0);
            await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
            if (mode === 'hover') { await row.scrollIntoViewIfNeeded(); await row.hover({ position: { x: 4, y: 4 } }); }
            else await row.locator('a').first().focus();
            await settle(page);
            const m = await row.evaluate(measure);
            const visible = m.thumb && m.thumb.display !== 'none' && m.thumb.opacity > 0.01 && m.thumb.width > 0;
            if (!m.pVisible) problems.push(`${m.id}/${mode}: description not visible`);
            if (!m.exploreVisible) problems.push(`${m.id}/${mode}: explore link not visible`);
            if (m.pClipped) problems.push(`${m.id}/${mode}: description clipped`);
            if (m.pFont < 14) problems.push(`${m.id}/${mode}: description font ${m.pFont}px`);
            if (width >= 1280 && !visible) problems.push(`${m.id}/${mode}: thumbnail not revealed at ≥1280px`);
            if (reduced && m.thumb && m.thumb.display !== 'none' && !/^0s(, 0s)*$/.test(m.thumb.transition)) problems.push(`${m.id}: reduced-motion still animates (${m.thumb.transition})`);
            if (visible) {
              shown++;
              if (m.thumb.left < m.li.left - 0.5 || m.thumb.right > m.li.right + 0.5) problems.push(`${m.id}/${mode}: thumbnail outside its row`);
              for (const [part, rects] of Object.entries(m.parts)) {
                if (rects.some((r) => overlaps(r, m.thumb))) problems.push(`${m.id}/${mode}: thumbnail overlaps ${part}`);
              }
            }
          }
          // Row 03 (digital-simulation) has a real image and the longest EN title, the worst case before the fix.
          if (shots && !reduced && i === 2) {
            await page.mouse.move(0, 0);
            await row.evaluate((el) => el.scrollIntoView({ block: 'center' }));
            await row.hover({ position: { x: 4, y: 4 } });
            await settle(page);
            await page.screenshot({ path: path.join(shots, `${prefix}-${lang}-${width}.jpg`), type: 'jpeg', quality: 72 });
          }
        }
        check(`${label}: thumbnail never overlaps index, title, description or explore link (hover and focus)`, problems.length === 0, problems.join('; '));
        if (width >= 1280) check(`${label}: thumbnail revealed for every row on hover and focus`, shown === count * 2);
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
  stop();
}
console.log(failed ? `FAIL: ${failed}/${checked}` : `PASS: ${checked} checks`);
process.exitCode = failed ? 1 : 0;
