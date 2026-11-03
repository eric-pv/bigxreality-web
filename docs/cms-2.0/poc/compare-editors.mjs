import {installDom} from './dom.mjs';import fs from 'node:fs';import path from 'node:path';import {marked} from 'marked';
const dom=installDom();const {BlockNoteEditor}=await import('@blocknote/core');const block=BlockNoteEditor.create({headless:true});
const {Editor,rootCtx,parserCtx,serializerCtx}=await import('@milkdown/kit/core');const {commonmark}=await import('@milkdown/kit/preset/commonmark');
const milk=await Editor.make().config(ctx=>ctx.set(rootCtx,document.querySelector('#editor'))).use(commonmark).create();
const source=JSON.parse(fs.readFileSync(new URL('../evidence/MARKDOWN-ROUNDTRIP.json',import.meta.url))),root=path.resolve(import.meta.dirname,'../../..');
const normalize=s=>s.replace(/>\s+</g,'><').trim(),cases=[];
const synthetic={double:'<div class="two"><img src="a.png" alt="A"><img src="b.png" alt="B"></div>\n',video:'<video controls><source src="/media/news/test.mp4" type="video/mp4"></video>\n',youtube:'<iframe src="https://www.youtube-nocookie.com/embed/abcdefghijk"></iframe>\n',table:'| A | B |\n| --- | --- |\n| 1 | 2 |\n',basic:'## Title\n\n**Bold** and a [link](https://example.invalid).\n\n- List\n',comment:'<!-- retain -->\nText\n'};
const {splitSource}=await import('./preserve.mjs');for(const row of source.rows.filter(r=>r.id.startsWith('src/')))cases.push({id:row.id,body:splitSource(fs.readFileSync(path.join(root,row.id),'utf8')).body});for(const[id,body]of Object.entries(synthetic))cases.push({id:'synthetic:'+id,body});
const rows=[];
try{for(const c of cases)for(const name of ['blocknote','milkdown']){
 let result='',error='';try{result=name==='blocknote'?await block.blocksToMarkdownLossy(await block.tryParseMarkdownToBlocks(c.body)):milk.action(ctx=>ctx.get(serializerCtx)(ctx.get(parserCtx)(c.body)));}catch(e){error=e.message;}
 rows.push({id:c.id,editor:name,bytesEqual:!error&&result===c.body,renderedHtmlEqual:!error&&normalize(marked.parse(result))===normalize(marked.parse(c.body)),error});
}fs.writeFileSync(new URL('../evidence/OTHER-EDITORS.json',import.meta.url),JSON.stringify({versions:{blocknote:'0.57.0',milkdown:'7.23.0'},scope:'Actual Markdown import/export, headless/jsdom; not a visual usability acceptance test.',rows},null,2)+'\n');console.log('PASS measured',rows.length,'editor/corpus cases');}finally{await milk.destroy();dom.window.close();}
