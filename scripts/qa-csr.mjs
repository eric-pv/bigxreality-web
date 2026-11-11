import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import {csrNews,currentNews} from './lib/cms-content.mjs';
import { startPreview, CHROMIUM } from './lib/serve.mjs';
const slugs = csrNews();
const server = await startPreview(4371);
const browser = await chromium.launch({ executablePath: CHROMIUM });
let checked = 0;
try {
 const page = await browser.newPage({ reducedMotion: 'reduce' });
 const errors = [];
 page.on('pageerror', e => errors.push(e.message));
 page.on('response', r => { if (r.status() >= 400) errors.push(r.url()); });
 for (const lang of ['tw','en','jp']) {
  for (const width of [1440,768,390]) {
   await page.setViewportSize({width,height:900});
   await page.goto(`${server.base}/${lang}/company/csr/`);
   assert.equal(await page.locator('h1').count(),1);
   assert.equal(await page.locator('section.topic').count(),4);
   assert.equal(await page.locator('.csr-cards .card').count(),csrNews(lang).length);
   for (const slug of slugs) assert.ok(await page.locator(`.csr-cards a[href="/${lang}/news/${slug}/"]`).count());
   assert.equal(await page.locator('link[rel="alternate"][hreflang]').count(),4);
   assert.ok((await page.locator('link[rel="canonical"]').getAttribute('href')).endsWith(`/${lang}/company/csr/`));
   assert.ok((await page.locator('meta[name="description"]').getAttribute('content')).length);
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
   for (const img of await page.locator('img').all()) assert.ok(await img.evaluate(el => el.complete && el.naturalWidth > 0));
   for (const slug of slugs) {
    await page.goto(`${server.base}/${lang}/news/${slug}/`);
    assert.equal(await page.locator(`.csr-links > a[href="/${lang}/company/csr/"]`).count(),1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
   }
   checked++;
  }
  // The same news paragraphs remain intact; CSR adds metadata, never a second article body.
  for (const slug of slugs) {
   assert.equal(currentNews(slug).featuredInCSR,true);
  }
 }
 assert.deepEqual(errors,[]);
 console.log(`PASS: CSR and currently linked news pages across ${checked} language/viewport combinations; SEO, topics, bidirectional links, no overflow or failed requests.`);
} finally { await browser.close(); server.stop(); }
