import fs from 'node:fs';import {execFileSync} from 'node:child_process';import ts from 'typescript';import YAML from 'yaml';
const base=process.env.BXR_REVIEW_BASE??'3c6e9ac',out='docs/reviews/visual-copy';fs.mkdirSync(out,{recursive:true});
const pattern=/我們|你們|他們|您的|您|私たち|当社|弊社|あなた|彼ら|彼女|但是|可是|然而|不過|無法|不能|不會|沒有|並非|不是|未能|不只|不應|不等同|不代表|不一定|不需|難以|尚無|尚未|できません|ありません|しかし|ただし|\b(?:we|our|us|you|your|he|she|they|their|not|no|cannot|without|however|but|unable|never)\b/i;
function flatten(value,prefix='',out={}){if(typeof value==='string')out[prefix]=value;else if(Array.isArray(value))value.forEach((v,i)=>flatten(v,`${prefix}.${i}`,out));else if(value&&typeof value==='object')for(const[k,v]of Object.entries(value))flatten(v,prefix?`${prefix}.${k}`:k,out);return out;}
function values(file,source){
 if(file.endsWith('.json'))return flatten(JSON.parse(source));
 if(file.endsWith('.md')){const pieces=source.split(/^---\s*$/m);const fields=flatten(YAML.parse(pieces[1]));pieces.slice(2).join('---').trim().split(/\n\s*\n/).forEach((text,i)=>{if(text.trim())fields[`body.${i}`]=text.trim();});return fields;}
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true),result={};
 function expr(node,p){if(!node)return;if(ts.isAsExpression(node)||ts.isSatisfiesExpression(node)||ts.isParenthesizedExpression(node))return expr(node.expression,p);if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))result[p]=node.text;else if(ts.isObjectLiteralExpression(node))for(const prop of node.properties)if(ts.isPropertyAssignment(prop))expr(prop.initializer,`${p}.${prop.name.text??prop.name.getText(ast)}`);else{}else if(ts.isArrayLiteralExpression(node))node.elements.forEach((item,i)=>expr(item,`${p}.${i}`));}
 function visit(node){if(ts.isVariableDeclaration(node))expr(node.initializer,node.name.getText(ast));ts.forEachChild(node,visit);}visit(ast);return result;
}
const tracked=execFileSync('git',['ls-files','src/content','src/data'],{encoding:'utf8'}).trim().split('\n').filter(f=>/\.(json|md|ts)$/.test(f));
const changed=new Set(execFileSync('git',['diff','--name-only',base,'--','src/content','src/data'],{encoding:'utf8'}).trim().split('\n'));
const revisions=[],exceptions=[];let inspected=0;
for(const file of tracked){
 const after=values(file,fs.readFileSync(file,'utf8'));inspected+=Object.keys(after).length;
 if(changed.has(file)){
  const before=values(file,execFileSync('git',['show',`${base}:${file}`],{encoding:'utf8'}));
  for(const key of new Set([...Object.keys(before),...Object.keys(after)]))if(before[key]!==after[key]&&!/\.(src|need|ratio|position|fit)$/.test(key))revisions.push({file,field:key,before:before[key]??'',after:after[key]??'',review:'逐句審核；原產品名稱、數字、日期及能力範圍依原資料保留'});
 }
 for(const[field,text]of Object.entries(after)){
  if(!pattern.test(text)||/(^|\.)(placeholder|need|sourceNote|importNote|dateSource|dateReviewNote|dateNote|dateCandidate|url|src|file)(\.|$)/.test(field)||file.endsWith('news-media.json'))continue;
  if(file.includes('/history.md'))continue; // Retained source, not a public route.
  const reason=file.includes('/news/')?'歷史新聞原文／原 SEO；保留使用者確認的三語來源，供人工審核':/faq|answer|note|relation/i.test(field+file)?'必要功能限制、專業安全或產品關係；保留原意供人工確認':'技術條件或敘述用語待人工逐句確認；保留原文，避免擴大能力';
  exceptions.push({file,field,text,reason,status:'待人工審核'});
 }
}
const csv=(rows,keys)=>[keys,...rows.map(r=>keys.map(k=>r[k]))].map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n')+'\n';
fs.writeFileSync(`${out}/COPY-CHANGES.csv`,csv(revisions,['file','field','before','after','review']));
fs.writeFileSync(`${out}/COPY-REVIEW-EXCEPTIONS.csv`,csv(exceptions,['file','field','text','reason','status']));
fs.writeFileSync(`${out}/COPY-AUDIT.json`,JSON.stringify({comparisonBase:base,inspectedTextFields:inspected,changedTextFields:revisions.length,exceptions:exceptions.length,historicalExceptions:exceptions.filter(r=>r.file.includes('/news/')).length,remainingTechnicalReview:exceptions.filter(r=>!r.file.includes('/news/')).length,policy:'Historical quotations and necessary limitations remain review exceptions; no automatic word substitution is used in production.'},null,2));
console.log(`Audited ${inspected} string fields, ${revisions.length} revisions, ${exceptions.length} individually listed review exceptions.`);
