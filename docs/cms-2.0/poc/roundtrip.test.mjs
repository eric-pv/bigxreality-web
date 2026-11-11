import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {execFileSync,spawnSync} from 'node:child_process';import {noOpSave,patchScalar,appendRawParagraph,splitSource} from './preserve.mjs';
const root=path.resolve(import.meta.dirname,'../../..');
const files=execFileSync('git',['ls-files','src/content/**/*.md'],{cwd:root,encoding:'utf8'}).trim().split('\n');
test('all pinned real Markdown files preserve every byte on no-op and preserve original prefix on isolated raw edits',()=>{for(const file of files){const source=fs.readFileSync(path.join(root,file),'utf8');assert.equal(noOpSave(source),source,file);assert.ok(appendRawParagraph(source,'Isolated Phase 0 edit.').startsWith(source),file);}});
test('scalar edit preserves unknown fields, comments, CRLF/BOM and opaque media body',()=>{const source='\uFEFF---\r\n# Comment\r\ntitle: \'Old\' # keep\r\npublishDate: "2026-01-02"\r\nunknown: {code: 1}\r\n---\r\n<video controls src="/media/news/old.mp4"></video>\r\n';const next=patchScalar(source,['title'],'New');assert.ok(next.includes('# keep'));assert.ok(next.includes('unknown: {code: 1}'));assert.ok(next.startsWith('\uFEFF'));assert.equal(splitSource(next).body,splitSource(source).body);assert.throws(()=>patchScalar(source,['unknown'],'loss'));
});
test('synthetic Git CAS: one commit exposes three language changes together, stale heads and pre-publish failures never overwrite',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bxr-cms2-cas-'));const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8',stdio:['pipe','pipe','pipe']}).trim();
 git('init','-q');git('config','user.name','BXR Phase0');git('config','user.email','phase0@example.invalid');
 for(const lang of ['tw','en','jp']){fs.mkdirSync(path.join(dir,'test',lang),{recursive:true});fs.writeFileSync(path.join(dir,'test',lang,'synthetic.md'),'original '+lang);}
 git('add','.');git('commit','-qm','baseline');const base=git('rev-parse','HEAD');git('update-ref','refs/heads/cms/phase0',base);
 for(const lang of ['tw','en','jp'])fs.writeFileSync(path.join(dir,'test',lang,'synthetic.md'),'edited '+lang);
 git('add','.');const tree=git('write-tree');const prepared=git('commit-tree',tree,'-p',base,'-m','BXR-Save-ID:synthetic-three-languages');
 // Prepared immutable objects are not visible as the review branch until the CAS succeeds.
 assert.equal(git('rev-parse','refs/heads/cms/phase0'),base);
 git('update-ref','refs/heads/cms/phase0',prepared,base);for(const lang of ['tw','en','jp'])assert.equal(git('show',`refs/heads/cms/phase0:test/${lang}/synthetic.md`),'edited '+lang);
 const stale=git('commit-tree',tree,'-p',base,'-m','stale concurrent author');const r=spawnSync('git',['update-ref','refs/heads/cms/phase0',stale,base],{cwd:dir});assert.notEqual(r.status,0);assert.equal(git('rev-parse','refs/heads/cms/phase0'),prepared);
 // Ambiguous network-response recovery is a design/API concern; local receipt can be identified by operation marker.
 assert.ok(git('log','-1','--format=%B','refs/heads/cms/phase0').includes('BXR-Save-ID:synthetic-three-languages'));
 fs.mkdirSync(path.join(root,'.qa/cms-2-research'),{recursive:true});fs.writeFileSync(path.join(root,'docs/cms-2.0/evidence/GIT-CAS.json'),JSON.stringify({scope:'Local synthetic Git semantics; NOT a real GitHub GraphQL/PR/network acceptance test',threeFileSingleCommit:true,unpublishedPreparedObjectDoesNotChangeBranch:true,staleHeadRejected:true,operationMarkerReadable:true,repository:dir,baseline:base,published:prepared},null,2)+'\n');
});
