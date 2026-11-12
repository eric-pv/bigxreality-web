import { newsArchive } from "./news-listing";
import { getEntry } from "astro:content";
import { LANGS, segmentOf, type Lang } from "../i18n";
import { ARTICLE_COLLECTIONS, getLocalized } from "./content";
import { articlesWithTag, getArticles, pageSize, paginate, TAG_INDEX_MIN } from "./articles";
import { isNoIndexBuild } from "./content-source";
import { INVESTOR_MODULES, companyContent } from "./company";
import {overviewContent} from "../data/technologies-content";
import { LIVE_TECHNOLOGY_IDS, technologyAvailableLangs } from "./technologies";


export interface IndexablePage { lang: Lang; path: string; alternates: Lang[] }
let cached: Promise<IndexablePage[]> | undefined;
export function indexablePages() { return cached ??= collect(); }
async function collect(): Promise<IndexablePage[]> {
  const pages: IndexablePage[] = [];
  /** Adds one URL pattern for every language in which it is indexable. */
  const add = (path: string, langs: Lang[]) => {
    for (const lang of langs) pages.push({ lang, path, alternates: langs });
  };
  const copyOk = async (page: string, l: Lang) => (await getEntry("pages", `${l}/${page}`))?.data.translationStatus !== "pending";
  const filter = async (test: (l: Lang) => Promise<boolean>) => {
    const ok = await Promise.all(LANGS.map(test));
    return LANGS.filter((_, i) => ok[i]);
  };

  if (!isNoIndexBuild()) {
    add("/{lang}/", [...LANGS]);
    add("/{lang}/technologies/", LANGS.filter(lang=>overviewContent[lang].translationStatus!=="pending"));
    for (const id of LIVE_TECHNOLOGY_IDS) add(`/{lang}/technologies/${id}/`, technologyAvailableLangs(id));
    add("/{lang}/products/", await filter((l) => copyOk("products", l)));
    add("/{lang}/solutions/", await filter((l) => copyOk("solutions", l)));
    add("/{lang}/contact/", await filter((l) => copyOk("contact", l)));
    // Privacy routes exist only when the shared TW source is published.
    add("/{lang}/privacy/", await filter(async (l) =>
      (await getLocalized("pages", l)).some((entry) => entry.slug === "privacy" && !entry.pendingTranslation)));
    add("/{lang}/company/csr/", [...LANGS]);
    add("/{lang}/company/careers/", [...LANGS]);
    add("/{lang}/company/", await filter((l) => copyOk("company", l)));
    // About BXR sub-pages: only languages in which they have published content (otherwise noindex).
    const companyByLang = new Map<Lang, Awaited<ReturnType<typeof companyContent>>>();
    for (const l of LANGS) companyByLang.set(l, await companyContent(l));
    for (const page of ["team", "partners", "investors"] as const) {
      add(`/{lang}/company/${page}/`, await filter(async (l) => companyByLang.get(l)![page] && (await copyOk(page, l))));
    }
    for (const m of INVESTOR_MODULES) add(`/{lang}/company/investors/${m}/`, await filter(async (l) => companyByLang.get(l)!.modules.includes(m) && (await copyOk("investors", l))));

    for (const collection of ["products", "solutions"] as const) {
      const indexable = new Map<string, Lang[]>();
      for (const lang of LANGS) {
        for (const e of await getLocalized(collection, lang)) if (!e.pendingTranslation) indexable.set(e.slug, [...(indexable.get(e.slug) ?? []), lang]);
      }
      for (const [slug, langs] of indexable) add(`/{lang}/${collection}/${slug}/`, langs);
    }

    for (const collection of ARTICLE_COLLECTIONS) {
      const pageCount = new Map<Lang, number>();
      for (const l of LANGS) {
        const all = await getArticles(collection, l);
        if (all.length && (await copyOk(collection, l))) pageCount.set(l, collection === "news" ? newsArchive(all).total : paginate(all, pageSize(collection)).length);
      }
      const maxPages = Math.max(0, ...pageCount.values());
      for (let n = 1; n <= maxPages; n++) {
        add(n === 1 ? `/{lang}/${segmentOf(collection)}/` : `/{lang}/${segmentOf(collection)}/page/${n}/`, LANGS.filter((l) => (pageCount.get(l) ?? 0) >= n));
      }
      const indexable = new Map<string, Lang[]>();
      for (const lang of LANGS) {
        for (const a of await getArticles(collection, lang)) if (!a.pendingTranslation) indexable.set(a.slug, [...(indexable.get(a.slug) ?? []), lang]);
      }
      for (const [slug, langs] of indexable) add(`/{lang}/${segmentOf(collection)}/${slug}/`, langs);
    }

    const tagPages = new Map<string, Lang[]>();
    for (const lang of LANGS) {
      for (const t of await getLocalized("tags", lang)) {
        const n = (await articlesWithTag(t.slug, lang)).length;
        if (n >= TAG_INDEX_MIN && !t.pendingTranslation && !!t.loc.data.description) tagPages.set(t.slug, [...(tagPages.get(t.slug) ?? []), lang]);
      }
    }
    // Tag indexes remain noindex regardless of article count.
    for (const [slug, langs] of tagPages) add(`/{lang}/tags/${slug}/`, langs);
  }

  return pages;
}
