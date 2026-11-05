import { readFile,writeFile } from 'node:fs/promises';
import { stringify } from 'yaml';
import { z } from 'astro/zod';
import { mediaSchema } from '../../public/admin/value-tools.js';
import { loadSchemas,unwrap,root } from './schema.mjs';
const labels={translationStatus:'翻譯狀態',draft:'草稿（TW 控制是否公開）',publishDate:'發布日期（未知請留空）',updatedAt:'更新日期',title:'標題',summary:'摘要',category:'分類',body:'完整內文',seo:'SEO',description:'描述',hero:'頁首',landing:'完整內容區塊',alt:'替代文字',src:'圖片',name:'名稱',order:'排序',domains:'應用領域',cover:'封面',featured:'焦點新聞',featuredPriority:'焦點優先順序',featuredInCSR:'CSR 案例',csrCategories:'CSR 主題',articleId:'ARTICLE_ID',mediaId:'共用媒體 ID',imageId:'圖片 ID'};
const schemas=loadSchemas();
function field(name,input,path='') {
 const {schema,optional,defaultValue}=unwrap(input),d=schema._def;
 const f={name,label:labels[name]??name,required:!optional};
 if(defaultValue!==undefined)f.default=defaultValue;
 if(schema.description==='astro:image')Object.assign(f,{widget:'image',multiple:false,choose_url:false});
 else if(d.type==='string')Object.assign(f,{widget:['description','summary','intro','body','content','answer','bio','note','notes','sourceNote','importNote','dateNote','dateReviewNote'].includes(name)?'text':'string'});
 else if(d.type==='date')Object.assign(f,{widget:'datetime',format:'YYYY-MM-DD',date_format:'YYYY-MM-DD',time_format:false,picker_utc:true});
 else if(d.type==='number')Object.assign(f,{widget:'number',value_type:schema.isInt?'int':'float',...(Number.isFinite(schema.minValue)?{min:schema.minValue}:{}),...(Number.isFinite(schema.maxValue)?{max:schema.maxValue}:{})});
 else if(d.type==='boolean')f.widget='boolean';
 else if(d.type==='enum')Object.assign(f,{widget:'select',options:Object.values(d.entries)});
 else if(d.type==='object')Object.assign(f,{widget:'object',collapsed:true,fields:Object.entries(schema.shape).map(([k,v])=>field(k,v,`${path}.${name}`))});
 else if(d.type==='array'){
  const inner=field('item',d.element,`${path}.${name}`);
  Object.assign(f,{widget:'list',collapsed:true,allow_add:true});
  if(inner.widget==='object')f.fields=inner.fields;else f.field=inner;
  const json=z.toJSONSchema(schema,{io:'input',unrepresentable:'any'});
  if(json.minItems!==undefined)f.min=json.minItems;
  if(json.maxItems!==undefined)f.max=json.maxItems;
 }
 else if(d.type==='union')Object.assign(f,{widget:'bxr-value',value_schema:z.toJSONSchema(schema,{io:'input'}),hint:'進階複合欄位：輸入 JSON，保留數字／字串／物件的原始型別。字串須含雙引號。'});
 else throw new Error(`Unsupported Astro field ${path}.${name}: ${d.type}`);
 if(d.type==='string' && !schema.description){const rule=z.toJSONSchema(schema);if(rule.pattern)f.pattern=[rule.pattern,'請依照欄位要求的格式填寫'];}
 if(name==='translationStatus')Object.assign(f,{default:'source'});
 if(name==='draft'){f.default=true;f.hint='TW 控制前台公開：勾選表示下架／未公開。CMS 的 Save Draft 只儲存審核分支；Publish 合併 main 後，仍需取消此勾選並完成三語及 CI 才會在官網顯示。';}
 // No invented date when an editor creates an undated historical story.
 if(d.type==='date')delete f.default;
 return f;
}
const titleFields={products:'hero.name',solutions:'name',pages:'hero.title',tags:'name'};
const names={news:'最新消息',insights:'技術專欄',products:'產品介紹',solutions:'解決方案','case-studies':'案例研究',pages:'固定頁面',tags:'文章標籤','investor-items':'投資人資訊'};
const collections=Object.keys(names).map(name=>({name,label:names[name],folder:`src/content/${name}`,create:name!=='pages',delete:name!=='pages',extension:'md',format:'frontmatter',
 i18n:true,identifier_field:titleFields[name]??'title',slug:'{{slug}}',
 summary:name==='products'?'{{hero.name}}':name==='solutions'?'{{name}}':name==='pages'?'{{hero.title}}':'{{title}}',
 ...(name==='pages'?{filter:{field:'hero.eyebrow',pattern:'^(?!發展歷程$|History$|沿革$).*$'}}:{}),
 media_folder:`/src/assets/images/${name==='news'?'news':name==='products'||name==='solutions'?'products':'content'}`,
 public_folder:`../../../assets/images/${name==='news'?'news':name==='products'||name==='solutions'?'products':'content'}`,
 fields:[...Object.entries(schemas[name].shape).map(([k,v])=>field(k,v)),{name:'body',label:'完整內文',widget:'markdown',required:false,modes:['raw','rich_text']}] }));
