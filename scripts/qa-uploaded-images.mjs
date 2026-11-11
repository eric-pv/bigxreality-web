import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright-core';
import { startPreview, CHROMIUM } from './lib/serve.mjs';
const products=['sut','uav','usv','wargaming-table','mortar-observation','sniper-simulator','machine-gun-simulator','hmmwv-simulator','tactical-boat-simulator','full-scale-police-training','police-box','fire-extinguisher-simulator'];
const solutions=['military','police','fire-rescue','smart-city'];
const source=fs.readFileSync(new URL('../src/data/primary-images.ts',import.meta.url),'utf8');
const files=[...source.matchAll(/import image\d+ from '\.\.\/assets\/images\/products\/([^']+)'/g)].map(m=>m[1]);
for(const file of files){const asset='src/assets/images/products/'+file;assert.equal(execFileSync('git',['hash-object',asset],{encoding:'utf8'}).trim(),execFileSync('git',['rev-parse',`HEAD:${asset}`],{encoding:'utf8'}).trim(),file+' source modified');}
const server=await startPreview(4362),browser=await chromium.launch({executablePath:CHROMIUM});
const sources=new Map(),failures=[];let cases=0;
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 page.on('response',r=>{if(r.request().resourceType()==='image'&&r.status()>=400)failures.push(r.url());});
 page.on('pageerror',error=>failures.push(error.message));
 for(const lang of ['tw','en','jp']) for(const width of [1440,768,390]) {
  await page.setViewportSize({width,height:1000});
  for(const route of ['', 'products','solutions',...products.map(s=>'products/'+s),...solutions.map(s=>'solutions/'+s)]){
   const url=`/${lang}/${route?route+'/':''}`;
   assert.equal((await page.goto(server.base+url)).status(),200,url);
   if(products.some(s=>route==='products/'+s)||solutions.some(s=>route==='solutions/'+s))assert.equal(await page.locator('.page-hero img[data-primary-image]').count(),1,url);
   if(route==='products')assert.equal(await page.locator('#product-grid [data-primary-image]').count(),12);
   if(route==='')assert.equal(await page.locator('[aria-labelledby="h-solutions"] [data-primary-image]').count(),4);
   const images=page.locator('img[data-primary-image]');
   for(const image of await images.all()){
    await image.scrollIntoViewIfNeeded();
    await image.evaluate(img=>img.decode());
    const m=await image.evaluate(img=>({file:img.dataset.primaryImage,src:img.currentSrc,alt:img.alt,fit:getComputedStyle(img).objectFit,w:img.width,h:img.height,natural:img.naturalWidth,loading:img.loading}));
    assert.ok(m.natural>0&&m.w>0&&m.h>0,m.file);assert.ok(m.alt.trim());assert.ok(['cover','contain'].includes(m.fit));
    // Responsive candidates differ by slot and viewport; the source asset (name.hash before Astro's _transform suffix) must not.
    const asset=decodeURIComponent(new URL(m.src).pathname.split('/').pop()).replace(/_[^_.]+\.[a-z]+$/,'');
    assert.ok(asset.startsWith(m.file.replace(/\.[^.]+$/,'')+'.'),`${m.file} rendered from ${asset}`);
    const previous=sources.get(m.file);if(previous)assert.equal(previous.asset,asset);else sources.set(m.file,{asset,url:m.src});
    if(lang==='en')assert.ok(!/[\u3400-\u9fff]/.test(m.alt));
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,url+' overflow');
   if(width===1440&&lang==='tw'&&route==='products/tactical-boat-simulator')await page.screenshot({path:'/tmp/bxr-images-boat-desktop.png',fullPage:false});
   if(width===390&&lang==='tw'&&['products/sut','products/full-scale-police-training','products/tactical-boat-simulator','solutions/police',''].includes(route)){
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`/tmp/bxr-images-${route.replaceAll('/','-')||'home'}-mobile.png`,fullPage:route===''});
   }
   cases++;
  }
 }
 assert.equal(sources.size,15);assert.deepEqual(failures,[]);
 // Originals are pinned by the git hash check above; what is served is a resized derivative and must be lighter than its original.
 for(const [file,{url}]of sources){const response=await fetch(url);assert.equal(response.status,200,url);assert.ok((await response.arrayBuffer()).byteLength<fs.statSync('src/assets/images/products/'+file).size,file+' served candidate is not smaller than the original');}
 console.log(`PASS: ${files.length} unchanged original assets (served as smaller responsive derivatives), ${cases} routes/viewports, shared three-language sources, image decode/404/alt/fit checks`);
}finally{await browser.close();server.stop();}
