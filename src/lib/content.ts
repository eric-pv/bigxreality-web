import { getCollection, type CollectionEntry, type CollectionKey } from "astro:content";
import { comparePublicationDates } from "./publication-date";
import { LANGS, SOURCE_LANG, type Lang } from "../i18n";

/*
 * Each entry exists once per language folder (`<lang>/<slug>`). `base` is the
 * tw file, which owns the structural fields (order, relations, dates, draft);
 * `loc` is the file for the requested language, which owns the wording.
 */
export interface Localized<C extends CollectionKey> {
  slug: string;
  lang: Lang;
  base: CollectionEntry<C>;
  loc: CollectionEntry<C>;
  pendingTranslation: boolean;
}

type LocalizableKey = "products" | "solutions" | "pages" | "tags" | "insights" | "news" | "case-studies" | "milestones" | "team" | "partners" | "investor-items";
export const ARTICLE_COLLECTIONS = ["insights", "news", "case-studies"] as const;
export type ArticleCollection = (typeof ARTICLE_COLLECTIONS)[number];

function split(id: string): { lang: string; slug: string } {
  const [lang, ...rest] = id.split("/");
  return { lang, slug: rest.join("/") };
}

/**
 * Published = not a draft, (case studies) the client approved publication, and, when
 * dated, publishDate has passed at build time.
 */
function isPublished(data: Record<string, unknown>, now: Date): boolean {
  if (data.draft === true) return false;
  if ((data.approval as { approved?: boolean } | undefined)?.approved === false) return false;
  const date = data.publishDate;
  return !(date instanceof Date) || date.getTime() <= now.getTime();
}

const cache = new Map<string, Promise<Localized<LocalizableKey>[]>>();

/** All published entries of a collection in one language, sorted by `order` then date. */
export function getLocalized<C extends LocalizableKey>(collection: C, lang: Lang): Promise<Localized<C>[]> {
  const key = `${collection}:${lang}`;
  if (!cache.has(key)) cache.set(key, load(collection, lang));
  return cache.get(key) as Promise<Localized<C>[]>;
}

async function load<C extends LocalizableKey>(collection: C, lang: Lang): Promise<Localized<C>[]> {
  const now = new Date();
  const all = (await getCollection(collection)) as CollectionEntry<C>[];
  const bySlug = new Map<string, Partial<Record<Lang, CollectionEntry<C>>>>();
  for (const e of all) {
    const { lang: l, slug } = split(e.id);
    if (!(LANGS as readonly string[]).includes(l)) throw new Error(`${collection}/${e.id}: unknown language folder "${l}"`);
    const row = bySlug.get(slug) ?? {};
    row[l as Lang] = e;
    bySlug.set(slug, row);
  }
  const out: Localized<C>[] = [];
  for (const [slug, row] of bySlug) {
    const base = row[SOURCE_LANG];
    const loc = row[lang];
    // Missing tw source or missing translation file: no page in this language
    // (scripts/lib/i18n-coverage.mjs reports it as a build warning).
    if (!base || !loc) continue;
    const data = base.data as Record<string, unknown>;
    if (!isPublished(data, now)) continue;
    out.push({ slug, lang, base, loc, pendingTranslation: (loc.data as { translationStatus: string }).translationStatus === "pending" });
  }
  return out.sort((a, b) => {
    const ad = a.base.data as { order?: number; publishDate?: Date };
    const bd = b.base.data as { order?: number; publishDate?: Date };
    if (ad.order !== undefined && bd.order !== undefined) return ad.order - bd.order;
    return comparePublicationDates(ad.publishDate, bd.publishDate);
  });
}

/** Languages in which this slug has a published page (for hreflang and the language switch). */
export async function availableLangs(collection: LocalizableKey, slug: string): Promise<Lang[]> {
  const result: Lang[] = [];
  for (const lang of LANGS) {
    if ((await getLocalized(collection, lang)).some((e) => e.slug === slug)) result.push(lang);
  }
  return result;
}

/*
 * Relation checks. Relations store bare slugs; a slug that points to no tw
 * source file is an editing error and fails the build with the file name.
 */