// Fixed files: exclude the retired history copy rather than creating any new public page.
const pages=collections.find(c=>c.name==='pages');delete pages.filter;delete pages.folder;delete pages.create;delete pages.identifier_field;delete pages.slug;delete pages.summary;
const {readdir}=await import('node:fs/promises');
// Fixed pages: only routes that go through getLocalized read TW `draft` (today: privacy, still under
// legal review). Other fixed pages have no `draft` key in Git and omit the field, so the CMS never offers a
// switch that does nothing. (A `hidden` widget with `required` is rejected by Sveltia's config validation,
// which made qa:sveltia, and therefore every main deployment, fail.)
const DRAFT_PAGES=new Set(['privacy']);
const draftField=pages.fields.find(f=>f.name==='draft');
const pageDraft={...draftField,hint:'TW 控制前台公開：勾選表示不公開（頁面不建置，頁尾也不顯示連結）。取消勾選前須完成法務審閱、刪除草稿標註並完成 EN／JP 翻譯。'};
const pageFields=name=>pages.fields.flatMap(f=>f!==draftField?[f]:DRAFT_PAGES.has(name)?[pageDraft]:[]);
pages.files=(await readdir(new URL('src/content/pages/tw/',root))).filter(n=>n.endsWith('.md')&&n!=='history.md').sort().map(filename=>({name:filename.slice(0,-3),label:filename.slice(0,-3),file:`src/content/pages/{{locale}}/${filename}`,i18n:true,fields:pageFields(filename.slice(0,-3))}));delete pages.fields;delete pages.delete;delete pages.extension;
// Keep the existing dynamic map intact. One custom JSON object preserves all IDs and future entries.
collections.push({name:'news-media',label:'新聞共用圖集與影片（進階）',files:[{name:'registry',label:'新聞媒體資料',file:'src/data/news-media.json',format:'bxr-media-json',fields:[{name:'body',label:'媒體對應表',widget:'bxr-value',required:true,value_schema:mediaSchema,hint:'完整沿用現有 mediaId→媒體物件。圖檔在 src/assets/images/news/，filename 只填檔名；approved=true 且三語 alt 完整才顯示。'}]}]});
// Presentation-only sidecar: text and SEO source fields stay unchanged.
collections.push({name:'typography',label:'多語文字換行',files:[{name:'rules',label:'關鍵詞與標題分組',file:'src/data/typography.json',format:'json',fields:['tw','en','jp'].map(name=>({name,label:({tw:'繁體中文',en:'English',jp:'日本語'})[name],widget:'object',fields:[{name:'terms',label:'完整保留的關鍵詞',widget:'list',field:{name:'term',widget:'string'},hint:'短詞組為主；避免整句加入詞庫。'}, {name:'headings',label:'個別標題分組（選用）',widget:'list',required:false,fields:[{name:'text',label:'完整原標題（完全一致）',widget:'string'},{name:'groups',label:'依語意分組',widget:'list',field:{name:'group',widget:'string'},hint:'所有分組依序串接必須等於原標題，包含空格和標點。長組在窄螢幕可安全換行。'}]}]}))}]});
collections.push({name:'cms-test',label:'隔離測試文章（不會顯示於官網）',folder:'cms-test-content',create:true,delete:true,extension:'md',format:'frontmatter',media_folder:'/cms-test-media',public_folder:'../cms-test-media',fields:[{name:'title',label:'標題',widget:'string'},{name:'date',label:'日期',widget:'datetime',required:false,format:'YYYY-MM-DD',time_format:false},{name:'image',label:'測試圖片',widget:'image',required:false},{name:'body',label:'內文',widget:'markdown',required:false}]});
// Existing folder codes tw/jp are URL segments, not BCP-47 language tags. Explicit locale
// collections keep correct human labels without renaming files or monkey-patching Intl APIs.
const languageNames={tw:'繁體中文（TW）',en:'English（EN）',jp:'日本語（JP）'};
const localFields=(fields,lang)=>fields.map(f=>f.name==='translationStatus'?{...f,default:lang==='tw'?'source':'pending'}:f);
const localizedCollections=collections.flatMap(collection=>{
 if(!schemas[collection.name])return [collection];
 return Object.entries(languageNames).map(([lang,label])=>{
  const c={...collection,name:`${collection.name}-${lang}`,label:`${collection.label} · ${label}`};delete c.i18n;
  if(c.folder)c.folder+=`/${lang}`;
  if(c.fields)c.fields=localFields(c.fields,lang);
  if(c.files)c.files=c.files.map(file=>{const f={...file,file:file.file.replace('{{locale}}',lang),fields:localFields(file.fields,lang)};delete f.i18n;return f;});
  return c;
 });
});
const config={backend:{name:'github',repo:'eric-pv/bigxreality-web',branch:'main',auth_methods:['token']},
 publish_mode:'editorial_workflow',output:{omit_empty_optional_fields:true},site_url:'https://eric-pv.github.io/bigxreality-web/',display_url:'https://eric-pv.github.io/bigxreality-web/',
 media_folder:'src/assets/images/news',public_folder:'/src/assets/images/news',
 asset_collections:[{name:'news-images',label:'新聞圖片',media_folder:'src/assets/images/news',public_folder:'/src/assets/images/news'},{name:'product-images',label:'產品與解決方案圖片',media_folder:'src/assets/images/products',public_folder:'/src/assets/images/products'},{name:'content-images',label:'一般內容圖片',media_folder:'src/assets/images/content',public_folder:'/src/assets/images/content'},{name:'news-videos',label:'新聞本地影片',media_folder:'public/media/news',public_folder:'/media/news'}],
 media_libraries:{default:{config:{max_file_size:20000000,slugify_filename:true,filename_template:'{{filename}}-{{uuid_short}}'}}},collections:localizedCollections};
const output='# Generated by npm run cms:sveltia:generate from src/content.config.ts. Do not hand-edit.\n'+stringify(config,{lineWidth:110,aliasDuplicateObjects:true});
const destination=new URL('public/admin/config.yml',root);
if(process.argv.includes('--check')){
 if(await readFile(destination,'utf8')!==output)throw new Error('Sveltia config is stale: npm run cms:sveltia:generate');
 console.log('PASS: Sveltia fields match the current Astro schemas.');
}else{await writeFile(destination,output);console.log(`Generated ${localizedCollections.length} collections, all supported nested schema fields.`);}
