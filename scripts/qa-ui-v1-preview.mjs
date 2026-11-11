import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {CHROMIUM,startPages} from './lib/serve.mjs';
import {publicBasePath} from '../src/lib/public-url.ts';
// Base path comes from src/data/site.json: /bigxreality-web/ for the project site, / for a custom domain.
const root=path.resolve('dist-pages'),base=publicBasePath;
const pages=[];function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(entry.name==='index.html')pages.push(file);}}walk(root);
let references=0;
for(const file of pages)for(const [,url]of fs.readFileSync(file,'utf8').matchAll(/\b(?:href|src|poster)="(\/[^"\s]+)"/g)){
 if(url.startsWith('//'))continue;assert.ok(url.startsWith(base),url);let target=decodeURIComponent(url.slice(base.length).split(/[?#]/)[0]);if(target.endsWith('/'))target+='index.html';assert.ok(fs.existsSync(path.join(root,target)),url);references++;
}
const server=await startPages({root,base,port:4379});const browser=await chromium.launch({executablePath:CHROMIUM});
let checked=0;
try{
 const p=await browser.newPage({reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(r.url());});
 for(const lang of ['tw','en','jp'])for(const width of [1440,390])for(const route of ['','news/','news/filter/event/all/','news/filter/all/2025/page/2/','products/sut/','solutions/military/','company/partners/']){
  await p.setViewportSize({width,height:900});assert.equal((await p.goto(`${server.origin}${base}${lang}/${route}`)).status(),200);
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(!route)assert.equal(await p.locator('[data-home-partners] img').count(),0);
  if(route==='news/'){await p.locator('.category-filter a[href$="/filter/event/all/"]').click();assert.ok(p.url().endsWith(`${base}${lang}/news/filter/event/all/`));await p.reload();assert.equal(await p.locator('[data-news-category]').evaluateAll(es=>es.every(e=>e.dataset.newsCategory==='event')),true);}
  if(route==='company/partners/')for(const img of await p.locator('[data-client-logos] img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(e=>e.decode());assert.ok((await img.getAttribute('src')).startsWith(base));}
  checked++;
 }
 assert.deepEqual(errors,[]);console.log(`PASS: ${pages.length} rebased HTML pages, ${references} local references, ${checked} TW/EN/JP desktop/mobile pages including static filters and logo paths.`);
}finally{await browser.close();server.stop();}
