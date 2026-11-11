import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { startPreview, CHROMIUM } from './lib/serve.mjs';
const server = await startPreview(4361), browser = await chromium.launch({ executablePath: CHROMIUM });
const routes = ['', 'solutions', 'solutions/military', 'products', 'products/sut', 'technologies', 'technologies/xr', 'company', 'news'];
let checked = 0;
try {
  for (const lang of ['tw', 'en', 'jp']) for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'no-preference', hasTouch: width < 1024 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.motionStarts = [];
      document.addEventListener('animationstart', e => { if (e.animationName === 'bxr-enter') window.motionStarts.push(e.target.textContent); });
    });
    for (const route of routes) {
      const url = `${server.base}/${lang}/${route ? route + '/' : ''}`;
      assert.equal((await page.goto(url)).status(), 200);
      await page.waitForFunction(() => !!window.bxrMotionDispose);
      // Includes templates with no below-fold heading: hero/buttons/cards remain interactive.
      assert.ok(await page.locator('main h1').count());
      // The hidden inline inquiry form (InlineInquiry.astro) is not page content until opened.
      const target = page.locator('main h2:not(.visually-hidden):not([data-inline-inquiry] h2)').last();
      if (await target.count()) {
        await target.scrollIntoViewIfNeeded();
        await page.waitForFunction(text => window.motionStarts.some(value => value.includes(text)), (await target.textContent()).trim());
        await page.waitForFunction(() => !document.querySelector('.motion-enter'));
        const text = (await target.textContent()).trim();
        const starts = await page.evaluate(text => window.motionStarts.filter(value => value.includes(text)).length, text);
        assert.ok(starts > 0, `${lang}/${route}: no entrance coverage`);
        await page.evaluate(() => scrollTo(0, 0));
        await target.scrollIntoViewIfNeeded();
        assert.equal(await page.evaluate(text => window.motionStarts.filter(value => value.includes(text)).length, text), starts);
      }
      // Reload with native scroll restoration, then repeat at the top.
      await page.reload();
      await page.waitForFunction(() => window.motionStarts.length > 0);
      await page.waitForFunction(() => !document.querySelector('.motion-enter'));
      assert.equal(await page.locator('main').evaluate(el => getComputedStyle(el).opacity), '1');
      await page.evaluate(() => scrollTo(0, 0));
      await page.reload();
      await page.waitForFunction(() => !!window.bxrMotionDispose);
      await page.goto(`${server.base}/${lang}/contact/`);
      await page.goBack();
      await page.waitForFunction(() => !!window.bxrMotionDispose);
      await page.goForward();
      assert.equal(await page.locator('main h1').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      checked++;
    }
    await page.goto(`${server.base}/${lang}/products/sut/`);
    await page.waitForFunction(() => !!window.bxrMotionDispose);
    await page.evaluate(() => {
      const heading = document.createElement('h2'); heading.id = 'dynamic-motion-heading'; heading.textContent = 'Dynamic heading';
      document.querySelector('main').append(heading);
    });
    const dynamic = page.locator('#dynamic-motion-heading');
    await dynamic.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => window.motionStarts.includes('Dynamic heading'));
    // Router events and BFCache restoration may repeat, but must not duplicate observers/effects.
    await page.evaluate(() => {
      document.dispatchEvent(new Event('astro:before-swap'));
      document.dispatchEvent(new Event('astro:page-load'));
      document.dispatchEvent(new Event('astro:page-load'));
    });
    await page.waitForFunction(() => window.motionStarts.filter(x => x === 'Dynamic heading').length === 2);
    await page.waitForFunction(() => !document.querySelector('.motion-enter'));
    await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await page.waitForFunction(() => window.motionStarts.filter(x => x === 'Dynamic heading').length === 3);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !document.querySelector('.motion-enter'));
    assert.equal(await dynamic.evaluate(el => getComputedStyle(el).opacity), '1');
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log(`PASS: ${checked} template/language/viewport cases; first visit, reload, restored scroll, navigation/back/forward, dynamic insertion, router/BFCache reset and reduced motion`);
} finally { await browser.close(); server.stop(); }
