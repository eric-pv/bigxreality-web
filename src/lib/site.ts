import { z } from "astro/zod";
import siteSettings from "../data/site.json";
import { PENDING, isPending } from "./pending";
import type { Lang } from "../i18n";

const pending = z.literal(PENDING);
const url = z.union([z.url(), pending]);
const perLang = z.object({ tw: z.string().min(1), en: z.string().min(1), jp: z.string().min(1) });
const form = z.object({ url, productEntry: z.union([z.string().regex(/^entry\.\d+$/), pending]) });

const schema = z.object({
  brand: z.string(),
  tagline: z.string(),
  url: z.url(),
  companyName: perLang,
  contact: z.object({
    address: perLang,
    phone: z.string().min(1),
    email: z.union([z.email(), pending]),
    /** Google Maps link for the address (same place in every language). */
    mapUrl: url,
  }),
  social: z.union([z.array(z.object({ label: z.string(), url: z.url() })), pending]),
  careersUrl: url,
  forms: z.object({ brochure: form, demo: form }),
  analytics: z.object({ gaId: z.string().regex(/^G-[A-Z0-9]+$/) }),
  /** Articles per list page; null = everything on one page (docs/PHASE-2-PLAN.md §11.4). */
  listing: z.object({
    pageSize: z.object({ news: z.number().int().positive().nullable(), insights: z.number().int().positive().nullable(), "case-studies": z.number().int().positive().nullable() }),
  }),
});

// Git src/data/site.json is the only source of the site settings.
export const site = schema.parse(siteSettings);
export type FormKind = keyof typeof site.forms;

/**
 * Google Form link with the product code pre-filled (`usp=pp_url&entry.N=CODE`).
 * Returns null while the form URL is still PENDING, so callers render a disabled
 * button instead of a dead link. Without a product the plain form URL is used.
 */
export function formHref(kind: FormKind, productCode?: string): string | null {
  const f = site.forms[kind];
  if (isPending(f.url)) return null;
  if (!productCode || isPending(f.productEntry)) return f.url;
  const u = new URL(f.url);
  u.searchParams.set("usp", "pp_url");
  u.searchParams.set(f.productEntry, productCode);
  return u.toString();
}

export function companyName(lang: Lang): string {
  return site.companyName[lang];
}

/** The phone number is stored in international form (+886-2-…); Taiwan visitors see the national form (02-…). */
export function phoneDisplay(lang: Lang): string {
  const { phone } = site.contact;
  return lang === "tw" && !isPending(phone) ? phone.replace(/^\+886-?/, "0") : phone;
}

/** `tel:` link for the phone number, or null while it is PENDING. */
export function phoneHref(): string | null {
  const { phone } = site.contact;
  return isPending(phone) ? null : `tel:${phone.replace(/[^+\d]/g, "")}`;
}
