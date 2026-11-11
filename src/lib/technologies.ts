/** Stable taxonomy shared by the CMS and all seven published technology pages. */
import type { Lang } from "../i18n";
import { technologyContent, overviewContent } from "../data/technologies-content.ts";
import type { Article } from "./articles";

export const TECHNOLOGY_IDS = ["xr", "ai-simulation", "digital-simulation", "training-design", "system-integration", "decision-visualization", "domain-expertise"] as const;
export type TechnologyId = (typeof TECHNOLOGY_IDS)[number];
export function publishedTechnologyLanguages(translations:Record<Lang,{draft?:boolean;translationStatus?:string}>):Lang[]{
 if(translations.tw.draft===true)return [];
 return (['tw','en','jp'] as Lang[]).filter(lang=>translations[lang].draft!==true&&translations[lang].translationStatus!=='pending');
}
export const technologyAvailableLangs=(id:TechnologyId)=>publishedTechnologyLanguages(technologyContent[id]);
export const LIVE_TECHNOLOGY_IDS = TECHNOLOGY_IDS.filter(id=>technologyAvailableLangs(id).length>0);
export const isLiveTechnology = (id: string): id is (typeof LIVE_TECHNOLOGY_IDS)[number] => (LIVE_TECHNOLOGY_IDS as readonly string[]).includes(id);
export const technologyName = (id: TechnologyId, lang: Lang) => overviewContent[lang].technologies[id].title;
export const technologyHref = (id: TechnologyId, lang: Lang) => isLiveTechnology(id)&&technologyAvailableLangs(id).includes(lang) ? `/${lang}/technologies/${id}/` : `/${lang}/technologies/#${id}`;

/** Preserve the requested order without surfacing missing or unfinished localized cards. */
export function technologyResources<T extends { slug: string; pendingTranslation: boolean }>(entries: readonly T[], slugs: readonly string[]): T[] {
  return slugs.flatMap((slug) => {
    const entry = entries.find((item) => item.slug === slug);
    return entry && !entry.pendingTranslation ? [entry] : [];
  });
}

/** Source-language tags own structure; published text must actually exist in the requested locale. */
export function selectTechnologyArticles<T extends {
  collection: string; lang: Lang; pendingTranslation: boolean;
  base: { data: { technologyTags?: readonly string[]; draft?: boolean; publishDate?: Date } };
  loc: { data: { draft?: boolean; translationStatus?: string }; body?: string };
}>(articles: readonly T[], id: TechnologyId, lang: Lang, limit = 6, now = new Date()): T[] {
  return articles.filter((a) => a.collection === "insights" && a.lang === lang && !a.pendingTranslation
    && a.loc.data.translationStatus !== "pending" && a.loc.data.draft !== true && a.base.data.draft !== true
    && !!a.base.data.publishDate && a.base.data.publishDate.getTime() <= now.getTime() && !!a.loc.body?.trim()
    && (a.base.data.technologyTags ?? []).includes(id))
    .sort((a, b) => (b.base.data.publishDate?.getTime() ?? 0) - (a.base.data.publishDate?.getTime() ?? 0)).slice(0, Math.max(0, limit));
}
export async function getTechnologyArticles(id: TechnologyId, lang: Lang, limit = 6): Promise<Article[]> {
  const { getArticles } = await import("./articles");
  return selectTechnologyArticles(await getArticles("insights", lang), id, lang, limit);
}
export function articleTechnologyLinks(article: Article) {
  const tags = (article.base.data as { technologyTags?: TechnologyId[] }).technologyTags ?? [];
  return article.collection === "insights" ? tags.map((id) => ({ id, name: technologyName(id, article.lang), href: technologyHref(id, article.lang) })) : [];
}
