import {primaryImage} from '../data/primary-images';
import type {Lang} from '../i18n';
/** Application-context assets; AI has no verified interface image and keeps a text-led Hero. */
export function technologyMedia(id:string,lang:Lang){
 const targets:Record<string,['products'|'solutions',string]>={overview:['products','police-box'],xr:['products','sut'],'digital-simulation':['solutions','smart-city'],'training-design':['solutions','police'],'system-integration':['products','police-box'],'decision-visualization':['products','wargaming-table'],'domain-expertise':['solutions','military']};
 const target=targets[id];return target?primaryImage(target[0],target[1],lang):undefined;
}
