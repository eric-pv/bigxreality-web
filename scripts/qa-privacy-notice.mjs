import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { startPreview, CHROMIUM } from './lib/serve.mjs';

const server = await startPreview(4402);
const browser = await chromium.launch({ executablePath: CHROMIUM });
const key = 'bxr-privacy-choice';
let cases = 0;
try {
  for (const lang of ['tw', 'en', 'jp']) for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [], posts = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
    const notice = page.locator('[data-privacy-notice]');
    await page.goto(`${server.base}/${lang}/`, { waitUntil: 'domcontentloaded' });
    await notice.waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), null, 'no assumed consent');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-privacy-choice')), 'accepted');
    assert.equal(await notice.locator('a').getAttribute('href'), `/${lang}/privacy/`);
    for (const button of await notice.locator('button').all()) {
      const box = await button.boundingBox();
      assert.ok(box.width >= 44 && box.height >= 44);
      assert.ok((await button.innerText()).trim());
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('data-privacy-choice')), 'rejected');
    await page.keyboard.press('Enter');
    assert.equal(await notice.isVisible(), false);
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'main');
    let stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    assert.equal(stored.choice, 'rejected');
    assert.deepEqual(Object.keys(stored).sort(), ['choice', 'version']);
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await notice.isVisible(), false);
    assert.equal(await page.locator('main h1').isVisible(), true);
    const other = lang === 'tw' ? 'en' : 'tw';
    await page.goto(`${server.base}/${other}/products/`, { waitUntil: 'domcontentloaded' });
    assert.equal(await notice.isVisible(), false, 'choice survives language/page changes');
    await page.goto(`${server.base}/${lang}/privacy/`, { waitUntil: 'domcontentloaded' });
    await notice.waitFor({ state: 'visible' });
    await notice.locator('[data-privacy-choice="accepted"]').click();
    stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    assert.equal(stored.choice, 'accepted');
    await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ choice: 'accepted', version: 'old' })), key);
    await page.goto(`${server.base}/${lang}/company/`, { waitUntil: 'domcontentloaded' });
    await notice.waitFor({ state: 'visible' });
    await page.evaluate(key => localStorage.setItem(key, '{invalid'), key);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await notice.waitFor({ state: 'visible' });
    assert.deepEqual(errors, []);
    assert.deepEqual(posts, [], 'choosing does not submit personal data');
    await context.close();
    cases++;
  }
  for (const lang of ['tw', 'en', 'jp']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
    await context.addInitScript(() => {
      Storage.prototype.getItem = () => { throw new Error('Storage disabled'); };
      Storage.prototype.setItem = () => { throw new Error('Storage disabled'); };
    });
    const page = await context.newPage();
    await page.goto(`${server.base}/${lang}/`, { waitUntil: 'domcontentloaded' });
    const notice = page.locator('[data-privacy-notice]');
    await notice.waitFor({ state: 'visible' });
    await notice.locator('[data-privacy-choice="rejected"]').click();
    assert.equal(await notice.isVisible(), false);
    await context.close();
  }
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${server.base}/tw/`, { waitUntil: 'domcontentloaded' });
  assert.equal(await page.locator('main h1').isVisible(), true);
  assert.equal(await page.locator('.copyright a[href="/tw/privacy/"]').count(), 1);
  await context.close();
  console.log(`PASS: ${cases} language/viewport cases; both choices, persistence, language changes, policy changes, corrupt/disabled storage, no-JS browsing and no POST`);
} finally {
  await browser.close();
  server.stop();
}
