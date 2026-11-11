import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { chromium } from 'playwright-core';
import { startPreview, CHROMIUM } from './lib/serve.mjs';
const config=JSON.parse(fs.readFileSync('src/data/client-logos.json','utf8'));
const expected=[11,3,9,3];
const expectedFiles=[['中華民國國防部','中華民國海軍','中華民國海軍陸戰隊','陸軍步兵訓練指揮部','內政部警政署','刑事警察局','保安警察第一總隊','台灣縣市警察局','中央警察大學','臺灣警察專科學校','台北市政府消防局'],['國家中山科學研究院','工業技術研究院','國家災害防救科技中心'],['中華民國交通部','經濟部工業局','勞動部勞動力發展署','勞動部職業安全衛生署','南部科學園區','台灣中油股份有限公司','台灣電力公司','桃園國際機場股份有限公司','台灣國家級新創品牌'],['台灣國防產業發展協會','台灣防災產業協會','台灣虛擬及擴增實境產業協會']].map(group=>group.map(name=>`${name}.webp`));
assert.deepEqual(config.map(row=>row.file),expectedFiles.flat());
assert.deepEqual(fs.readdirSync('src/assets/images/clients').filter(name=>name.endsWith('.webp')).sort(),expectedFiles.flat().sort());
const hashes=new Map();for(const row of config){const pixels=await sharp(`src/assets/images/clients/${row.file}`).ensureAlpha().raw().toBuffer({resolveWithObject:true});const hash=crypto.createHash('sha256').update(JSON.stringify(pixels.info)).update(pixels.data).digest('hex');assert.ok(!hashes.has(hash),`Duplicate: ${row.file}`);hashes.set(hash,row.file);}
const server=await startPreview(4374),browser=await chromium.launch({executablePath:CHROMIUM});
try{
 const p=await browser.newPage({reducedMotion:'reduce'});const errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)errors.push(r.url());});
 for(const lang of ['tw','en','jp'])for(const width of [1440,768,390]){
  await p.setViewportSize({width,height:900});await p.goto(`${server.base}/${lang}/`);
  assert.equal(await p.locator('[data-client-logos], [data-logo-pause]').count(),0);
  assert.equal(await p.locator('img').evaluateAll(imgs=>imgs.some(img=>img.src.includes('/clients/')||img.closest('.client-logos'))),false);
  const stats=p.locator('[data-partner-statistics]');assert.deepEqual(await stats.locator('dd').allTextContents(),expected.map(String));
  // Home (embedded): the statistics fill the container; four columns in one row, 2×2 on phones.
  const fill=await stats.evaluate(e=>{const c=e.closest('.container'),cs=getComputedStyle(c),inner=c.getBoundingClientRect().width-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
   const rows=new Set([...e.querySelectorAll('dl > div')].map(d=>Math.round(d.getBoundingClientRect().top))).size;return{width:e.getBoundingClientRect().width,inner,rows};});
  assert.ok(Math.abs(fill.width-fill.inner)<1,`home statistics fill the container ${JSON.stringify(fill)}`);assert.equal(fill.rows,width>=768?1:2);
  assert.equal(await stats.locator('dl').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),width>=768?4:2);
  assert.ok(await p.evaluate(()=>{const m=document.querySelector('[data-partner-statistics]'),s=document.querySelector('#h-solutions').closest('section');return s.nextElementSibling===m.closest("[data-home-partners]");}));
  assert.equal(await stats.locator('img, button, script').count(),0);
  await p.goto(`${server.base}/${lang}/company/`);assert.equal(await p.locator('[data-client-logos]').count(),0);
  await p.goto(`${server.base}/${lang}/company/partners/`);const wall=p.locator('[data-client-logos="partners"]');
  // Partners page (non-embedded): the centred statistics keep their 760 px limit.
  assert.ok(await p.locator('[data-partner-statistics]').evaluate(e=>!e.classList.contains('embedded')&&e.getBoundingClientRect().width<=760));
  assert.equal(await wall.locator('img').count(),26);assert.equal(await wall.locator('img').first().getAttribute('alt'),'中華民國國防部');
  const groups=wall.locator('.logo-category');assert.equal(await groups.count(),4);
  for(let i=0;i<4;i++){
   const grid=groups.nth(i).locator('.logo-grid');assert.deepEqual(await grid.locator('li').evaluateAll(items=>items.map(e=>e.dataset.logoFile)),expectedFiles[i]);
   assert.equal(await grid.evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),width>=768?4:2);
   await grid.scrollIntoViewIfNeeded();await grid.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
   assert.equal(await grid.innerText(),'');
   for(const img of await grid.locator('img').all())assert.ok(await img.evaluate(e=>e.naturalWidth>0&&getComputedStyle(e).objectFit==='contain'));
  }
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(lang==='tw'&&width!==768){await p.screenshot({path:`/tmp/bxr-partners-${width}.png`,fullPage:true});await p.goto(`${server.base}/${lang}/`);await stats.screenshot({path:`/tmp/bxr-statistics-${width}.png`});}
 }
 assert.deepEqual(errors,[]);console.log('PASS: 26 unique logos in exact 11/3/9/3 groups/order, first Ministry of National Defense; TW/EN/JP × 1440/768/390; home full-container 4-column/2×2 statistics, partners-page 760px statistics without logos, About without logos, partner 4/2 grids and no captions, valid images.');
}finally{await browser.close();server.stop();}
