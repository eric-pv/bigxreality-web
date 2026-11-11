import copy from '../data/csr.json';
import type { Lang } from '../i18n';
export const CSR_CATEGORIES = ['defense-education', 'disaster-resilience', 'technology-education', 'community-engagement'] as const;
export type CSRCategory = typeof CSR_CATEGORIES[number];
export const csrCopy = (lang: Lang) => copy[lang];
export function csrCategories(data: Record<string, unknown>): CSRCategory[] {
  return data.featuredInCSR === true && Array.isArray(data.csrCategories)
    ? CSR_CATEGORIES.filter(category => data.csrCategories instanceof Array && data.csrCategories.includes(category)) : [];
}
export const csrLabel = (category: CSRCategory, lang: Lang) => copy[lang].topics[CSR_CATEGORIES.indexOf(category)];
