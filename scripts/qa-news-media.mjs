// DOM-only widget harness uses the repository's existing favicon. No news asset or binary is created.
import assert from 'node:assert/strict';import {chromium} from 'playwright-core';import {startPreview,CHROMIUM} from './lib/serve.mjs';
const server=await startPreview(4367),browser=await chromium.launch({executablePath:CHROMIUM});let checked=0;
try{
 const page=await browser.newPage({reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let playerRequests=0;await page.route('https://www.youtube-nocookie.com/**',route=>{playerRequests++;return route.fulfill({contentType:'text/html',body:'<!doctype html><title>QA frame</title>'});});
 for(const lang of ['tw','en','jp'])for(const width of [1440,768,390]){
  await page.setViewportSize({width,height:900});await page.goto(`${server.base}/${lang}/news/news-07-indo-defence/`);
  assert.equal(await page.locator('.news-videos iframe').count(),0);assert.ok(await page.locator('.news-videos a[href="https://youtu.be/GUrKtH_TKjU"]').isVisible());
  await page.evaluate(()=>{const root=document.querySelector('[data-news-gallery]');root.hidden=false;const list=root.querySelector('ul');for(let i=0;i<2;i++){const li=document.createElement('li');li.innerHTML='<figure><a data-gallery-open href="/favicon.svg" aria-label="QA image"><img src="/favicon.svg" alt="QA existing icon" width="32" height="32"></a><figcaption>QA caption</figcaption></figure>';list.append(li);}});
  const links=page.locator('[data-gallery-open]');await links.first().click();await page.waitForFunction(()=>document.querySelector('[data-news-gallery] dialog').open);
  await page.locator('[data-gallery-display] img').evaluate(img=>img.decode());
  assert.equal(await page.locator('[data-gallery-caption]').innerText(),'QA caption');
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[data-news-gallery] dialog').open);
  assert.equal(await links.first().evaluate(el=>el===document.activeElement),true);
  await links.last().click();await page.locator('[data-gallery-close]').click();await page.waitForFunction(()=>!document.querySelector('[data-gallery-display] img'));
  const before=playerRequests;
  await page.evaluate(()=>{const item=document.createElement('div');item.className='player';const button=document.createElement('button');button.type='button';button.textContent='QA load';button.dataset.videoPlayer='https://www.youtube-nocookie.com/embed/GUrKtH_TKjU?autoplay=0&rel=0';button.dataset.videoTitle='QA player';item.append(button);const root=document.querySelector('[data-news-videos]');for(const attr of root.attributes)if(attr.name.startsWith('data-astro-cid-')){item.setAttribute(attr.name,'');button.setAttribute(attr.name,'');}root.append(item);});
  assert.equal(playerRequests,before);await page.locator('[data-video-player]').click();await page.waitForFunction(()=>!!document.querySelector('.news-videos iframe'));
  assert.ok((await page.locator('.news-videos iframe').getAttribute('src')).includes('autoplay=0'));
  assert.ok(!(await page.locator('.news-videos iframe').getAttribute('allow')).includes('autoplay'));
  await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide')));assert.equal(await page.locator('.news-videos iframe').count(),0);assert.equal(await page.locator('[data-video-player]').isVisible(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);checked++;
 }
 for(const lang of ['tw','en','jp']){await page.goto(`${server.base}/${lang}/news/news-29-xr-defense-platform-2025/`);assert.equal(await page.locator('.news-videos iframe').count(),0);assert.ok(await page.locator('.news-videos a[href="https://www.facebook.com/gpttcom/videos/1741246489814363/"]').isVisible());}
 assert.deepEqual(errors,[]);console.log(`PASS: ${checked} language/viewport gallery+video controls; keyboard close/focus, click-to-load, no autoplay, pagehide reset, Facebook fallback. Remote player requests intercepted, no media downloaded.`);
}finally{await browser.close();server.stop();}
