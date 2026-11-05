import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import { parse,stringify } from 'yaml';
import { loadSchemas,unwrap,root } from './schema.mjs';
import { mediaFormat,validateValue,mediaSchema } from '../../public/admin/value-tools.js';
const config=parse(await readFile(new URL('public/admin/config.yml',root),'utf8'));
assert.equal(config.backend.branch,'main');
assert.equal(config.publish_mode,'editorial_workflow');
for(const collection of config.collections.filter(c=>c.folder&&c.name!=='cms-test'))assert.equal(collection.delete,true,'Content deletion uses reviewed Git history; fixed pages remain protected');
assert.ok(!config.i18n);
for(const lang of ['tw','en','jp'])assert.ok(config.collections.some(c=>c.name===`news-${lang}`&&c.folder===`src/content/news/${lang}`));
assert.ok(config.output.omit_empty_optional_fields);
assert.ok(!config.media_libraries.default.config.transformations);
// List labels must identify real content without exposing storage identifiers as UI text.
for(const lang of ['tw','en','jp']){
 const tags=config.collections.find(c=>c.name===`tags-${lang}`);
 assert.equal(tags.identifier_field,'name');
 assert.equal(tags.summary,'{{name}}','Tag lists must use the schema name, not a missing title');
 const pages=config.collections.find(c=>c.name===`pages-${lang}`);
 for(const file of pages.files){
  assert.match(file.label,/[\u3400-\u9fff].* \/ [A-Za-z]/,`${file.name}: fixed-page label must be bilingual`);
  assert.equal(file.file,`src/content/pages/${lang}/${file.name}.md`,'Display labels must not rename content paths');
 }
}
for(const asset of config.asset_collections)assert.match(asset.label,/[\u3400-\u9fff].* \/ [A-Za-z]/);
const schemas=loadSchemas();let fields=0,files=0;
function coverage(schema,configured,trace,omitted=new Set()){
 const s=unwrap(schema).schema,d=s._def;
 if(d.type==='object')for(const[k,v]of Object.entries(s.shape)){
  if(omitted.has(k))continue;
  const f=configured.find(f=>f.name===k);assert.ok(f,`Missing CMS field ${trace}.${k}`);fields++;
  const inner=unwrap(v).schema;
  if(inner._def.type==='object')coverage(v,f.fields,`${trace}.${k}`);
  if(inner._def.type==='array'){
   const item=unwrap(inner._def.element).schema;
   if(item._def.type==='object')coverage(item,f.fields,`${trace}.${k}[]`);
  }
  if(inner._def.type==='union')assert.equal(f.widget,'bxr-value');
 }
}
function rawCoverage(value,schema,trace){
 if(value===undefined||value===null)return;
 const s=unwrap(schema).schema,d=s._def;
 if(d.type==='object')for(const[k,v]of Object.entries(value)){assert.ok(s.shape[k],`Unmapped existing field ${trace}.${k}`);rawCoverage(v,s.shape[k],`${trace}.${k}`);}
 if(d.type==='array')value.forEach((v,i)=>rawCoverage(v,d.element,`${trace}[${i}]`));
}
for(const collection of config.collections){
 const name=collection.name.replace(/-(tw|en|jp)$/,'');
 if(!schemas[name])continue;
 if(collection.fields)coverage(schemas[name],collection.fields,collection.name);
 // Fixed pages: `draft` is offered only where the route reads it (privacy). Omitting it elsewhere is safe
 // only while no language file of that page holds a draft value that a CMS save could drop.
 else for(const file of collection.files){
  const omitted=new Set(name==='pages'&&!file.fields.some(f=>f.name==='draft')?['draft']:[]);
  for(const lang of omitted.size?['tw','en','jp']:[]){
   const md=new URL(`src/content/pages/${lang}/${file.name}.md`,root);
   if(existsSync(md))assert.equal(parse((await readFile(md,'utf8')).split(/^---\s*$/m)[1])?.draft,undefined,`pages/${lang}/${file.name}.md has draft but the CMS omits the field`);
  }
  coverage(schemas[name],file.fields,`${collection.name}.${file.name}`,omitted);
 }
 for(const lang of [collection.name.split('-').at(-1)]){
  const folder=new URL(`src/content/${name}/${lang}/`,root);if(!existsSync(folder))continue;
  for(const filename of (await readdir(folder)).filter(n=>n.endsWith('.md'))){
   assert.ok(/^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/.test(filename),`Use a stable lowercase English slug: ${collection.name}/${filename}`);
   const source=await readFile(new URL(filename,folder),'utf8');const raw=parse(source.split(/^---\s*$/m)[1]);
   rawCoverage(raw,schemas[name],`${collection.name}/${lang}/${filename}`);
   assert.ok(schemas[name].safeParse(raw).success,`Invalid schema ${collection.name}/${lang}/${filename}`);
   assert.deepEqual(parse(stringify(raw)),raw);files++;
  }
 }
}
const media=JSON.parse(await readFile(new URL('src/data/news-media.json',root),'utf8'));
assert.equal(validateValue(media,mediaSchema),'');
for(const [id,record] of Object.entries(media)){
 for(const photo of [record.cover,...(record.gallery??[])].filter(Boolean))if(photo.approved){
  assert.ok(existsSync(new URL(`src/assets/images/news/${photo.filename}`,root)),`${id}: approved photo missing`);
  for(const lang of ['tw','en','jp'])assert.ok(photo.alt?.[lang]?.trim(),`${id}: approved photo needs real ${lang} alt`);
 }
 for(const video of record.videos??[])if(video.type==='local'&&video.approved){
  assert.ok(/^\/media\/news\/[a-z0-9-]+\.(mp4|webm)$/.test(video.url));
  assert.ok(existsSync(new URL(`public${video.url}`,root)),`${id}: approved local video missing`);
 }
}
assert.deepEqual(JSON.parse(mediaFormat.toFile(mediaFormat.fromFile(JSON.stringify(media)))) ,media);
assert.ok(validateValue('bad',{type:'number'}));
assert.equal(validateValue('[待提供]',{anyOf:[{type:'number'},{type:'string',const:'[待提供]'}]}),'');
const personnel=config.collections.find(c=>c.name==='products-tw').fields.find(f=>f.name==='deployment').fields.find(f=>f.name==='personnel');
assert.equal(validateValue({min:1,max:3,approx:false},personnel.value_schema),'');
assert.ok(validateValue({min:-1,max:3},personnel.value_schema));
assert.ok(!config.collections.some(c=>['milestones','team','partners'].includes(c.name)));
assert.ok(!config.collections.find(c=>c.name==='pages-tw').files.some(f=>f.name==='history'));
const articleIds=new Set();
for(const collection of ['news','products','solutions','insights','case-studies']){
 const dir=new URL(`src/content/${collection}/tw/`,root);if(!existsSync(dir))continue;
 for(const file of (await readdir(dir)).filter(f=>f.endsWith('.md'))){
  const raw=parse((await readFile(new URL(file,dir),'utf8')).split(/^---\s*$/m)[1]);
  if(collection==='news'&&raw.articleId){assert.ok(!articleIds.has(raw.articleId),`Duplicate ARTICLE_ID ${raw.articleId}`);articleIds.add(raw.articleId);}
  if(raw.draft||raw.approval?.approved===false)continue;
  if(collection==='news'){
   assert.ok(raw.articleId,`${file}: published news needs a stable ARTICLE_ID`);
   if(raw.mediaId)assert.ok(media[raw.mediaId],`${file}: mediaId is not registered`);
  }
  for(const lang of ['en','jp']){
   const localized=new URL(`src/content/${collection}/${lang}/${file}`,root);
   assert.ok(existsSync(localized),`${collection}/${file}: publish only after EN and JP exist with the same slug`);
   const copy=parse((await readFile(localized,'utf8')).split(/^---\s*$/m)[1]);
   assert.equal(copy.translationStatus,'translated',`${collection}/${lang}/${file}: translation not ready`);
  }
 }
}
const sample=JSON.parse(JSON.stringify({translationStatus:'source',draft:true,title:'Isolated CMS test',summary:'Never published',category:'company'}));
assert.ok(schemas.news.safeParse(sample).success);
assert.equal(schemas.news.parse(sample).publishDate,undefined);
assert.equal(path.normalize(path.join('src/content/news/tw','../../../assets/images/news/example.jpg')),'src/assets/images/news/example.jpg');
assert.ok(!config.collections.find(c=>c.name==='cms-test').folder.startsWith('src/content'));
const branch=process.env.GITHUB_HEAD_REF||process.env.GITHUB_REF_NAME||execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
if(branch==='feature/sveltia-cms'||branch.startsWith('cms/')){
 const changed=execFileSync('git',['diff','--name-only','--diff-filter=MD','origin/main','--','src/assets/images','public/media','public/video'],{encoding:'utf8'}).trim().split('\n').filter(file=>/\.(png|jpe?g|gif|webp|avif|svg|mp4|webm)$/i.test(file));
 assert.deepEqual(changed,[],'CMS changes must add a new asset name rather than overwrite/delete existing media');
}
console.log(`PASS: ${fields} nested schema fields; ${files} existing files unchanged/round-trippable; three language paths, unknown dates, typed unions, media registry and isolated test folder.`);
