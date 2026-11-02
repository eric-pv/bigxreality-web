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
    rules.push(...kept.map((x) => x.rule));
    console.log(`fonts: ${lang}.css ${families.find((f) => f.key === key).to} ${kept.length}/${byFamily[key].length} rules`);
  }
  await writeFile(path.join(out, `${lang}.css`), rules.join("\n") + "\n");
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
