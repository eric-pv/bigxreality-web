import rawRules from '../data/typography.json' with { type: 'json' };
export type TypographyLang = 'tw'|'en'|'jp';
export interface HeadingGroup { text:string; groups:string[] }
export interface TypographyRule { terms:string[]; headings?:HeadingGroup[] }
// typography.json is edited in Sveltia. Its JSON-inferred type changes with the data (an empty optional
// `headings` list is omitted on save), so type it by the declared schema instead of by today's file.
const rules=rawRules as Partial<Record<TypographyLang,TypographyRule>>;
const chineseWords = new Intl.Segmenter('zh-Hant', { granularity: 'word' });
function proseParts(text: string, lang: string): Array<{text:string;keep:boolean}> {
 if (lang !== 'tw') return text ? [{text,keep:false}] : [];
 return [...chineseWords.segment(text)].map(({segment,isWordLike}) => ({text:segment,keep:!!isWordLike && /[\p{Script=Han}]{2}/u.test(segment)}));
}
export function typographyParts(text:string, lang:string, custom?:TypographyRule):Array<{text:string;keep:boolean;group?:boolean}> {
 const rule=custom??rules[lang as TypographyLang];
 if(!rule)return [{text,keep:false}];
 // Grouping is presentation only: concatenation must reproduce the original title exactly.
 const heading=(rule.headings??[]).find(h=>h?.text===text&&Array.isArray(h.groups)&&h.groups.length>1&&h.groups.every(g=>typeof g==='string'&&g.length>0)&&h.groups.join('')===text);
 if(heading)return heading.groups.map(text=>({text,keep:true,group:true}));
 const terms=[...new Set((rule.terms??[]).filter(t=>typeof t==='string'&&t.length>0))].sort((a,b)=>b.length-a.length);
 if(!terms.length)return proseParts(text,lang);
 const alternatives=terms.map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
 // Keep closing punctuation with its phrase, and opening punctuation with what follows.
 const pattern=new RegExp('[（「『【《〈〔〖〘〚(]*(?:'+alternatives+')[．，。、；：！？）」』】》〉〕〗〙〛・·,.!?;:%)]*','gu');
 const result:Array<{text:string;keep:boolean;group?:boolean}>=[];let start=0;
 for(const match of text.matchAll(pattern)){if(match.index>start)result.push(...proseParts(text.slice(start,match.index),lang));result.push({text:match[0],keep:true});start=match.index+match[0].length;}
 if(start<text.length)result.push(...proseParts(text.slice(start),lang));return result;
}
