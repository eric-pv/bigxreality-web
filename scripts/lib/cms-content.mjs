import {contentLocale} from "../../src/lib/content-locale.ts";
// Current Git content is the editable authority; imported TXT remains the provenance archive.
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {parse} from 'yaml';
export function currentNews(slug,lang='tw') {
 const source=readFileSync(`src/content/news/${contentLocale(lang)}/${slug}.md`,'utf8'),parts=source.split(/^---\s*$/m);
 return {...parse(parts[1]),body:parts.slice(2).join('---').trim()};
}
export function publishedNews(lang='tw') {
 return readdirSync('src/content/news/zh-Hant').filter(f=>f.endsWith('.md')).map(f=>f.slice(0,-3)).filter(slug=>{
  const data=currentNews(slug);return !data.draft&&(!data.publishDate||new Date(data.publishDate)<=new Date())&&existsSync(`src/content/news/${contentLocale(lang)}/${slug}.md`);
 });
}
export function csrNews(lang='tw') {
 return publishedNews(lang).filter(slug=>{const data=currentNews(slug);return data.featuredInCSR===true&&Array.isArray(data.csrCategories)&&data.csrCategories.length>0;});
}
// The one focus article is outside the paginated 10-row list.
export const newsPageCount=count=>Math.max(1,Math.ceil(Math.max(0,count-1)/10));
// Any CMS-editable collection entry, read from Git exactly as Sveltia saves it (frontmatter only).
export function currentEntry(collection,slug,lang='tw') {
 const file=`src/content/${collection}/${contentLocale(lang)}/${slug}.md`;
 if(!existsSync(file))return undefined;
 return parse(readFileSync(file,'utf8').split(/^---\s*$/m)[1])??{};
}
// TW is the structural source: draft and publishDate decide what is public in every language.
export function publishedSlugs(collection,lang='tw') {
 return readdirSync(`src/content/${collection}/zh-Hant`).filter(f=>f.endsWith('.md')).map(f=>f.slice(0,-3)).filter(slug=>{
  const data=currentEntry(collection,slug);return !data.draft&&(!data.publishDate||new Date(data.publishDate)<=new Date())&&existsSync(`src/content/${collection}/${contentLocale(lang)}/${slug}.md`);
 });
}
