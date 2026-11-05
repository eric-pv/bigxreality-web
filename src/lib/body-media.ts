import path from 'node:path';
import {externalVideo} from './news-video.ts';
import {mediaPattern} from '../../public/admin/editor-components.js';
export const escapeMediaHtml=(value:unknown)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
/** Resolve only original image assets inside this checkout, never arbitrary filesystem or URLs. */
export function bodyImagePath(value:string,entryFile:string){
 if(!value||/[\x00-\x1f\\?#%]/.test(value)||/^(?:[a-z][\w+.-]*:|\/\/)/i.test(value))throw new Error('Inline image must use a local image asset');
 const resolved=value.startsWith('/src/')?value.slice(1):path.posix.normalize(path.posix.join(path.posix.dirname(entryFile),value));
 if(!resolved.startsWith('src/assets/images/')||!/^src\/assets\/images\/.+\.(?:jpe?g|png|webp|avif|svg)$/i.test(resolved))throw new Error('Inline image is outside src/assets/images');
 return resolved;
}
interface Options {
 entryFile:string;lang:'tw'|'en'|'jp';
 image:(file:string,alt:string)=>Promise<string>;
 localVideoExists:(file:string)=>boolean;
}
/** Expand only our explicit components. Every inserted attribute/text is escaped. No remote fetches. */
export async function renderBodyMedia(html:string,options:Options){
 const pattern=new RegExp(mediaPattern.source,'g');
 const matches=[...html.matchAll(pattern)];
 if(!matches.length)return html;
 const t={tw:{load:'載入播放器',open:'開啟影片連結'},en:{load:'Load player',open:'Open video link'},jp:{load:'プレーヤーを読み込む',open:'動画リンクを開く'}}[options.lang];
 let result='',offset=0;
 for(const match of matches){
  result+=html.slice(offset,match.index);offset=match.index!+match[0].length;
  let data:Record<string,unknown>;try{data=JSON.parse(match[2]);}catch{throw new Error(`${options.entryFile}: invalid inline-media JSON`);}
  if(!data||Array.isArray(data)||typeof data!=='object')throw new Error('Invalid inline-media object');
  if(data.approved!==true)continue;
  const text=(key:string,required=false)=>{const v=data[key];if((v!==undefined&&typeof v!=='string')||(required&&!(typeof v==='string'&&v.trim())))throw new Error(`${options.entryFile}: inline ${key} is required`);return typeof v==='string'?v:'';};
  const caption=text('caption');
  if(match[1]==='image'){
   const alt=text('alt',true),file=bodyImagePath(text('src',true),options.entryFile);
   result+=`<figure class="bxr-inline-media" data-bxr-inline-image>${await options.image(file,alt)}${caption?`<figcaption>${escapeMediaHtml(caption)}</figcaption>`:''}</figure>`;
  }else{
   const title=text('title',true),url=text('url',true);let player='';
   if(data.type==='local'){
    if(!/^\/media\/news\/[a-z0-9-]+\.(?:mp4|webm)$/.test(url)||!options.localVideoExists(`public${url}`))throw new Error(`${options.entryFile}: local inline video is missing or has an invalid path`);
    player=`<video controls playsinline preload="metadata" aria-label="${escapeMediaHtml(title)}"><source src="${escapeMediaHtml(url)}" type="video/${url.endsWith('.webm')?'webm':'mp4'}"><a href="${escapeMediaHtml(url)}">${t.open}</a></video>`;
   }else{
    if(data.type!=='youtube'&&data.type!=='facebook')throw new Error('Unsupported inline video provider');
    const video=externalVideo(data.type,url,data.embedApproved===true);
    if(!video)throw new Error(`${options.entryFile}: invalid inline video URL`);
    player=`${video.embed?`<div class="bxr-inline-player"><button type="button" data-bxr-video="${escapeMediaHtml(video.embed)}" data-video-title="${escapeMediaHtml(title)}">${t.load}</button></div>`:''}<a href="${escapeMediaHtml(video.url)}" target="_blank" rel="noopener noreferrer">${t.open} (${data.type==='youtube'?'YouTube':'Facebook'})</a>`;
   }
   result+=`<figure class="bxr-inline-media" data-bxr-inline-video><p class="t-h4">${escapeMediaHtml(title)}</p>${player}${caption?`<figcaption>${escapeMediaHtml(caption)}</figcaption>`:''}</figure>`;
  }
 }
 return result+html.slice(offset);
}

/** An inline asset is shared by all translations; each language supplies its own approved text. */
export function validateBodyMediaTranslations(entries:Partial<Record<'tw'|'en'|'jp',{file:string;bodies:string[]}>>){
 const media=new Map<string,Map<string,Record<string,unknown>[]>>();
 for(const [lang,entry]of Object.entries(entries))for(const body of entry.bodies)for(const match of body.matchAll(new RegExp(mediaPattern.source,'g'))){
  let data:Record<string,unknown>;try{data=JSON.parse(match[2]);}catch{throw new Error(`${entry.file}: invalid inline-media JSON`);}
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error(`${entry.file}: invalid inline-media object`);
  if(data.approved!==true)continue;
  const source=match[1]==='image'?bodyImagePath(String(data.src??''),entry.file):String(data.url??'');
  const key=`${match[1]}:${source}`;if(!media.has(key))media.set(key,new Map());
  const locales=media.get(key)!;locales.set(lang,[...(locales.get(lang)??[]),data]);
 }
 const errors:string[]=[];
 for(const [asset,locales]of media){
  if(![...locales.values()].flat().some(data=>data.approved===true))continue;
  const field=asset.startsWith('image:')?'alt':'title';
  for(const lang of ['tw','en','jp'])if(!locales.get(lang)?.some(data=>data.approved===true&&typeof data[field]==='string'&&String(data[field]).trim()))errors.push(`${asset}: approved ${lang} ${field} is missing`);
 }
 return errors;
}
