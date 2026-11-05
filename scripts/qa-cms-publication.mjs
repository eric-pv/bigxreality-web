import {contentLocale} from "../src/lib/content-locale.ts";
// Disposable Git checkout only. Never pushes, edits the working site's articles, or deploys.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp, mkdir, readFile, writeFile, symlink, access, readdir} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {stringify} from 'yaml';
import {publicSiteRoot} from '../src/lib/public-url.ts';

const root=path.resolve(import.meta.dirname,'..');
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim();
await mkdir(path.join(root,'.qa'),{recursive:true});
const dir=await mkdtemp(path.join(tmpdir(),'bxr-cms-publication-'));
git(root,'clone','--quiet','--no-hardlinks',root,dir);
await symlink(path.join(root,'node_modules'),path.join(dir,'node_modules'),'dir');
const id='bxr-cms-isolated-qa', marker='BXR CMS ISOLATED QA';
const before=git(root,'diff','HEAD','--','src/content','src/assets','public/media','public/video');
const env={...process.env,BXR_CONTENT_SOURCE:'markdown',BXR_PREVIEW:'0'};
delete env.GITHUB_SHA;delete env.GITHUB_ACTIONS;
const results=[];let technologyEdited=false;
async function present(file){try{await access(file);return true;}catch{return false;}}
async function stage(name,published){
  git(dir,'add','src/content/news','src/content/technologies');
  git(dir,'-c','user.name=BXR isolated QA','-c','user.email=qa@example.invalid','commit','-m',name);
  const log=execFileSync('npm',['run','build'],{cwd:dir,env,encoding:'utf8',maxBuffer:32*1024*1024});
  await writeFile(path.join(dir,`${name}.log`),log);
  const sitemap=await readFile(path.join(dir,'dist/sitemap.xml'),'utf8');
  for(const lang of ['tw','en','jp']){
    const file=path.join(dir,`dist/${lang}/news/${id}/index.html`);
    assert.equal(await present(file),published,`${name}: ${lang} route`);
    assert.equal(sitemap.includes(`/${lang}/news/${id}/`),published,`${name}: ${lang} sitemap`);
    if(published){
      const html=await readFile(file,'utf8');
      assert.ok(html.includes(`${marker} updated ${lang}`));
      assert.ok(html.includes('Isolated updated body.'));
      assert.ok(html.includes(`${publicSiteRoot}/${lang}/news/${id}/`));
    }
    assert.ok(await present(path.join(dir,`dist/${lang}/products/sut/index.html`)));
    assert.ok(await present(path.join(dir,`dist/${lang}/news/news-01-ds-2025/index.html`)));
    if(technologyEdited){
      const tech=await readFile(path.join(dir,`dist/${lang}/technologies/xr/index.html`),'utf8');
      const visible=tech.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
      assert.ok(visible.includes(`Isolated technology lead ${lang}`));
      assert.ok(visible.includes(`Isolated technology paragraph ${lang}`));
      assert.ok(visible.includes(`Isolated technology FAQ ${lang}`));
      assert.ok(tech.includes(`alt="Isolated technology hero ${lang}"`));
      assert.ok(tech.includes(`content="Isolated technology SEO ${lang}"`));
      const uav=await readFile(path.join(dir,`dist/${lang}/products/uav/index.html`),'utf8');
      assert.ok(uav.match(/<section[^>]*data-related-technologies[\s\S]*?<\/section>/)?.[0].includes(`/${lang}/technologies/xr/`),'Technology relation edits must update product reverse links');
    }

  }
  results.push({stage:name,pass:true,commit:git(dir,'rev-parse','HEAD')});
  await writeFile(path.join(dir,'RESULTS.json'),JSON.stringify(results,null,2));
  console.log(`PASS ${name}: routes, sitemap, three languages and existing articles`);
}
try{
  for(const lang of ['tw','en','jp']){
    const data={translationStatus:lang==='tw'?'source':'translated',draft:true,articleId:id,title:`${marker} ${lang}`,summary:'Isolated publication verification.',category:'company',seo:{title:`${marker} ${lang}`,description:'Isolated publication verification.'}};
    await writeFile(path.join(dir,`src/content/news/${contentLocale(lang)}/${id}.md`),`---\n${stringify(data)}---\n\nIsolated initial body.\n`);
  }
  await stage('draft-created',false);
  for(const lang of ['tw','en','jp']){
    const file=path.join(dir,`src/content/news/${contentLocale(lang)}/${id}.md`);
    const text=await readFile(file,'utf8');
    await writeFile(file,text.replace('draft: true','draft: false').replaceAll(`${marker} ${lang}`,`${marker} updated ${lang}`).replace('Isolated initial body.','Isolated updated body.'));
  }
  const heroFile=(await readdir(path.join(dir,'src/assets/images/clients'))).find(file=>file.endsWith('.webp'));
  for(const lang of ['tw','en','jp']){
    const file=path.join(dir,`src/content/technologies/${contentLocale(lang)}/xr.json`),data=JSON.parse(await readFile(file,'utf8'));
    data.lead=`Isolated technology lead ${lang}`;
    data.sections[0].paragraphs.push(`Isolated technology paragraph ${lang}`);
    data.faq[0].answer=`Isolated technology FAQ ${lang}`;
    data.seo.description=`Isolated technology SEO ${lang}`;
    data.heroImage={src:`../../../assets/images/clients/${heroFile}`,alt:`Isolated technology hero ${lang}`};
    if(lang==='tw')data.relatedProducts.push('uav');
    await writeFile(file,JSON.stringify(data,null,2)+'\n');
  }
  technologyEdited=true;
  await stage('edited-and-published',true);
  const tw=path.join(dir,`src/content/news/zh-Hant/${id}.md`);
  await writeFile(tw,(await readFile(tw,'utf8')).replace('draft: false','draft: true'));
  await stage('unpublished',false);
  git(dir,'rm',...['tw','en','jp'].map(lang=>`src/content/news/${contentLocale(lang)}/${id}.md`));
  await stage('deleted',false);
  assert.equal(git(root,'diff','HEAD','--','src/content','src/assets','public/media','public/video'),before);
  console.log(`PASS local Git → Astro publication lifecycle. Results: ${dir}/RESULTS.json. Live authorization, GitHub review, Actions and online Pages are NOT tested.`);
}finally{
  // Preserve the detached checkout and logs for review; no remote branch or official file was changed.
  console.log(`Isolated checkout retained: ${dir}`);
}
