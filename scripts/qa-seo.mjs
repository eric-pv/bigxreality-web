import {contentLocale} from "../src/lib/content-locale.ts";
import { publicUrl, artifactPath } from '../src/lib/public-url.ts';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { CHROMIUM, DIST } from './lib/serve.mjs';
const approved = JSON.parse(await fs.readFile(new URL('../tests/fixtures/seo-approved.json', import.meta.url), 'utf8'));
const newsImages = JSON.parse(await fs.readFile(new URL('../src/data/news-media.json', import.meta.url), 'utf8'));
const site = JSON.parse(await fs.readFile(new URL('../src/data/site.json', import.meta.url), 'utf8'));
const browser = await chromium.launch({ executablePath: CHROMIUM });
const pages = [], errors = [];
const normalize = title => { while (/\s*[|｜]\s*(?:Big\s*x\s*Reality|BXR)\s*$/i.test(title)) title = title.replace(/\s*[|｜]\s*(?:Big\s*x\s*Reality|BXR)\s*$/i, '').trim(); return title + ' | Big x Reality'; };
async function walk(dir) { for (const item of await fs.readdir(dir, { withFileTypes:true })) { const file=path.join(dir,item.name); if(item.isDirectory()) { if(!['_astro','pagefind','fonts','media','admin'].includes(item.name)) await walk(file); } else if(item.name==='index.html') { const html=await fs.readFile(file,'utf8'); if(!/http-equiv="refresh"/.test(html)) pages.push({url:'/'+path.relative(DIST,path.dirname(file)).split(path.sep).join('/')+'/',html,head:html.match(/<head[^>]*>([\s\S]*?)<\/head>/)?.[1]}); } } }
try {
  await walk(DIST);
  const page=await browser.newPage();
  for(const item of pages) {
    item.meta=await page.evaluate(head=>{
      const doc=new DOMParser().parseFromString(head,'text/html');
      const value=selector=>doc.querySelector(selector)?.getAttribute('content');
      return {titles:[...doc.querySelectorAll('title')].map(x=>x.textContent),descriptions:[...doc.querySelectorAll('meta[name="description"]')].map(x=>x.content),canonical:[...doc.querySelectorAll('link[rel="canonical"]')].map(x=>x.getAttribute('href')),noindex:!!doc.querySelector('meta[name="robots"][content*="noindex"]'),alternates:[...doc.querySelectorAll('link[rel="alternate"][hreflang]')].map(x=>[x.getAttribute('hreflang'),x.getAttribute('href')]),ogTitle:value('meta[property="og:title"]'),ogDescription:value('meta[property="og:description"]'),twitterTitle:value('meta[name="twitter:title"]'),twitterDescription:value('meta[name="twitter:description"]'),ogImage:value('meta[property="og:image"]'),ogAlt:value('meta[property="og:image:alt"]'),keywords:!!doc.querySelector('meta[name="keywords"]'),graph:JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent)['@graph']};
    },item.head);
  }
  const byUrl=new Map(pages.map(p=>[publicUrl(p.url).href,p]));
  for(const {url,meta:m} of pages) {
    try {
      assert.equal(m.titles.length,1);assert.equal(m.descriptions.length,1);assert.equal(m.canonical.length,1);
      assert.equal(m.canonical[0],publicUrl(url).href);
      assert.ok(m.titles[0].endsWith(' | Big x Reality'));
      assert.ok(!/[|｜]\s*(?:BXR|Big x Reality)\s*[|｜]/i.test(m.titles[0]));
      assert.ok(m.descriptions[0].trim());
      assert.ok(!/\[待|undefined|\bnull\b/.test([m.titles[0],m.descriptions[0],m.ogAlt].join(' ')));
      assert.equal(m.ogTitle,m.titles[0]);assert.equal(m.twitterTitle,m.titles[0]);assert.equal(m.ogDescription,m.descriptions[0]);assert.equal(m.twitterDescription,m.descriptions[0]);
      assert.equal(m.keywords,false);assert.ok(m.ogAlt);assert.ok(await fs.stat(path.join(DIST,artifactPath(m.ogImage))));
      // CMS-authored Markdown and technology JSON SEO use their current Git source;
      // legacy expectations only cover pages without a CMS content file.
      let copy=approved[url];
      const [lang, section, slug] = url.split('/').filter(Boolean);
      const collection=({news:'news',insights:'insights',cases:'case-studies',products:'products',solutions:'solutions'})[section];
      const pageSlug=section==='company'?(slug??'company'):(!slug?section:undefined);
      const technologyPath=section==='technologies'?`src/content/${slug?'technologies':'technology-overview'}/${contentLocale(lang)}/${slug??'overview'}.json`:undefined;
      const sourcePath=technologyPath??(collection&&slug?`src/content/${collection}/${contentLocale(lang)}/${slug}.md`:pageSlug?`src/content/pages/${contentLocale(lang)}/${pageSlug}.md`:undefined);
      if(sourcePath)try{
        const text=await fs.readFile(sourcePath,'utf8');
        const source=sourcePath.endsWith('.json')?JSON.parse(text):parseYaml(text.split(/^---\s*$/m)[1]);
        if(source.seo?.title&&source.seo?.description)copy=source.seo;
      }catch(error){if(error.code!=='ENOENT')throw error;}
      if(copy){assert.equal(m.titles[0],normalize(copy.title));assert.equal(m.descriptions[0],copy.description);}
      const pattern=url.replace(/^\/(tw|en|jp)\//,'/{lang}/');
      const matching=pages.filter(p=>!p.meta.noindex && p.url.replace(/^\/(tw|en|jp)\//,'/{lang}/')===pattern);
      const expected=m.noindex?[]:matching.map(p=>[({tw:'zh-TW',en:'en',jp:'ja'})[p.url.split('/')[1]],publicUrl(p.url).href]);
      const defaultPage=matching.find(p=>p.url.startsWith('/en/'));
      if(!m.noindex && defaultPage)expected.push(['x-default',publicUrl(defaultPage.url).href]);
      assert.deepEqual([...m.alternates].sort(),expected.sort());
      const principal=m.graph.filter(n=>['WebPage','CollectionPage','Product','Article','NewsArticle'].includes(n['@type']));assert.equal(principal.length,1);
      for(const node of m.graph)if(node['@type']==='BreadcrumbList')for(const item of node.itemListElement)assert.ok(byUrl.has(item.item),item.item);
      for(const [language,href]of m.alternates){const target=byUrl.get(href);assert.ok(target,href);assert.equal(target.meta.noindex,false,href);if(language==='x-default')assert.equal(target.url.split('/')[1],'en');}
      const org=m.graph.find(n=>n['@type']==='Organization');assert.equal(org.email,'service@gptt.com.tw');assert.equal(org.telephone,'+886-2-8791-6811');if(url.startsWith('/en/')||url.startsWith('/jp/'))assert.equal(org.legalName,undefined);
      for(const node of m.graph)if(node['@type']==='Product')for(const key of ['offers','aggregateRating','review','availability','price'])assert.equal(node[key],undefined);
      if(/\/(search|tags)\/$/.test(url))assert.equal(m.noindex,true);
    }catch(error){errors.push(`${url}: ${error.message}`);}
  }
  // Page structure, language consistency and indexing files (built HTML, so new content is covered automatically).
  const HTML_LANG={tw:'zh-Hant-TW',en:'en',jp:'ja-JP'}, OG_LOCALE={tw:'zh_TW',en:'en_US',jp:'ja_JP'};
  const sitemap=await fs.readFile(path.join(DIST,'sitemap.xml'),'utf8');
  const listed=new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]));
  const robots=await fs.readFile(path.join(DIST,'robots.txt'),'utf8');
  const visible=html=>html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g,'');
  const warnings=[];
  for(const {url,html,meta:m} of pages) {
    const l=url.split('/')[1], abs=publicUrl(url).href;
    try {
      assert.equal(html.match(/<html lang="([^"]+)"/)?.[1],HTML_LANG[l],'html lang');
      assert.equal(html.match(/property="og:locale" content="([^"]+)"/)?.[1],OG_LOCALE[l],'og:locale');
      for(const name of ['viewport','description','robots','twitter:card','twitter:title','twitter:description','twitter:image'])assert.ok((html.match(new RegExp(`<meta name="${name}"`,'g'))??[]).length<=1,'duplicate meta '+name);
      for(const prop of ['og:title','og:description','og:url','og:type','og:image','og:image:alt','og:locale','og:site_name'])assert.equal((html.match(new RegExp(`<meta property="${prop}"`,'g'))??[]).length,1,'meta '+prop);
      assert.equal(html.match(/property="og:url" content="([^"]+)"/)?.[1],abs,'og:url');
      // og:image:width/height describe the file actually written, in the 1.91:1 social-card ratio.
      const ogW=html.match(/property="og:image:width" content="(\d+)"/)?.[1], ogH=html.match(/property="og:image:height" content="(\d+)"/)?.[1];
      if(ogW||ogH){const meta=await sharp(path.join(DIST,decodeURIComponent(artifactPath(html.match(/property="og:image" content="([^"]+)"/)[1])))).metadata();assert.deepEqual([meta.width,meta.height],[+ogW,+ogH],'og:image file size matches og:image:width/height');assert.ok(Math.abs(meta.width/meta.height-1200/630)<0.01,'og:image is 1.91:1');assert.ok(meta.width<=1200,'og:image at most 1200 px wide');}
      for(const [code] of m.alternates)assert.ok(['zh-TW','en','ja','x-default'].includes(code),'hreflang code '+code);
      const blocks=[...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(x=>JSON.parse(x[1]));
      const nodes=blocks.flatMap(b=>b['@graph']??[b]);
      for(const node of nodes){assert.ok(node['@type'],'JSON-LD node without @type');if(node.inLanguage)assert.equal(node.inLanguage,HTML_LANG[l],'JSON-LD inLanguage');assert.ok(!/\[待|undefined/.test(JSON.stringify(node)),'placeholder in JSON-LD');}
      for(const node of nodes)if(['Article','NewsArticle'].includes(node['@type'])){for(const key of ['headline','publisher','url'])assert.ok(node[key],'Article '+key);if(!node.datePublished){const id=url.match(/\/news\/([^/]+)\//)?.[1];assert.ok(id && newsImages[id]?.publicationDate===null,'Article missing confirmed date without source uncertainty');}else assert.ok(!Number.isNaN(Date.parse(node.datePublished)),'Article datePublished');}
      const crumbs=nodes.find(n=>n['@type']==='BreadcrumbList');
      if(!m.noindex){assert.ok(crumbs,'BreadcrumbList');assert.equal(crumbs.itemListElement.at(-1).item,abs,'BreadcrumbList ends at this page');}
      const body=visible(html);
      assert.equal((body.match(/<h1[\s>]/g)??[]).length,1,'exactly one h1');
      let prev=0;for(const level of [...body.matchAll(/<h([1-6])[\s>]/g)].map(x=>+x[1])){assert.ok(!prev||level<=prev+1,`heading h${prev} -> h${level}`);prev=level;}
      for(const img of body.match(/<img\b[^>]*>/g)??[]){assert.match(img,/\salt(?:=|\s|>)/,'img without alt');assert.match(img,/\swidth="\d+"[^>]*\sheight="\d+"|\sheight="\d+"[^>]*\swidth="\d+"/,'img without width/height');}
      assert.equal(listed.has(abs),!m.noindex,m.noindex?'noindex page in sitemap':'indexable page missing from sitemap');
      if(!m.noindex&&/\[待/.test(body))warnings.push(`${url}: visible placeholder text in page body`);
    }catch(error){errors.push(`${url}: ${error.message}`);}
  }
  for(const loc of listed)if(!byUrl.has(loc))errors.push(`sitemap lists a URL that was not built: ${loc}`);
  if(!pages.some(p=>p.meta.noindex===false)){if(!/Disallow:\s*\/\s*$/m.test(robots))errors.push('noindex build without a blocking robots.txt');}
  else if(/Disallow:\s*\/\s*$/m.test(robots)||!robots.includes(`Sitemap: ${site.url}/sitemap.xml`))errors.push('robots.txt blocks crawling or omits the sitemap');
  const duplicates = field => { const grouped=new Map();for(const p of pages){const value=p.meta[field][0];grouped.set(value,[...(grouped.get(value)??[]),p.url]);}return [...grouped.values()].filter(urls=>urls.length>1); };
  const duplicateTitles=duplicates('titles'), duplicateDescriptions=duplicates('descriptions');
  if(duplicateTitles.length)errors.push('Duplicate titles: '+JSON.stringify(duplicateTitles));
  if(duplicateDescriptions.length)errors.push('Duplicate descriptions: '+JSON.stringify(duplicateDescriptions));
  const report={checked:pages.length,approvedUpdated:pages.filter(p=>approved[p.url]).length,languages:Object.fromEntries(['tw','en','jp'].map(l=>[l,pages.filter(p=>p.url.startsWith('/'+l+'/')).length])),indexable:pages.filter(p=>!p.meta.noindex).length,noindex:pages.filter(p=>p.meta.noindex).map(p=>p.url),sitemapUrls:listed.size,warnings,duplicateTitles,duplicateDescriptions,errors};
  await fs.writeFile(process.env.SEO_REPORT??'/tmp/bxr-seo-report.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));assert.deepEqual(errors,[]);
}finally{await browser.close();}
