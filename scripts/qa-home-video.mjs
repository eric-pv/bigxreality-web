import assert from 'node:assert/strict';import{chromium}from'playwright-core';import{startPreview,CHROMIUM}from'./lib/serve.mjs';
const server=await startPreview(4396),browser=await chromium.launch({executablePath:CHROMIUM});let cases=0;
try{const page=await browser.newPage({reducedMotion:'no-preference'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
for(const lang of['tw','en','jp'])for(const width of[320,375,390,430,768,1024,1440]){await page.setViewportSize({width,height:960});await page.goto(`${server.base}/${lang}/`);await page.waitForFunction(()=>document.querySelector('[data-hero]')?.getAttribute('data-current-clip')==='0');
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
const hero=page.locator('[data-hero]'),control=hero.locator('[data-toggle]');assert.equal(await control.evaluate(e=>getComputedStyle(e).opacity),'0');
for(const clip of await hero.locator('video').all())assert.equal(await clip.evaluate(v=>getComputedStyle(v).objectFit),'contain');
const box=await hero.boundingBox();await page.waitForFunction(()=>document.querySelector('[data-hero]')?.getAttribute('data-current-clip')==='1',{},{timeout:15000});await page.waitForFunction(()=>document.querySelector('[data-hero]')?.getAttribute('data-current-clip')==='0',{},{timeout:15000});assert.deepEqual(await hero.boundingBox(),box);
await control.focus();assert.equal(await control.evaluate(e=>getComputedStyle(e).opacity),'1');await page.keyboard.press('Enter');assert.equal(await control.getAttribute('aria-pressed'),'true');assert.ok(await hero.locator('video').evaluateAll(vs=>vs.every(v=>v.paused)));
await page.emulateMedia({reducedMotion:'reduce'});await page.reload();assert.equal(await hero.locator('source[src]').count(),0);await page.emulateMedia({reducedMotion:'no-preference'});cases++;}
assert.deepEqual(errors,[]);console.log(`PASS: ${cases} TW/EN/JP home viewports; real ended and wrap, whole-frame contain, stable geometry, keyboard control and reduced-motion.`);
}finally{await browser.close();server.stop();}
