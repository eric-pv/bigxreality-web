import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {chromium} from 'playwright-core';import {startPreview,CHROMIUM,DIST} from './lib/serve.mjs';
const stage=process.env.VISUAL_STAGE??'after';const out=`docs/reviews/visual-copy/screenshots/${stage}`;fs.mkdirSync(out,{recursive:true});
const server=await startPreview(4399),browser=await chromium.launch({executablePath:CHROMIUM});
const routes=['','products/','products/sut/','products/fire-extinguisher-simulator/','products/sniper-simulator/','products/tactical-boat-simulator/','solutions/','solutions/military/','solutions/fire-rescue/','technologies/','technologies/xr/','news/','company/'];
try{const page=await browser.newPage({reducedMotion:'reduce'});
for(const width of [1440,390]){await page.setViewportSize({width,height:960});for(const route of routes){await page.goto(`${server.base}/tw/${route}`);await page.evaluate(()=>document.fonts.ready);await page.locator('main').waitFor();for(const img of await page.locator('main img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());}await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${out}/${route.replaceAll('/','-')||'home'}-${width}.jpg`,type:'jpeg',quality:75,fullPage:route==='products/fire-extinguisher-simulator/'});}}
console.log(`PASS: ${stage}, 26 desktop/mobile before/after captures in ${out}`);
}finally{await browser.close();server.stop();}
