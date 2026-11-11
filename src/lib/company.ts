/**
 * "About BXR" section: shared constants and queries. Nothing here invents content: every list is
 * built from published CMS entries or the shared client-logo catalogue; empty pages are not indexed.
 */
import { clientLogos } from "./client-logos";
import type { CollectionEntry } from "astro:content";
import { getLocalized, type Localized } from "./content";
import type { Lang } from "../i18n";

export const PARTNER_CATEGORIES = ["technology", "integration", "international"] as const;
export type PartnerCategory = (typeof PARTNER_CATEGORIES)[number];

/** Investor relations modules, in display order. */
export const INVESTOR_MODULES = ["profile", "financials", "governance", "shareholders", "announcements", "briefings", "contact"] as const;
export type InvestorModule = (typeof INVESTOR_MODULES)[number];

export type InvestorItem = Localized<"investor-items">;

/** Published investor items of one module, newest first (items without a date by `order`). */
export async function investorItems(lang: Lang, module?: InvestorModule): Promise<InvestorItem[]> {
  const all = await getLocalized("investor-items", lang);
  const own = module ? all.filter((i) => i.base.data.module === module) : all;
  return own.sort((a, b) => {
    const ao = a.base.data.order;
    const bo = b.base.data.order;
    if (ao !== undefined && bo !== undefined) return ao - bo;
    return b.base.data.publishDate.getTime() - a.base.data.publishDate.getTime();
  });
}

/** Modules that have at least one published item: only these are shown or linked on the site. */
export async function enabledModules(lang: Lang): Promise<InvestorModule[]> {
  const all = await getLocalized("investor-items", lang);
  const used = new Set(all.map((i) => i.base.data.module));
  return INVESTOR_MODULES.filter((m) => used.has(m));
}

/** Which About BXR pages have content in this language (drives the sitemap and noindex). */
export async function companyContent(lang: Lang) {
  const modules = await enabledModules(lang);
  return { history: false, team: true, partners: clientLogos(lang).length > 0, investors: modules.length > 0, modules };
}

export type Milestone = CollectionEntry<"milestones">;
