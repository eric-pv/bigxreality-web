/** URL segment for each language. The URL code and the BCP-47 tags are kept apart on purpose. */
export const LANGS = ["en", "tw", "jp"] as const;
export type Lang = (typeof LANGS)[number];

/** `/` redirects here and hreflang x-default points here. */
export const DEFAULT_LANG: Lang = "en";
/** Content is written in Chinese first; structural fields (order, relations, dates) are read from this language only. */
export const SOURCE_LANG: Lang = "tw";

export const HTML_LANG: Record<Lang, string> = { en: "en", tw: "zh-Hant-TW", jp: "ja-JP" };
export const HREFLANG: Record<Lang, string> = { en: "en", tw: "zh-TW", jp: "ja" };
export const LANG_LABEL: Record<Lang, string> = { en: "EN", tw: "TW", jp: "JP" };
export const OG_LOCALE: Record<Lang, string> = { en: "en_US", tw: "zh_TW", jp: "ja_JP" };
export const INTL_LOCALE: Record<Lang, string> = { en: "en-US", tw: "zh-TW", jp: "ja-JP" };

export function isLang(value: string | undefined): value is Lang {
  return (LANGS as readonly string[]).includes(value ?? "");
}

/**
 * Collections whose public URL segment differs from the collection name. Case studies
 * live under `/cases/` (the content collection keeps its name `case-studies`).
 */
export const URL_SEGMENT: Record<string, string> = { "case-studies": "cases" };
export const segmentOf = (collection: string) => URL_SEGMENT[collection] ?? collection;

/** Builds a site path such as `/tw/products/sut/` (always with trailing slash). */
export function localePath(lang: Lang, ...segments: string[]): string {
  const rest = segments.filter(Boolean).map((s, i) => (i === 0 ? segmentOf(s) : s)).join("/");
  return rest ? `/${lang}/${rest}/` : `/${lang}/`;
}
