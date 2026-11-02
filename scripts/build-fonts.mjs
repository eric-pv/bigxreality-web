// Copies self-hosted font files into public/fonts and writes one stylesheet per
// page language (tw.css, en.css, jp.css; loaded by src/components/FontLinks.astro).
// Font family names are rewritten to the names used by the design tokens
// (--font-sans / --font-mono), so the tokens file stays untouched.
//
// The CJK families come as ~110-125 unicode-range subsets each. A language's
// stylesheet keeps only the @font-face rules whose range covers a character found
// in the Git text that can appear on that language's pages (src/, test fixtures);
// the content is rebuilt from Git on every build, so a new character in content
// brings its subset back. tw files are the structural source and can surface on
// every language; en/jp files only on their own. Characters outside every kept
// range (e.g. typed into the search box) use the next font of the stack.
// EmDash/bootstrap builds read content that is not in Git and keep every rule.
//
// The unicode-range lists are most of each stylesheet's bytes (fontsource spells every
// subset as hundreds of single code points). Within a family, a kept rule's gaps that hold
// no code point of another kept rule of that family are folded into its ranges: the code
// points in such a gap belong to a dropped subset or to no subset, so they fall back to
// the next font either way (now after the browser finds the glyph missing in the file).
// Every character of a kept subset still selects the same file. The rules are written
// without line breaks and without the default `font-style: normal`; font-display stays.
//
// B612 Mono is a single @font-face in src/styles/global.css (the browser fetches
// it only on pages that render .t-tech / code text); only its file is copied here.
import { mkdir, readFile, writeFile, copyFile, readdir, rm } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "public/fonts");
const LANGS = ["tw", "en", "jp"];

const families = [
  { key: "tc", pkg: "@fontsource-variable/noto-sans-tc", css: "index.css", from: "Noto Sans TC Variable", to: "Noto Sans TC" },
  { key: "jp", pkg: "@fontsource-variable/noto-sans-jp", css: "index.css", from: "Noto Sans JP Variable", to: "Noto Sans JP" },
  { key: "mono", pkg: "@fontsource/b612-mono", css: "latin-400.css", from: "B612 Mono", to: "B612 Mono" },
];
// Families per page language (global.css: :lang(ja) puts Noto Sans JP before Noto Sans TC).
const stacks = { tw: ["tc"], en: ["tc"], jp: ["jp", "tc"] };

/** @font-face rules of one family, each with its file and code point ranges. */
function faces(css) {
  return [...css.matchAll(/@font-face\s*\{[^}]*\}/g)].map(([rule]) => ({
    rule,
    file: rule.match(/url\(\/fonts\/([^)]+)\)/)[1],
    ranges: (rule.match(/unicode-range:\s*([^;]+);/)?.[1] ?? "U+0-10FFFF").split(",").map((r) => {
      const [a, b] = r.trim().slice(2).split("-");
      return [parseInt(a, 16), parseInt(b ?? a, 16)];
    }),
  }));
}
const covers = (face, cp) => face.ranges.some(([a, b]) => cp >= a && cp <= b);
const hex = (n) => n.toString(16);

/** Rules of one family with their unicode-range folded over gaps no other kept rule uses. */
function compact(kept) {
  const owner = new Int16Array(0x110000); // 0: no kept rule, i + 1: rule i only, -1: several
  kept.forEach((face, i) => {
    for (const [a, b] of face.ranges) for (let cp = a; cp <= b; cp++) owner[cp] = owner[cp] && owner[cp] !== i + 1 ? -1 : i + 1;
  });
  const free = (lo, hi, id) => {
    for (let cp = lo; cp <= hi; cp++) if (owner[cp] !== 0 && owner[cp] !== id) return false;
    return true;
  };
  return kept.map((face, i) => {
    const ranges = [];
    for (const r of [...face.ranges].sort((x, y) => x[0] - y[0])) {
      const last = ranges.at(-1);
      if (last && free(last[1] + 1, r[0] - 1, i + 1)) last[1] = Math.max(last[1], r[1]);
      else ranges.push([...r]);
    }
    const range = ranges.map(([a, b]) => (a === b ? `U+${hex(a)}` : `U+${hex(a)}-${hex(b)}`)).join(",");
    return face.rule
      .replace(/unicode-range:\s*[^;]+;/, `unicode-range: ${range};`)
      .replace(/\s*font-style:\s*normal;/, "")
      .replace(/\s*\n\s*/g, "");
  });
}

