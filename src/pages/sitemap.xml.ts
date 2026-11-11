import { publicUrl } from '../lib/public-url.ts';
import type { APIRoute } from "astro";
import { HREFLANG, DEFAULT_LANG, type Lang } from "../i18n";
import { site } from "../lib/site";
import { indexablePages } from "../lib/indexable-pages";

export const GET: APIRoute = async () => {
  const pages = await indexablePages();
  const abs = (path: string, l: Lang) => publicUrl(path.replace("{lang}", l)).toString();
  const body = pages
    .map((p) => {
      const alts = p.alternates.map((l) => `    <xhtml:link rel="alternate" hreflang="${HREFLANG[l]}" href="${abs(p.path, l)}"/>`);
      if (p.alternates.includes(DEFAULT_LANG)) alts.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(p.path, DEFAULT_LANG)}"/>`);
      return `  <url>\n    <loc>${abs(p.path, p.lang)}</loc>\n${alts.join("\n")}\n  </url>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`;
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
