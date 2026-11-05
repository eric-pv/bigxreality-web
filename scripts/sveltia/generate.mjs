import { readFile,writeFile } from 'node:fs/promises';
import { stringify } from 'yaml';
import { z } from 'astro/zod';
import { mediaSchema } from '../../public/admin/value-tools.js';
import { loadSchemas,unwrap,root } from './schema.mjs';
import { FIELD_LABELS,OPTION_LABELS } from './labels.mjs';
// Slug references become searchable pickers over the TW collection (TW owns structure). The stored
// value stays the bare slug, so files and the build's relation check are unchanged.
const relationTargets={relatedProducts:'products',products:'products',product:'products',relatedSolutions:'solutions',solution:'solutions',parent:'solutions',relatedNews:'news',relatedInsights:'insights',relatedCaseStudies:'case-studies',tags:'tags'};
const relationDisplay={products:['hero.name'],solutions:['name'],tags:['name']};
function relation(name,multiple){
 const target=relationTargets[name],display=relationDisplay[target]??['title'];
 return {widget:'relation',collection:`${target}-tw`,value_field:'{{slug}}',search_fields:display,display_fields:display,multiple,dropdown_threshold:0,hint:'搜尋名稱後選取；實際儲存英文代稱（slug）。 / Search by name; the slug is stored.'};
}
const isSlug=schema=>schema?._def?.type==='string'&&String(z.toJSONSchema(schema).pattern)==='^[a-z0-9]+(?:-[a-z0-9]+)*$';
// Identifiers of existing records: editing them breaks links to shared media or URLs.
const advanced=new Set(['articleId','mediaId','imageId','code']);
const schemas=loadSchemas();
function field(name,input,path='') {
 const {schema,optional,defaultValue}=unwrap(input),d=schema._def;
 const f={name,label:FIELD_LABELS[name]??name,required:!optional};
 if(defaultValue!==undefined)f.default=defaultValue;
 if(relationTargets[name]&&isSlug(schema))Object.assign(f,relation(name,false));
 else if(relationTargets[name]&&d.type==='array'&&isSlug(unwrap(d.element).schema))Object.assign(f,relation(name,true));
 else if(schema.description==='astro:image')Object.assign(f,{widget:'image',multiple:false,choose_url:false});
 else if(d.type==='string')Object.assign(f,{widget:['description','summary','intro','body','content','answer','bio','note','notes','sourceNote','importNote','dateNote','dateReviewNote'].includes(name)?'text':'string'});
 else if(d.type==='date')Object.assign(f,{widget:'datetime',format:'YYYY-MM-DD',date_format:'YYYY-MM-DD',time_format:false,picker_utc:true});
 else if(d.type==='number')Object.assign(f,{widget:'number',value_type:schema.isInt?'int':'float',...(Number.isFinite(schema.minValue)?{min:schema.minValue}:{}),...(Number.isFinite(schema.maxValue)?{max:schema.maxValue}:{})});
 else if(d.type==='boolean')f.widget='boolean';
 else if(d.type==='enum')Object.assign(f,{widget:'select',options:Object.values(d.entries).map(value=>({label:OPTION_LABELS[name]?.[value]??value,value}))});
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
 if(d.type==='string' && !schema.description && f.widget!=='relation'){const rule=z.toJSONSchema(schema);if(rule.pattern)f.pattern=[rule.pattern,'請依照欄位要求的格式填寫'];}
 if(advanced.has(name))f.hint='進階識別碼：既有內容請勿修改，否則共用媒體或連結會失效。 / Advanced ID: do not change on existing entries.';
 if(name==='translationStatus')Object.assign(f,{default:'source'});
 if(name==='draft'){f.default=true;f.hint='TW 控制前台公開：勾選表示下架／未公開。CMS 的 Save Draft 只儲存審核分支；Publish 合併 main 後，仍需取消此勾選並完成三語及 CI 才會在官網顯示。';}
 // No invented date when an editor creates an undated historical story.
 if(d.type==='date')delete f.default;
 return f;
}
const titleFields={products:'hero.name',solutions:'name',pages:'hero.title',tags:'name'};
const names={news:'最新消息 / News',insights:'技術專欄 / Insights',products:'產品介紹 / Products',solutions:'解決方案 / Solutions','case-studies':'案例研究 / Case Studies',pages:'固定頁面 / Pages',tags:'文章標籤 / Tags','investor-items':'投資人資訊 / Investor Relations'};
const collections=Object.keys(names).map(name=>({name,label:names[name],folder:`src/content/${name}`,create:name!=='pages',delete:name!=='pages',extension:'md',format:'frontmatter',
 i18n:true,identifier_field:titleFields[name]??'title',slug:'{{slug}}',
 summary:name==='products'?'{{hero.name}}':name==='solutions'?'{{name}}':name==='pages'?'{{hero.title}}':name==='tags'?'{{name}}':'{{title}}',
 ...(name==='pages'?{filter:{field:'hero.eyebrow',pattern:'^(?!發展歷程$|History$|沿革$).*$'}}:{}),
 media_folder:`/src/assets/images/${name==='news'?'news':name==='products'||name==='solutions'?'products':'content'}`,
 public_folder:`../../../assets/images/${name==='news'?'news':name==='products'||name==='solutions'?'products':'content'}`,
 fields:[...Object.entries(schemas[name].shape).map(([k,v])=>field(k,v)),{name:'body',label:FIELD_LABELS.body,widget:'markdown',required:false,modes:['raw','rich_text']}] }));
