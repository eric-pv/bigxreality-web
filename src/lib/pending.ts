/**
 * Content rules shared by every template:
 * - a field that is left out (or an empty list) hides its section;
 * - a field that holds PENDING is shown, with the marker visible on the page.
 */
export const PENDING = "[待提供]";
export const PENDING_TRANSLATION = "[待翻譯]";

export type MaybePending<T> = T | typeof PENDING;

export function isPending(value: unknown): value is typeof PENDING {
  return typeof value === "string" && value.trim() === PENDING;
}

/** Presentation guard for unfinished copy; unlike isPending, also handles prefixed translation notes. */
export function isEditorialPlaceholder(value: unknown): boolean {
  return typeof value === 'string' && /\[待(?:提供|翻譯)\]/.test(value);
}

/** True when a field should produce a visible section (PENDING counts as content). */
export function hasContent(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasContent);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).some(hasContent);
  return true;
}

/** True when the value is PENDING or contains PENDING anywhere inside it. */
export function containsPending(value: unknown): boolean {
  if (isPending(value)) return true;
  if (typeof value === "string") return value.includes(PENDING);
  if (Array.isArray(value)) return value.some(containsPending);
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).some(containsPending);
  return false;
}

/** Product page sections, in page order (task brief §5.2 items 3–11). */
export const PRODUCT_SECTIONS = [
  "overview",
  "capabilities",
  "howItWorks",
  "scenarios",
  "components",
  "deployment",
  "integratedOps",
  "relatedSolutions",
  "relatedArticles",
] as const;
export type ProductSection = (typeof PRODUCT_SECTIONS)[number];

export interface ProductSectionInput {
  overview?: string;
  capabilities?: unknown[];
  howItWorks?: unknown[];
  scenarios?: unknown[];
  components?: unknown[];
  deployment?: Record<string, unknown>;
  integratedOps?: { description?: string; products?: unknown[] };
  relatedSolutions?: unknown[];
  relatedArticles?: unknown[];
}

/** Sections that have data; drives both rendering and the in-page navigation. */
export function visibleProductSections(p: ProductSectionInput): ProductSection[] {
  const present: Record<ProductSection, boolean> = {
    overview: hasContent(p.overview),
    capabilities: hasContent(p.capabilities),
    howItWorks: hasContent(p.howItWorks),
    scenarios: hasContent(p.scenarios),
    components: hasContent(p.components),
    deployment: hasContent(p.deployment),
    integratedOps: hasContent(p.integratedOps?.description) || hasContent(p.integratedOps?.products),
    relatedSolutions: hasContent(p.relatedSolutions),
    relatedArticles: hasContent(p.relatedArticles),
  };
  return PRODUCT_SECTIONS.filter((s) => present[s]);
}
