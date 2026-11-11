/** Stable priority selection; the input already has the publication order. */
export function selectFeaturedNews<T extends { base: { data: object } }>(items: readonly T[]): T | undefined {
 return items.filter(item => 'featured' in item.base.data && item.base.data.featured === true).sort((a,b) => Number('featuredPriority' in b.base.data ? b.base.data.featuredPriority : 0) - Number('featuredPriority' in a.base.data ? a.base.data.featuredPriority : 0))[0] ?? items[0];
}
