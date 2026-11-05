// Structural relations are edited on the TW technology entry; notes are localized.
import {technologyContent} from './technologies-content.ts';
const ids=Object.keys(technologyContent) as (keyof typeof technologyContent)[];
export const technologyRelations=Object.fromEntries(ids.map(id=>{const d=technologyContent[id].tw;return [id,{products:d.relatedProducts,solutions:d.relatedSolutions,primaryDestination:d.primaryDestination}];})) as Record<keyof typeof technologyContent,{products:string[];solutions:string[];primaryDestination:string}>;
export const technologyRelationNotes=Object.fromEntries(ids.map(id=>[id,Object.fromEntries(['tw','en','jp'].map(lang=>[lang,technologyContent[id][lang as 'tw'|'en'|'jp'].relationNotes]))])) as Record<keyof typeof technologyContent,Record<'tw'|'en'|'jp',string[]>>;
