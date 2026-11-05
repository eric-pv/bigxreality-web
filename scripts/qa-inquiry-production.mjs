// Exercises the actual packaged contact page. Default: mocked Google HTTP, never real writes.
// INQUIRY_LIVE=1: one synthetic inquiry via the deployed production receiver, then same-ID
// retry/conflict/invalid-input probes through the real transport. Never intercept Google in LIVE.
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {chromium} from 'playwright-core';
import ts from 'typescript';
import {CHROMIUM, resolveUnder} from './lib/serve.mjs';

const site=JSON.parse(await readFile('src/data/site.json','utf8'));
const endpoint=site.inquiry.endpoint, protocol='bxr-inquiry-v1', live=process.env.INQUIRY_LIVE==='1';
const root=path.resolve('dist-pages'), origin=new URL(site.url).origin;
const prefix=new URL(site.url).pathname.replace(/\/$/,'')+'/';
const transportURL=origin+prefix+'__inquiry-qa-transport.js';
const module=ts.transpileModule(await readFile('src/lib/inquiry.ts','utf8'),{
 compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022},
}).outputText;
const out='.qa/inquiry-production';await mkdir(out,{recursive:true});
const result={mode:live?'LIVE':'MOCK ONLY',origin,endpoint,policyVersion:site.inquiry.privacyVersion,
 artifact:'local dist-pages fulfilled at the Pages URL; not a deployed page',
 uiCases:0,replies:[],requests:[],sheetRowCount:'not directly inspected',status:'RUNNING'};
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json',
 '.woff2':'font/woff2','.avif':'image/avif','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png'};
