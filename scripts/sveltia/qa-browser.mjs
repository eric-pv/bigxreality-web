// Real pinned Sveltia application; all edits live in a browser OPFS clone, never GitHub or src/content.
import assert from 'node:assert/strict';
import {contentLocale} from '../../src/lib/content-locale.ts';
import { chromium } from 'playwright-core';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import {parse} from 'yaml';
import {CHROMIUM} from '../lib/serve.mjs';
import {loadSchemas} from './schema.mjs';
const run=promisify(execFile),repo=path.resolve(import.meta.dirname,'../..'),cache=path.join(repo,'.qa/sveltia');
await mkdir(cache,{recursive:true});
const cdn='https://cdn.jsdelivr.net/npm/@sveltia/cms@0.253.1/';
const server=createServer(async(req,res)=>{
 let p=new URL(req.url,'http://localhost').pathname.replace(/^\/bigxreality-web/,'');if(p.endsWith('/'))p+='index.html';
 const file=path.resolve(repo,'public','.'+p);
 if(!file.startsWith(path.join(repo,'public')+path.sep))return res.writeHead(404).end();
 try{res.writeHead(200,{'content-type':({'.html':'text/html','.js':'application/javascript','.yml':'text/yaml'})[path.extname(file)]??'application/octet-stream'}).end(await readFile(file));}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(4398,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:CHROMIUM});
const originals={'.git/HEAD':'ref: refs/heads/main\n','src/data/news-media.json':await readFile(path.join(repo,'src/data/news-media.json'),'utf8')};
async function collect(folder){for(const item of await readdir(path.join(repo,folder),{withFileTypes:true})){const file=folder+'/'+item.name;if(item.isDirectory())await collect(file);else if(file.endsWith('.md')||file.endsWith('.json'))originals[file]=await readFile(path.join(repo,file),'utf8');}}
if(existsSync(path.join(repo,'src/data/typography.json')))originals['src/data/typography.json']=await readFile(path.join(repo,'src/data/typography.json'),'utf8');
await collect('src/content');
const imageNames=(await readdir(path.join(repo,'src/assets/images/clients'))).filter(n=>n.endsWith('.webp'));
const image=await readFile(path.join(repo,'src/assets/images/clients',imageNames[0]));
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(/config|configuration|not supported|will be ignored/i.test(message.text())&&['warning','error'].includes(message.type()))errors.push(message.text());});
 // Load official application code via its pinned CDN; cache only JS, never external media.
 await page.route('https://**/*',async route=>{
  const url=route.request().url();
  const dependency=url.startsWith('https://unpkg.com/immutable@5.1.9/');
  const font=url.startsWith('https://cdn.jsdelivr.net/fontsource/');
  if(!url.startsWith(cdn)&&!dependency&&!font){await route.abort();return;}
  const downloadURL=dependency?url.replace('https://unpkg.com/','https://cdn.jsdelivr.net/npm/'):url;
  const cached=path.join(cache,Buffer.from(url).toString('base64url'));
  try{
   if(!existsSync(cached)){
    if(url.endsWith('/sveltia-cms.js')&&process.env.SVELTIA_BUNDLE)await writeFile(cached,await readFile(process.env.SVELTIA_BUNDLE));
    else await run('curl',['--fail','--location','--silent','--show-error','--retry','2','--max-time','45',downloadURL,'-o',cached]);
   }
   await route.fulfill({body:await readFile(cached),headers:{'access-control-allow-origin':'*'},contentType:url.endsWith('.woff2')?'font/woff2':url.endsWith('.css')?'text/css':'application/javascript'});
  }catch(error){errors.push(`CMS code download failed: ${url}`);await route.abort();}
 });
 await page.addInitScript(()=>{window.showDirectoryPicker=async()=>(await navigator.storage.getDirectory()).getDirectoryHandle('bxr-isolated-cms-qa',{create:true});});
 const go=async base=>{await page.goto(`http://127.0.0.1:4398${base}admin/`);await page.getByRole('button',{name:'Sign In Using Access Token'}).waitFor({timeout:90000});await page.getByText('Loading CMS Configuration...',{exact:true}).waitFor({state:'hidden'});};
 await go('/');
 // Token entry is available. No real user credential is supplied; live GitHub authorization is NOT passed.
 await page.getByRole('button',{name:'Sign In Using Access Token'}).click();
 await page.getByRole('textbox',{name:'Personal Access Token',exact:true}).waitFor();
 await go('/bigxreality-web/');
 await page.screenshot({path:path.join(cache,'login-desktop.png')});
 await page.evaluate(async(files)=>{
  const root=await(await navigator.storage.getDirectory()).getDirectoryHandle('bxr-isolated-cms-qa',{create:true});
  for(const[file,text]of Object.entries(files)){const parts=file.split('/');let dir=root;for(const part of parts.slice(0,-1))dir=await dir.getDirectoryHandle(part,{create:true});const h=await dir.getFileHandle(parts.at(-1),{create:true});const w=await h.createWritable();await w.write(text);await w.close();}
 },originals);
 await page.getByRole('button',{name:'Work with Local Repository'}).click();
 await page.getByRole('button',{name:'Show Account Menu'}).waitFor();
 const readClone=async()=>page.evaluate(async()=>{
  const root=await(await navigator.storage.getDirectory()).getDirectoryHandle('bxr-isolated-cms-qa');const out={};
  async function walk(dir,prefix=''){for await(const[name,handle]of dir.entries()){const p=prefix+name;if(handle.kind==='directory')await walk(handle,p+'/');else out[p]=Array.from(new Uint8Array(await(await handle.getFile()).arrayBuffer()));}}
  await walk(root);return out;
 });
 const textOf=(clone,file)=>Buffer.from(clone[file]??[]).toString('utf8');
 // Sveltia mounts editor fields lazily as they scroll into view. Step through the editor (not only to its
 // end, which leaves mid-form fields unmounted) until the field exists, then bring it into view.
 const reveal=async(locator,timeout=45000)=>{
  const end=Date.now()+timeout;
  while(await locator.count()===0){
   if(Date.now()>end)throw new Error('CMS field did not mount: '+locator);
   await page.evaluate(()=>document.querySelectorAll('*').forEach(el=>{if(el.scrollHeight>el.clientHeight+100&&getComputedStyle(el).overflowY!=='visible'){const top=el.scrollTop;el.scrollTop=top+el.clientHeight*0.7;if(el.scrollTop===top)el.scrollTop=0;}}));
   await page.waitForTimeout(200);
  }
  // Hidden controls (e.g. the file input behind a drop zone) exist but cannot be scrolled to.
  if(await locator.first().isVisible())await locator.first().scrollIntoViewIfNeeded();
  return locator.first();
 };
 await page.getByRole('treeitem',{name:'隔離測試文章（不會顯示於官網） / Isolated Test (Never Published)',exact:true}).click();
 await page.getByRole('main',{name:/隔離測試文章/}).waitFor();
 await page.getByRole('button',{name:'Create New Entry'}).first().click();
 await page.getByRole('textbox',{name:'標題 / Title',exact:true}).fill('bxr-cms-browser-qa');
 await page.getByRole('group',{name:/測試圖片.*Field/}).locator('input[type=file]').first().setInputFiles({name:'bxr-cms-upload.webp',mimeType:'image/webp',buffer:image});
 await page.getByRole('textbox',{name:'文章內文 / Article Content',exact:true}).fill('BXR isolated browser test.');
 const isolatedBody=page.getByRole('group',{name:/文章內文.*Field/});
 await isolatedBody.getByRole('textbox',{name:'文章內文 / Article Content',exact:true}).press('End');
 await isolatedBody.getByRole('textbox',{name:'文章內文 / Article Content',exact:true}).press('Enter');
 await isolatedBody.getByRole('button',{name:'Insert',exact:true}).click();
 await page.getByRole('menuitem',{name:'正文圖片 / Inline Image',exact:true}).click();
 const imageDialog=page.getByRole('dialog',{name:'正文圖片 / Inline Image',exact:true});
 await imageDialog.locator('input[type=file]').first().setInputFiles({name:'bxr-inline-upload.webp',mimeType:'image/webp',buffer:image});
 await imageDialog.getByRole('textbox',{name:'替代文字 / Alternative Text',exact:true}).fill('BXR inline image alt');
 await imageDialog.getByRole('textbox',{name:'圖說 / Caption',exact:true}).fill('BXR inline caption');
 await imageDialog.getByRole('switch',{name:'核准公開 / Approved for Publication',exact:true}).check();
 await imageDialog.getByRole('button',{name:'Insert',exact:true}).click();

 await page.getByRole('button',{name:'Save',exact:true}).click();
 await page.getByRole('row',{name:/bxr-cms-browser-qa/}).waitFor();
 let clone=await readClone(),saved=textOf(clone,'cms-test-content/bxr-cms-browser-qa.md');
 assert.ok(saved.includes('BXR isolated browser test.'));
 const insertedImage=saved.match(/<!-- bxr-image: (\{[^\n]*\}) -->/);assert.ok(insertedImage,'Rich editor must save the image component syntax');
 assert.equal(JSON.parse(insertedImage[1]).alt,'BXR inline image alt');
 const asset=Object.keys(clone).find(p=>p.startsWith('cms-test-media/')&&p.endsWith('.webp'));assert.ok(asset);
 assert.deepEqual(Buffer.from(clone[asset]),image);
 await page.getByRole('row',{name:/bxr-cms-browser-qa/}).click();
 await page.getByRole('button',{name:'正文圖片 / Inline Image',exact:true}).click();
 const editImage=page.getByRole('dialog',{name:'正文圖片 / Inline Image',exact:true});
 await editImage.getByRole('textbox',{name:'替代文字 / Alternative Text',exact:true}).fill('BXR edited inline alt');
 await editImage.getByRole('button',{name:'Update',exact:true}).click();
 await page.getByRole('button',{name:'Save',exact:true}).click();
 await page.getByRole('row',{name:/bxr-cms-browser-qa/}).waitFor();
 assert.ok(textOf(await readClone(),'cms-test-content/bxr-cms-browser-qa.md').includes('BXR edited inline alt'));
 await page.getByRole('row',{name:/bxr-cms-browser-qa/}).click();
 await page.getByRole('button',{name:'正文圖片 / Inline Image',exact:true}).click();
 await page.getByRole('dialog',{name:'正文圖片 / Inline Image',exact:true}).getByRole('button',{name:'Remove',exact:true}).click();
 // Insert an external video, then replace it with a local file through the same component.
 await isolatedBody.getByRole('textbox',{name:'文章內文 / Article Content',exact:true}).press('End');
 await isolatedBody.getByRole('textbox',{name:'文章內文 / Article Content',exact:true}).press('Enter');
 await isolatedBody.getByRole('button',{name:'Insert',exact:true}).click();
 await page.getByRole('menuitem',{name:'正文影片 / Inline Video',exact:true}).click();
 const videoDialog=page.getByRole('dialog',{name:'正文影片 / Inline Video',exact:true});
 await videoDialog.getByRole('textbox',{name:'外部影片連結 / External Video URL',exact:true}).fill('https://www.youtube.com/watch?v=abcdefghijk');
 await videoDialog.getByRole('textbox',{name:'影片標題 / Video Title',exact:true}).fill('BXR isolated inline video');
 await videoDialog.getByRole('switch',{name:'核准公開 / Approved for Publication',exact:true}).check();
 await videoDialog.getByRole('switch',{name:'核准嵌入播放器 / Approved to Embed',exact:true}).check();
 await videoDialog.getByRole('button',{name:'Insert',exact:true}).click();
 await page.getByRole('button',{name:'Save',exact:true}).click();
 await page.getByRole('row',{name:/bxr-cms-browser-qa/}).waitFor();
 let videoSource=textOf(await readClone(),'cms-test-content/bxr-cms-browser-qa.md');
 let videoData=JSON.parse(videoSource.match(/<!-- bxr-video: (\{[^\n]*\}) -->/)[1]);
 assert.equal(videoData.type,'youtube');assert.equal(videoData.url,'https://www.youtube.com/watch?v=abcdefghijk');
 await page.getByRole('row',{name:/bxr-cms-browser-qa/}).click();
 await page.getByRole('button',{name:'正文影片 / Inline Video',exact:true}).click();
 await videoDialog.getByRole('radio',{name:'本地影片 / Local Video',exact:true}).check();
 const clip=await readFile(path.join(repo,'tests/fixtures/media/inline-sample.webm'));
 await videoDialog.locator('input[type=file]').first().setInputFiles({name:'bxr-local-upload.webm',mimeType:'video/webm',buffer:clip});
 await videoDialog.getByRole('button',{name:'Update',exact:true}).click();
 await page.getByRole('button',{name:'Save',exact:true}).click();
 await page.getByRole('row',{name:/bxr-cms-browser-qa/}).waitFor();
 const localClone=await readClone();videoSource=textOf(localClone,'cms-test-content/bxr-cms-browser-qa.md');
 videoData=JSON.parse(videoSource.match(/<!-- bxr-video: (\{[^\n]*\}) -->/)[1]);
 assert.equal(videoData.type,'local');assert.ok(videoData.url.startsWith('/media/news/'),videoData.url);
 assert.deepEqual(Buffer.from(localClone[`public${videoData.url}`]),clip);
 await page.getByRole('row',{name:/bxr-cms-browser-qa/}).click();
 await page.getByRole('button',{name:'正文影片 / Inline Video',exact:true}).click();
 await videoDialog.getByRole('button',{name:'Remove',exact:true}).click();
 await page.getByRole('textbox',{name:'文章內文 / Article Content',exact:true}).fill('BXR isolated edit verified.');
 await page.getByRole('button',{name:'Save',exact:true}).click();
 await page.getByRole('row',{name:/bxr-cms-browser-qa/}).waitFor();
 clone=await readClone();assert.ok(textOf(clone,'cms-test-content/bxr-cms-browser-qa.md').includes('BXR isolated edit verified.'));
 // Edit a real multilingual story in the disposable clone. All three sibling paths must survive.
 await page.getByRole('treeitem',{name:'最新消息 / News',exact:true}).click();
 const id='news-01-ds-2025';
 const raw=parse(originals[`src/content/news/zh-Hant/${id}.md`].split(/^---\s*$/m)[1]);
 await page.getByRole('row').filter({hasText:raw.title}).first().click();
 // Sveltia lazily mounts off-screen fields; scroll the editor to the Markdown field.
 const body=await reveal(page.getByRole('textbox',{name:'文章內文 / Article Content',exact:true}));await writeFile(path.join(cache,'body-editor.txt'),await page.locator('body').ariaSnapshot());await body.fill('BXR local TW test only.');
 const coverGroup=await reveal(page.getByRole('group',{name:/封面.*Field/}));
 await coverGroup.getByRole('checkbox').check();
 await coverGroup.getByRole('button',{name:'Expand',exact:true}).click();
 await (await reveal(coverGroup.locator('input[type=file]'))).setInputFiles({name:'bxr-news-upload.webp',mimeType:'image/webp',buffer:image});
 await (await reveal(coverGroup.getByRole('textbox',{name:'替代文字 / Alternative Text',exact:true}))).fill('BXR isolated existing logo upload test');
 await page.getByRole('button',{name:'Save',exact:true}).click();
 await page.getByRole('row').filter({hasText:raw.title}).first().waitFor();
 clone=await readClone();const schemas=loadSchemas();
 for(const lang of ['tw','en','jp']){
  const file=`src/content/news/${contentLocale(lang)}/${id}.md`,source=textOf(clone,file);
  assert.ok(source,`${lang} file missing`);assert.ok(schemas.news.safeParse(parse(source.split(/^---\s*$/m)[1])).success,`${lang} schema invalid after actual CMS save`);
  if(lang==='tw'){
   assert.ok(source.includes('BXR local TW test only.'));
   const raw=parse(source.split(/^---\s*$/m)[1]);
   const before=parse(originals[file].split(/^---\s*$/m)[1]);
   for(const key of ['tags','relatedProducts','relatedSolutions','relatedNews','relatedInsights','relatedCaseStudies'])assert.deepEqual(raw[key]??[],before[key]??[],`${key} changed by an unrelated save`);
   assert.ok(raw.cover.src.startsWith('../../../assets/images/news/'));
   const assetPath=path.posix.normalize(path.posix.join('src/content/news/zh-Hant',raw.cover.src));
   assert.deepEqual(Buffer.from(clone[assetPath]),image);
  }else{
   const original=originals[file];
   // Native multi-locale saves can normalize YAML quoting/order and explicit schema defaults.
   // The localized values and the complete untouched Markdown body must remain identical.
   assert.deepEqual(schemas.news.parse(parse(source.split(/^---\s*$/m)[1])),schemas.news.parse(parse(original.split(/^---\s*$/m)[1])),`${lang} localized data changed without editing`);
   assert.equal(source.split(/^---\s*$/m).slice(2).join('---'),original.split(/^---\s*$/m).slice(2).join('---'),`${lang} Markdown body changed without editing`);
  }
 }
 const productSlug='fire-extinguisher-simulator',productName=parse(originals[`src/content/products/zh-Hant/${productSlug}.md`].split(/^---\s*$/m)[1]).hero.name;
 // Create ONE entry, retain unsaved buffers while switching languages, and save all three together.
 await page.getByRole('treeitem',{name:'最新消息 / News',exact:true}).click();
 await page.getByRole('button',{name:'Create New Entry'}).first().click();
 const draftTitles={tw:'bxr-cms-draft-qa',en:'BXR English draft',jp:'BXR 日本語 draft'};
 for(const lang of ['tw','en','jp']){
  await page.locator(`[role=radio][value="${contentLocale(lang)}"]`).first().click();
  await page.getByRole('textbox',{name:'標題 / Title',exact:true}).fill(draftTitles[lang]);
  await page.getByRole('textbox',{name:'摘要 / Summary',exact:true}).fill(`Isolated ${lang} draft, never published.`);
  if(lang==='tw'){
   await (await reveal(page.getByRole('group',{name:/分類.*Field/}).getByRole('combobox'))).click();
   await page.getByRole('option',{name:'公司消息 / Company News',exact:true}).click();
   const picker=await reveal(page.getByRole('group',{name:/關聯產品 \/ Related Products.*Field/}).getByRole('combobox'));
   await picker.click();await page.getByRole('option',{name:productName}).first().click();
  }
 }
 await page.locator('[role=radio][value="zh-Hant"]').first().click();
 assert.equal(await page.getByRole('textbox',{name:'標題 / Title',exact:true}).inputValue(),draftTitles.tw,'Switching languages must retain the unsaved source');
 const localeSnapshot=await page.locator('body').ariaSnapshot();
 assert.ok(localeSnapshot.includes('Japanese'));assert.ok(!localeSnapshot.includes('Akan'));
 await page.getByRole('button',{name:'Save',exact:true}).click();
 await page.getByRole('row',{name:/bxr-cms-draft-qa/}).waitFor();
 for(const lang of ['tw','en','jp']){
  const source=textOf(await readClone(),`src/content/news/${contentLocale(lang)}/bxr-cms-draft-qa.md`),raw=parse(source.split(/^---\s*$/m)[1]);
  assert.ok(schemas.news.safeParse(raw).success);assert.equal(raw.title,draftTitles[lang]);
  assert.equal(raw.draft,true);assert.equal(raw.publishDate,undefined);assert.equal(raw.category,'company');
  assert.equal(raw.translationStatus,lang==='tw'?'source':'pending');
  assert.deepEqual(raw.relatedProducts,[productSlug]);
 }
 await page.getByRole('treeitem',{name:'新聞共用圖集與影片（進階） / News Media Registry (Advanced)',exact:true}).click();
 await page.getByRole('row').filter({hasText:'新聞媒體資料'}).first().click();
 const mediaInput=await reveal(page.getByRole('textbox',{name:'媒體對應表 / Media Map',exact:true}));
 const mediaMap=JSON.parse(await mediaInput.inputValue());
 assert.deepEqual(mediaMap,JSON.parse(originals['src/data/news-media.json']));
 await mediaInput.fill('{ invalid');assert.equal(await mediaInput.getAttribute('aria-invalid'),'true');
 await page.getByRole('alert').filter({hasText:'請輸入有效的 JSON / Enter valid JSON'}).waitFor();
 mediaMap['bxr-cms-draft-qa']={gallery:[],videos:[],sourceLinks:[]};
 await mediaInput.fill(JSON.stringify(mediaMap,null,2));
 await page.getByRole('button',{name:'Save',exact:true}).click();
 await page.getByRole('row').filter({hasText:'新聞媒體資料'}).first().waitFor();
 clone=await readClone();assert.deepEqual(JSON.parse(textOf(clone,'src/data/news-media.json')),mediaMap);
 if(originals['src/data/typography.json']) {
  await page.getByRole('treeitem',{name:'多語文字換行 / Text Wrapping',exact:true}).click();
  await page.getByRole('row').filter({hasText:'關鍵詞與標題分組'}).first().click();
  await page.getByRole('group',{name:'Content Editor'}).waitFor();
  await page.getByRole('textbox',{name:'完整詞組 / Protected Term',exact:true}).first().waitFor();
  const textboxes=await page.getByRole('textbox').all();let updated=false;
  for(const input of textboxes) { if(await input.inputValue()==='全球動力科技'){await input.fill('全球動力科技 QA');updated=true;break;} }
  if(!updated)throw new Error('Typography term editor not found: '+JSON.stringify(await page.getByRole('textbox').evaluateAll(es=>es.map(e=>({label:e.getAttribute('aria-label'),value:e.value})))));
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByRole('row').filter({hasText:'關鍵詞與標題分組'}).first().waitFor();
  const saved=JSON.parse(textOf(await readClone(),'src/data/typography.json'));
  const before=JSON.parse(originals['src/data/typography.json']);before.tw.terms[0]='全球動力科技 QA';
  for(const lang of ['tw','en','jp']) { assert.deepEqual(saved[lang].terms,before[lang].terms);assert.deepEqual(saved[lang].headings??[],before[lang].headings??[]); }
 }
 // Technology full-text and overview edits use the actual JSON fields, in the disposable clone.
 for(const [collection,slug,fieldName,value] of [
  ['technologies','xr','導讀 / Lead','BXR isolated technology lead'],
  ['technology-overview','overview','導讀 / Lead','BXR isolated overview lead'],
 ]){
  const label=collection==='technologies'?'核心技術全文 / Core Technology Pages':'核心技術總覽 / Technology Overview';
  const file=`src/content/${collection}/zh-Hant/${slug}.json`,before=JSON.parse(originals[file]);
  await page.getByRole('treeitem',{name:label,exact:true}).click();
  await page.getByRole('row').filter({hasText:before.title}).first().click();
  await (await reveal(page.getByRole('textbox',{name:fieldName,exact:true}))).fill(value);
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByRole('row').filter({hasText:before.title}).first().waitFor();
  const saved=JSON.parse(textOf(await readClone(),file));
  assert.deepEqual(schemas[collection].parse(saved),schemas[collection].parse({...before,lead:value}));
  for(const lang of ['en','jp']){const file=`src/content/${collection}/${contentLocale(lang)}/${slug}.json`;assert.deepEqual(schemas[collection].parse(JSON.parse(textOf(await readClone(),file))),schemas[collection].parse(JSON.parse(originals[file])),`${lang} technology content changed without editing`);}
 }
 await page.screenshot({path:path.join(cache,'news-desktop.png')});
 // Deletion is confined to the newly created, non-public isolated test entry.
 await page.getByRole('treeitem',{name:'隔離測試文章（不會顯示於官網） / Isolated Test (Never Published)',exact:true}).click();
 await page.getByRole('row').filter({hasText:'bxr-cms-browser-qa'}).first().click();
 await page.getByRole('button',{name:'Show Editor Options'}).click();
 await page.getByRole('menuitem',{name:/Delete/}).first().click();
 const deletion=page.getByRole('alertdialog',{name:'Delete Entry'});
 await deletion.getByRole('button',{name:/Delete/}).click();
 await page.getByRole('row').filter({hasText:'bxr-cms-browser-qa'}).waitFor({state:'hidden'});
 await page.waitForFunction(async()=>{
  const root=await(await navigator.storage.getDirectory()).getDirectoryHandle('bxr-isolated-cms-qa');
  const folder=await root.getDirectoryHandle('cms-test-content');
  try{await folder.getFileHandle('bxr-cms-browser-qa.md');return false;}catch(error){if(error.name==='NotFoundError')return true;throw error;}
 });
 assert.deepEqual(errors,[]);
 // Sign out before checking the phone viewport; never reload a remembered OPFS handle.
 await page.getByRole('button',{name:'Show Account Menu'}).click();await page.getByRole('menuitem',{name:'Sign Out',exact:true}).click();
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Sign In Using Access Token'}).waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:path.join(cache,'login-mobile.png')});
 console.log('PASS: real pinned CMS config loads at /admin/ and Pages subpath; token form; local-clone create/edit/image-byte upload; existing article save with relations preserved, searchable product relation storing a bare slug, plus ONE native trilingual entry saved once to three siblings with retained unsaved buffers and correct language names, correct optional fields, unchanged translations and lossless media JSON save; typography JSON edit with unchanged language lists; inline image create/edit/remove; external-to-local video editing and exact upload bytes; technology JSON/overview edits with unchanged translations; isolated deletion; mobile login. Live GitHub auth/write not tested.');
}catch(error){
 // Keep the screen of a failed run for diagnosis (uploaded with the CI log artifacts when present).
 for(const p of browser.contexts().flatMap(c=>c.pages())){await p.screenshot({path:path.join(cache,'failure.png'),fullPage:true}).catch(()=>{});await writeFile(path.join(cache,'failure.txt'),await p.locator('body').ariaSnapshot()).catch(()=>{});}
 throw error;
}finally{await browser.close();server.close();}
