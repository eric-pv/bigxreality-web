import{test}from'node:test';import assert from'node:assert/strict';
import{typographyParts}from'../src/lib/typography.ts';import{typeset,typesetHtml,plain}from'../src/lib/text.ts';
test('semantic groups preserve every original character and prefer the longest term',()=>{
 const s='從瞄準操作到環境判讀，建立更完整的射擊訓練基礎';const parts=typographyParts(s,'tw');assert.equal(parts.map(p=>p.text).join(''),s);assert.ok(parts.some(p=>p.text.startsWith('環境判讀')&&p.keep));assert.ok(!parts.some(p=>p.text==='環境'));
});
test('explicit CMS groups are accepted only when they reproduce the entire heading',()=>{
 const text='XR training for teams',valid={terms:[],headings:[{text,groups:['XR training',' for teams']}]};assert.equal(typographyParts(text,'en',valid).filter(p=>p.keep).length,2);
 assert.deepEqual(typographyParts(text,'en',{terms:[],headings:[{text,groups:['Changed copy']}]}),[{text,keep:false}]);
});
test('typeset output escapes user text while plain SEO output remains unchanged',()=>{
 assert.equal(plain('環境判讀與 <script>'), '環境判讀與 <script>');assert.ok(typeset('環境判讀 <script>','tw').includes('&lt;script&gt;'));assert.ok(typeset('環境判讀','tw').includes('type-phrase'));
});
test('rich text retains tags, attributes, entities, comments and literal code',()=>{
 const html='<h2 title="環境判讀 > 觀察">環境判讀 &amp; XR</h2><!-- 環境判讀 --><pre><code>環境判讀 &lt;x&gt;</code></pre><p>模擬訓練</p>';
 const out=typesetHtml(html,'tw');assert.ok(out.includes('title="環境判讀 > 觀察"'));assert.ok(out.includes('<!-- 環境判讀 -->'));assert.ok(out.includes('<code>環境判讀 &lt;x&gt;</code>'));assert.equal((out.match(/class="type-phrase"/g)||[]).length,2);assert.ok(out.includes('&amp; XR'));
});
test('language dictionaries stay isolated and unknown locales leave grouping unchanged',()=>{
 assert.equal(typographyParts('環境判讀','en').some(p=>p.keep),false);assert.equal(typographyParts('情報統合','jp').some(p=>p.keep),true);assert.equal(typeset('Big x Reality','en'),'<span class="type-phrase">Big x Reality</span>');assert.equal(typeset('literal','fr'),'literal');
});

test('closing and opening CJK punctuation stay with the protected phrase',()=>{
 assert.deepEqual(typographyParts('（環境判讀），模擬訓練。','tw').map(p=>p.text),['（環境判讀），','模擬訓練。']);
});

test('brand separators remain with the preceding phrase',()=>{
 assert.ok(typographyParts('真實應變．守護未來','tw').some(p=>p.text==='真實應變．'));
});

test('compound terms are protected as a whole instead of splitting at a shorter term',()=>{
 const s='反制無人機訓練';const parts=typographyParts(s,'tw');assert.equal(parts.map(p=>p.text).join(''),s);
 assert.ok(parts.some(p=>p.keep&&p.text==='反制無人機'));assert.ok(!parts.some(p=>p.text==='無人機'));
 assert.ok(typeset('反制無人機','tw').includes('<span class="type-phrase">反制無人機</span>'));
});

test('exhibition name stays as two independent groups so it can wrap between them',()=>{
 assert.deepEqual(typographyParts('台北國際航太暨國防工業展','tw').filter(p=>p.keep).map(p=>p.text),['台北國際航太','國防工業展']);
});

test('ampersand terms match on raw text and are escaped exactly once',()=>{
 const out=typeset('Fire & Disaster','en');assert.equal(out,'<span class="type-phrase">Fire &amp; Disaster</span>');assert.ok(!out.includes('&amp;amp;'));
 assert.ok(!typesetHtml('<p>Fire &amp; Disaster</p>','en').includes('&amp;amp;'));
});
