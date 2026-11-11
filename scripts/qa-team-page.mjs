import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { startPreview, CHROMIUM, DIST } from './lib/serve.mjs';
const server = await startPreview(4368);
const browser = await chromium.launch({executablePath: CHROMIUM});
try {
 const page = await browser.newPage();
 const sitemap = readFileSync(`${DIST}/sitemap.xml`, 'utf8');
 for (const lang of ['tw','en','jp']) {
  assert.ok(!existsSync(`${DIST}/${lang}/company/history/index.html`));
  assert.ok(!sitemap.includes(`/${lang}/company/history/`));
  assert.ok(sitemap.includes(`/${lang}/company/team/`));
  for (const width of [1440,768,390]) {
   await page.setViewportSize({width,height:900});
   await page.goto(`${server.base}/${lang}/company/team/`);
   assert.equal(await page.locator('main h1').count(),1);
   assert.equal(await page.locator('.areas li').count(),3);
   assert.equal(await page.locator('main figcaption').count(),0);
   assert.ok(!(await page.locator('main').innerText()).includes('架構示意'));
   assert.equal(await page.locator('.capabilities h2').count(),3);
   assert.equal(await page.locator('main img').count(),0);
   assert.equal(await page.locator('a[href*="/company/history/"]').count(),0);
   assert.equal(await page.locator('link[rel=alternate][hreflang]').count(),4);
   assert.ok(await page.evaluate(()=>!document.querySelector('meta[name=robots]')?.getAttribute('content')?.includes('noindex')));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const cols = await page.locator('.areas').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);
   assert.equal(cols,width<768?1:3);
   await page.screenshot({path:`/tmp/bxr-team-${lang}-${width}.png`,fullPage:true});
  }
 }
 console.log('PASS: three languages, 1440/768/390px; original team routes, complete capabilities, responsive framework, SEO and removed history.');
} finally { await browser.close();server.stop(); }
