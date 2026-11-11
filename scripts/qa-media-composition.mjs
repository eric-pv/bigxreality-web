import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {chromium} from 'playwright-core';import {startPreview,CHROMIUM,DIST} from './lib/serve.mjs';
const widths=[320,375,390,430,768,1024,1440], server=await startPreview(4384),browser=await chromium.launch({executablePath:CHROMIUM});
const out='docs/reviews/visual-copy/screenshots/after';fs.mkdirSync(out,{recursive:true});
let checked=0,images=0,videoCases=0;const failures=[];
function routes(dir,list=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory()){if(!['_astro','pagefind','admin','media','video','fonts'].includes(e.name))routes(p,list);}else if(e.name==='index.html'){const url='/'+path.relative(DIST,path.dirname(p)).replaceAll(path.sep,'/')+'/';if(/^\/(tw|en|jp)\//.test(url)&&!url.includes('/news/filter/'))list.push(url);}}return list;}
try{
 const page=await browser.newPage({reducedMotion:'reduce'});
 page.on('pageerror',e=>failures.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push(r.url());});
 for(const width of widths){await page.setViewportSize({width,height:960});for(const route of routes(DIST).filter(route=>[320,1440].includes(width)||!/^\/(tw|en|jp)\/news\/news-/.test(route))){
  assert.equal((await page.goto(server.base+route)).status(),200,route);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${route} @${width}: overflow`);
  for(const img of await page.locator('main img').all()){
   // Responsive decorative thumbnails can be display:none. Still load/decode every source,
   // but only scroll rendered images into view (hidden elements cannot be scrolled to).
   if(await img.isVisible())await img.scrollIntoViewIfNeeded();
   await img.evaluate(async img=>{img.loading='eager';await img.decode();});
   const m=await img.evaluate(img=>({width:img.naturalWidth,alt:img.alt,decorative:img.hasAttribute('alt')&&!!img.closest('.sector-tag, [aria-hidden="true"]'),w:img.getBoundingClientRect().width,h:img.getBoundingClientRect().height,fit:getComputedStyle(img).objectFit}));
   assert.ok(m.width>0&&(m.alt.trim()||m.decorative),`${route} image decode/alt`);
   if(m.w&&m.h)assert.ok(['contain','cover','fill'].includes(m.fit));images++;
  }
  for(const frame of await page.locator('.news-card .media, .feature-media, [data-block="latest-news"] .media').all()){
   const box=await frame.boundingBox();if(box&&box.height>0)assert.ok(Math.abs(box.width/box.height-16/9)<.035,`${route} @${width}: 16:9 thumbnail`);
  }
  for(const hero of await page.locator('.hero--scene img,.hero--equipment img,.hero--interface img').all())assert.equal(await hero.evaluate(img=>getComputedStyle(img).objectFit),await hero.evaluate(img=>img.closest('[data-hero-uniform]')?'cover':'contain'));
  assert.equal(await page.locator('main .brand-default:visible').count(),0,route+' repeated BXR placeholder');
  checked++;
 } console.log(`checked width ${width}: ${checked} page/viewports`); }
 const v=await browser.newPage({reducedMotion:'no-preference'});
 v.on('pageerror',e=>failures.push(e.message));
 for(const lang of ['tw','en','jp'])for(const width of widths){
  await v.setViewportSize({width,height:960});await v.goto(`${server.base}/${lang}/`);
  await v.waitForFunction(()=>document.querySelector('[data-hero]')?.getAttribute('data-current-clip')==='0');
  const control=v.locator('[data-toggle]');assert.equal(await control.evaluate(el=>getComputedStyle(el).opacity),'0');
  const initial=await v.locator('[data-hero] .media').boundingBox();
  for(const clip of await v.locator('[data-clip]').all())assert.equal(await clip.evaluate(video=>getComputedStyle(video).objectFit),'contain');
  const video=v.locator('[data-clip].is-on');assert.ok(await video.evaluate(v=>v.muted&&v.playsInline&&v.readyState>=2));
  if(lang==='tw'&&[1440,390].includes(width)){
   await v.waitForTimeout(700);await v.screenshot({path:`${out}/video-1-${width}.jpg`,type:'jpeg',quality:85});
   // Let the actual media end; no synthetic ended event for these composition captures.
   await v.waitForFunction(()=>document.querySelector('[data-hero]')?.getAttribute('data-current-clip')==='1',{},{timeout:15000});
   await v.waitForTimeout(700);await v.screenshot({path:`${out}/video-2-${width}.jpg`,type:'jpeg',quality:85});
   await v.waitForFunction(()=>document.querySelector('[data-hero]')?.getAttribute('data-current-clip')==='0',{},{timeout:15000});
  }else{
   await video.evaluate(video=>{video.currentTime=video.duration-.05;});
   await v.waitForFunction(()=>document.querySelector('[data-hero]')?.getAttribute('data-current-clip')==='1',{},{timeout:10000});
  }
  assert.deepEqual(await v.locator('[data-hero] .media').boundingBox(),initial,'stable carousel geometry');
  await control.focus();assert.equal(await control.evaluate(el=>getComputedStyle(el).opacity),'1');await v.keyboard.press('Enter');
  assert.equal(await control.getAttribute('aria-pressed'),'true');assert.ok(await v.locator('[data-clip]').evaluateAll(videos=>videos.every(v=>v.paused)));
  await v.emulateMedia({reducedMotion:'reduce'});assert.ok(await v.locator('[data-clip]').evaluateAll(videos=>videos.every(v=>v.paused)));
  await v.emulateMedia({reducedMotion:'no-preference'});videoCases++;
 }
 await v.emulateMedia({reducedMotion:'reduce'});await v.goto(server.base+'/tw/');assert.equal(await v.locator('[data-clip] source[src]').count(),0);
 assert.deepEqual(failures,[]);
 const result={pageViewportChecks:checked,decodedImages:images,videoCases,widths,originalVideos:'Unchanged; whole native frame is retained',realEndedAndWrapCaptures:[1440,390],exceptions:'News photos and unprovided UI/scenario material remain pending; no unrelated imagery used.'};
 fs.writeFileSync('docs/reviews/visual-copy/BROWSER-RESULTS.json',JSON.stringify(result,null,2));console.log('PASS',JSON.stringify(result));
}finally{await browser.close();server.stop();}
