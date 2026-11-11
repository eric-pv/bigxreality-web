/**
 * News, insights and case studies. A relation may be stored on one side or on both;
 * every lookup here merges both directions.
 */
import { ARTICLE_COLLECTIONS, getLocalized, type ArticleCollection, type Localized } from "./content";
import { localePath, type Lang } from "../i18n";
import { comparePublicationDates } from "./publication-date";
import { site } from "./site";

export type Article = Localized<ArticleCollection> & { collection: ArticleCollection };

const warned = new Set<string>();
const cache = new Map<string, Promise<Article[]>>();

/**
 * Published articles of one type, newest first. An article whose text is empty in
 * this language is not built (docs/PHASE-2-PLAN.md §6) and is reported once.
 */
export function getArticles(collection: ArticleCollection, lang: Lang): Promise<Article[]> {
  const key = `${collection}:${lang}`;
  if (!cache.has(key)) {
    cache.set(key, (async () => {
      const out: Article[] = [];
      for (const e of await getLocalized(collection, lang)) {
        // Case studies are written in structured fields; the free-text body is optional for them.
        if (collection !== "case-studies" && !e.loc.body?.trim()) {
          const id = `${collection}/${lang}/${e.slug}`;
          if (!warned.has(id)) console.warn(`[articles] ${id}: empty body, page not built`);
          warned.add(id);
          continue;
        }
        out.push({ ...e, collection } as Article);
      }
      return out.sort(byDate);
    })());
  }
  return cache.get(key)!;
}

export const byDate = (a: Article, b: Article) => comparePublicationDates(a.base.data.publishDate, b.base.data.publishDate) || a.slug.localeCompare(b.slug);

export async function allArticles(lang: Lang): Promise<Article[]> {
  return (await Promise.all(ARTICLE_COLLECTIONS.map((c) => getArticles(c, lang)))).flat().sort(byDate);
}

export const articleHref = (a: Pick<Article, "collection" | "slug" | "lang">) => localePath(a.lang, a.collection, a.slug);

/** Articles that point at a product or solution, newest first. */
export async function articlesAbout(field: "relatedProducts" | "relatedSolutions", slug: string, lang: Lang, collections: readonly ArticleCollection[] = ARTICLE_COLLECTIONS): Promise<Article[]> {
  const found: Article[] = [];
  for (const c of collections) for (const a of await getArticles(c, lang)) if (a.base.data[field].includes(slug)) found.push(a);
  return found.sort(byDate);
}

const RELATION_FIELD = { news: "relatedNews", insights: "relatedInsights", "case-studies": "relatedCaseStudies" } as const;

/** Related articles of an article, both directions merged, newest first. */
export async function relatedToArticle(article: Article, limit = 6): Promise<Article[]> {
  const all = await allArticles(article.lang);
  const own = article.base.data;
  const out = all.filter((other) => {
    if (other.collection === article.collection && other.slug === article.slug) return false;
    const forward = (own[RELATION_FIELD[other.collection]] as string[]).includes(other.slug);
    const reverse = (other.base.data[RELATION_FIELD[article.collection]] as string[]).includes(article.slug);
    return forward || reverse;
  });
  return out.slice(0, limit);
}

/** Tag slug → localized tag (only tags published in this language). */
export async function tagMap(lang: Lang): Promise<Map<string, Localized<"tags">>> {
  return new Map((await getLocalized("tags", lang)).map((t) => [t.slug, t]));
}

/** Tag names for a card, in the article's order; unknown/untranslated tags are skipped. */
export async function tagNames(slugs: string[], lang: Lang): Promise<string[]> {
  const tags = await tagMap(lang);
  return slugs.map((s) => tags.get(s)?.loc.data.name).filter((n): n is string => !!n);
}

export async function articlesWithTag(tag: string, lang: Lang): Promise<Article[]> {
  return (await allArticles(lang)).filter((a) => a.base.data.tags.includes(tag));
}

/** Tag pages with fewer articles than this are noindex and left out of the sitemap (owner decision). */
export const TAG_INDEX_MIN = 3;

export function pageSize(collection: ArticleCollection): number | null {
  return site.listing.pageSize[collection];
}

/** Splits a list into pages; page 1 has no number in its URL. */
export function paginate<T>(items: T[], size: number | null): T[][] {
  if (!size) return [items];
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages.length ? pages : [[]];
}

/** Minutes to read: ~400 CJK characters or ~220 words per minute. */
export function readingMinutes(text: string): number {
  const cjk = (text.match(/[぀-ヿ㐀-鿿]/g) ?? []).length;
  const words = text.replace(/[぀-ヿ㐀-鿿]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(cjk / 400 + words / 220));
}
