import type {ImageMetadata} from 'astro';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import type {Lang} from '../i18n';
import records from '../data/news-media.json';
import {externalVideo} from './news-video.ts';
export type LocalizedMediaText=Record<Lang,string>;
export interface NewsPhoto {filename:string;approved:boolean;alt?:LocalizedMediaText;caption?:Partial<LocalizedMediaText>}
export interface NewsVideo {type:'youtube'|'facebook'|'local';url:string;embedApproved?:boolean;approved?:boolean;title?:Partial<LocalizedMediaText>;poster?:string}
export interface ResolvedNewsVideo extends NewsVideo {embed?:string}
export interface NewsMediaRecord {cover?:NewsPhoto;gallery?:NewsPhoto[];videos?:NewsVideo[];sourceLinks?:string[];publicationDate?:string|null}
const images=import.meta.glob<{default:ImageMetadata}>('../assets/images/news/*.{jpg,jpeg,png}',{eager:true});
function imageAsset(filename:string){return /^[a-z0-9-]+\.(jpg|jpeg|png)$/.test(filename)?images['../assets/images/news/'+filename]?.default:undefined;}
function photo(entry:NewsPhoto|undefined,lang:Lang){
  if(!entry?.approved||!(['tw','en','jp'] as const).every(l=>entry.alt?.[l]?.trim()))return undefined;
  const src=imageAsset(entry.filename);
  return src?{src,alt:entry.alt![lang],caption:entry.caption?.[lang]}:undefined;
}
export function newsMedia(id:string|undefined,lang:Lang){
  // CMS-edited JSON: type by the declared record shape, not by the inferred type of the current data.
  const record=id?(records as unknown as Record<string,NewsMediaRecord>)[id]:undefined;
  const videos=(record?.videos??[]).flatMap<ResolvedNewsVideo>(video=>{
    if(video.type==='local'){
      if(!video.approved||!/^\/media\/news\/[a-z0-9-]+\.(mp4|webm)$/.test(video.url)||!existsSync(resolve('public',video.url.slice(1))))return [];
      return [{...video,embed:undefined,poster:video.poster?imageAsset(video.poster)?.src:undefined}];
    }
    const external=externalVideo(video.type,video.url,!!video.embedApproved);
    return external?[{...video,...external,poster:undefined}]:[];
  });
  return {cover:photo(record?.cover,lang),gallery:(record?.gallery??[]).flatMap(entry=>{const image=photo(entry,lang);return image?[image]:[];}),videos,sourceLinks:(record?.sourceLinks??[]).filter(url=>/^https:\/\//.test(url))};
}
