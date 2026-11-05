import {contentLocale} from "../src/lib/content-locale.ts";
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import YAML from 'yaml';
import {parseHistoricalNews} from '../scripts/lib/historical-news.mjs';
import {comparePublicationDates} from '../src/lib/publication-date.ts';
const source=fs.readFileSync(new URL('../docs/sources/BXR_NEWS_TRILINGUAL_EXPANDED_V2_2026-10-27.txt',import.meta.url),'utf8');
const records=parseHistoricalNews(source);
test('historical source has 90 complete translations and stable article IDs; Git copies remain editable',()=>{
 assert.equal(records.length,30);assert.equal(records.some(r=>r.id.startsWith('news-14')),false);
 for(const r of records)for(const[lang,copy]of Object.entries(r.languages)){
  assert.ok(copy.title&&copy.body&&copy.summary);
  const file=`src/content/news/${contentLocale(lang)}/${r.id}.md`;
  // The provenance TXT remains immutable; authorized Git deletion is not blocked by a frozen import count.
  // Published triplet completeness is independently enforced by cms:sveltia:check.
  if(!fs.existsSync(file))continue;
  const text=fs.readFileSync(file,'utf8'),end=text.indexOf('\n---',3),data=YAML.parse(text.slice(4,end));
  assert.equal(data.articleId,r.id);assert.ok(data.title&&data.summary&&text.slice(end+5).trim());
  // Published rendering is checked against this Git copy by qa:news-import, not frozen TXT wording.
 }
});
test('unknown dates remain undated, sort last, and equal dates do not merge stories',()=>{
 assert.deepEqual(records.filter(r=>!r.date).map(r=>r.id),['news-07-indo-defence','news-11-sushi-tech-2024','news-15-media-visit-2026']);
 assert.equal(comparePublicationDates(undefined,new Date('2025-01-01')),1);assert.equal(comparePublicationDates(new Date('2025-01-01'),undefined),-1);assert.equal(comparePublicationDates(undefined,undefined),0);
 assert.equal(records.find(r=>r.id==='news-05-tadte-2025')!.date,records.find(r=>r.id==='news-13-future-combat')!.date);
});
test('media registry preserves original article IDs and accepts additional uploaded media',()=>{
 const registry=JSON.parse(fs.readFileSync('src/data/news-media.json','utf8')) as Record<string,{cover?:{filename:string};gallery:unknown[];videos:{type:string;url:string}[]}>;
 const csv=fs.readFileSync('NEWS-MEDIA-MANIFEST.csv','utf8');
 for(const r of records){assert.ok(registry[r.id]);assert.ok(csv.includes(r.id));}
 for(const entry of Object.values(registry)){
  if(entry.cover)assert.ok(/^[a-z0-9-]+\.(jpg|jpeg|png)$/.test(entry.cover.filename));
  for(const video of entry.videos??[])assert.ok(video.type==='local'?video.url.startsWith('/media/news/'):video.url.startsWith('https://'));
 }
});
