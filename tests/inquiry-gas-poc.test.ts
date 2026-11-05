import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {endpointUrl, post, runProof} from '../tools/inquiry-poc/probe.js';

const protocol='bxr-inquiry-poc-v1', id='e6509e7b-c33e-43bc-97cc-9f0a0d498f27';
function harness() {
 const rows:unknown[][]=[], props:Record<string,string>={TEST_SPREADSHEET_ID:'isolated-test-sheet',ALLOW_POC_API:'true'};
 let busy=false,fail=false,release=0;
 const sheet={getLastRow:()=>rows.length,getDataRange:()=>({getValues:()=>rows.map(r=>[...r])}),getRange:(row:number,_column:number,count:number)=>({
  getValues:()=>Array.from({length:count},(_,i)=>rows[row-1+i]??[]),
  setValues:(values:unknown[][])=>{if(fail)throw Error('simulated write failure');for(let i=0;i<values.length;i++)rows[row-1+i]=values[i];},
 })};
 const context=vm.createContext({Date,console:{error:()=>{}},PropertiesService:{getScriptProperties:()=>({getProperty:(key:string)=>props[key]})},
  LockService:{getScriptLock:()=>({tryLock:()=>!busy,releaseLock:()=>{release++;}})},
  SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet}),flush:()=>{}},
  Utilities:{DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_algorithm:string,value:string)=>createHash('sha256').update(value).digest(),base64EncodeWebSafe:(value:Uint8Array)=>Buffer.from(value).toString('base64url')},
  ContentService:{MimeType:{JSON:'json'},createTextOutput:(text:string)=>({setMimeType:()=>text})},
 });
 vm.runInContext(fs.readFileSync(new URL('../integrations/google-apps-script/inquiry-poc/Code.gs',import.meta.url),'utf8'),context);
 vm.runInContext('setupPoc()',context);
 const send=(message:string,overrides:Record<string,string>={})=>{
  context.event={parameter:{protocol,requestId:id,message,website:'',...overrides},parameters:{},postData:{length:200}};
  return JSON.parse(vm.runInContext('doPost(event)',context));
 };
 return {rows,props,send,busy:()=>busy=true,fail:()=>fail=true,releases:()=>release};
}

test('GAS proof acknowledges confirmed rows; idempotency and conflict use persistent sheet data',()=>{
 const h=harness();const first=h.send('BXR-POC test');assert.equal(first.persisted,true);assert.equal(first.duplicate,false);assert.equal(h.rows.length,2);
 assert.equal(h.send('BXR-POC test').duplicate,true);assert.equal(h.rows.length,2);
 assert.equal(h.send('BXR-POC changed').code,'ID_CONFLICT');assert.equal(h.rows.length,2);assert.equal(h.releases(),3);
});
test('GAS proof rejects invalid/bot/customer data and never acknowledges write failure',()=>{
 const h=harness();assert.equal(h.send('BXR-POC test',{requestId:id+'\n'}).code,'INVALID_REQUEST');assert.equal(h.send('BXR-POC'+ 'x'.repeat(151)).code,'INVALID_MESSAGE');assert.equal(h.send('').code,'INVALID_MESSAGE');assert.equal(h.send('customer private data').ok,false);
 assert.equal(h.send('=IMPORTXML("https://example.invalid")').ok,false);assert.equal(h.send('BXR-POC test',{website:'bot'}).code,'REJECTED');assert.equal(h.rows.length,1);
 h.fail();const failed=h.send('BXR-POC test');assert.equal(failed.ok,false);assert.equal(failed.persisted,false);assert.equal(failed.code,'STORAGE_ERROR');assert.equal(h.releases(),1);
});
test('GAS proof is opt-in, lock-protected and globally bounded; no client IP is fabricated',()=>{
 const h=harness();h.props.ALLOW_POC_API='false';assert.equal(h.send('BXR-POC test').code,'DISABLED');h.props.ALLOW_POC_API='true';h.busy();assert.equal(h.send('BXR-POC test').code,'BUSY');
 const limited=harness();for(let i=0;i<10;i++)limited.rows.push(['other-'+i,new Date(),'BXR-POC','hash','POC_ONLY']);assert.equal(limited.send('BXR-POC test').code,'RATE_LIMITED');
});
test('browser transport rejects opaque/malformed/wrong-ID responses and untrusted endpoints',async()=>{
 assert.throws(()=>endpointUrl('https://example.com/exec'));assert.throws(()=>endpointUrl('https://script.google.com/macros/s/test/dev'));
 const endpoint='https://script.google.com/macros/s/test/exec';
 await assert.rejects(post(endpoint,id,'BXR-POC test',async()=>({ok:true,type:'opaque',status:0}) as Response));
 await assert.rejects(post(endpoint,id,'BXR-POC test',async()=>({ok:true,type:'cors',status:200,json:async()=>({ok:true,persisted:true,protocol,requestId:'wrong'})}) as Response));
});
test('browser proof requires four readable outcomes, and supports same-ID retry after ambiguous response',async()=>{
 const h=harness();const calls:string[]=[];
 const fetcher=async(_input:unknown,init:RequestInit={})=>{
  assert.equal(init.mode,'cors');assert.equal(init.credentials,'omit');assert.ok(init.body instanceof URLSearchParams);assert.equal(init.headers,undefined);
  const p=init.body as URLSearchParams;calls.push(p.get('requestId')!);
  return {ok:true,type:'cors',status:200,json:async()=>h.send(p.get('message')!)} as Response;
 };
 // Node has no browser location; provide only this public-origin test value.
 const previous=Object.getOwnPropertyDescriptor(globalThis,'location');Object.defineProperty(globalThis,'location',{value:{origin:'https://eric-pv.github.io'},configurable:true});
 try{
  const first=await runProof('https://script.google.com/macros/s/test/exec',()=>{},fetcher,id);assert.equal(first.results.length,4);assert.equal(h.rows.length,2);
  await runProof('https://script.google.com/macros/s/test/exec',()=>{},fetcher,id,true);assert.equal(h.rows.length,2);assert.ok(calls.every(value=>value===id));
 }finally{if(previous)Object.defineProperty(globalThis,'location',previous);else Reflect.deleteProperty(globalThis,'location');}
});
