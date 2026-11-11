import {contentLocale} from "../../src/lib/content-locale.ts";
// Scans src/content/<collection>/<lang>/<slug>.md and reports, per collection,
// slugs that are missing in some language and files still marked pending.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const LANGS = ["en", "tw", "jp"];

export async function i18nCoverage(root) {
  const contentDir = path.join(root, "src/content");
  const missing = [];
  const pending = [];
  for (const collection of (await readdir(contentDir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name)) {
    const slugs = new Map();
    for (const lang of LANGS) {
      let files = [];
      try {
        files = (await readdir(path.join(contentDir, collection, contentLocale(lang)))).filter((f) => /\.(md|json)$/.test(f));
      } catch {
        continue; // collections that are not split by language folders (e.g. ui)
      }
      for (const f of files) {
        const slug = f.replace(/\.(md|json)$/, "");
        if (!slugs.has(slug)) slugs.set(slug, new Set());
        slugs.get(slug).add(lang);
        const text = await readFile(path.join(contentDir, collection, contentLocale(lang), f), "utf8");
        if ((f.endsWith(".json") && JSON.parse(text).translationStatus === "pending") || /^translationStatus:\s*pending\s*$/m.test(text)) pending.push(`${collection}/${lang}/${f}`);
      }
    }
    for (const [slug, langs] of slugs) {
      const absent = LANGS.filter((l) => !langs.has(l));
      if (absent.length) missing.push({ collection, slug, absent });
    }
  }
  return { missing, pending };
}

export function formatCoverage({ missing, pending }) {
  const lines = [];
  for (const m of missing) lines.push(`missing translation file: ${m.collection}/${m.slug} has no ${m.absent.join(", ")} version`);
  if (pending.length) lines.push(`${pending.length} file(s) still marked translationStatus: pending (rendered with noindex)`);
  return lines;
}
