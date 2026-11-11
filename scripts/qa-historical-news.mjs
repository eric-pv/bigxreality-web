import {contentLocale} from "../src/lib/content-locale.ts";
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parse as parseYaml} from 'yaml';
import {marked} from 'marked';
import {chromium} from 'playwright-core';
import {parseHistoricalNews} from './lib/historical-news.mjs';
import {startPreview,CHROMIUM} from './lib/serve.mjs';
import {publicSiteRoot} from '../src/lib/public-url.ts';
const records=parseHistoricalNews(fs.readFileSync(new URL('../docs/sources/BXR_NEWS_TRILINGUAL_EXPANDED_V2_2026-10-27.txt',import.meta.url),'utf8'));
const images=JSON.parse(fs.readFileSync(new URL('../src/data/news-media.json',import.meta.url),'utf8'));
const current=(id,lang)=>{const source=fs.readFileSync(`src/content/news/${contentLocale(lang)}/${id}.md`,'utf8');const split=source.split(/^---\s*$/m);return {...parseYaml(split[1]),body:split.slice(2).join('---').trim()};};
const ready=(id,lang)=>!!(current(id,'tw').cover?.src || (images[id]?.cover?.approved&&['tw','en','jp'].every(l=>images[id]?.cover?.alt?.[l])&&fs.existsSync('src/assets/images/news/'+images[id].cover.filename)));
const published=fs.readdirSync('src/content/news/zh-Hant').filter(f=>f.endsWith('.md')).map(f=>f.slice(0,-3)).filter(id=>{const copy=current(id,'tw');return !copy.draft&&(!copy.publishDate||new Date(copy.publishDate)<=new Date());});
const server=await startPreview(4366),browser=await chromium.launch({executablePath:CHROMIUM});let checked=0;
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('request',r=>{if(r.url().startsWith('https://www.bigxreality.com/upload/'))errors.push('forbidden old image request '+r.url());});
 for(const lang of ['tw','en','jp']){
  const links=[];for(const route of Array.from({length:Math.max(1,Math.ceil(Math.max(0,published.length-1)/10))},(_,i)=>i?`/${lang}/news/page/${i+1}/`:`/${lang}/news/`)){
   assert.equal((await page.goto(server.base+route)).status(),200);
   const pageLinks=await page.locator('#article-grid .title a').evaluateAll(as=>as.map(a=>a.getAttribute('href')));
   links.push(...pageLinks);
   assert.equal(await page.locator('#article-grid .editorial-cover').count(),pageLinks.filter(href=>!ready(href.split('/').filter(Boolean).at(-1),lang)).length);
   assert.ok(!(await page.locator('main').innerText()).includes('[待翻譯]'));
   assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),publicSiteRoot+route);
  }
  assert.equal(new Set(links).size,published.filter(id=>fs.existsSync(`src/content/news/${contentLocale(lang)}/${id}.md`)).length);
  for(const r of records){
   if(!published.includes(r.id))continue;
   const copy=current(r.id,lang),base=current(r.id,'tw'),url=`/${lang}/news/${r.id}/`;
   assert.equal((await page.goto(server.base+url)).status(),200);
   assert.equal(await page.locator('h1').innerText(),copy.title);
   const body=await page.locator('.prose').evaluate(el=>{const c=el.cloneNode(true);c.querySelectorAll('.bxr-inline-media').forEach(f=>f.remove());document.body.append(c);const t=c.innerText;c.remove();return t;}),norm=s=>s.replace(/\s+/g,' ').trim();assert.equal(norm(body),norm(await page.evaluate(html=>new DOMParser().parseFromString(html,'text/html').body.textContent,await marked.parse(copy.body))),url);
   assert.equal(await page.locator('meta[name="description"]').getAttribute('content'),copy.seo?.description??copy.summary);
   assert.equal(await page.locator('.article-header .cover .placeholder').count(),0);assert.equal(await page.locator('.article-header .cover img').count(),ready(r.id,lang)?1:0);
   if(ready(r.id,lang))await page.locator('.article-header .cover img').evaluate(img=>img.decode());
   const graph=await page.locator('script[type="application/ld+json"]').evaluate(el=>JSON.parse(el.textContent)['@graph']),article=graph.find(n=>n['@type']===(base.category==='insight'?'Article':'NewsArticle'));
   assert.ok(article);assert.equal(article.datePublished,base.publishDate?new Date(base.publishDate).toISOString():undefined);
   assert.equal(await page.locator('.article-header time').count(),base.publishDate?1:0);
   assert.ok(!(await page.locator('main').innerText()).includes('[待翻譯]'));
   await page.setViewportSize({width:390,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,url);
   if(r.id==='news-01-ds-2025'&&lang==='tw')await page.screenshot({path:'/tmp/bxr-historical-news-mobile.png',fullPage:true});
   await page.setViewportSize({width:1440,height:1000});checked++;
  }
 }
 assert.deepEqual(errors,[]);console.log(`PASS: ${checked} three-language articles matching current Git source, dynamic lists, dates/undated metadata, image placeholders, desktop/mobile and no old-site image requests`);
}finally{await browser.close();server.stop();}
