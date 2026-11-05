import {contentLocale} from "../src/lib/content-locale.ts";
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bodyImagePath,renderBodyMedia,escapeMediaHtml} from '../src/lib/body-media.ts';
import {encodeMedia,imageComponent,videoComponent} from '../public/admin/editor-components.js';
const entryFile='src/content/news/zh-Hant/example.md';
const options={entryFile,lang:'tw' as const,image:async(file:string,alt:string)=>`<img src="/generated.webp" alt="${escapeMediaHtml(alt)}" data-source="${file}">`,localVideoExists:(file:string)=>file==='public/media/news/example.mp4'};
test('inline media round trips and preserves paragraph order without rewriting unrelated Markdown',async()=>{
 const data={src:'../../../assets/images/news/example.jpg',alt:'測試 <圖片>',caption:'Caption "quotes"',approved:true};
 const block=encodeMedia('image',data);
 assert.deepEqual(imageComponent.fromBlock(block.match(imageComponent.pattern)),data);
 assert.equal(imageComponent.toBlock(data),block);
 const html=await renderBodyMedia(`<p>Before</p>\n${block}\n<p>After</p>`,options);
 assert.ok(html.indexOf('Before')<html.indexOf('<figure'));
 assert.ok(html.indexOf('</figure>')<html.indexOf('After'));
 assert.ok(html.includes('&lt;圖片&gt;'));assert.ok(html.includes('Caption &quot;quotes&quot;'));
 assert.equal(await renderBodyMedia('<p>No media &amp; no changes.</p>',options),'<p>No media &amp; no changes.</p>');
 assert.equal(bodyImagePath('/src/assets/images/content/example.webp',entryFile),'src/assets/images/content/example.webp');
});
test('inline images reject remote URLs, traversal, missing alt and invalid JSON; unapproved images never resolve',async()=>{
 for(const src of ['https://example.com/a.jpg','//example.com/a.jpg','../../../../etc/a.jpg','/etc/a.jpg','../../../assets/images/news/a.jpg%22','../../../assets/images/news/a.jpg?x'])assert.throws(()=>bodyImagePath(src,entryFile));
 await assert.rejects(renderBodyMedia(encodeMedia('image',{src:'../../../assets/images/news/a.jpg',approved:true}),options),/alt/);
 await assert.rejects(renderBodyMedia('<!-- bxr-image: {bad} -->',options),/invalid inline-media JSON/);
 assert.equal(await renderBodyMedia(encodeMedia('image',{src:'missing',approved:false}),{...options,image:async()=>{throw new Error('must not resolve unpublished assets');}}),'');
 const hostile=encodeMedia('image',{src:'../../../assets/images/news/a.jpg',alt:'</figure><script>alert(1)</script>',caption:'--><iframe>',approved:true});
 assert.ok(!hostile.includes('<script>'));
 const html=await renderBodyMedia(hostile,options);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<iframe>'));
});
test('video embeds require allowlisted providers and explicit approval, never autoplay or eager iframe loading',async()=>{
 const data={type:'youtube',url:'https://www.youtube.com/watch?v=abcdefghijk',title:'影片',approved:true,embedApproved:true};
 const encoded=videoComponent.toBlock(data);assert.deepEqual(videoComponent.fromBlock(encoded.match(videoComponent.pattern)),data);
 const html=await renderBodyMedia(encoded,options);assert.ok(html.includes('youtube-nocookie.com/embed/abcdefghijk?autoplay=0'));assert.ok(html.includes('data-bxr-video='));assert.ok(!html.includes('<iframe'));
 const link=await renderBodyMedia(encodeMedia('video',{...data,embedApproved:false}),options);assert.ok(link.includes('開啟影片連結'));assert.ok(!link.includes('data-bxr-video'));
 for(const url of ['javascript:alert(1)','https://evil.example/watch?v=abcdefghijk','https://youtube.com.evil.example/watch?v=abcdefghijk'])await assert.rejects(renderBodyMedia(encodeMedia('video',{...data,url}),options),/invalid inline video URL/);
 const local=await renderBodyMedia(encodeMedia('video',{type:'local',url:'/media/news/example.mp4',title:'Local',approved:true}),options);assert.ok(local.includes('<video controls playsinline preload="metadata"'));assert.ok(local.includes('video/mp4'));
 await assert.rejects(renderBodyMedia(encodeMedia('video',{type:'local',url:'/media/news/missing.mp4',title:'Missing',approved:true}),options),/missing/);
 assert.equal(await renderBodyMedia(encodeMedia('video',{...data,approved:false}),options),'');
});

test('a shared inline asset needs approved alternative text in all three translations before publication',async()=>{
 const {validateBodyMediaTranslations}=await import('../src/lib/body-media.ts');
 const entry=(lang:string,approved=true,alt=lang)=>({file:`src/content/news/${contentLocale(lang)}/example.md`,bodies:[encodeMedia('image',{src:'../../../assets/images/news/example.jpg',alt,approved})]});
 assert.deepEqual(validateBodyMediaTranslations({tw:entry('tw'),en:entry('en'),jp:entry('jp')}),[]);
 assert.match(validateBodyMediaTranslations({tw:entry('tw'),en:entry('en')}).join('\n'),/approved jp alt is missing/);
 assert.match(validateBodyMediaTranslations({tw:entry('tw'),en:entry('en'),jp:entry('jp',true,'')}).join('\n'),/approved jp alt is missing/);
 assert.deepEqual(validateBodyMediaTranslations({tw:entry('tw',false)}),[]);
});

test('media clipboard HTML carries escaped source data and rejects malformed pasted metadata',async()=>{
 const {mediaComponentHtml,mediaComponentFromHtml}=await import('../public/admin/editor-components.js');
 const data={src:'../../../assets/images/news/a.jpg',alt:'<script>"quoted"</script>',approved:true};
 const html=mediaComponentHtml('image',data);
 assert.ok(html.includes('data-bxr-media="image"'));assert.ok(!html.includes('<script>'));
 assert.deepEqual(mediaComponentFromHtml({getAttribute:()=>JSON.stringify(data)}),data);
 assert.equal(mediaComponentFromHtml({getAttribute:()=>'{bad'}),undefined);
 assert.equal(mediaComponentFromHtml({getAttribute:()=>'null'}),undefined);
});

test('Sveltia recognizes image and video components as paragraph blocks, not inline characters',()=>{
 assert.equal(imageComponent.pattern.multiline,true);
 assert.equal(videoComponent.pattern.multiline,true);
});
