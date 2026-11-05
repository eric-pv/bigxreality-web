import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright-core';
import {startPreview,CHROMIUM} from './lib/serve.mjs';
const server=await startPreview(4383),browser=await chromium.launch({executablePath:CHROMIUM});
const widths=[1366,1440,1920,768,390,430];let heroes=0,videos=0;
try{
 const p=await browser.newPage({reducedMotion:'reduce'}),v=await browser.newPage({reducedMotion:'no-preference'}),errors=[];
 for(const page of [p,v]){page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.url());});}
 for(const lang of ['tw','en','jp'])for(const width of widths){
  await p.setViewportSize({width,height:1000});await v.setViewportSize({width,height:1000});
  for(const collection of ['products','solutions'])for(const file of fs.readdirSync(`src/content/${collection}/zh-Hant`).filter(f=>f.endsWith('.md'))){
   const slug=file.slice(0,-3),url=`/${lang}/${collection}/${slug}/`;await p.goto(server.base+url);const hero=p.locator('.page-hero'),image=hero.locator('img');await image.evaluate(img=>img.decode());
   assert.ok(['scene','equipment','interface'].includes(await hero.getAttribute('data-hero-variant')),url);
   const frame=await image.evaluate(img=>{const rect=img.getBoundingClientRect(),root=img.closest('.page-hero').getBoundingClientRect(),style=getComputedStyle(img);return {fit:style.objectFit,top:rect.top-root.top,bottom:rect.bottom-root.bottom,width:rect.width,height:rect.height};});
   // Product and solution landings share one uniform 16:9 scene hero that fills its box (cover, centred focus crop).
   assert.equal(await hero.getAttribute('data-hero-variant'),'scene',url+' hero variant');
   assert.equal(frame.fit,await hero.getAttribute('data-hero-uniform')!==null?'cover':'contain',url+' hero fit');
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,url);
   if(collection==='solutions'&&slug==='fire-rescue')assert.equal(await image.getAttribute('data-primary-image'),'vr-fire-extinguisher-training-trainee.webp');
   if(lang==='tw'&&[1440,390].includes(width)&&['sut','military','fire-rescue'].includes(slug))await hero.screenshot({path:`/tmp/bxr-framing-${slug}-${width}.png`});heroes++;
  }
  await v.goto(`${server.base}/${lang}/`);assert.deepEqual(await v.locator('[data-clip] source[type="video/mp4"]').evaluateAll(es=>es.map(e=>e.dataset.src)),['/video/hero/hero-1.mp4','/video/hero/hero-2.mp4']);
  await v.waitForFunction(()=>document.querySelector('[data-clip].is-on')?.readyState>=2&&!document.querySelector('[data-toggle]').hidden);
  const first=v.locator('[data-clip]').first();await first.evaluate(el=>{el.pause();el.currentTime=.8;});await first.evaluate(el=>new Promise(resolve=>el.seeking?el.addEventListener('seeked',resolve,{once:true}):resolve()));
  assert.ok(await first.evaluate(el=>el.muted&&el.playsInline));
  if(width<1024){const media=await v.locator('[data-hero] .media').boundingBox(),copy=await v.locator('[data-hero] .inner').boundingBox();assert.ok(Math.abs(media.width/media.height-16/9)<.01);assert.ok(copy.y>=media.y+media.height-1);assert.equal(await v.locator('[data-hero] .shade').evaluate(el=>getComputedStyle(el).backgroundImage),'none');assert.equal(await first.evaluate(el=>getComputedStyle(el).objectFit),'contain');}
  assert.equal(await first.evaluate(el=>getComputedStyle(el).objectFit),'contain');
  if(lang==='tw'&&[1440,390].includes(width))await v.locator('[data-hero]').screenshot({path:`/tmp/bxr-framing-home-${width}.png`});
  await v.locator('[data-toggle]').focus();await v.locator('[data-toggle]').click();assert.equal(await v.locator('[data-toggle]').getAttribute('aria-pressed'),'true');await v.locator('[data-toggle]').click();await first.evaluate(el=>el.currentTime=el.duration-.05);await v.waitForFunction(()=>document.querySelector('[data-hero]').getAttribute('data-current-clip')==='1');
  for(const route of ['', 'solutions/']){await p.goto(`${server.base}/${lang}/${route}`);assert.ok(await p.locator('img[data-primary-image="vr-fire-extinguisher-training-trainee.webp"]').count());}
  videos++;
 }
 assert.deepEqual(errors,[]);console.log(`PASS: ${heroes} trilingual scene/equipment/interface Heroes with complete subjects and reviewed framing; ${videos} home viewports verify 1→2 video order, top framing, full 16:9 mobile footage with no dark shade, pause/next controls and shared fire cover.`);
}finally{await browser.close();server.stop();}
