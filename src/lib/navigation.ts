/**
 * Site navigation: the single source for the Header (desktop bar, submenus, phone menu) and the
 * Footer link columns. Add, remove, rename, reorder or move a menu item here only; both
 * components read this module at build time and need no change of their own.
 *
 * - `id`        unique; pages mark themselves current with it (BaseLayout `current*` props).
 * - `label`     key in src/content/ui/<lang>.json (dot path), so all three languages share it.
 * - `route`     URL segments below /<lang>/ (built with localePath); omitted for a menu-only group.
 * - `order`     sort order among siblings.
 * - `enabled`   false hides the item in Header and Footer.
 * - `status`    "planned" = the page is not built yet: it keeps its place in the menu but is shown
 *               as plain text, never as a link (no 404s). "published" pages must exist in
 *               src/pages/[lang]/ — the build fails otherwise.
 * - `page`      (legal links only) slug in the `pages` collection whose TW `draft` gates the link:
 *               while the TW file is a draft the route builds no page, so the link is resolved as
 *               "planned" (no href) and the Footer leaves it out.
 */
import { localePath, type Lang } from "../i18n";
import { getUi, type Ui } from "./ui";
import { getLocalized } from "./content";

import { DOMAINS, PRODUCT_DOMAINS } from "./domains";
import { LIVE_TECHNOLOGY_IDS, technologyName, technologyHref, type TechnologyId } from "./technologies";

export type PageStatus = "published" | "planned";

interface NavNode {
  id: string;
  label: string;
  route?: readonly string[];
  domain?: string;
  order: number;
  enabled: boolean;
  status: PageStatus;
  page?: string;
  children?: readonly NavNode[];
}

export const NAVIGATION = [
  { id: "solutions", label: "nav.solutions", children: DOMAINS.map((id, order) => ({ id: `solution-${id}`, label: `domains.${id}`, route: ["solutions", id], order, enabled: true, status: "published" as const })), route: ["solutions"], order: 10, enabled: true, status: "published" },
  { id: "products", label: "nav.products", children: PRODUCT_DOMAINS.map((id, order) => ({ id: `product-${id}`, label: `productDomains.${id}`, route: ["products"], domain: id, order, enabled: true, status: "published" as const })), route: ["products"], order: 20, enabled: true, status: "published" },
  { id: "technologies", label: "nav.technologies", children: LIVE_TECHNOLOGY_IDS.map((id, order) => ({ id: `technology-${id}`, label: `technology:${id}`, route: ["technologies", id], order, enabled: true, status: "published" as const })), route: ["technologies"], order: 30, enabled: true, status: "published" },
  {
    id: "resources", label: "nav.resources", order: 40, enabled: true, status: "published",
    children: [
      { id: "news", label: "nav.news", route: ["news"], order: 10, enabled: true, status: "published" },
      { id: "insights", label: "nav.insights", route: ["insights"], order: 20, enabled: true, status: "published" },
      { id: "case-studies", label: "nav.caseStudies", route: ["cases"], order: 30, enabled: true, status: "published" },
    ],
  },
  {
    id: "company", label: "nav.company", order: 50, enabled: true, status: "published",
    children: [
      { id: "about", label: "nav.aboutUs", route: ["company"], order: 10, enabled: true, status: "published" },
      { id: "csr", label: "nav.csr", route: ["company", "csr"], order: 15, enabled: true, status: "published" },
      { id: "team", label: "nav.team", route: ["company", "team"], order: 30, enabled: true, status: "published" },
      { id: "partners", label: "nav.partners", route: ["company", "partners"], order: 40, enabled: true, status: "published" },
      { id: "investors", label: "nav.investors", route: ["company", "investors"], order: 50, enabled: true, status: "published" },
      { id: "contact", label: "contact", route: ["contact"], order: 60, enabled: true, status: "published" },
    ],
  },
] as const satisfies readonly NavNode[];

/** Legal links in the Footer's bottom row (not part of the menu). Same status rules, plus `page`. */
export const LEGAL_LINKS = [
  { id: "privacy", label: "footer.privacy", route: ["privacy"], page: "privacy", order: 10, enabled: true, status: "published" },
] as const satisfies readonly NavNode[];

type Top = (typeof NAVIGATION)[number];
export type NavKey = Top["id"];
type ChildIds<T> = T extends { id: infer P; children: readonly (infer C)[] } ? [P, C extends { id: infer I } ? I : never] : never;
type Groups = ChildIds<Top>;
export type ResourceKey = Extract<Groups, ["resources", unknown]>[1];
export type CompanyKey = Extract<Groups, ["company", unknown]>[1];

/** One resolved item: translated label and a link, or `href: null` while the page is planned. */
export interface NavItem {
  id: string;
  label: string;
  href: string | null;
  children: NavItem[];
}

// Page files that exist, e.g. "/src/pages/[lang]/company/team/index.astro".
const PAGE_FILES = new Set(Object.keys(import.meta.glob("/src/pages/\\[lang\\]/**/index.astro", { query: "?raw" })));

function lookup(ui: Ui, key: string): string {
  const value = key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], ui);
  if (typeof value !== "string") throw new Error(`navigation: no UI string "${key}"`);
  return value;
}

function hrefOf(lang: Lang, node: NavNode): string | null {
  if (!node.route || node.status !== "published") return null;
  const file = `/src/pages/[lang]/${node.route.join("/")}/index.astro`;
  const dynamicRoute = node.route.length === 2 && (
    (node.route[0] === "solutions" && (DOMAINS as readonly string[]).includes(node.route[1])) ||
    (node.route[0] === "technologies" && (LIVE_TECHNOLOGY_IDS as readonly string[]).includes(node.route[1]))
  );
  if (!PAGE_FILES.has(file) && !dynamicRoute) throw new Error(`navigation: "${node.id}" is published but ${file} does not exist (set status "planned")`);
  const href = node.route[0] === "technologies" && node.route[1]
    ? technologyHref(node.route[1] as TechnologyId, lang) : localePath(lang, ...node.route);
  return node.domain ? `${href}?domain=${encodeURIComponent(node.domain)}` : href;
}

function resolve(lang: Lang, nodes: readonly NavNode[]): NavItem[] {
  const ui = getUi(lang);
  return nodes
    .filter((n) => n.enabled)
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((n) => ({ id: n.id, label: n.label.startsWith("technology:") ? technologyName(n.label.slice(11) as TechnologyId, lang) : lookup(ui, n.label), href: hrefOf(lang, n), children: resolve(lang, n.children ?? []) }));
}

/** The menu for one language, filtered and sorted; used by both Header and Footer. */
export function navigation(lang: Lang): NavItem[] {
  return resolve(lang, NAVIGATION);
}

/** Legal links for one language; a link whose `page` is a TW draft (or not built in `lang`) has no href. */
export async function legalLinks(lang: Lang): Promise<NavItem[]> {
  const built = new Set((await getLocalized("pages", lang)).map((e) => e.slug));
  const nodes: readonly NavNode[] = LEGAL_LINKS;
  return resolve(lang, nodes.map((n) => (n.page && !built.has(n.page) ? { ...n, status: "planned" as const } : n)));
}
