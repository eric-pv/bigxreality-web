import type { APIRoute } from "astro";
import { isNoIndexBuild } from "../lib/content-source";
import { site } from "../lib/site";

/** TEST FIXTURE builds (PHASE-2-PLAN §11.5) and the preview profile block every crawler. */
export const GET: APIRoute = () => {
  const body = isNoIndexBuild()
    ? "User-agent: *\nDisallow: /\n"
    : `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
