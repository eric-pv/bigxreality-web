// Headline-style fields never end with a period or other sentence-final mark
// (owner rule 2026-10-20); body text keeps normal punctuation.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

/** Keys whose values are headings, sub-headings, names, labels or card titles. */
export const HEADLINE_KEYS = new Set(["title", "name", "headline", "subheadline", "tagline", "label", "ctaLabel", "englishName", "eyebrow", "focus", "need"]);
const END = /[。．.！!？?；;]$/;
/** Roman-numeral style abbreviations that legitimately end with a period. */
const ALLOWED_ENDINGS = /(?:\b(?:etc|vs|No|Inc|Ltd|Co)\.)$/;

export function endsWithPeriod(s) {
  const t = String(s).trim();
  return END.test(t) && !ALLOWED_ENDINGS.test(t);
}

/** Walks a parsed object; yields [keyPath, value] for headline-style string fields that end in a period. */
export function* findings(value, keyPath = []) {
  if (Array.isArray(value)) { for (const [i, v] of value.entries()) yield* findings(v, [...keyPath, i]); return; }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === "string" && HEADLINE_KEYS.has(k) && endsWithPeriod(v)) yield [[...keyPath, k].join("."), v];
      else if (typeof v === "object") yield* findings(v, [...keyPath, k]);
    }
  }
}

/** Markdown headings (# …) in a body. */
export function* headingFindings(body) {
  for (const line of body.split("\n")) {
    const m = /^#{1,6}\s+(.*)$/.exec(line);
    if (m && endsWithPeriod(m[1])) yield ["body heading", line];
  }
}

export async function* contentFiles(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* contentFiles(p);
    else if (e.name.endsWith(".md") || e.name.endsWith(".json")) yield p;
  }
}

export async function scanContent(root) {
  const out = [];
  for await (const file of contentFiles(root)) {
    // The rule is a Chinese-copy convention: English and Japanese files keep their sentence punctuation as supplied.
    if ([`${path.sep}en${path.sep}`, `${path.sep}jp${path.sep}`, `${path.sep}ja${path.sep}`].some((s) => file.includes(s)) || file.endsWith(`${path.sep}en.json`) || file.endsWith(`${path.sep}jp.json`)) continue;
    const text = await readFile(file, "utf8");
    let data, body = "";
    if (file.endsWith(".json")) data = JSON.parse(text);
    else { const [, fm, ...rest] = text.split(/^---$/m); data = YAML.parse(fm) ?? {}; body = rest.join("---"); }
    for (const [key, value] of findings(data)) out.push({ file: path.relative(root, file), key, value });
    for (const [key, value] of headingFindings(body)) out.push({ file: path.relative(root, file), key, value });
  }
  return out;
}
