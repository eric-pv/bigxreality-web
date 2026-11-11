/** Backwards-compatible cover API. All cover/gallery/video data now lives in one registry. */
import type {Lang} from '../i18n';
import {newsMedia} from './news-media';
export function newsCover(id:string|undefined,lang:Lang){return newsMedia(id,lang).cover;}
