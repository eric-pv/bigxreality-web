import assert from 'node:assert/strict';
import test from 'node:test';
import {contentLocale,routeLocale,contentEntryId} from '../src/lib/content-locale.ts';
test('BCP-47 storage names map to stable public routes and logical Astro IDs',()=>{
 for(const [route,storage]of [['tw','zh-Hant'],['en','en'],['jp','ja']]){
  assert.equal(contentLocale(route),storage);assert.equal(routeLocale(storage),route);
  assert.equal(contentEntryId(`${storage}/example.md`),`${route}/example`);
  assert.equal(contentEntryId(`${storage}/example.json`),`${route}/example`);
 }
 assert.equal(contentEntryId('tw/fixture-news-02.md',{allowLegacy:true}),'tw/fixture-news-02');
 assert.equal(contentEntryId('jp/fixture-insight-1.md',{allowLegacy:true}),'jp/fixture-insight-1');
 assert.throws(()=>contentEntryId('tw/legacy.md'),/Unknown/);
 assert.throws(()=>routeLocale('unknown'),/Unknown/);assert.throws(()=>contentLocale('unknown'),/Unknown/);
});
