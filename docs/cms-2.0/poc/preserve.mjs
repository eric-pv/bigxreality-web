// Source-preserving prototype, not a production editor or Markdown migration.
import {parseDocument,isScalar} from 'yaml';
export function splitSource(source){
 const open=source.match(/^\uFEFF?---\r?\n/);if(!open)throw Error('Missing YAML frontmatter');
 const pattern=/^---(?:\r?\n|$)/gm;pattern.lastIndex=open[0].length;const close=pattern.exec(source);if(!close)throw Error('Unclosed frontmatter');
 return {yamlStart:open[0].length,yaml:source.slice(open[0].length,close.index),bodyStart:close.index+close[0].length,body:source.slice(close.index+close[0].length)};
}
export function noOpSave(source){splitSource(source);return source;}
export function patchScalar(source,keys,value){
 const part=splitSource(source),doc=parseDocument(part.yaml,{keepSourceTokens:true});if(doc.errors.length)throw Error('Invalid YAML');
 const node=doc.getIn(keys,true);if(!isScalar(node)||typeof node.value!=='string'||!node.range)throw Error('Raw mode required for this field');
 const start=part.yamlStart+node.range[0],end=part.yamlStart+node.range[1],next=source.slice(0,start)+JSON.stringify(value)+source.slice(end);
 const parsed=parseDocument(splitSource(next).yaml);if(parsed.getIn(keys)!==value)throw Error('Unsafe replacement');return next;
}
export function appendRawParagraph(source,text){
 const part=splitSource(source),eol=source.includes('\r\n')?'\r\n':'\n';
 // Never parse/serialize untouched paragraphs, HTML, tables, image directives or unknown extensions.
 return source+(part.body.endsWith(eol)?eol:eol+eol)+text+eol;
}
