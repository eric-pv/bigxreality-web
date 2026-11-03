// Home tactical-HUD motion: content-first enhancement checks (run after `npm run build`).
// Covers: no-JS / slow-JS / failed-JS visibility, reduced motion (no new animation, final state),
// aria-hidden decorations, single binding across astro:page-load / pageshow, resize reflow,
// key-phrase underline placement and off-screen pausing of slow loops.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { startPreview, CHROMIUM } from './lib/serve.mjs';

const server = await startPreview(4411), browser = await chromium.launch({ executablePath: CHROMIUM });
const LANGS = ['tw', 'en', 'jp'], WIDTHS = [1440, 390];
const heroText = page => page.evaluate(() => {
  const h1 = document.querySelector('[data-hero] h1'), eyebrow = document.querySelector('[data-hero] .eyebrow');
  return { title: h1.textContent.trim(), eyebrow: eyebrow.textContent.trim(), titleOpacity: getComputedStyle(h1).opacity, eyebrowOpacity: getComputedStyle(eyebrow).opacity };
});
/** Animations (CSS or WAAPI) currently attached to hero elements, other than the footage cross-fade. */
const heroAnimations = page => page.evaluate(() => document.getAnimations()
  .filter(a => a.effect?.target instanceof Element && a.effect.target.closest('[data-hero]') && a.effect.target.tagName !== 'VIDEO' && a.playState !== 'finished')
  .map(a => a.animationName ?? 'waapi'));