// Fixed files: exclude the retired history copy rather than creating any new public page.
const pages=collections.find(c=>c.name==='pages');delete pages.filter;delete pages.folder;delete pages.create;delete pages.identifier_field;delete pages.slug;delete pages.summary;
const {readdir}=await import('node:fs/promises');
// Fixed pages: only routes that go through getLocalized read TW `draft` (today: privacy, still under
// legal review). Other fixed pages have no `draft` key in Git and omit the field, so the CMS never offers a
// switch that does nothing. (A `hidden` widget with `required` is rejected by Sveltia's config validation,
// which made qa:sveltia, and therefore every main deployment, fail.)
const PAGE_LABELS={
 'case-studies':'案例研究 / Case Studies',company:'公司介紹 / Company',contact:'聯絡我們 / Contact',
 insights:'技術專欄 / Insights',investors:'投資人資訊 / Investor Relations',news:'最新消息 / News',
 partners:'合作夥伴 / Partners',privacy:'隱私權政策 / Privacy Policy',products:'產品介紹 / Products',
 search:'站內搜尋 / Search',solutions:'解決方案 / Solutions',tags:'文章標籤 / Tags',team:'團隊介紹 / Team'
};
const pageLabel=slug=>{
 if(!PAGE_LABELS[slug])throw new Error(`Missing bilingual fixed-page label: ${slug}`);
 return PAGE_LABELS[slug];
};
const DRAFT_PAGES=new Set(['privacy']);
const draftField=pages.fields.find(f=>f.name==='draft');
const pageDraft={...draftField,hint:'TW 控制前台公開：勾選表示不公開（頁面不建置，頁尾也不顯示連結）。取消勾選前須完成法務審閱、刪除草稿標註並完成 EN／JP 翻譯。'};
const pageFields=name=>pages.fields.flatMap(f=>f!==draftField?[f]:DRAFT_PAGES.has(name)?[pageDraft]:[]);
pages.files=(await readdir(new URL('src/content/pages/tw/',root))).filter(n=>n.endsWith('.md')&&n!=='history.md').sort().map(filename=>({name:filename.slice(0,-3),label:pageLabel(filename.slice(0,-3)),file:`src/content/pages/{{locale}}/${filename}`,i18n:true,fields:pageFields(filename.slice(0,-3))}));delete pages.fields;delete pages.delete;delete pages.extension;
// Keep the existing dynamic map intact. One custom JSON object preserves all IDs and future entries.
collections.push({name:'news-media',label:'新聞共用圖集與影片（進階） / News Media Registry (Advanced)',files:[{name:'registry',label:'新聞媒體資料 / News Media Data',file:'src/data/news-media.json',format:'bxr-media-json',fields:[{name:'body',label:'媒體對應表 / Media Map',widget:'bxr-value',required:true,value_schema:mediaSchema,hint:'完整沿用現有 mediaId→媒體物件。圖檔在 src/assets/images/news/，filename 只填檔名；approved=true 且三語 alt 完整才顯示。'}]}]});
// Presentation-only sidecar: text and SEO source fields stay unchanged.
collections.push({name:'typography',label:'多語文字換行 / Text Wrapping',files:[{name:'rules',label:'關鍵詞與標題分組 / Terms and Heading Groups',file:'src/data/typography.json',format:'json',fields:['tw','en','jp'].map(name=>({name,label:FIELD_LABELS[name],widget:'object',fields:[{name:'terms',label:FIELD_LABELS.terms,widget:'list',field:{name:'term',label:FIELD_LABELS.term,widget:'string'},hint:'短詞組為主；避免整句加入詞庫。'}, {name:'headings',label:FIELD_LABELS.headings,widget:'list',required:false,fields:[{name:'text',label:FIELD_LABELS.text,widget:'string',hint:'須與原標題完全一致。 / Must match the heading exactly.'},{name:'groups',label:FIELD_LABELS.groups,widget:'list',field:{name:'group',label:FIELD_LABELS.group,widget:'string'},hint:'所有分組依序串接必須等於原標題，包含空格和標點。長組在窄螢幕可安全換行。'}]}]}))}]});
collections.push({name:'cms-test',label:'隔離測試文章（不會顯示於官網） / Isolated Test (Never Published)',folder:'cms-test-content',create:true,delete:true,extension:'md',format:'frontmatter',media_folder:'/cms-test-media',public_folder:'../cms-test-media',fields:[{name:'title',label:FIELD_LABELS.title,widget:'string'},{name:'date',label:FIELD_LABELS.date,widget:'datetime',required:false,format:'YYYY-MM-DD',time_format:false},{name:'image',label:'測試圖片 / Test Image',widget:'image',required:false},{name:'body',label:FIELD_LABELS.body,widget:'markdown',required:false}]});
// Existing folder codes tw/jp are URL segments, not BCP-47 language tags. Explicit locale
// collections keep correct human labels without renaming files or monkey-patching Intl APIs.
const languageNames={tw:'繁體中文（TW）',en:'English（EN）',jp:'日本語（JP）'};
const localFields=(fields,lang)=>fields.map(f=>f.name==='translationStatus'?{...f,default:lang==='tw'?'source':'pending'}:f);
const localizedCollections=collections.flatMap(collection=>{
 if(!schemas[collection.name])return [collection];
 return Object.entries(languageNames).map(([lang,label])=>{
  const c={...collection,name:`${collection.name}-${lang}`,label:`${lang.toUpperCase()} · ${collection.label}`,description:label};delete c.i18n;
  if(c.folder)c.folder+=`/${lang}`;
  if(c.fields)c.fields=localFields(c.fields,lang);
  if(c.files)c.files=c.files.map(file=>{const f={...file,file:file.file.replace('{{locale}}',lang),fields:localFields(file.fields,lang)};delete f.i18n;return f;});
  return c;
 });
});
const config={backend:{name:'github',repo:'eric-pv/bigxreality-web',branch:'main',auth_methods:['token']},
 publish_mode:'editorial_workflow',output:{omit_empty_optional_fields:true},site_url:'https://eric-pv.github.io/bigxreality-web/',display_url:'https://eric-pv.github.io/bigxreality-web/',
 media_folder:'src/assets/images/news',public_folder:'/src/assets/images/news',
 asset_collections:[{name:'news-images',label:'新聞圖片 / News Images',media_folder:'src/assets/images/news',public_folder:'/src/assets/images/news'},{name:'product-images',label:'產品與解決方案圖片 / Product and Solution Images',media_folder:'src/assets/images/products',public_folder:'/src/assets/images/products'},{name:'content-images',label:'一般內容圖片 / Content Images',media_folder:'src/assets/images/content',public_folder:'/src/assets/images/content'},{name:'news-videos',label:'新聞本地影片 / Local News Videos',media_folder:'public/media/news',public_folder:'/media/news'}],
 media_libraries:{default:{config:{max_file_size:20000000,slugify_filename:true,filename_template:'{{filename}}-{{uuid_short}}'}}},collections:localizedCollections};
const output='# Generated by npm run cms:sveltia:generate from src/content.config.ts. Do not hand-edit.\n'+stringify(config,{lineWidth:110,aliasDuplicateObjects:true});
const destination=new URL('public/admin/config.yml',root);
if(process.argv.includes('--check')){
 if(await readFile(destination,'utf8')!==output)throw new Error('Sveltia config is stale: npm run cms:sveltia:generate');
 console.log('PASS: Sveltia fields match the current Astro schemas.');
}else{await writeFile(destination,output);console.log(`Generated ${localizedCollections.length} collections, all supported nested schema fields.`);}
