export type HeroVariant = 'split' | 'scene' | 'equipment' | 'interface';
/** All supplied product/solution Hero images share one scene treatment; with PageHero's uniformMedia every
 *  product and solution landing shows the same 16:9 image box at the same place (no per-product layouts). */
export function heroPresentation(_collection: 'products' | 'solutions', _slug: string, hasImage: boolean): HeroVariant {
 return hasImage ? 'scene' : 'split';
}
/** Complete scenes retain heads, shoulders and equipment; background extension blends the edges. */
export function heroSceneFit(_collection: 'products'|'solutions', _slug:string): 'contain' { return 'contain'; }
export function heroScenePosition(collection:'products'|'solutions',slug:string):string {
 if(collection==='products'&&slug==='sniper-simulator')return '100% 80%';
 if(collection==='solutions'&&slug==='police')return '100% 40%';
 return '100% 50%';
}
export function heroSceneHeadroom(_collection:'products'|'solutions',_slug:string):number { return 16; }
