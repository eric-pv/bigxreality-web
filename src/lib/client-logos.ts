import type { ImageMetadata } from 'astro';
import config from '../data/client-logos.json';
import type { Lang } from '../i18n';
import { getUi } from './ui';

export const CLIENT_CATEGORIES = ['defense-public-safety', 'research-technology', 'government-public-enterprises', 'industry-professional-associations'] as const;
const images = import.meta.glob<{ default: ImageMetadata }>('../assets/images/clients/*.webp', { eager: true });

/** One ordered list drives the home counts and the existing partner page. */
export function clientLogoGroups(lang: Lang) {
  const labels = getUi(lang).clientCategories;
  return CLIENT_CATEGORIES.map(id => ({
    id, label: labels[id],
    items: config.filter(item => item.enabled && item.category === id).sort((a, b) => a.order - b.order).map(item => {
      const image = images[`../assets/images/clients/${item.file}`]?.default;
      if (!image) throw new Error(`Client logo missing: ${item.file}`);
      return { image, file: item.file, alt: item.alt[lang], order: item.order };
    }),
  }));
}
export const clientLogos = (lang: Lang) => clientLogoGroups(lang).flatMap(group => group.items);
