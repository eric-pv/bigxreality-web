// Requires the fixture build. No production content or remote media requests are used.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright-core';
import {startPreview,CHROMIUM,DIST} from './lib/serve.mjs';
import {renderBodyMedia} from '../src/lib/body-media.ts';
import {encodeMedia} from '../public/admin/editor-components.js';
assert.ok(DIST.endsWith('dist-fixtures'),'Run with QA_DIST=dist-fixtures; never alter the production build');
const media=path.join(DIST,'media/news/bxr-inline-fixture.webm');
await mkdir(path.dirname(media),{recursive:true});await copyFile(new URL('../tests/fixtures/media/inline-sample.webm',import.meta.url),media);
const local=await renderBodyMedia(encodeMedia('video',{type:'local',url:'/media/news/bxr-inline-fixture.webm',title:'TEST FIXTURE local video',approved:true}),{entryFile:'tests/fixtures/news.md',lang:'tw',image:async()=>{throw new Error('No image expected');},localVideoExists:file=>existsSync(path.join(DIST,file.replace(/^public\//,'')))});
const template=await readFile(path.join(DIST,'tw/news/fixture-news-02/index.html'),'utf8');
assert.ok(template.includes('name="robots" content="noindex"'));
await writeFile(path.join(DIST,'qa-inline-local.html'),template.replace('</main>',local+'</main>'));
const server=await startPreview(4404),browser=await chromium.launch({executablePath:CHROMIUM});
try{
 const page=await browser.newPage();let externalRequests=0;
 await page.route('https://**/*',async route=>{externalRequests++;return route.abort();});
 for(const lang of ['tw','en','jp'])for(const width of [390,1440]){
  await page.setViewportSize({width,height:900});await page.goto(`${server.base}/${lang}/${lang==='jp'?'insights/fixture-insight-1':'news/fixture-news-02'}/`);
  const image=page.locator('[data-bxr-inline-image] img');await image.evaluate(img=>img.decode());
  assert.equal(await image.getAttribute('alt'),`TEST FIXTURE ${lang} inline image`);
  assert.equal(await page.locator('[data-bxr-inline-image] figcaption').innerText(),`TEST FIXTURE ${lang} inline caption`);
  assert.equal(await page.locator('[data-bxr-inline-image]').count(),1,'Unapproved image must not render');
  assert.equal(await page.locator('.bxr-inline-player iframe').count(),0);
  assert.equal(externalRequests,0,'No external player requests before user interaction');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Media must not cause horizontal overflow');
  const html=await page.locator('main').innerHTML();assert.ok(html.indexOf('before inline media')<html.indexOf('data-bxr-inline-image'));assert.ok(html.indexOf('data-bxr-inline-image')<html.indexOf('between image and video'));assert.ok(html.indexOf('between image and video')<html.indexOf('data-bxr-inline-video'));assert.ok(html.indexOf('data-bxr-inline-video')<html.indexOf('after inline media'));
 }
 for(const lang of ['tw','en','jp']){
  await page.goto(`${server.base}/${lang}/cms-fixture/inline/`);
  const image=page.locator('.landing-body [data-bxr-inline-image] img');await image.evaluate(img=>img.decode());
  assert.equal(await image.getAttribute('alt'),`TEST FIXTURE ${lang} landing image`);
  const ratio=await image.evaluate(img=>img.getBoundingClientRect().width/img.getBoundingClientRect().height);assert.ok(Math.abs(ratio-16/9)<0.02,'Landing inline images must follow the 16:9 layout rule');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 await page.goto(`${server.base}/tw/news/fixture-news-02/`);
 await page.locator('[data-bxr-video]').click();await page.locator('.bxr-inline-player iframe').waitFor();
 assert.match(await page.locator('.bxr-inline-player iframe').getAttribute('src'),/^https:\/\/www\.youtube-nocookie\.com\/embed\/abcdefghijk\?autoplay=0&rel=0$/);
 await page.goto('http://127.0.0.1:4404/qa-inline-local.html');
 const video=page.locator('.bxr-inline-media video');await video.evaluate(async v=>{if(v.readyState<1)await new Promise((resolve,reject)=>{v.addEventListener('loadedmetadata',resolve,{once:true});v.addEventListener('error',reject,{once:true});});});
 assert.ok(await video.evaluate(v=>v.videoWidth>0&&v.duration>0));
 assert.equal(await video.getAttribute('autoplay'),null);
 console.log('PASS: three-language inline images and captions, approval gate, paragraph order, desktop/mobile layout, typed landing prose blocks with 16:9 images, click-to-load external player, playable local video; no remote media downloaded.');
}finally{await browser.close();server.stop();}