let checked: Promise<void> | undefined;
export function validateRelations(): Promise<void> {
  checked ??= (async () => {
    const slugs = async (c: LocalizableKey) =>
      new Set((await getCollection(c)).filter((e) => split(e.id).lang === SOURCE_LANG).map((e) => split(e.id).slug));
    const products = await slugs("products");
    const solutions = await slugs("solutions");
    const errors: string[] = [];
    const expect = (file: string, field: string, list: string[] | undefined, known: Set<string>) => {
      for (const s of list ?? []) if (!known.has(s)) errors.push(`${file}: ${field} → "${s}" does not exist`);
    };
    for (const e of await getCollection("products")) {
      if (split(e.id).lang !== SOURCE_LANG) continue;
      const file = `products/${e.id}.md`;
      expect(file, "integratedOps.products", e.data.integratedOps?.products, products);
      expect(file, "relatedProducts", e.data.relatedProducts, products);
      if (e.data.relatedProducts?.includes(split(e.id).slug)) errors.push(`${file}: relatedProducts lists itself`);
      expect(file, "relatedSolutions", e.data.relatedSolutions, solutions);
      if (e.data.integratedOps?.products?.includes(split(e.id).slug)) errors.push(`${file}: integratedOps.products lists itself`);
    }
    for (const e of await getCollection("solutions")) {
      if (split(e.id).lang !== SOURCE_LANG) continue;
      const file = `solutions/${e.id}.md`;
      const self = split(e.id).slug;
      if (e.data.parent) {
        expect(file, "parent", [e.data.parent], solutions);
        if (e.data.parent === self) errors.push(`${file}: parent lists itself`);
      }
      expect(file, "relatedSolutions", e.data.relatedSolutions, solutions);
      expect(file, "relatedProducts", e.data.relatedProducts, products);
      for (const it of e.data.landing?.featured?.items ?? []) expect(file, "landing.featured", [it.solution], solutions);
    }
    for(const entry of await getCollection("technologies")){
      if(split(entry.id).lang!==SOURCE_LANG)continue;
      expect(`technologies/${entry.id}.json`,"relatedProducts",entry.data.relatedProducts,products);
      expect(`technologies/${entry.id}.json`,"relatedSolutions",entry.data.relatedSolutions,solutions);
      const ids=entry.data.sections.map(section=>section.id);
      if(new Set(ids).size!==ids.length)errors.push(`technologies/${entry.id}.json: duplicate section IDs`);
    }
    const tags = await slugs("tags");
    const articles = { news: await slugs("news"), insights: await slugs("insights"), "case-studies": await slugs("case-studies") };
    for (const c of ARTICLE_COLLECTIONS) {
      for (const e of await getCollection(c)) {
        if (split(e.id).lang !== SOURCE_LANG) continue;
        const file = `${c}/${e.id}.md`;
        expect(file, "tags", e.data.tags, tags);
        expect(file, "relatedProducts", e.data.relatedProducts, products);
        expect(file, "relatedSolutions", e.data.relatedSolutions, solutions);
        expect(file, "relatedNews", e.data.relatedNews, articles.news);
        expect(file, "relatedInsights", e.data.relatedInsights, articles.insights);
        expect(file, "relatedCaseStudies", e.data.relatedCaseStudies, articles["case-studies"]);
      }
    }
    if (errors.length) throw new Error(`Broken content relations:\n  ${errors.join("\n  ")}`);
  })();
  return checked;
}

/**
 * Products that integrate with `slug`. The relation is stored on one side only;
 * both directions are merged here so editors never maintain it twice.
 */
export async function integratedProducts(slug: string, lang: Lang): Promise<Localized<"products">[]> {
  const all = await getLocalized("products", lang);
  const self = all.find((p) => p.slug === slug);
  const forward = new Set(self?.base.data.integratedOps?.products ?? []);
  return all.filter((p) => p.slug !== slug && (forward.has(p.slug) || (p.base.data.integratedOps?.products ?? []).includes(slug)));
}
