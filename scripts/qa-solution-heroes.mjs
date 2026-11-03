// Regression check: every solution landing hero (military, police, fire-rescue, smart-city and the solutions under
// them) shows its image in the same 16:9 box at the same place, and the copy starts at the same height, in all three
// languages at 390 / 768 / 1024 / 1280 / 1440 px. The image fills that box (cover, cropped around its focus point,
// horizontally centred); on stacked layouts the box itself is centred in the viewport.
// Usage: node scripts/qa-solution-heroes.mjs   (QA_SHOTS=<dir> QA_SHOTS_PREFIX=<name> also writes hero screenshots)
import { chromium } from 'playwright-core';
import { readdirSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { startPreview, CHROMIUM, DIST } from './lib/serve.mjs';

const languages = ['tw', 'en', 'jp'];
const widths = [390, 768, 1024, 1280, 1440];
const shots = process.env.QA_SHOTS;
const prefix = process.env.QA_SHOTS_PREFIX ?? 'hero';
if (shots) mkdirSync(shots, { recursive: true });
let failed = 0, checked = 0;
const check = (name, ok, detail = '') => { checked++; if (!ok) failed++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${!ok && detail ? ` — ${detail}` : ''}`); };
const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;

const { base, stop } = await startPreview(4362);
const browser = await chromium.launch({ executablePath: CHROMIUM });
try {
  const page = await browser.newPage();
  for (const lang of languages) {
    const slugs = readdirSync(path.join(DIST, lang, 'solutions'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      const rows = [];
      for (const slug of slugs) {
        await page.goto(`${base}/${lang}/solutions/${slug}/`, { waitUntil: 'networkidle' });
        const m = await page.evaluate(() => {
          const hero = document.querySelector('.page-hero');
          const img = hero?.querySelector('.media .asset-fit img');
          if (!hero || !img) return null;
          const h = hero.getBoundingClientRect();
          const box = hero.querySelector('.media .asset-fit').getBoundingClientRect();
          const copy = hero.querySelector('.copy').getBoundingClientRect();
          const cs = getComputedStyle(img);
          return { uniform: hero.hasAttribute('data-hero-uniform'), left: box.left - h.left, top: box.top - h.top, width: box.width, height: box.height, imgW: img.getBoundingClientRect().width, imgH: img.getBoundingClientRect().height, fit: cs.objectFit, posX: cs.objectPosition.split(' ')[0], centre: box.left + box.width / 2, copyTop: copy.top - h.top, decoded: img.complete && img.naturalWidth > 0 };
        });
        if (!m) continue; // text-only hero (no supplied image)
        rows.push({ slug, ...m });
        if (shots && lang === 'tw' && ['military', 'police', 'fire-rescue', 'smart-city'].includes(slug)) await page.locator('.page-hero').screenshot({ path: path.join(shots, `${prefix}-${slug}-${width}.jpg`), type: 'jpeg', quality: 72 });
      }
      const label = `/${lang}/solutions/* ${width}px`;
      check(`${label}: the four category heroes and sub-solutions have an image hero`, ['military', 'police', 'fire-rescue', 'smart-city'].every((s) => rows.some((r) => r.slug === s)), rows.map((r) => r.slug).join(','));
      check(`${label}: every hero uses the shared uniform layout`, rows.every((r) => r.uniform));
      check(`${label}: image fills a 16:9 box (cover, centred crop) and is decoded`, rows.every((r) => near(r.width / r.height, 16 / 9, 0.01) && near(r.imgW, r.width) && near(r.imgH, r.height) && r.fit === 'cover' && r.posX === '50%' && r.decoded), JSON.stringify(rows.filter((r) => !near(r.width / r.height, 16 / 9, 0.01) || r.fit !== 'cover' || r.posX !== '50%').map((r) => [r.slug, r.width, r.height, r.fit, r.posX])));
      if (width < 1024) check(`${label}: stacked image is centred in the viewport`, rows.every((r) => near(r.centre, width / 2, 1)), rows.map((r) => `${r.slug}:${Math.round(r.centre)}`).join(' | '));
      const ref = rows[0];
      // Side-by-side (≥ 1024 px) the box is pinned; stacked, it follows the copy, so only size and x must match.
      const sameTop = (r) => width < 1024 || near(r.top, ref.top);
      check(`${label}: same image size and position on every solution`, rows.every((r) => near(r.left, ref.left) && sameTop(r) && near(r.width, ref.width) && near(r.height, ref.height)), rows.map((r) => `${r.slug}:${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`).join(' | '));
      check(`${label}: copy (breadcrumb/H1) starts at the same height`, rows.every((r) => near(r.copyTop, ref.copyTop)), rows.map((r) => `${r.slug}:${Math.round(r.copyTop)}`).join(' | '));
      check(`${label}: no horizontal scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    }
  }
} finally {
  await browser.close();
  stop();
}
console.log(failed ? `FAIL: ${failed}/${checked}` : `PASS: ${checked} checks`);
process.exitCode = failed ? 1 : 0;
