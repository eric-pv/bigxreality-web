import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {MarkdownManager} from '@tiptap/markdown';import StarterKit from '@tiptap/starter-kit';import Image from '@tiptap/extension-image';import {marked} from 'marked';import {splitSource,noOpSave,patchScalar,appendRawParagraph} from './preserve.mjs';
const root=path.resolve(import.meta.dirname,'../../..'),out=path.resolve(import.meta.dirname,'../evidence');
const manager=new MarkdownManager({extensions:[StarterKit,Image]});
const corpus=execFileSync('git',['ls-files','src/content/**/*.md'],{cwd:root,encoding:'utf8'}).trim().split('\n').map(file=>({id:file,source:fs.readFileSync(path.join(root,file),'utf8')}));
const stress=[
 ['basic','## 標題\n\n文字 **粗體** 和 [連結](https://example.invalid)。\n\n- 項目 A\n- 項目 B\n'],
 ['quote','> 正式引言\n> 第二行\n'],
 ['single-image','![設備替代文字](../../../assets/images/products/example.png "圖說")\n'],
 ['double-images','<div class="two-column"><figure><img src="a.png" alt="A"><figcaption>甲</figcaption></figure><figure><img src="b.png" alt="B"></figure></div>\n'],
 ['gallery-directive',':::gallery\n- existing-photo.jpg\n- second-photo.png\n:::\n'],
 ['youtube','<iframe src="https://www.youtube-nocookie.com/embed/abcdefghijk" title="Video" allowfullscreen></iframe>\n'],
 ['local-video','<video controls poster="cover.jpg"><source src="/media/news/test.mp4" type="video/mp4"><track kind="captions" src="captions.vtt"></video>\n'],
 ['divider','前段\n\n---\n\n後段\n'],
 ['cta','<a class="btn btn--primary" href="/tw/contact/?topic=product&amp;item=SUT">洽詢 SUT</a>\n'],
 ['unknown-html','<!-- preserve editor note -->\n<custom-training data-mode="real">文字</custom-training>\n'],
 ['gfm-table','| 項目 | 數值 |\n| --- | --- |\n| 距離 | 100 |\n'],
 ['raw-security','<script>window.untrusted = true</script>\n'],
].map(([id,body])=>({id:'synthetic:'+id,source:'---\ntitle: "合成測試"\n---\n'+body}));
const norm=s=>s.replace(/>\s+</g,'><').trim();let semanticDifferences=0,byteDifferences=0,guardPass=0;const rows=[];
for(const item of [...corpus,...stress]){
 const body=splitSource(item.source).body;let serialized='',error='';try{serialized=manager.serialize(manager.parse(body));}catch(e){error=e.message;}
 const bytes=body===serialized,semantic=!error&&norm(marked.parse(body))===norm(marked.parse(serialized));if(!bytes)byteDifferences++;if(!semantic)semanticDifferences++;
 const noOp=noOpSave(item.source)===item.source,edited=appendRawParagraph(item.source,'Phase 0 isolated edit.');if(noOp&&edited.startsWith(item.source))guardPass++;
 rows.push({id:item.id,bodyBytes:Buffer.byteLength(body),tiptapBytesEqual:bytes,tiptapRenderedHtmlEqual:semantic,error,sourceGuardNoOpEqual:noOp,sourceGuardEditRetainsOriginalPrefix:edited.startsWith(item.source),decision:!bytes?'Keep original raw source; visual import is not automatically safe':'Candidate subset only; explicit edit verification still required'});
}
const tricky='\uFEFF---\r\n# Keep comment\r\ntitle: \'Original\' # retain trailing note\r\npublishDate: "2026-01-02"\r\nunknown: { nested: [1, "2"] }\r\n---\r\n<video src="/media/news/test.mp4" controls></video>\r\n';
const patched=patchScalar(tricky,['title'],'Changed');if(!patched.includes('# retain trailing note')||!patched.endsWith(splitSource(tricky).body)||!patched.includes('unknown: { nested: [1, "2"] }'))throw Error('CST patch failed');
fs.writeFileSync(path.join(out,'MARKDOWN-ROUNDTRIP.json'),JSON.stringify({scope:'Read-only corpus plus synthetic fixtures. Tiptap MarkdownManager, not a completed visual editor.',versions:{tiptap:'3.32.2',marked:'17.0.6'},repositoryFiles:corpus.length,syntheticFixtures:stress.length,byteDifferences,semanticDifferences,guardPass,scalarPatchPreservedBomCrlfCommentsUnknownFields:true,rows},null,2)+'\n');
console.log(JSON.stringify({repositoryFiles:corpus.length,syntheticFixtures:stress.length,byteDifferences,semanticDifferences,guardPass},null,2));
