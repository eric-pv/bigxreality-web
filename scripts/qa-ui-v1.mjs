import assert from 'node:assert/strict';
import fs from 'node:fs';
import {publishedNews,csrNews,newsPageCount} from './lib/cms-content.mjs';
import {chromium} from 'playwright-core';
import {startPreview,CHROMIUM} from './lib/serve.mjs';
const server=await startPreview(4378),browser=await chromium.launch({executablePath:CHROMIUM});
const widths=[1366,1440,1920,768,390,430];
const routes=['','news/','news/page/2/','news/filter/event/all/','news/filter/all/2025/','news/news-20-taipei-education-expo-2026/','products/','solutions/','products/sut/','products/police-box/','products/wargaming-table/','solutions/military/','solutions/fire-rescue/','company/csr/','company/','company/partners/','contact/','insights/','cases/'];
let checked=0;const screenshots='/tmp/bxr-ui-v1';fs.mkdirSync(screenshots,{recursive:true});
try{
 const p=await browser.newPage({reducedMotion:'reduce'}),errors=[],placeholders=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(r.url());});
 for(const lang of ['tw','en','jp'])for(const width of widths){
  await p.setViewportSize({width,height:1000});
  for(const route of routes){
   const url=`/${lang}/${route}`;assert.equal((await p.goto(server.base+url)).status(),200,url);
   assert.equal(await p.locator('h1').count(),1,url);
   assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${url} @${width}`);
   const visible=await p.locator('main').innerText();if(/素材需求|封面圖片|解決方案圖片|\[待提供\]|\[待翻譯\]/.test(visible))placeholders.push(`${url} @${width}`);
   if(!route){assert.equal(await p.locator('[data-home-partners] img').count(),0);assert.equal(await p.locator('[data-home-partners] h2').innerText(),{tw:'合作夥伴',en:'Partners',jp:'パートナー'}[lang]);assert.deepEqual(await p.locator('[data-partner-statistics] dd').allTextContents(),['11','3','9','3']);}
   if(route==='news/'){assert.equal(await p.locator('[data-news-featured]').count(),1);assert.equal(await p.locator('.news-rows .news-card').count(),10);const ids=await p.locator('[data-news-id]').evaluateAll(es=>es.map(e=>e.dataset.newsId));assert.equal(ids.length,new Set(ids).size);}
   if(route==='news/filter/event/all/')assert.ok(await p.locator('[data-news-category]').evaluateAll(es=>es.length>0&&es.every(e=>e.dataset.newsCategory==='event')));
   if(route==='news/filter/all/2025/')assert.ok(await p.locator('[data-news-year]').evaluateAll(es=>es.length>0&&es.every(e=>e.dataset.newsYear==='2025')));
   if(route.startsWith('news/filter/')){assert.equal(await p.locator('meta[name="robots"]').getAttribute('content'),'noindex');assert.ok((await p.locator('link[rel="canonical"]').getAttribute('href')).endsWith(url));}
   if(route==='company/csr/'){const ids=await p.locator('.csr-cards .title a').evaluateAll(es=>es.map(e=>e.href));assert.equal(ids.length,csrNews(lang).length);assert.equal(new Set(ids).size,ids.length);}
   if(route==='company/partners/')assert.equal(await p.locator('[data-client-logos] img').count(),26);
   if(width>=1024)assert.equal(await p.locator('.site-footer details:not([open])').count(),0);
   if(lang==='tw'&&[1440,390].includes(width)&&['','news/','products/sut/','products/police-box/','products/wargaming-table/','solutions/military/','company/csr/'].includes(route)){
    await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:`${screenshots}/${route.replaceAll('/','-')||'home'}-${width}.png`});
    if(!route)await p.locator('[data-home-partners]').screenshot({path:`${screenshots}/partners-${width}.png`});
   }
   checked++;
  }
 }
 // Archives preserve each original URL exactly once across all unfiltered pages.
 for(const lang of ['tw','en','jp']){
  const expected=publishedNews(lang);const ids=[];for(const route of Array.from({length:newsPageCount(expected.length)},(_,i)=>i?`news/page/${i+1}/`:'news/')){await p.goto(`${server.base}/${lang}/${route}`);ids.push(...await p.locator('[data-news-id]').evaluateAll(es=>es.map(e=>e.dataset.newsId)));}assert.equal(ids.length,expected.length);assert.deepEqual([...new Set(ids)].sort(),expected.sort());
  await p.goto(`${server.base}/${lang}/news/`);await p.locator('.category-filter a[href$="/filter/event/all/"]').click();assert.ok(p.url().endsWith('/news/filter/event/all/'));await p.reload();assert.ok(await p.locator('[data-news-category]').evaluateAll(es=>es.every(e=>e.dataset.newsCategory==='event')));
 }
 assert.deepEqual(errors,[]);assert.deepEqual([...new Set(placeholders)],[],'visible development copy');
 console.log(`PASS: ${checked} TW/EN/JP template/viewports at ${widths.join('/')}px, static filters/reload, complete current Git article archive, no duplicate CSR, no home logos, no overflow/errors/development copy. Screenshots: ${screenshots}`);
}finally{await browser.close();server.stop();}
