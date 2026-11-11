// @ts-check
// Official site: a static Astro build of Git content, edited with Sveltia and
// published by GitHub Actions to GitHub Pages (docs/ARCHITECTURE.md). No server,
// adapter or remote CMS is part of the build.
import { defineConfig } from "astro/config";
import siteMetadata from "./src/data/site.json" with { type: "json" };
import react from "@astrojs/react";
import i18nCoverage from "./src/integrations/i18n-coverage.mjs";

export default defineConfig({
  site: new URL(siteMetadata.url).origin,
  output: "static",
  // Public URLs keep their trailing slash (all links and the sitemap use it).
  trailingSlash: "ignore",
  build: { format: "directory" },
  // TEST FIXTURE builds never write to dist/ (docs/PHASE-2-PLAN.md §11.5).
  outDir: process.env.BXR_CONTENT_SOURCE === "fixtures" ? "./dist-fixtures" : "./dist",
  // Static build: written as a meta-refresh dist/index.html. The Pages packager
  // replaces it with the published start page (scripts/pages/package.mjs).
  redirects: { "/": "/en/" },
  integrations: [i18nCoverage(), react()],
  vite: {
    // Browser support target for CSS, kept explicit so vendor prefixes do not depend on
    // which Vite environment bundles the styles (Safari 16.4 still needs
    // -webkit-backdrop-filter, -webkit-mask-* and the -webkit-text-decoration shorthand).
    build: { cssTarget: ["chrome111", "edge111", "firefox114", "safari16.4", "ios16.4"] },
    // The content source is fixed into the code at build time (read in src/lib/content-source.ts).
    define: {
      __BXR_CONTENT_SOURCE__: JSON.stringify(process.env.BXR_CONTENT_SOURCE ?? "markdown"),
      __BXR_PREVIEW__: JSON.stringify(process.env.BXR_PREVIEW === "1"),
    },
  },
  devToolbar: { enabled: false },
});
