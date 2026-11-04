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
 const rows=new Map();let dropNext=false;
 if(!live)await context.route(endpoint,async route=>{
  const p=Object.fromEntries(new URLSearchParams(route.request().postData()||''));
  let reply={protocol,requestId:p.requestId,ok:false,persisted:false};
  const fingerprint=JSON.stringify(Object.entries(p).filter(([k])=>k!=='requestId').sort());
  if(!p.message)reply={...reply,code:'INVALID_FIELD',field:'message'};
  else if(rows.has(p.requestId)&&rows.get(p.requestId)!==fingerprint)reply={...reply,code:'ID_CONFLICT'};
  else {reply={...reply,ok:true,persisted:true,duplicate:rows.has(p.requestId)};rows.set(p.requestId,fingerprint);}
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
  assert.match(await page.locator('#f-interest').inputValue(),/\(product:sut\)$/);
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
  const name={tw:'BXR 合成測試',en:'François O’Connor',jp:'山田 太郎'}[lang];
  await page.locator('#f-name').fill(name);
  await page.locator('#f-organization').fill('BXR synthetic acceptance test - not a customer');
  await page.locator('#f-email').fill('bxr-inquiry-e2e@example.com');
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
   assert.equal(await page.locator('[data-ref]').innerText(),first.requestId);
   assert.equal(first.name,name);
   assert.equal(first.privacyConsent,'yes');
   assert.equal(first.sourcePage,`${prefix}${lang}/contact/`);
   if(!savedId){savedId=first.requestId;savedPayload=Object.fromEntries(Object.entries(first).filter(([k])=>!['protocol','requestId','website'].includes(k)));}
  }
  result.uiCases++;
 }
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
 if(!live){assert.equal(rows.size,6);result.mockRows=rows.size;}
 result.requestId=savedId;
 result.sheetRowCount=live?'User must confirm exactly one row with this requestId in 客戶詢問; no authenticated Sheet access in this test':'MOCK ONLY: no Google writes';
 result.status='PASS';
 console.log(`${live?'LIVE':'MOCK ONLY'} PASS: ${result.uiCases} trilingual page/viewports; full names, consent, preselection, privacy, success, duplicate/conflict/invalid checks. ${result.sheetRowCount}`);
}catch(error){result.status=live?'LIVE NOT VERIFIED':'FAIL';result.error=String(error);console.error(result.status,result.error);process.exitCode=1;}
finally{await browser.close();await writeFile(`${out}/${live?'LIVE':'MOCK'}-results.json`,JSON.stringify(result,null,2)+'\n');}