// Disabling intake by clearing the endpoint must remain a valid, tested configuration.
if(endpoint==='[待提供]'){
 assert.equal(live,false,'LIVE requires a configured production endpoint');
 for(const lang of ['tw','en','jp']){
  const html=await readFile(path.join(root,lang,'contact/index.html'),'utf8');
  assert.doesNotMatch(html,/<form\b[^>]*data-inquiry/);
  assert.match(html,/href="mailto:/);
 }
 console.log('MOCK ONLY PASS: endpoint unset; three-language email fallback remains available.');
 process.exit(0);
}
const browser=await chromium.launch({executablePath:CHROMIUM});
try {
 const context=await browser.newContext({reducedMotion:'reduce',serviceWorkers:'block'});
 await context.route(origin+prefix+'**',async route=>{
  const url=new URL(route.request().url());
  if(url.href===transportURL)return route.fulfill({contentType:'application/javascript',body:module});
  const file=await resolveUnder(root,prefix,url.pathname);
  if(!file)return route.fulfill({status:404,body:'Missing packaged asset'});
  return route.fulfill({contentType:types[path.extname(file)]??'application/octet-stream',body:await readFile(file)});
 });
 await context.addInitScript(()=>{window.__inquiryEvents=[];document.addEventListener('bxr:inquiry',event=>window.__inquiryEvents.push(event.detail));});
 const rows=new Map(),numbers=new Map();let dropNext=false;
 if(!live)await context.route(endpoint,async route=>{
  const p=Object.fromEntries(new URLSearchParams(route.request().postData()||''));
  let reply={protocol,requestId:p.requestId,ok:false,persisted:false};
  const fingerprint=JSON.stringify(Object.entries(p).filter(([k])=>k!=='requestId').sort());
  if(!p.message)reply={...reply,code:'INVALID_FIELD',field:'message'};
  else if(rows.has(p.requestId)&&rows.get(p.requestId)!==fingerprint)reply={...reply,code:'ID_CONFLICT'};
  else {
   const duplicate=rows.has(p.requestId);
   if(!duplicate){numbers.set(p.requestId,'20261104'+String(numbers.size+1).padStart(3,'0'));rows.set(p.requestId,fingerprint);}
   reply={...reply,ok:true,persisted:true,duplicate,inquiryId:numbers.get(p.requestId)};
  }
  if(dropNext){dropNext=false;return route.abort('failed');}
  return route.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(reply)});
 });
 const page=await context.newPage();
 page.on('request',request=>{if(request.url()===endpoint&&request.method()==='POST'){
  const p=Object.fromEntries(new URLSearchParams(request.postData()||''));
  result.requests.push({requestId:p.requestId,language:p.language});
 }});
 await page.goto(origin+prefix+'tw/contact/');
 if(live){
  result.health=await page.evaluate(async endpoint=>{
   try{const r=await fetch(endpoint,{mode:'cors',credentials:'omit',signal:AbortSignal.timeout(30000)});
    return {ok:r.ok,type:r.type,value:await r.json()};}catch(error){return {error:String(error)};}
  },endpoint);
  assert.ok(result.health.ok&&result.health.type==='cors'&&result.health.value.protocol===protocol,
   'LIVE health failed: '+JSON.stringify(result.health));
 }
 let savedPayload,savedId;
 for(const lang of ['tw','en','jp'])for(const width of [1440,390]){
  await page.setViewportSize({width,height:960});
  await page.goto(`${origin}${prefix}${lang}/contact/?topic=product&item=SUT`);
  const form=page.locator('[data-inquiry]');await form.waitFor({state:'visible'});
  assert.equal(await form.getAttribute('data-endpoint'),endpoint);
  assert.equal(await form.getAttribute('data-version'),site.inquiry.privacyVersion);
  assert.equal(await page.locator('#f-name').getAttribute('autocomplete'),'name');
  assert.match(await page.locator('#f-name').getAttribute('aria-describedby'),/f-name-hint/);
  assert.ok((await page.locator('#f-name-hint').innerText()).trim());
  assert.equal(await page.locator('#f-topic').inputValue(),'product');
  assert.equal(await page.locator('#f-country option').count(),250);
  // Owner-specified names; Taiwan heads the list (first option after the placeholder).
  const special={tw:['台灣(中華民國)','中國(中華人民共和國)'],en:['Taiwan(ROC)','China(PRC)'],jp:['台湾（中華民国）','中国（中華人民共和国）']}[lang];
  assert.equal(await page.locator('#f-country option').nth(1).getAttribute('value'),'TW');
  assert.equal((await page.locator('#f-country option').nth(1).innerText()).trim(),special[0]);
  assert.equal((await page.locator('#f-country option[value="CN"]').innerText()).trim(),special[1]);
  assert.equal(await page.locator('#f-country').inputValue(),'','country must not be inferred from language');
  const policyHref=await form.locator('a').getAttribute('href');
  assert.equal(policyHref,`${prefix}${lang}/privacy/`);
  const policy=await context.newPage();await policy.goto(origin+policyHref);
  assert.equal(await policy.locator('h1').count(),1);
  assert.doesNotMatch(await policy.locator('main').innerText(),/待確認|法務審|Under legal review|內部備註/);
  await policy.close();
  const count=result.requests.length;
  await page.locator('[data-submit]').click();
  assert.equal(result.requests.length,count,'empty form must not submit');
  assert.equal(await page.locator('#f-name').getAttribute('aria-invalid'),'true');
  await page.reload();await form.waitFor({state:'visible'});
  const choices=page.locator('input[name="interest"]');
  assert.match(await choices.evaluateAll(inputs=>inputs.filter(i=>i.checked).map(i=>i.value).join('; ')),/\(product:sut\)$/);
  await page.locator('[data-interest-summary]').click();
  const extra=choices.nth(1);await extra.check();
  const sut=page.locator('input[name="interest"][value$="(product:sut)"]');
  await sut.uncheck();assert.equal(await extra.isChecked(),true);await sut.check();
  if(lang==='tw'&&width===1440)for(const choice of await choices.all())await choice.check();
  await page.locator('[data-interest-summary]').click();
  const name={tw:'BXR 合成測試',en:'François O’Connor',jp:'山田 太郎'}[lang];
  await page.locator('#f-name').fill(name);
  await page.locator('#f-organization').fill('BXR synthetic acceptance test - not a customer');
  await page.locator('#f-email').fill('bxr-inquiry-e2e@example.com');
  await page.locator('#f-phone').fill('+886-2-8791-6811');
  await page.locator('#f-country').selectOption(lang==='jp'?'JP':'TW');
  await page.locator('#f-message').fill('Synthetic production acceptance test. Please ignore this inquiry.');
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:`${out}/${live?'LIVE':'MOCK'}-${lang}-${width}.png`,fullPage:true});
  await page.locator('[data-decline]').click();
  assert.equal(result.requests.length,count,'decline must not submit');
  assert.equal(await page.locator('#f-name').inputValue(),name);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  // LIVE creates only one real inquiry. Other languages/viewports validate the same UI without writes.
  if(!live||(lang==='tw'&&width===1440)){
   if(!live&&lang==='tw'&&width===1440)dropNext=true;
   const pending=page.waitForRequest(r=>r.url()===endpoint&&r.method()==='POST');
   await page.locator('[data-submit]').click();
   const first=Object.fromEntries(new URLSearchParams((await pending).postData()||''));
   if(!live&&lang==='tw'&&width===1440){
    await page.locator('[data-status]').waitFor({state:'visible'});
    assert.equal(await page.locator('#f-name').inputValue(),name);
    assert.equal(await page.locator('[data-done]').isVisible(),false,'unknown result cannot show success');
    const retry=page.waitForRequest(r=>r.url()===endpoint&&r.method()==='POST');
    await page.locator('[data-submit]').click();
    const resent=Object.fromEntries(new URLSearchParams((await retry).postData()||''));
    assert.equal(resent.requestId,first.requestId,'unknown-result retry must reuse ID');
    assert.equal(rows.size,1,'lost-response retry must not create another mocked row');
   }
   await page.locator('[data-done]').waitFor({state:'visible',timeout:40000});
   const shown=await page.locator('[data-ref]').innerText();
   assert.match(shown,/^\d{8}\d{3,}$/,'success shows the receiver-assigned date+sequence number, not the request UUID');
   if(!live)assert.equal(shown,numbers.get(first.requestId));
   assert.notEqual(shown,first.requestId);
   assert.equal(first.name,name);
   assert.equal(first.country,lang==='jp'?'JP':'TW');
   assert.equal(first.privacyConsent,'yes');
   assert.ok(first.interest.includes('; '),'all selected values must be submitted');
   if(lang==='tw'&&width===1440)assert.ok(first.interest.length>200,'exercise upgraded receiver limit');
   assert.equal(first.sourcePage,`${prefix}${lang}/contact/`);
   if(!savedId){savedId=first.requestId;savedPayload=Object.fromEntries(Object.entries(first).filter(([k])=>!['protocol','requestId','website'].includes(k)));}
  }
  result.uiCases++;
 }
 // Original-page inquiries: no redirect, persistent edits, multi-select, and the source path is independent.
 for(const lang of ['tw','en','jp'])for(const width of [1440,390])for(const collection of ['products','solutions']){
  const slug=collection==='products'?'sut':'fire-rescue';
  const pathname=`${prefix}${lang}/${collection}/${slug}/`;
  await page.setViewportSize({width,height:960});await page.goto(origin+pathname);
  const section=page.locator('[data-inline-inquiry]');assert.equal(await section.isVisible(),false);
  const trigger=page.locator('main a[href*="/contact/?topic="]').first();
  await trigger.focus();await page.keyboard.press('Enter');
  await section.waitFor({state:'visible'});await section.locator('[data-inquiry]').waitFor({state:'visible'});
  assert.equal(new URL(page.url()).pathname,pathname);
  const preselected=page.locator('input[name="interest"]:checked');
  assert.equal(await preselected.count(),1);
  assert.ok((await preselected.inputValue()).endsWith(`(${collection==='products'?'product':'solution'}:${slug})`));
  await page.locator('[data-interest-summary]').click();
  await preselected.uncheck();await page.locator('input[name="interest"]').nth(1).check();
  await page.locator('[data-interest-summary]').click();
  await page.locator('#f-name').fill(lang==='jp'?'山田 太郎':'BXR inline synthetic test');
  await page.locator('#f-organization').fill('BXR synthetic acceptance test - not a customer');
  await page.locator('#f-email').fill('bxr-inline-e2e@example.com');
  await page.locator('#f-phone').fill('+1 202 555 0100');
  await page.locator('#f-country').selectOption('US');
  await page.locator('#f-message').fill('Synthetic original-page inquiry; please ignore.');
  await page.locator('[data-inquiry-close]').click();assert.equal(await section.isVisible(),false);
  await trigger.click();assert.equal(await page.locator('#f-message').inputValue(),'Synthetic original-page inquiry; please ignore.');
  assert.equal(await page.locator('input[name="interest"]:checked').count(),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.evaluate(()=>scrollTo(0,document.querySelector('[data-inline-inquiry]').offsetTop-100));
  await section.screenshot({path:`${out}/${live?'LIVE':'MOCK'}-inline-${lang}-${collection}-${width}.png`});
  if(!live){
   const pending=page.waitForRequest(r=>r.url()===endpoint&&r.method()==='POST');
   await page.locator('[data-submit]').click();const data=Object.fromEntries(new URLSearchParams((await pending).postData()||''));
   await page.locator('[data-done]').waitFor({state:'visible'});
   assert.equal(data.country,'US');
   assert.equal(data.sourcePage,pathname,'changing selections must retain the original product/solution page');
   const events=await page.evaluate(()=>window.__inquiryEvents);
   assert.equal(events.filter(e=>e.stage==='success').length,1);
   assert.ok(events.every(e=>Object.keys(e).sort().join(',')==='interestCount,sourcePage,stage,topic'),'hooks contain no names, emails, messages or request IDs');
  }
  result.uiCases++;
 }
 // JavaScript unavailable: original, indexable contact CTA remains a usable navigation link.
 const fallback=await browser.newContext({javaScriptEnabled:false});
 await fallback.route(origin+prefix+'**',async route=>{
  const file=await resolveUnder(root,prefix,new URL(route.request().url()).pathname);
  if(!file)return route.fulfill({status:404,body:'missing'});
  return route.fulfill({contentType:types[path.extname(file)]??'application/octet-stream',body:await readFile(file)});
 });
 const plain=await fallback.newPage();await plain.goto(origin+prefix+'tw/products/sut/');
 await plain.locator('main a[href*="/contact/?topic="]').first().click();
 assert.equal(new URL(plain.url()).pathname,prefix+'tw/contact/');
 assert.equal(await plain.locator('[data-inquiry]').isVisible(),false);
 assert.equal(await plain.locator('[data-mailto]').isVisible(),true);
 await fallback.close();
 // Real source transport: duplicate, same-ID conflict, invalid data. In LIVE these reach Google.
 const probe=async(id,payload)=>page.evaluate(async({transportURL,endpoint,id,payload})=>{
  const {sendInquiry}=await import(transportURL);return sendInquiry(endpoint,id,payload);
 },{transportURL,endpoint,id,payload});
 const duplicate=await probe(savedId,savedPayload);result.replies.push({case:'duplicate',...duplicate});
 assert.equal(duplicate.ok,true);assert.equal(duplicate.persisted,true);assert.equal(duplicate.duplicate,true);
 const conflict=await probe(savedId,{...savedPayload,message:'Changed synthetic test content'});
 result.replies.push({case:'conflict',...conflict});assert.equal(conflict.ok,false);assert.equal(conflict.persisted,false);assert.equal(conflict.code,'ID_CONFLICT');
 const invalid=await probe(crypto.randomUUID(),{...savedPayload,message:''});
 result.replies.push({case:'invalid',...invalid});assert.equal(invalid.ok,false);assert.equal(invalid.persisted,false);assert.equal(invalid.code,'INVALID_FIELD');
 if(!live){assert.equal(rows.size,18);result.mockRows=rows.size;}
 result.requestId=savedId;
 result.sheetRowCount=live?'User must confirm exactly one row with this requestId in 客戶詢問; no authenticated Sheet access in this test':'MOCK ONLY: no Google writes';
 result.status='PASS';
 console.log(`${live?'LIVE':'MOCK ONLY'} PASS: ${result.uiCases} trilingual page/viewports; full names, consent, preselection, privacy, success, duplicate/conflict/invalid checks. ${result.sheetRowCount}`);
}catch(error){result.status=live?'LIVE NOT VERIFIED':'FAIL';result.error=String(error);console.error(result.status,result.error);process.exitCode=1;}
finally{await browser.close();await writeFile(`${out}/${live?'LIVE':'MOCK'}-results.json`,JSON.stringify(result,null,2)+'\n');}
