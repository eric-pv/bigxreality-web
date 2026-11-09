// Read the built site without executing page scripts or contacting external services.
// This documents existing topic ownership; it does not estimate demand or rankings.
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { CHROMIUM, DIST } from './lib/serve.mjs';

const out = process.env.SEO_ALT_REPORT_DIR ?? 'docs/audits/seo-alt-2026-11-09';
const focus = JSON.parse(await fs.readFile('docs/audits/seo-alt-2026-11-09/keyword-focus.json', 'utf8'));
const technical = JSON.parse(await fs.readFile(process.env.SEO_REPORT ?? '/tmp/bxr-seo-report.json', 'utf8'));
const files = [];
async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory() && !['admin', '_astro', 'pagefind'].includes(entry.name)) await walk(file);
    else if (entry.name === 'index.html' && /^(tw|en|jp)\//.test(path.relative(DIST, file))) files.push(file);
  }
}
await walk(DIST);
const browser = await chromium.launch({ executablePath: CHROMIUM });
const context = await browser.newContext({ javaScriptEnabled: false });
await context.route('**/*', route => route.abort());
const pages = [], images = [];
try {
  const page = await context.newPage();
  for (const file of files.sort()) {
    const route = '/' + path.relative(DIST, path.dirname(file)).replaceAll(path.sep, '/') + '/';
    await page.setContent(await fs.readFile(file, 'utf8'), { waitUntil: 'domcontentloaded' });
    const data = await page.evaluate(() => {
      const meta = name => document.querySelector(`meta[name="${name}"],meta[property="${name}"]`)?.getAttribute('content') ?? '';
      const text = node => node?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      const main = document.querySelector('main')?.cloneNode(true);
      main?.querySelectorAll('script,style,form,[hidden],.visually-hidden,[aria-hidden="true"]').forEach(node => node.remove());
      return {
        title: document.title, description: meta('description'), h1: text(document.querySelector('h1')),
        robots: meta('robots'), canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
        alternates: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map(node => node.getAttribute('hreflang')),
        keywords: meta('keywords'), ogImage: meta('og:image'), ogAlt: meta('og:image:alt'), body: text(main),
        images: [...document.images].map((img, index) => ({
          index: index + 1, src: img.getAttribute('src') ?? '', altPresent: img.hasAttribute('alt'), alt: img.getAttribute('alt') ?? '',
          decorative: img.closest('[aria-hidden="true"]') ? 'aria-hidden decorative thumbnail' : img.closest('.sector-tag') ? 'sector icon with adjacent text' : '',
          caption: text(img.closest('figure')?.querySelector('figcaption')),
        })),
      };
    });
    const lang = route.split('/')[1];
    const template = route.replace(/^\/(tw|en|jp)/, '');
    const indexable = !data.robots.includes('noindex');
    const titleParts = data.title.replace(/\s*\|\s*Big x Reality$/i, '').split(/[|｜]/).map(value => value.trim()).filter(Boolean);
    const assignment = focus[template];
    const business = /^\/(products|solutions|technologies)\//.test(template) || template === '/';
    const primary = indexable ? assignment?.primary[lang] ?? titleParts[0] : '';
    const normalize = value => value.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{Z}\s]/gu, '');
    const mentions = value => primary ? normalize(value).includes(normalize(primary)) : null;
    const record = {
      route, lang, indexable, canonical: data.canonical, title: data.title, titleCharacters: [...data.title].length,
      description: data.description, descriptionCharacters: [...data.description].length, h1: data.h1,
      primaryFocus: primary, secondaryFocus: indexable ? (assignment?.secondary?.[lang] ?? titleParts.slice(1)).join('; ') : '',
      candidateQueries: indexable ? (assignment?.candidateQueries?.[lang] ?? []).join('; ') : '',
      intent: !indexable ? '刻意不作自然搜尋目標' : assignment?.intent ?? (business ? '新增商業頁：待人工核對關鍵字分工' : route.includes('/news/') ? '新聞事件／文章主題；分頁承接消息列表' : '品牌／公司／政策／聯絡資訊'),
      focusSource: !indexable ? 'noindex' : assignment ? '人工核對現有商業頁主題' : business ? '待人工核對商業主題' : '現有 SEO 標題的資訊主題，非搜尋量研究',
      primaryInTitle: mentions(data.title), primaryInDescription: mentions(data.description), primaryInH1: mentions(data.h1), primaryInBody: mentions(data.body),
      imageCount: data.images.length, missingAlt: data.images.filter(img => !img.altPresent).length,
      unexplainedEmptyAlt: data.images.filter(img => !img.alt && !img.decorative).length,
      hreflang: data.alternates.join('; '), ogImage: data.ogImage, ogAlt: data.ogAlt, metaKeywordsPresent: !!data.keywords,
    };
    pages.push(record);
    for (const img of data.images) images.push({
      route, lang, index: img.index,
      source: img.src.startsWith('data:') ? `data:image/svg+xml#${createHash('sha256').update(img.src).digest('hex').slice(0, 12)}` : decodeURIComponent(img.src),
      alt: img.alt, altPresent: img.altPresent, decorativeReason: img.decorative,
      genericRepresentative: /代表畫面|representative image|紹介画像/i.test(img.alt), caption: img.caption,
    });
  }
} finally { await browser.close(); }
const csv = rows => {
  const keys = Object.keys(rows[0]);
  const cell = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
  return keys.map(cell).join(',') + '\n' + rows.map(row => keys.map(key => cell(row[key])).join(',')).join('\n') + '\n';
};
const indexable = pages.filter(page => page.indexable);
assert.equal(technical.checked, pages.length, 'Technical SEO and inventory coverage differ; rerun qa:seo against this build');
assert.deepEqual(technical.errors, [], 'Resolve technical SEO errors before publishing the inventory');
const report = {
  builtPages: pages.length, indexable: indexable.length, noindex: pages.length - indexable.length,
  languages: Object.fromEntries(['tw', 'en', 'jp'].map(lang => [lang, pages.filter(page => page.lang === lang).length])),
  businessKeywordGroups: Object.keys(focus).length, businessKeywordPages: pages.filter(page => page.focusSource === '人工核對現有商業頁主題').length,
  informationalKeywordPages: indexable.filter(page => page.focusSource === '現有 SEO 標題的資訊主題，非搜尋量研究').length,
  unmappedBusinessPages: pages.filter(page => page.focusSource === '待人工核對商業主題').map(page => page.route),
  imageInstances: images.length, missingAlt: pages.reduce((sum, page) => sum + page.missingAlt, 0),
  emptyDecorativeAlt: images.filter(img => !img.alt && img.decorativeReason).length,
  unexplainedEmptyAlt: pages.reduce((sum, page) => sum + page.unexplainedEmptyAlt, 0),
  genericRepresentativeAltInstances: images.filter(img => img.genericRepresentative).length,
  brandOgFallbackIndexable: indexable.filter(page => page.ogImage.endsWith('/icon-512.png')).length,
  titlesOver70Characters: indexable.filter(page => page.titleCharacters > 70).map(page => page.route),
  metaKeywordsPages: pages.filter(page => page.metaKeywordsPresent).length,
  technicalSeo: technical,
  limits: ['Static build, not proof of deployed Pages or Google indexing.', 'No Search Console, search volume, ranking or competitor data.', 'Literal keyword matching is diagnostic, not a demand to repeat exact phrases.', 'Empty decorative alt is intentional; do not stuff it with keywords.'],
};
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, 'pages.csv'), '\uFEFF' + csv(pages));
await fs.writeFile(path.join(out, 'image-alt.csv'), '\uFEFF' + csv(images));
await fs.writeFile(path.join(out, 'summary.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ ...report, technicalSeo: { checked: technical.checked, errors: technical.errors, warnings: technical.warnings }, titlesOver70Characters: report.titlesOver70Characters.length }, null, 2));
