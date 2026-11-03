/**
 * Where content comes from at build time (BXR_CONTENT_SOURCE):
 * - "markdown"   src/content Markdown in Git main, the only official source (default)
 * - "fixtures"   TEST FIXTURE content in tests/fixtures/content (falls back to src/content per
 *                collection); every page is noindex and nothing is listed in the sitemap.
 *                Written to dist-fixtures/ and never packaged for GitHub Pages.
 */
export type ContentSource = "markdown" | "fixtures";
const SOURCES: readonly string[] = ["markdown", "fixtures"];

declare const __BXR_CONTENT_SOURCE__: string | undefined;
declare const __BXR_PREVIEW__: boolean | undefined;

/** Pure rule, exported for tests. */
export function resolveContentSource(value: string | undefined): ContentSource {
  const v = value ?? "markdown";
  if (!SOURCES.includes(v)) throw new Error(`BXR_CONTENT_SOURCE must be markdown or fixtures (got "${v}")`);
  return v as ContentSource;
}

export function contentSource(): ContentSource {
  return resolveContentSource(typeof __BXR_CONTENT_SOURCE__ === "string" ? __BXR_CONTENT_SOURCE__ : process.env.BXR_CONTENT_SOURCE);
}

/** BXR_PREVIEW=1 is a historical non-production profile; official Pages must set 0. */
export const isPreviewBuild = () => (typeof __BXR_PREVIEW__ === "boolean" ? __BXR_PREVIEW__ : process.env.BXR_PREVIEW === "1");
/** Builds that must never be indexed: test fixtures and the preview profile. */
export const isNoIndexBuild = () => isPreviewBuild() || contentSource() === "fixtures";
