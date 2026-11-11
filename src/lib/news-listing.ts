import { selectFeaturedNews } from './news-featured';
import { getArticles, paginate, pageSize, type Article } from './articles';
import { localePath, type Lang } from '../i18n';
export type NewsFilter = { category?: string; year?: string };
export const newsCategory = (article: Article) => 'category' in article.base.data ? article.base.data.category : 'company';
export const newsYear = (article: Article) => article.base.data.publishDate?.getUTCFullYear().toString() ?? 'undated';
export function selectNews(items: Article[], filter: NewsFilter) {
  return items.filter(article => (!filter.category || newsCategory(article) === filter.category) && (!filter.year || newsYear(article) === filter.year));
}
/** Marked articles win; larger priority wins, then the existing newest-first order. */
export function newsArchive(items: Article[], page = 1) {
  const featured = selectFeaturedNews(items);
  const pages = paginate(items.filter(a => a.slug !== featured?.slug), pageSize("news") ?? 10);
  return { featured: page === 1 ? featured : undefined, items: pages[page - 1] ?? [], total: pages.length };
}
export function newsListPath(lang: Lang, filter: NewsFilter = {}, page = 1) {
  const segments = filter.category || filter.year ? ['news','filter',filter.category ?? 'all',filter.year ?? 'all'] : ['news'];
  return localePath(lang, ...segments, ...(page > 1 ? ['page',String(page)] : []));
}
export async function newsFilterPaths(lang: Lang) {
  const items = await getArticles('news', lang);
  const categories = [...new Set(items.map(newsCategory))];
  const years = [...new Set(items.map(newsYear))];
  const result: { filter: NewsFilter; page: number; route: string }[] = [];
  for (const category of [undefined, ...categories]) for (const year of [undefined,...years]) {
    if (!category && !year) continue;
    const filter = { category, year }, own = selectNews(items,filter);
    if (!own.length) continue;
    for (let page = 1; page <= newsArchive(own).total; page++) result.push({filter,page,route: `${category ?? 'all'}/${year ?? 'all'}${page > 1 ? `/page/${page}` : ''}`});
  }
  return result;
}
