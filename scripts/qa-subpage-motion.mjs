// Sub-page tactical headers (run after `npm run build`). Every PageHero image header in TW/EN/JP at 1440 and 390:
// HUD corners match the image's visible area (≤ 2 px), the image has soft edges (no hard box), decorations are
// aria-hidden with no pointer events, the scan loop runs only on screen and never under reduced motion or the
// site-wide pause. Text-only headers: static blueprint decoration only. Pages kept out of this redesign (news) have none.
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { startPreview, CHROMIUM, DIST } from './lib/serve.mjs';

const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('index.html') ? [p] : []; });
const all = walk(DIST).map(p => p.slice(DIST.length).replace(/index\.html$/, '').replace(/\\/g, '/')).filter(p => /^\/(tw|en|jp)\/.+/.test(p));
const isNews = p => /^\/(tw|en|jp)\/news\//.test(p);
const server = await startPreview(4471), browser = await chromium.launch({ executablePath: CHROMIUM });
const fit = page => page.evaluate(() => {
  const img = document.querySelector('.page-hero .media img'); if (!img) return null;
  const b = img.getBoundingClientRect(), ar = img.naturalWidth / img.naturalHeight, s = getComputedStyle(img), pos = s.objectPosition.split(' ').map(p => parseFloat(p) / 100);
  let vis; if (s.objectFit === 'cover') vis = b; else { const w = Math.min(b.width, b.height * ar), h = w / ar, l = b.left + (b.width - w) * pos[0], t = b.top + (b.height - h) * pos[1]; vis = { left: l, top: t, right: l + w, bottom: t + h }; }
  const cs = [...document.querySelectorAll('.page-hero .tac-corner')].map(c => c.getBoundingClientRect());
  const box = { left: Math.min(...cs.map(c => c.left)), top: Math.min(...cs.map(c => c.top)), right: Math.max(...cs.map(c => c.right)), bottom: Math.max(...cs.map(c => c.bottom)) };
  return { corners: cs.length, error: Math.max(...['left', 'top', 'right', 'bottom'].map(k => Math.abs(box[k] - vis[k]))), mask: s.maskImage };
});
const heroAnimations = page => page.evaluate(() => document.querySelector('.page-hero').getAnimations({ subtree: true }).filter(a => !(a instanceof CSSTransition) && a.animationName !== 'bxr-enter').map(a => ({ name: a.animationName, state: a.playState }))); // bxr-enter: the site's existing copy entrance
let images = 0, texts = 0, excluded = 0;
try {
  // Classify once (markup is the same at every width).
  const probe = await browser.newPage();
  const kinds = {};
  for (const path of all) { await probe.goto(server.base + path); kinds[path] = await probe.evaluate(() => { const h = document.querySelector('.page-hero'); return !h ? 'none' : h.querySelector('.media img') ? 'image' : 'text'; }); }
  await probe.close();
  for (const width of [1440, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference', hasTouch: width < 1024 });
    const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
    for (const path of all) {
      const kind = kinds[path]; if (kind === 'none') continue;
      await page.goto(server.base + path); await page.waitForFunction(() => !!window.bxrMotionDispose);
      const label = `${path}@${width}`;
      const deco = await page.evaluate(() => [...document.querySelectorAll('.page-hero :is(.tac-hud, .tac-scan, .tac-blueprint)')].map(e => [e.getAttribute('aria-hidden'), getComputedStyle(e).pointerEvents]));
      if (isNews(path)) { assert.deepEqual(deco, [], `${label}: news pages are outside this redesign`); excluded++; continue; }
      assert.ok(deco.length && deco.every(([a, p]) => a === 'true' && p === 'none'), `${label}: decorations aria-hidden, no pointer events ${JSON.stringify(deco)}`);
      if (kind === 'text') {
        assert.deepEqual(await heroAnimations(page), [], `${label}: text-only header is static`);
        assert.equal(await page.locator('.page-hero .tac-blueprint').count(), 1); texts++; continue;
      }
      await page.evaluate(() => document.fonts.ready);
      const f = await fit(page);
      assert.ok(f.corners === 4 && f.error <= 2, `${label}: HUD corners match the visible image (error ${f.error?.toFixed(1)} px)`);
      assert.ok(f.mask && f.mask !== 'none', `${label}: image has soft edges`);
      const sweep = () => page.locator('.page-hero .tac-sweep').evaluate(el => el.getAnimations()[0]?.playState);
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(150);
      assert.equal(await sweep(), 'running', `${label}: scan line runs in view`);
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(200);
      assert.equal(await sweep(), 'paused', `${label}: scan line pauses off screen`);
      images++;
    }
    assert.deepEqual(errors, []);
    await ctx.close();
    // Reduced motion and the site-wide pause: no header animation at all (sample: every image header).
    for (const mode of ['reduce', 'paused']) {
      const c2 = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: mode === 'reduce' ? 'reduce' : 'no-preference' });
      if (mode === 'paused') await c2.addInitScript(() => { try { localStorage.setItem('bxr-motion', 'off'); } catch {} });
      const p2 = await c2.newPage();
      for (const path of all.filter(p => kinds[p] === 'image' && !isNews(p))) {
        await p2.goto(server.base + path); await p2.waitForFunction(() => !!window.bxrMotionDispose); await p2.waitForTimeout(100);
        assert.deepEqual((await heroAnimations(p2)).filter(a => a.state === 'running'), [], `${path}@${width}: no header animation (${mode})`);
        assert.ok((await fit(p2)).error <= 2, `${path}@${width}: corners still aligned (${mode})`);
      }
      await c2.close();
    }
  }
  console.log(`PASS: ${images} image-header checks (TW/EN/JP × 1440/390; corners ≤ 2 px, soft edges, on-screen-only scan loop; static under reduced motion and the site-wide pause), ${texts} static text-only headers, ${excluded} news pages untouched.`);
} finally { await browser.close(); server.stop(); }
