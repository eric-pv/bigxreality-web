import fs from 'node:fs';import path from 'node:path';import {parse} from 'yaml';
const root=path.resolve(import.meta.dirname,'../../..'),out=path.resolve(import.meta.dirname,'../evidence');
const pairs=`alt|替代文字|Alternative Text
answer|回答|Answer
application|應用方式|Application
approach|方案做法|Approach
approval|公開核准|Publication Approval
approved|已核准公開|Approved for Publication
area|場地面積|Floor Area
articleId|文章識別碼|Article ID
attachments|附件|Attachments
audience|適用對象|Audience
author|作者|Author
background|背景|Background
blocks|內容區塊|Content Blocks
body|文章內文|Article Content
brochure|產品資料入口|Brochure Link
button|按鈕文字|Button Label
capabilities|核心能力|Capabilities
caption|圖說|Caption
cardHeadline|卡片主標|Card Headline
cardLabel|卡片連結文字|Card Link Label
cards|卡片|Cards
casesIntro|案例介紹|Case Introduction
category|分類|Category
challenge|主要需求與挑戰|Challenge
challenges|需求與挑戰|Challenges
client|客戶資訊|Client
closing|結尾內容|Closing Content
code|產品代號|Product Code
components|系統組成|Components
content|內容|Content
cover|封面|Cover
csrCategories|社會責任主題|CSR Topics
cta|行動呼籲|Call to Action
ctaLabel|行動按鈕文字|CTA Label
date|日期|Date
dateCandidate|待確認日期|Candidate Date
dateNote|日期說明|Date Note
dateReviewNote|日期查核備註|Date Review Note
dateSource|日期來源|Date Source
dateUnconfirmed|日期待確認|Date Unconfirmed
demo|展示洽詢入口|Demo Inquiry Link
deployment|導入條件|Deployment Requirements
description|描述|Description
disclosure|公開方式|Disclosure
domain|應用領域|Application Domain
domains|應用領域|Application Domains
draft|尚未公開|Unpublished Draft
en|英文|English
endDate|結束日期|End Date
englishName|英文名稱|English Name
event|活動資訊|Event
eyebrow|標題上方文字|Eyebrow
faq|常見問題|Frequently Asked Questions
featured|焦點文章|Featured Article
featuredInCSR|列為社會責任案例|Featured in CSR
featuredPriority|焦點排序|Featured Priority
flow|訓練流程|Training Flow
focus|內容重點|Focus
gallery|照片圖集|Photo Gallery
group|分組名稱|Group
groups|文字語意分組|Semantic Text Groups
headings|標題換行設定|Heading Wrapping
headline|主標|Headline
hero|頁首內容|Hero Content
heroDescription|頁首摘要|Hero Description
heroImage|頁首圖片|Hero Image
highlights|重點介紹|Highlights
howItWorks|運作方式|How It Works
icon|圖示|Icon
image|圖片|Image
imageCaption|圖片說明|Image Caption
imageId|圖片識別碼|Image ID
images|圖片|Images
importNote|匯入備註|Import Note
integratedOps|已確認系統整合|Confirmed Integrations
intro|介紹|Introduction
item|項目|Item
items|項目|Items
jp|日文|Japanese
kind|素材類型|Image Type
label|顯示名稱|Display Label
landing|完整頁面內容|Landing Page Content
lead|導讀|Lead
location|地點|Location
mediaId|共用媒體識別碼|Media ID
module|資訊模組|Information Module
name|名稱|Name
need|素材需求備註|Asset Requirement Note
note|備註|Note
notes|補充備註|Notes
ogImage|社群分享圖片|Social Sharing Image
order|排序|Order
outcomes|已確認成果|Confirmed Outcomes
parent|上層分類|Parent Category
personnel|操作人數|Personnel
pillars|方案重點|Solution Pillars
product|產品|Product
products|產品|Products
publishDate|發布日期|Publish Date
question|問題|Question
ratio|圖片比例|Image Ratio
related|相關內容|Related Content
relatedCaseStudies|相關案例研究|Related Case Studies
relatedInsights|相關技術文章|Related Insights
relatedNews|相關新聞|Related News
relatedProducts|關聯產品|Related Products
relatedSolutions|關聯解決方案|Related Solutions
results|已確認成果說明|Confirmed Results
scenarios|應用情境|Application Scenarios
seo|搜尋引擎設定|SEO Settings
setupTime|架設時間|Setup Time
solution|解決方案|Solution
source|來源|Source
sourceCategory|原始分類|Original Category
sourceNote|來源備註|Source Note
src|圖片檔案|Image File
startDate|開始日期|Start Date
status|素材顯示狀態|Asset Visibility
steps|步驟|Steps
subheadline|副標|Subheadline
substitute|替代素材|Fallback Asset
summary|摘要|Summary
tagline|價值副標|Value Statement
tags|文章標籤|Tags
technologyTags|核心技術標籤|Technology Tags
term|完整詞組|Protected Term
terms|完整詞組清單|Protected Terms
text|原始文字|Original Text
title|標題|Title
translationStatus|翻譯狀態|Translation Status
tw|繁體中文|Traditional Chinese
type|類型|Type
updatedAt|更新日期|Updated Date
url|連結網址|Link URL
value|數值或內容|Value
values|數值或內容清單|Values`;
const labels=Object.fromEntries(pairs.split('\n').map(s=>{const[k,tw,en]=s.split('|');return[k,{tw,en}];}));
function csv(file,rows){const keys=Object.keys(rows[0]);fs.writeFileSync(path.join(out,file),[keys,...rows.map(r=>keys.map(k=>r[k]))].map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n')+'\n');}
// Use the generator's actual output as the field source; never update the real generator/config.
const cfg=parse(fs.readFileSync(path.join(root,'public/admin/config.yml'),'utf8')),rows=[],options=[];
function fields(list,collection,trail=''){for(const f of list??[]){const d=labels[f.name];if(!d)throw Error('Unplanned field '+f.name);rows.push({collection,path:trail+f.name,existing:f.label??f.name,proposed:d.tw+' / '+d.en,control:f.widget??'',policy:['articleId','imageId','mediaId','code'].includes(f.name)?'Advanced/read-only for existing records; never rename automatically':f.widget==='bxr-value'?'Typed form needed; raw JSON remains advanced fallback':'Semantic review before implementation',hint:f.hint??'',validation:f.pattern?.[1]??''});for(const v of f.options??[])options.push({field:f.name,value:typeof v==='string'?v:JSON.stringify(v)});fields(f.fields,collection,trail+f.name+'.');if(f.field)fields([f.field],collection,trail+f.name+'[].');}}
for(const c of cfg.collections){fields(c.fields,c.name);for(const f of c.files??[])fields(f.fields,c.name+'.'+f.name);}
csv('FIELD-LABEL-PLAN.csv',rows);csv('OPTION-VALUES.csv',[...new Map(options.map(v=>[v.field+'|'+v.value,v])).values()]);
const source=path.join(root,'.qa/cms-2-research/sveltia/src/lib/locales');
function flatten(value,prefix='',out={}){for(const[k,v]of Object.entries(value)){if(typeof v==='object'&&v!==null)flatten(v,prefix?prefix+'.'+k:k,out);else if(typeof v==='string')out[prefix?prefix+'.'+k:k]=v;}return out;}
const en=flatten(parse(fs.readFileSync(path.join(source,'en-US.yaml'),'utf8'))),tw=flatten(parse(fs.readFileSync(path.join(source,'zh-TW.yaml'),'utf8')));
csv('APP-MESSAGES.csv',Object.keys(en).map(key=>({key,en:en[key],tw:tw[key]??'',proposed:tw[key]?tw[key]+' / '+en[key]:'待翻譯 / '+en[key],review:'Generated review inventory, not an approved shipped translation; preserve interpolation variables'})));
const custom=flatten({bootstrap:{missingCMS:'Sveltia CMS 載入失敗，請檢查網路或 CDN 連線。',json:'請輸入有效的 JSON'},valueTools:{union:'不符合允許的資料型別或欄位結構',enum:'值不在允許清單',required:'必填',unknown:'未定義的欄位',object:'必須為物件'}});csv('CUSTOM-MESSAGES.csv',Object.entries(custom).map(([key,text])=>({key,current:text,proposal:'Translate using semantic field labels; internal JSON path only in developer details',source:key.startsWith('bootstrap')?'public/admin/bootstrap.js':'public/admin/value-tools.js'})));
console.log('Field occurrences',rows.length,'UI message keys',Object.keys(en).length,'untranslated TW UI keys',Object.keys(en).filter(k=>!tw[k]).length);
// Every Chinese-bearing literal/template in BXR's custom controls, rather than a handpicked subset.
const ts=(await import('typescript')).default,customRows=[];
for(const file of ['public/admin/bootstrap.js','public/admin/value-tools.js','scripts/sveltia/generate.mjs']){
 const text=fs.readFileSync(path.join(root,file),'utf8'),ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
 const visit=node=>{if((ts.isStringLiteralLike(node)||ts.isTemplateExpression(node))&&/[\u3400-\u9fff]/.test(node.getText(ast)))customRows.push({source:file,line:ast.getLineAndCharacterOfPosition(node.getStart(ast)).line+1,text:node.getText(ast),review:'Inventory only; preserve placeholders and expose human field names instead of raw paths'});ts.forEachChild(node,visit);};visit(ast);
}
csv('CUSTOM-MESSAGES.csv',customRows);
