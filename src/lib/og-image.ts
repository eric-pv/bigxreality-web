import type { ImageMetadata } from "astro";
import { isEditorialPlaceholder } from "./pending";

/** og:image input for BaseLayout/SeoHead: both fields, or neither (site fallback image). */
export interface OgImage { ogImage?: ImageMetadata; ogImageAlt?: string }

/**
 * The page's own hero/cover image for og:image and JSON-LD.
 * `alt` must be this language's own text (never the tw alt standing in for en/jp);
 * an empty, [待提供] or [待翻譯] alt, or a page whose translation is pending, keeps the fallback.
 */
export function pageOgImage(src: ImageMetadata | undefined, alt: string | undefined, pendingTranslation = false): OgImage {
  const text = alt?.trim();
  if (!src || pendingTranslation || !text || isEditorialPlaceholder(text)) return {};
  return { ogImage: src, ogImageAlt: text };
}