await mkdir(out, { recursive: true });
// Stylesheets from an earlier layout (one per family) must not linger in public/.
for (const n of await readdir(out)) if (n.endsWith(".css")) await rm(path.join(out, n));

const byFamily = {};
for (const f of families) {
  const dir = path.join(root, "node_modules", f.pkg);
  let css = await readFile(path.join(dir, f.css), "utf8");
  css = css
    .replaceAll(`'${f.from}'`, `'${f.to}'`)
    // keep woff2 only; every supported browser reads it
    .replace(/,\s*url\([^)]*\.woff\) format\('woff'\)/g, "")
    .replace(/url\(\.\/files\//g, "url(/fonts/")
    .replace(/\/\*.*?\*\/\n/g, "");
  byFamily[f.key] = faces(css);
  const used = new Set(byFamily[f.key].map((x) => x.file));
  const files = (await readdir(path.join(dir, "files"))).filter((n) => used.has(n));
  await Promise.all(files.map((n) => copyFile(path.join(dir, "files", n), path.join(out, n))));
}

// Characters per language. null = keep every rule.
const source = process.env.BXR_CONTENT_SOURCE ?? "markdown";
const chars = source === "emdash" || source === "bootstrap" ? null : await gitTextChars();

for (const lang of LANGS) {
  const rules = [];
  const used = chars && [...chars[lang]];
  for (const key of stacks[lang]) {
    // Noto Sans TC keeps every rule a jp character needs too: it is also the CJK fallback of --font-mono.
    const kept = byFamily[key].filter((face) => !used || used.some((cp) => covers(face, cp)));
    rules.push(...compact(kept));
    console.log(`fonts: ${lang}.css ${families.find((f) => f.key === key).to} ${kept.length}/${byFamily[key].length} rules`);
  }
  const text = rules.join("\n") + "\n";
  await writeFile(path.join(out, `${lang}.css`), text);
  console.log(`fonts: ${lang}.css ${(text.length / 1024).toFixed(1)} KB`);
}

async function gitTextChars() {
  const sets = Object.fromEntries(LANGS.map((l) => [l, new Set()]));
  const add = (langs, text) => {
    for (const c of text) {
      const cp = c.codePointAt(0);
      for (const l of langs) sets[l].add(cp);
    }
  };
  // Printable ASCII is always available; Intl dates are not spelled out in the sources.
  add(LANGS, String.fromCharCode(...Array.from({ length: 95 }, (_, i) => i + 32)));
  const locales = { tw: "zh-TW", en: "en-US", jp: "ja-JP" };
  for (const l of LANGS) {
    for (let m = 0; m < 12; m++) {
      const date = new Date(Date.UTC(2026, m, 1 + m * 2));
      for (const o of [{ dateStyle: "full" }, { year: "numeric", month: "2-digit", day: "2-digit" }, { year: "numeric", month: "long" }]) {
        add([l], new Intl.DateTimeFormat(locales[l], { ...o, timeZone: "UTC" }).format(date));
      }
    }
  }
  for (const dir of ["src", "tests/fixtures"]) {
    for (const rel of await readdir(path.join(root, dir), { recursive: true })) {
      if (!/\.(astro|ts|tsx|js|mjs|json|md|mdx|ya?ml|svg|txt)$/.test(rel)) continue;
      const lang = rel.split(path.sep).find((part) => /^(tw|en|jp)(\.[a-z]+)?$/.test(part))?.slice(0, 2);
      add(lang === "en" || lang === "jp" ? [lang] : LANGS, await readFile(path.join(root, dir, rel), "utf8"));
    }
  }
  return sets;
}