/** Union of the four HUD corners vs the footage's rendered (object-fit) rectangle, in px. */
const cornerFit = page => page.evaluate(() => {
  const v = document.querySelector('[data-hero] [data-clip].is-on') ?? document.querySelector('[data-hero] .poster');
  const b = v.getBoundingClientRect(), ar = (v.videoWidth || v.naturalWidth || 16) / (v.videoHeight || v.naturalHeight || 9);
  const pos = getComputedStyle(v).objectPosition.split(' ').map(p => parseFloat(p) / 100);
  const w = Math.min(b.width, b.height * ar), h = w / ar, vis = { left: b.x + (b.width - w) * pos[0], top: b.y + (b.height - h) * pos[1], right: 0, bottom: 0 };
  vis.right = vis.left + w; vis.bottom = vis.top + h;
  const cs = [...document.querySelectorAll('[data-hero] .corner')].map(c => c.getBoundingClientRect());
  const box = { left: Math.min(...cs.map(c => c.left)), top: Math.min(...cs.map(c => c.top)), right: Math.max(...cs.map(c => c.right)), bottom: Math.max(...cs.map(c => c.bottom)) };
  // Corners that touch copy or controls in the text column (reported, pending the owner's decision).
  const range = document.createRange(), texts = [];
  for (const el of document.querySelectorAll('[data-hero] .inner :is(.eyebrow, .title, .subtitle, .desc)')) { range.selectNodeContents(el); texts.push(...range.getClientRects()); }
  texts.push(...[...document.querySelectorAll('[data-hero] .actions a')].map(a => a.getBoundingClientRect()));
  const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  // Effective opacity of a corner = the stage's horizontal fade at its right-most pixel (same gradient as the footage, ≥ 1200 px).
  const stage = document.querySelector('[data-hero] .stage').getBoundingClientRect(), fades = getComputedStyle(document.querySelector('[data-hero] .hud')).maskImage !== 'none';
  const alpha = c => fades ? Math.min(Math.max((c.right - stage.left) / (stage.width * 0.3), 0), 1) : 1;
  const onText = cs.filter(c => texts.some(t => hit(c, t)));
  return { error: Math.max(...['left', 'top', 'right', 'bottom'].map(k => Math.abs(box[k] - vis[k]))), maxOnText: onText.length ? Math.max(...onText.map(alpha)) : 0 };
});
let cases = 0;
try {
  for (const lang of LANGS) for (const width of WIDTHS) {
    const url = `${server.base}/${lang}/`, label = `${lang}@${width}`;
    // Server HTML: the final title/eyebrow text, no motion classes.
    const ssr = await (await fetch(url)).text();
    assert.ok(!/motion-ready|data-motion=|type-visual/.test(ssr.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')), `${label}: SSR markup carries no motion state`);

    // 1. No JS: everything visible, static HUD only.
    {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, javaScriptEnabled: false, reducedMotion: 'no-preference' });
      const page = await ctx.newPage(); await page.goto(url);
      const t = await heroText(page);
      assert.deepEqual([t.titleOpacity, t.eyebrowOpacity], ['1', '1'], `${label}: no-JS hero copy visible`);
      assert.equal(await page.locator('html.motion-ready').count(), 0);
      assert.equal(await page.locator('[data-hero] .hud[aria-hidden="true"]').count(), 1);
      await ctx.close();
    }
    // 2. Main JS fails or is slow: the head fallback reveals the copy by 1.5 s; late JS never hides it again.
    for (const mode of ['abort', 'slow']) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
      const page = await ctx.newPage();
      await page.route(/\/_astro\/.*\.js$/, route => mode === 'abort' ? route.abort() : setTimeout(() => route.continue().catch(() => {}), 2500));
      await page.goto(url, { waitUntil: 'commit' });
      await page.waitForTimeout(1700);
      let t = await heroText(page);
      assert.deepEqual([t.titleOpacity, t.eyebrowOpacity], ['1', '1'], `${label}: copy visible when JS ${mode}`);
      assert.equal(await page.locator('html.motion-ready').count(), 0, `${label}: fallback cleared pre-state (${mode})`);
      if (mode === 'slow') {
        await page.waitForFunction(() => !!window.bxrMotionDispose, null, { timeout: 10000 });
        t = await heroText(page);
        assert.deepEqual([t.titleOpacity, t.eyebrowOpacity], ['1', '1'], `${label}: late JS keeps copy visible`);
        assert.equal(await page.locator('[data-hero][data-motion]').count(), 0, `${label}: late JS does not replay the entrance`);
      }
      await ctx.close();
    }
    // 3. Reduced motion: no new animation at all, final state immediately.
    {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const page = await ctx.newPage(); await page.goto(url); await page.waitForFunction(() => !!window.bxrMotionDispose);
      const t = await heroText(page);
      assert.deepEqual([t.titleOpacity, t.eyebrowOpacity], ['1', '1'], `${label}: reduced-motion copy visible`);
      assert.deepEqual(await heroAnimations(page), [], `${label}: reduced motion has no hero animations`);
      assert.equal(await page.locator('[data-hero] .sweep').evaluate(el => getComputedStyle(el).display), 'none');
      assert.equal(await page.locator('[data-hero][data-motion], html.motion-ready').count(), 0);
      await ctx.close();
    }
    // 4. Full motion.
    {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
      const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => {
        window.heroEnter = 0; window.titleSamples = new Set();
        document.addEventListener('animationstart', e => { if (e.animationName === 'bxr-enter' && e.target.closest('[data-hero]')) window.heroEnter++; });
      });
      await page.goto(url);
      await page.waitForFunction(() => document.querySelector('[data-hero]')?.dataset.motion === 'running');
      const during = await heroText(page);
      await page.waitForFunction(() => document.querySelector('[data-hero]').dataset.motion === 'done', null, { timeout: 5000 });
      const after = await heroText(page);
      assert.equal(during.title, after.title, `${label}: H1 text unchanged during the entrance`);
      assert.equal(after.eyebrow.replace(/\s+/g, ' ').includes(after.eyebrow), true);
      // Accessible names: the H1 and eyebrow read as their full strings, once.
      const snapshot = await page.locator('[data-hero] .inner').ariaSnapshot();
      const eyebrowText = await page.locator('[data-hero] .eyebrow .visually-hidden').textContent();
      assert.ok(snapshot.includes(`paragraph: ${eyebrowText}`), `${label}: eyebrow read once in full\n${snapshot}`);
      assert.ok(!/paragraph: [^\n]*_/.test(snapshot), `${label}: caret not exposed`);
      assert.equal(await page.locator('[data-hero] h1').evaluate(h => [...h.children].map(c => c.className).join(',')), 'typeset', `${label}: H1 structure — no underline or wrappers`);
      assert.equal(await page.locator('[data-hero] h1').evaluate(h => h.getAttribute('style') ?? ''), '');
      // Decorations: aria-hidden, no pointer events, not focusable.
      for (const sel of ['.hud', '.scan', '.fog', '.type-visual']) assert.equal(await page.locator(`[data-hero] ${sel}`).getAttribute('aria-hidden'), 'true', `${label}: ${sel} aria-hidden`);
      for (const sel of ['.hud', '.scan', '.fog']) assert.equal(await page.locator(`[data-hero] ${sel}`).evaluate(el => getComputedStyle(el).pointerEvents), 'none', `${label}: ${sel} pointer-events`);
      assert.equal(await page.locator('[data-hero] .hud [tabindex], [data-hero] .scan [tabindex]').count(), 0);
      // The HUD corners frame the footage's rendered area exactly (≤ 2 px), at every width and language.
      const fit = await cornerFit(page);
      assert.ok(fit.error <= 2, `${label}: corners match the visible footage (error ${fit.error.toFixed(1)} px)`);
      assert.ok(fit.maxOnText <= 0.15, `${label}: corners over copy stay ≤ 0.15 opaque (${fit.maxOnText})`);
      // Shared entrance controller never animates the hero a second time.
      assert.equal(await page.evaluate(() => window.heroEnter), 0, `${label}: .motion-enter not applied in hero`);
      // Re-dispatched lifecycle events do not re-bind or replay.
      await page.evaluate(() => { window.knownAnimations = new Set(document.getAnimations()); for (let i = 0; i < 3; i++) document.dispatchEvent(new Event('astro:page-load')); window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false })); });
      await page.waitForTimeout(100);
      assert.deepEqual(await page.evaluate(() => ({
        visual: document.querySelectorAll('[data-hero] .type-visual').length, spoken: document.querySelectorAll('[data-hero] .eyebrow .visually-hidden').length,
        key: document.querySelectorAll('[data-hero] .hero-key').length, motion: document.querySelector('[data-hero]').dataset.motion,
      })), { visual: 1, spoken: 1, key: 0, motion: 'done' }, `${label}: single binding after astro:page-load`);
      assert.deepEqual(await page.evaluate(() => document.getAnimations().filter(a => !window.knownAnimations.has(a) && a.effect?.target?.closest?.('[data-hero]') && a.effect.target.tagName !== 'VIDEO').map(a => a.animationName ?? 'waapi')), [], `${label}: no replay after astro:page-load`);
      // Slow loop runs on screen, pauses off screen.
      const sweepState = () => page.locator('[data-hero] .sweep').evaluate(el => el.getAnimations()[0]?.playState);
      assert.equal(await sweepState(), 'running', `${label}: sweep runs in view`);
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(250);
      assert.equal(await sweepState(), 'paused', `${label}: sweep pauses off screen`);
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(250);
      assert.equal(await sweepState(), 'running', `${label}: sweep resumes in view`);
      // The hero pause control (WCAG 2.2.2) also stops the sweep; resuming restarts it.
      const toggle = page.locator('[data-hero] [data-toggle]');
      await toggle.focus(); await page.keyboard.press('Enter');
      assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
      assert.equal(await sweepState(), 'paused', `${label}: pause control stops the sweep`);
      await page.keyboard.press('Enter');
      assert.equal(await sweepState(), 'running', `${label}: play control resumes the sweep`);
      // Resize: natural reflow, no wrappers, underline follows the new lines.
      const other = width === 1440 ? 390 : 1440;
      await page.setViewportSize({ width: other, height: 900 }); await page.waitForTimeout(300);
      const ref = await browser.newContext({ viewport: { width: other, height: 900 }, javaScriptEnabled: false });
      const refPage = await ref.newPage(); await refPage.goto(url);
      const height = h => h.locator('[data-hero] h1').evaluate(el => Math.round(el.getBoundingClientRect().height));
      assert.equal(await height(page), await height(refPage), `${label}→${other}: H1 reflows like the server HTML`);
      await ref.close();
      assert.ok((await cornerFit(page)).error <= 2, `${label}→${other}: corners follow the footage after resize`);
      assert.deepEqual(errors, []);
      await ctx.close();
    }
    // 5. Mid-entrance resize and preference change finish immediately in the final state.
    {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
      const page = await ctx.newPage(); await page.goto(url);
      await page.waitForFunction(() => document.querySelector('[data-hero]')?.dataset.motion === 'running');
      await page.setViewportSize({ width: width - 120, height: 900 });
      await page.waitForFunction(() => document.querySelector('[data-hero]').dataset.motion === 'done', null, { timeout: 1000 });
      assert.deepEqual((await heroAnimations(page)).filter(n => !['hud-sweep', 'hero-type', 'hero-caret', 'hero-caret-step', 'hud-lock'].includes(n)), [], `${label}: resize cancels the line reveal`);
      await page.goto(url); await page.waitForFunction(() => document.querySelector('[data-hero]')?.dataset.motion === 'running');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForFunction(() => document.querySelector('[data-hero]').dataset.motion === 'done', null, { timeout: 1000 });
      assert.deepEqual(await heroAnimations(page), [], `${label}: reduce mid-entrance leaves no animation`);
      const t = await heroText(page); assert.deepEqual([t.titleOpacity, t.eyebrowOpacity], ['1', '1']);
      await ctx.close();
    }
    // 6. Partner statistics (home + partners page): final values in HTML, count-up only as enhancement.
    for (const path of ['', 'company/partners/']) {
      const page_url = `${url}${path}`, where = `${label} /${path}`;
      const html = await (await fetch(page_url)).text();
      const finals = [...html.matchAll(/<dd data-count[^>]*>(\d+)<\/dd>/g)].map(m => m[1]);
      assert.equal(finals.length, 4, `${where}: four plain final values in HTML`);
      const values = page => page.locator('[data-partner-statistics] dd').evaluateAll(dds => dds.map(dd => ({ text: dd.textContent.trim(), children: dd.children.length })));
      const plain = finals.map(text => ({ text, children: 0 }));
      for (const [mode, options] of [['no-JS', { javaScriptEnabled: false }], ['reduced', { reducedMotion: 'reduce' }]]) {
        const ctx = await browser.newContext({ viewport: { width, height: 900 }, ...options });
        const page = await ctx.newPage(); await page.goto(page_url);
        await page.locator('[data-partner-statistics]').scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
        assert.deepEqual(await values(page), plain, `${where}: ${mode} shows the final values only`);
        await ctx.close();
      }
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
      const page = await ctx.newPage(); await page.goto(page_url); await page.waitForFunction(() => !!window.bxrMotionDispose);
      const stats = page.locator('[data-partner-statistics]');
      if (await stats.evaluate(el => el.getBoundingClientRect().top > innerHeight * 1.1))
        assert.equal(await stats.locator('.count-visual').count(), 0, `${where}: nothing counts before it is near the viewport`);
      await stats.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelectorAll('[data-partner-statistics] .count-visual').length === 4);
      const sample = () => stats.locator('dd').evaluateAll(dds => dds.map(dd => ({
        hidden: dd.querySelector('.count-visual')?.getAttribute('aria-hidden'), spoken: dd.querySelector('.visually-hidden')?.textContent,
        width: dd.querySelector('.count-visual')?.getBoundingClientRect().width, font: getComputedStyle(dd).fontVariantNumeric,
      })));
      const samples = [];
      for (let i = 0; i < 5; i++) { samples.push(await sample()); await page.waitForTimeout(120); }
      for (const [i, final] of finals.entries()) {
        const runs = samples.map(s => s[i]).filter(s => s.width !== undefined);
        assert.ok(runs.length >= 2, `${where}: count-up observed`);
        assert.ok(runs.every(r => r.hidden === 'true' && r.spoken === final && r.font.includes('tabular-nums')), `${where}: visual digits aria-hidden, final value spoken`);
        assert.ok(Math.max(...runs.map(r => r.width)) - Math.min(...runs.map(r => r.width)) < 0.5, `${where}: digit width stable while counting`);
      }
      await page.waitForFunction(() => document.querySelectorAll('[data-partner-statistics] .count-visual').length === 0, null, { timeout: 2500 });
      assert.deepEqual(await values(page), plain, `${where}: back to the plain final values`);
      await page.evaluate(() => { for (let i = 0; i < 3; i++) document.dispatchEvent(new Event('astro:page-load')); scrollTo(0, 0); });
      await stats.scrollIntoViewIfNeeded(); await page.waitForTimeout(300);
      assert.equal(await stats.locator('.count-visual').count(), 0, `${where}: counts once, no re-binding`);
      if (!path) {
        // Home layout: four equal columns across the container (2×2 on phones) with 1 px dividers.
        const geometry = await stats.evaluate(section => {
          const dl = section.querySelector('dl').getBoundingClientRect(), container = section.closest('.container');
          const inner = container.getBoundingClientRect().width - parseFloat(getComputedStyle(container).paddingLeft) - parseFloat(getComputedStyle(container).paddingRight);
          const cells = [...section.querySelectorAll('dl > div')].map(d => d.getBoundingClientRect());
          return { dl: dl.width, inner, widths: cells.map(c => Math.round(c.width)), rows: new Set(cells.map(c => Math.round(c.top))).size,
            dividers: [...section.querySelectorAll('dl > div')].map(d => getComputedStyle(d).borderInlineStartWidth) };
        });
        assert.ok(Math.abs(geometry.dl - geometry.inner) < 1, `${where}: statistics fill the container (${geometry.dl} / ${geometry.inner})`);
        assert.equal(new Set(geometry.widths).size, 1, `${where}: equal columns ${geometry.widths}`);
        assert.equal(geometry.rows, width < 768 ? 2 : 1, `${where}: ${width < 768 ? '2×2' : 'four columns'}`);
        assert.deepEqual(geometry.dividers, width < 768 ? ['0px', '1px', '0px', '1px'] : ['0px', '1px', '1px', '1px'], `${where}: 1 px dividers`);
      }
      await ctx.close();
    }
    // 7. Core technologies: blueprint grid + slow glow (paused off screen); one-shot beam/glitch on hover or keyboard focus.
    {
      const animationsIn = (page, sel) => page.locator(sel).evaluateAll(els => els.flatMap(el => el.getAnimations({ subtree: true }).map(a => ({ name: a.animationName, state: a.playState, iterations: a.effect.getComputedTiming().iterations }))));
      const glow = page => page.locator('section.tech').evaluate(el => el.getAnimations({ subtree: true }).find(a => a.animationName === 'tech-drift')?.playState);
      const reduced = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      let page = await reduced.newPage(); await page.goto(url);
      await page.locator('section.tech').scrollIntoViewIfNeeded(); await page.locator('.tech-list li').first().hover(); await page.waitForTimeout(150);
      assert.deepEqual(await animationsIn(page, 'section.tech'), [], `${label}: reduced motion — no tech animations`);
      assert.equal(await page.locator('.tech-list .beam').first().evaluate(el => getComputedStyle(el).display), 'none');
      await reduced.close();
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
      page = await ctx.newPage(); await page.goto(url); await page.waitForFunction(() => !!window.bxrMotionDispose);
      // Decorations: aria-hidden, no pointer events, tab order = the four technology links only.
      assert.equal(await page.locator('.tech-list .beam[aria-hidden="true"]').count(), 4);
      assert.deepEqual(await page.locator('.tech-list .beam').evaluateAll(els => [...new Set(els.map(el => getComputedStyle(el).pointerEvents))]), ['none']);
      assert.deepEqual(await page.locator('section.tech').evaluate(el => [getComputedStyle(el, '::before').pointerEvents, getComputedStyle(el, '::after').pointerEvents]), ['none', 'none']);
      assert.equal(await page.locator('.tech-list').evaluate(el => [...el.querySelectorAll('*')].filter(n => n.tabIndex >= 0 && !n.closest('[aria-hidden="true"]')).length), 4, `${label}: tab order unchanged`);
      assert.equal(await glow(page), 'paused', `${label}: glow paused off screen`);
      await page.locator('section.tech').scrollIntoViewIfNeeded(); await page.waitForTimeout(250);
      assert.equal(await glow(page), 'running', `${label}: glow drifts in view`);
      const card = n => `.tech-list li:nth-child(${n})`;
      const oneShot = async (sel, how) => {
        const list = await animationsIn(page, sel);
        const beam = list.find(a => a.name === 'tech-beam'), glitch = list.find(a => a.name === 'tech-glitch');
        assert.ok(beam && glitch, `${label}: ${how} plays beam + glitch (${JSON.stringify(list)})`);
        assert.equal(beam.iterations, 1, `${label}: beam runs once`); assert.equal(glitch.iterations, 1, `${label}: glitch runs once`);
      };
      if (width >= 1024) { await page.locator(card(1)).hover(); await page.waitForTimeout(60); await oneShot(card(1), 'hover'); await page.mouse.move(0, 0); }
      // Keyboard: focus the link in card 2 with Tab from the card 1 link.
      await page.locator(`${card(1)} a`).focus(); await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.closest('li')?.matches('.tech-list li:nth-child(2)')), true);
      await page.waitForTimeout(60); await oneShot(card(2), 'keyboard focus');
      await page.waitForTimeout(1400);
      assert.deepEqual((await animationsIn(page, card(2))).filter(a => a.state === 'running'), [], `${label}: no looping after one pass`);
      assert.equal(await page.locator(`${card(2)} .beam > span`).evaluate(el => getComputedStyle(el).opacity), '0', `${label}: beam hidden at rest`);
      await ctx.close();
    }
    // 8. Phase 4: header scroll state + progress, product-card feedback, section rulers, CTA loops, news cover texture.
    {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference', hasTouch: width < 1024 });
      const page = await ctx.newPage(); await page.goto(url); await page.waitForFunction(() => !!window.bxrMotionDispose);
      const header = page.locator('[data-site-header]');
      const headerState = () => header.evaluate(h => ({ scrolled: h.classList.contains('is-scrolled'), solid: getComputedStyle(h, '::before').opacity,
        blur: getComputedStyle(h, '::after').backdropFilter, own: getComputedStyle(h).backdropFilter, read: Number(getComputedStyle(h).getPropertyValue('--read') || 0) }));
      let st = await headerState();
      assert.deepEqual([st.scrolled, st.solid, st.read], [false, '1', 0], `${label}: header solid at top`);
      assert.equal(await header.locator('.read-progress').getAttribute('aria-hidden'), 'true');
      assert.equal(await header.locator('.read-progress').evaluate(el => getComputedStyle(el).pointerEvents), 'none');
      await page.evaluate(() => scrollTo(0, 120)); await page.waitForTimeout(400);
      st = await headerState();
      assert.ok(st.scrolled && st.solid === '0' && st.blur.includes('blur') && st.own === 'none', `${label}: translucent blurred header after 40 px ${JSON.stringify(st)}`);
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(300);
      assert.ok((await headerState()).read > 0.99, `${label}: progress reaches the end`);
      if (width < 1024) {
        // Mobile menu: opaque header and a fixed panel still anchored to the viewport.
        await page.evaluate(() => scrollTo(0, 400)); await page.waitForTimeout(200);
        await page.locator('.menu-toggle').click();
        const open = await page.evaluate(() => { const h = document.querySelector('[data-site-header]'), m = document.querySelector('#site-menu').getBoundingClientRect();
          return { solid: getComputedStyle(h, '::before').opacity, blur: getComputedStyle(h, '::after').backdropFilter, top: Math.round(m.top), bottom: Math.round(m.bottom), header: Math.round(h.getBoundingClientRect().bottom) }; });
        await page.waitForTimeout(250);
        const settled = await header.evaluate(h => getComputedStyle(h, '::before').opacity);
        assert.ok(settled === '1' && open.blur === 'none' && Math.abs(open.top - open.header) <= 1 && open.bottom === 900, `${label}: open menu keeps an opaque header and viewport-fixed panel ${JSON.stringify(open)}`);
        await page.locator('.menu-toggle').click();
      }
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(250);
      assert.equal((await headerState()).scrolled, false, `${label}: back to solid at the top`);
      // Product cards (home lead + /products/ card): 1.05 inside a clipped frame, red gradient, arrow +4 px; no size change.
      const lead = page.locator('.feature--lead');
      await lead.scrollIntoViewIfNeeded();
      const before = await lead.boundingBox();
      const hoverState = () => lead.evaluate(card => ({ img: getComputedStyle(card.querySelector('.feature-media img')).transform, wash: getComputedStyle(card.querySelector('.feature-media'), '::after').opacity,
        arrow: getComputedStyle(card.querySelector('.more .arrow')).transform, clip: getComputedStyle(card.querySelector('.feature-media')).overflow }));
      if (width >= 1024) {
        await lead.hover(); await page.waitForTimeout(600);
        const h = await hoverState();
        assert.ok(h.img.startsWith('matrix(1.05') && h.wash === '1' && h.arrow === 'matrix(1, 0, 0, 1, 4, 0)' && h.clip === 'hidden', `${label}: lead card hover ${JSON.stringify(h)}`);
        assert.deepEqual(await lead.boundingBox(), before, `${label}: hover does not change card size`);
        await page.mouse.move(0, 0);
      }
      await lead.locator('h3 a').focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); await page.waitForTimeout(600);
      const k = await hoverState();
      assert.ok(k.img.startsWith('matrix(1.05') && k.wash === '1' && k.arrow === 'matrix(1, 0, 0, 1, 4, 0)', `${label}: keyboard focus gives the same card feedback ${JSON.stringify(k)}`);
      // Section rulers: static, decorative.
      const rulers = await page.locator('.ruled').evaluateAll(els => els.map(el => [getComputedStyle(el, '::before').pointerEvents, getComputedStyle(el, '::before').animationName]));
      assert.deepEqual(rulers, [['none', 'none'], ['none', 'none']], `${label}: two static ruler seams + one closing ruler`);
      assert.equal(await page.locator('.ruled--end').evaluate(el => getComputedStyle(el, '::after').content), '""');
      // CTA: stripes run only on screen; the radar ring pulses a finite three times.
      const cta = page.locator('section.cta');
      const ctaAnims = () => cta.evaluate(el => el.getAnimations({ subtree: true }).map(a => ({ name: a.animationName, state: a.playState, n: a.effect.getComputedTiming().iterations })));
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(250);
      assert.equal((await ctaAnims()).find(a => a.name === 'cta-stripes')?.state, 'paused', `${label}: CTA stripes paused off screen`);
      await cta.scrollIntoViewIfNeeded(); await page.waitForTimeout(250);
      const on = await ctaAnims();
      assert.equal(on.find(a => a.name === 'cta-stripes')?.state, 'running', `${label}: CTA stripes run in view`);
      assert.equal(on.find(a => a.name === 'cta-radar')?.state, 'running', `${label}: radar pulse runs in view`);
      assert.equal(await cta.evaluate(el => [getComputedStyle(el, '::before').pointerEvents, getComputedStyle(el.querySelector('.cta-primary'), '::after').pointerEvents].join()), 'none,none');
      // News cover texture: inline SVG, no extra request.
      const cover = page.locator('.editorial-cover').first();
      if (await cover.count()) assert.ok((await cover.evaluate(el => getComputedStyle(el).backgroundImage)).includes('data:image/svg+xml'), `${label}: contour texture is inline SVG`);
      await ctx.close();
      // /products/ card.
      if (width >= 1024) {
        const pctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
        const pp = await pctx.newPage(); await pp.goto(`${url}products/`);
        const card = pp.locator('[data-interactive-card]').first(); await card.scrollIntoViewIfNeeded(); await card.hover(); await pp.waitForTimeout(600);
        const c = await card.evaluate(el => ({ img: getComputedStyle(el.querySelector('.media img')).transform, wash: getComputedStyle(el.querySelector('.media'), '::after').opacity, clip: getComputedStyle(el.querySelector('.media')).overflow }));
        assert.ok(c.img.startsWith('matrix(1.05') && c.wash === '1' && c.clip === 'hidden', `${label}: CardProduct hover ${JSON.stringify(c)}`);
        await pctx.close();
      }
      // Reduced motion: no Phase 4 animation or transform; header still works without transitions.
      const rctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const rp = await rctx.newPage(); await rp.goto(url); await rp.waitForFunction(() => !!window.bxrMotionDispose);
      await rp.locator('section.cta').scrollIntoViewIfNeeded(); await rp.waitForTimeout(300);
      assert.deepEqual(await rp.locator('section.cta, [data-site-header]').evaluateAll(els => els.flatMap(el => el.getAnimations({ subtree: true }).map(a => a.animationName))), [], `${label}: reduced motion — no CTA/header animation`);
      if (width >= 1024) { await rp.locator('.feature--lead').hover(); await rp.waitForTimeout(400); assert.equal(await rp.locator('.feature--lead .feature-media img').evaluate(el => getComputedStyle(el).transform), 'none', `${label}: reduced motion — no image zoom`); }
      await rp.evaluate(() => scrollTo(0, 300)); await rp.waitForTimeout(200);
      assert.equal(await rp.locator('[data-site-header]').evaluate(h => h.classList.contains('is-scrolled') && getComputedStyle(h, '::before').transitionDuration), '0s', `${label}: reduced motion — header state without transition`);
      await rctx.close();
    }
    // 9. Loops (one pass, then ≥ 4.5 s still), background-tab pause, the header pause control, unbroken underlines.
    {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference', hasTouch: width < 1024 });
      const page = await ctx.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(url); await page.waitForFunction(() => document.querySelector('[data-hero]')?.dataset.motion === 'done');
      await page.locator('section.cta').scrollIntoViewIfNeeded(); await page.waitForTimeout(250);
      const loops = await page.evaluate(() => document.getAnimations().filter(a => a.animationName && a.effect.getComputedTiming().iterations === Infinity).map(a => {
        const t = a.effect.getComputedTiming(), frames = a.effect.getKeyframes(), key = f => `${f.transform ?? ''}|${f.opacity ?? ''}`;
        let rest = 0; for (let i = 1; i < frames.length; i++) if (key(frames[i]) === key(frames[i - 1])) rest = Math.max(rest, (frames[i].computedOffset - frames[i - 1].computedOffset) * t.duration);
        return { name: a.animationName, duration: t.duration, rest: Math.round(rest) };
      }));
      const want = { 'hud-sweep': 8000, 'hero-caret': 6500, 'tech-drift': 22000, 'cta-stripes': 11000, 'cta-radar': 6500 };
      for (const [name, duration] of Object.entries(want)) {
        const loop = loops.find(l => l.name === name);
        assert.ok(loop && loop.duration === duration && loop.rest >= 4500, `${label}: ${name} = ${duration} ms with a ≥ 4.5 s rest ${JSON.stringify(loop)}`);
      }
      // Background tab: every running animation freezes, and resumes on return.
      const running = () => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
      assert.ok(await running() > 0);
      const setHidden = h => page.evaluate(h => { Object.defineProperty(document, 'hidden', { value: h, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); }, h);
      await setHidden(true); assert.equal(await running(), 0, `${label}: background tab pauses all animation`);
      await setHidden(false); assert.ok(await running() > 0, `${label}: animation resumes in the foreground`);
      // Pause control.
      const toggle = page.locator('.site-header [data-motion-toggle]');
      if (width >= 1280) {
        assert.ok(await toggle.isVisible(), `${label}: desktop pause control visible next to the language switch`);
        const geo = await page.evaluate(() => { const b = document.querySelector('.site-header [data-motion-toggle]').getBoundingClientRect(), l = document.querySelector('.langs').getBoundingClientRect(), s = document.querySelector('.tools .icon-link').getBoundingClientRect();
          return { w: b.width, h: b.height, right: b.right, langs: l.left, search: s.right, color: getComputedStyle(document.querySelector('.site-header [data-motion-toggle]')).color, muted: getComputedStyle(document.querySelector('.langs a:not([aria-current])')).color }; });
        assert.ok(geo.w >= 24 && geo.h >= 24 && geo.right <= geo.langs + 0.5 && geo.right - geo.w >= geo.search - 0.5 && geo.color === geo.muted, `${label}: 24 px target in the gap, muted colour ${JSON.stringify(geo)}`);
        // Nothing else in the header moved: compare with the same page without JS (control hidden).
        const rects = pg => pg.evaluate(() => [...document.querySelectorAll('.site-header .logo, .nav-list > li, .tools .icon-link, .langs a, .tools .contact')].map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)].join(); }));
        const ref = await browser.newContext({ viewport: { width, height: 900 }, javaScriptEnabled: false }); const rp = await ref.newPage(); await rp.goto(url);
        assert.deepEqual(await rects(page), await rects(rp), `${label}: header items keep their positions`);
        await ref.close();
        await toggle.focus(); await page.keyboard.press('Enter');
      } else {
        assert.equal(await toggle.isVisible(), false, `${label}: no pause control on the phone header row`);
        await page.locator('.menu-toggle').click();
        assert.ok(await toggle.isVisible(), `${label}: pause control in the open menu`);
        const box = await toggle.boundingBox(); assert.ok(box.width >= 44 && box.height >= 44, `${label}: 44 px target in the menu`);
        await toggle.focus(); await page.keyboard.press('Space');
      }
      assert.equal(await toggle.getAttribute('aria-pressed'), 'true', `${label}: pressed = paused`);
      assert.equal(await page.evaluate(() => document.documentElement.classList.contains('motion-off') && localStorage.getItem('bxr-motion')), 'off');
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => [...document.querySelectorAll('[data-hero] [data-clip]')].every(v => v.paused)), true, `${label}: pause also stops the hero footage`);
      assert.deepEqual(await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && !(a instanceof CSSTransition) && a.effect?.target?.tagName !== 'VIDEO').map(a => a.animationName ?? `waapi:${a.effect?.target?.className}`)), [], `${label}: paused — no animation runs (interaction transitions excepted)`);
      await page.goto(`${url}products/`);
      assert.equal(await page.locator('.site-header [data-motion-toggle]').getAttribute('aria-pressed'), 'true', `${label}: pause persists across pages`);
      assert.equal(await page.evaluate(() => document.documentElement.classList.contains('motion-off') && !document.documentElement.classList.contains('motion-ready')), true);
      await page.goto(url); await page.waitForFunction(() => !!window.bxrMotionDispose);
      assert.deepEqual(await page.evaluate(() => ({ motion: document.querySelector('[data-hero]').dataset.motion ?? null, count: document.querySelectorAll('.count-visual').length, opacity: getComputedStyle(document.querySelector('[data-hero] h1')).opacity })), { motion: null, count: 0, opacity: '1' }, `${label}: paused page shows the final state`);
      assert.equal(await page.locator('[data-hero] source[src]').count(), 0, `${label}: stored pause never starts (or downloads) the footage`);
      if (width < 1280) await page.locator('.menu-toggle').click();
      await page.locator('.site-header [data-motion-toggle]').click();
      assert.equal(await page.evaluate(() => !document.documentElement.classList.contains('motion-off') && localStorage.getItem('bxr-motion')), null, `${label}: resume clears the stored choice`);
      await page.waitForFunction(() => { const v = document.querySelector('[data-hero] [data-clip].is-on'); return v && !v.paused; }, null, { timeout: 15000 });
      assert.deepEqual(errors, []);
      // Underlines: every phrase group inside an underlined link carries the underline, with no skip-ink gaps.
      if (width >= 1024) {
        const broken = async () => page.evaluate(() => [...document.querySelectorAll('main a')].filter(a => getComputedStyle(a).textDecorationLine.includes('underline'))
          .flatMap(a => [...a.querySelectorAll('.type-phrase, .type-group')].filter(g => !getComputedStyle(g).textDecorationLine.includes('underline') || getComputedStyle(g).textDecorationSkipInk !== 'none').map(() => a.textContent.trim())));
        assert.deepEqual(await broken(), [], `${label}: resting underlines are continuous`);
        for (const link of await page.locator('.tech-list a').all()) { await link.hover(); assert.deepEqual(await broken(), [], `${label}: hover underline is continuous on ${await link.textContent()}`); }
      }
      await ctx.close();
      // System reduced motion: the control shows "paused" and cannot switch animation on.
      const rctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const rp = await rctx.newPage(); await rp.goto(url); await rp.waitForFunction(() => !!window.bxrMotionDispose);
      if (width < 1280) await rp.locator('.menu-toggle').click();
      const rt = rp.locator('.site-header [data-motion-toggle]');
      if (await rt.isVisible()) { await rt.click({ force: true }); assert.deepEqual([await rt.getAttribute('aria-pressed'), await rt.getAttribute('aria-disabled'), await rp.evaluate(() => localStorage.getItem('bxr-motion'))], ['true', 'true', null], `${label}: reduced motion keeps the control paused`); }
      await rctx.close();
      // Storage unavailable: no error, the control still works for this page.
      const sctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
      await sctx.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } }));
      const sp = await sctx.newPage(); const serr = []; sp.on('pageerror', e => serr.push(e.message));
      await sp.goto(url); await sp.waitForFunction(() => !!window.bxrMotionDispose);
      if (width < 1280) await sp.locator('.menu-toggle').click();
      await sp.locator('.site-header [data-motion-toggle]').click();
      assert.equal(await sp.evaluate(() => document.documentElement.classList.contains('motion-off')), true);
      assert.deepEqual(serr, [], `${label}: no error without localStorage`);
      await sctx.close();
      // Narrow desktops: control in the header gap at 1140–1279 (tool gaps only), in the footer at 1024–1139.
      if (width === 1440) for (const w of [1024, 1139, 1140, 1279]) {
        const c3 = await browser.newContext({ viewport: { width: w, height: 800 }, reducedMotion: 'no-preference' });
        const p3 = await c3.newPage(); await p3.goto(url); await p3.waitForFunction(() => !!window.bxrMotionDispose);
        const st = await p3.evaluate(() => {
          const vis = e => !!e && !e.hidden && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0;
          const h = document.querySelector('.site-header [data-motion-toggle]'), f = document.querySelector('.site-footer [data-motion-toggle]'), bar = document.querySelector('.site-header .bar');
          const b = h.getBoundingClientRect(), others = [...document.querySelectorAll('.tools .icon-link, .langs a, .tools .contact')].map(e => e.getBoundingClientRect());
          return { header: vis(h), footer: vis(f), w: b.width, h: b.height, overlap: others.some(o => b.left < o.right - .5 && o.left < b.right - .5 && b.top < o.bottom && o.top < b.bottom),
            overflow: bar.scrollWidth > bar.clientWidth + 1, rows: new Set([...document.querySelectorAll('.nav-list > li')].map(li => Math.round(li.getBoundingClientRect().top))).size };
        });
        const header = w >= 1140;
        assert.ok(st.header === header && st.footer === !header && !st.overflow && st.rows === 1 && (!header || (st.w >= 24 && st.h >= 24 && !st.overlap)), `${lang}@${w}: pause control placement ${JSON.stringify(st)}`);
        await c3.close();
      }
      // Corner fit at the other desktop widths; the left pair fades with the footage (≤ 0.15 opaque over copy).
      if (width === 1440) for (const w of [1280, 1920]) {
        const c2 = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'no-preference' });
        const p2 = await c2.newPage(); await p2.goto(url); await p2.waitForFunction(() => document.querySelector('[data-hero]')?.dataset.motion === 'done');
        const fit = await cornerFit(p2);
        assert.ok(fit.error <= 2, `${lang}@${w}: corners match the visible footage (error ${fit.error.toFixed(1)} px)`);
        assert.ok(fit.maxOnText <= 0.15, `${lang}@${w}: corners over copy stay ≤ 0.15 opaque (${fit.maxOnText})`);
        await c2.close();
      }
    }
    cases++;
  }
  console.log(`PASS: ${cases} TW/EN/JP home viewports — no-JS/failed/slow-JS copy visible, reduced motion static, aria-hidden decorations, single binding, resize reflow, no title underline, off-screen pause; partner count-up (home + partners page) final values without JS/with reduced motion, aria-hidden digits, stable width, single run, home 4-column/2×2 layout; tech blueprint glow paused off screen, one-shot beam/glitch on hover and keyboard focus, reduced motion static; header blur/progress (menu-safe), product-card feedback on hover + keyboard, static rulers, CTA stripes + radar on-screen only, inline-SVG news texture; HUD corners = rendered footage ±2 px at 1280/1440/1920/390, left pair ≤ 0.15 over copy; loops one pass + ≥ 4.5 s rest; background tab pauses; header pause control (desktop gap ≥ 1140 / footer 1024–1139 / mobile menu, persisted, reduced-locked, storage-safe); continuous underlines.`);
} finally { await browser.close(); server.stop(); }
