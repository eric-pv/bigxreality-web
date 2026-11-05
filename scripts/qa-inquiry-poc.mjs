// Browser transport harness. Default mode intercepts Google and is explicitly NOT live validation.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright-core';
import {CHROMIUM} from './lib/serve.mjs';
import {endpointUrl,PROTOCOL} from '../tools/inquiry-poc/probe.js';
const live=!!process.env.GAS_POC_ENDPOINT;
const endpoint=endpointUrl(process.env.GAS_POC_ENDPOINT||'https://script.google.com/macros/s/LOCAL_MOCK_ONLY/exec');
const base='https://eric-pv.github.io/bigxreality-web/__inquiry-poc__/';
const html=await readFile('tools/inquiry-poc/index.html','utf8'),js=await readFile('tools/inquiry-poc/probe.js','utf8');
const browser=await chromium.launch({executablePath:CHROMIUM});
await mkdir('.qa/inquiry-poc',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});
 await page.route(base,route=>route.fulfill({contentType:'text/html',body:html}));
 await page.route(base+'probe.js',route=>route.fulfill({contentType:'application/javascript',body:js}));
 const rows=new Map();let outage=false;
 if(!live)await page.route(endpoint,async route=>{
  if(outage)return route.abort('failed');
  const p=new URLSearchParams(route.request().postData()||''),id=p.get('requestId'),message=p.get('message');
  let result={protocol:PROTOCOL,requestId:id,ok:false,persisted:false};
  if(!message)result.code='INVALID_MESSAGE';
  else if(rows.has(id)&&rows.get(id)!==message)result.code='ID_CONFLICT';
  else {result={...result,ok:true,persisted:true,duplicate:rows.has(id)};rows.set(id,message);}
  await route.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify(result)});
 });
 await page.goto(base);await page.locator('#endpoint').fill(endpoint);
 await page.getByRole('button').click();await page.waitForFunction(()=>!document.querySelector('#run').disabled);
 const result=await page.locator('#result').innerText();
 await writeFile(`.qa/inquiry-poc/${live?'LIVE':'MOCK'}-result.txt`,result);
 assert.ok(result.startsWith('PASS：'),result);
 await page.screenshot({path:`.qa/inquiry-poc/${live?'LIVE':'MOCK'}-desktop.png`});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:`.qa/inquiry-poc/${live?'LIVE':'MOCK'}-mobile.png`});
 if(!live){
  assert.equal(rows.size,1);outage=true;await page.getByRole('button').click();await page.waitForFunction(()=>!document.querySelector('#run').disabled);
  assert.ok((await page.locator('#result').innerText()).startsWith('FAIL／尚未確認寫入：'));assert.equal(rows.size,1);
  outage=false;await page.getByRole('button').click();await page.waitForFunction(()=>!document.querySelector('#run').disabled);
  assert.ok((await page.locator('#result').innerText()).startsWith('PASS：'));assert.equal(rows.size,1);
 }
 console.log(live?'PASS LIVE browser responses from GitHub Pages origin; verify the single requestId row manually in the TEST sheet. The probe page was intercepted locally, never deployed.':'PASS MOCK ONLY: four outcomes, request-ID retry, network failure visibility, desktop/mobile. Google authorization, real CORS and Sheets writes NOT verified.');
}finally{await browser.close();}
