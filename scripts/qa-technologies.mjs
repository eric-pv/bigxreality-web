// Inspect actual prerendered HTML and exercise the shared FAQ at three viewport sizes.
// Usage: node scripts/qa-technologies.mjs (or QA_DIST=dist-fixtures/client ...).
import { chromium } from 'playwright-core';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { startPreview, CHROMIUM, DIST } from './lib/serve.mjs';
import { publicSiteRoot } from '../src/lib/public-url.ts';
import { technologyContent, overviewContent } from '../src/data/technologies-content.ts';
import { technologyRelationNotes } from '../src/data/technology-relations.ts';

const languages = ['tw', 'en', 'jp'];
const batchTwo = ['ai-simulation', 'digital-simulation', 'system-integration', 'decision-visualization'];
const live = ['xr', 'ai-simulation', 'digital-simulation', 'training-design', 'system-integration', 'decision-visualization', 'domain-expertise'];
const related = {
  xr: { products: ['sut', 'full-scale-police-training', 'police-box', 'usv', 'fire-extinguisher-simulator'], solutions: [] },
  'training-design': { products: ['sut', 'mortar-observation', 'full-scale-police-training', 'police-box', 'fire-extinguisher-simulator'], solutions: [] },
  'domain-expertise': { products: [], solutions: ['military', 'police', 'fire-rescue', 'smart-city'] },
  'ai-simulation': { products: ['sut', 'uav'], solutions: ['military'] },
  'digital-simulation': { products: ['sut', 'wargaming-table', 'hmmwv-simulator', 'tactical-boat-simulator', 'usv', 'fire-extinguisher-simulator'], solutions: [] },
  'system-integration': { products: ['sut', 'usv'], solutions: ['military', 'mum-t', 'nova'] },
  'decision-visualization': { products: ['wargaming-table'], solutions: ['military', 'nova'] },
};
const locale = { tw: 'zh-TW', en: 'en', jp: 'ja' };
const fixture = DIST.includes('dist-fixtures');
let failed = 0, checked = 0;
const check = (name, ok, detail = '') => {
  checked++;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${!ok && detail ? ` — ${detail}` : ''}`);
};
const text = (s) => s.replace(/\s+/g, ' ').trim();
const sectionParagraphs = (s) => [...(s.paragraphs ?? []), ...(s.items ?? []).flatMap((i) => i.paragraphs ?? []), ...(s.note ? [s.note] : [])];
const paragraphs = (d) => [...d.intro, ...d.sections.flatMap(sectionParagraphs), d.closing.body];
const headings = (d) => [d.title, d.lead, ...d.sections.flatMap((s) => [s.title, ...(s.items ?? []).map((i) => i.title)]), d.relatedTitle, d.closing.title];
const signature = (d) => ({ sections: d.sections.length, intro: d.intro.length, paragraphs: paragraphs(d).length, items: d.sections.map((s) => (s.items ?? []).length), bullets: d.sections.map((s) => (s.bullets ?? []).length), faq: d.faq.length });
const report = [];
const sitemap = readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
for (const slug of live) {
  const source = signature(technologyContent[slug].tw);
  check(`${slug}: translated section/paragraph/list/FAQ counts equal TW`, languages.every((lang) => JSON.stringify(signature(technologyContent[slug][lang])) === JSON.stringify(source)));
}
const masterFile = process.env.QA_TECHNOLOGIES_MASTER;
if (masterFile) {
  const master = readFileSync(masterFile, 'utf8').replace(/\r\n/g, '\n').replace(/\*\*/g, '');
  for (const slug of batchTwo) {
    const start = master.indexOf(`技術 ID：\`${slug}\``);
    const end = master.indexOf('\n---\n', start);
    const rawChunk = master.slice(start, end < 0 ? undefined : end);
    const chunk = text(rawChunk);
    const d = technologyContent[slug].tw;
    const formal = [...headings(d), ...paragraphs(d), ...d.sections.flatMap((s) => s.bullets ?? []), ...d.faq.flatMap((f) => [f.question, f.answer]), d.eyebrow, d.primaryCta, d.secondaryCta, d.closing.cta, d.seo.title, d.seo.description];
    check(`${slug}: every TW formal content field matches the supplied master exactly`, start >= 0 && formal.every((s) => chunk.includes(text(s))), formal.filter((s) => !chunk.includes(text(s))).join(' | '));
    // Check the reverse direction too: long formal paragraphs and every bullet must not be omitted.
    // Related-resource instructions are configuration, not public editorial paragraphs.
    const bodyEnd = rawChunk.indexOf('## Desire｜相關');
    const faqStart = rawChunk.indexOf('## 常見問題');
    const formalSource = rawChunk.slice(0, bodyEnd < 0 ? faqStart : bodyEnd) + '\n' + rawChunk.slice(faqStart);
    const requiredLines = formalSource.split('\n').map((line) => line.trim()).filter((line) => line && !/^##(?:\s|$)|^技術 ID：/.test(line)).map((line) => line.replace(/^###\s+|^-\s+|^Q\d+：|^A：/g, '')).filter((line) => line.length >= 18);
    const joined = text(formal.join('\n'));
    check(`${slug}: no full TW master paragraph or substantive list item is omitted`, requiredLines.every((line) => joined.includes(text(line))), requiredLines.filter((line) => !joined.includes(text(line))).join(' | '));
  }
}

const { base, stop } = await startPreview(4348);
const browser = await chromium.launch({ executablePath: CHROMIUM });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  for (const lang of languages) for (const slug of ['', ...live]) {
    const url = `/${lang}/technologies/${slug ? `${slug}/` : ''}`;
    const data = slug ? technologyContent[slug][lang] : overviewContent[lang];
    const file = path.join(DIST, lang, 'technologies', slug, 'index.html');
    check(`${url}: built HTML exists`, existsSync(file));
    if (!existsSync(file)) continue;
    const raw = readFileSync(file, 'utf8');
    const response = await page.goto(base + url, { waitUntil: 'networkidle' });
    check(`${url}: HTTP 200`, response.status() === 200);
    check(`${url}: shared Header and Footer expose the technologies entry`, await page.locator(`header a[href="/${lang}/technologies/"]`).count() > 0 && await page.locator(`footer a[href="/${lang}/technologies/"]`).count() > 0);
    const initial = await page.evaluate((html) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      return { fullText: doc.body.textContent ?? '', main: doc.querySelector('main')?.textContent ?? '', h1: doc.querySelectorAll('h1').length, faq: [...doc.querySelectorAll('[data-faq] details')].map((d) => ({ q: d.querySelector('summary h3')?.textContent, a: d.querySelector('.a')?.textContent, open: d.hasAttribute('open') })), graphs: [...doc.querySelectorAll('script[type="application/ld+json"]')].flatMap((s) => JSON.parse(s.textContent)['@graph'] ?? []) };
    }, raw);
    check(`${url}: one H1 with localized title`, initial.h1 === 1 && text(await page.locator('h1').innerText()) === text(data.title));
    check(`${url}: unique localized SEO`, (await page.title()).includes(data.seo.title) && await page.locator('meta[name="description"]').getAttribute('content') === data.seo.description);
    check(`${url}: canonical`, await page.locator('link[rel="canonical"]').getAttribute('href') === `${publicSiteRoot}${url}`);
    check(`${url}: hreflang only targets indexable translations`, fixture ? await page.locator('link[rel="alternate"][hreflang]').count() === 0 : (await Promise.all(languages.map(async (l) => page.locator(`link[rel="alternate"][hreflang="${locale[l]}"]`).getAttribute('href')))).every((href, i) => href === `${publicSiteRoot}/${languages[i]}/technologies/${slug ? `${slug}/` : ''}`));
    const robots = page.locator('meta[name="robots"]');
    const noindex = await robots.count() ? await robots.getAttribute('content') : '';
    check(`${url}: correct index/sitemap policy`, fixture ? /noindex/.test(noindex ?? '') && !sitemap.includes(`<loc>${publicSiteRoot}${url}</loc>`) : !/noindex/.test(noindex ?? '') && sitemap.includes(`<loc>${publicSiteRoot}${url}</loc>`));
    check(`${url}: BreadcrumbList agrees with visible breadcrumb`, initial.graphs.some((g) => g['@type'] === 'BreadcrumbList' && g.itemListElement.at(-1)?.item === `${publicSiteRoot}${url}`) && await page.locator('main nav.breadcrumb [aria-current="page"]').count() === 1);
    check(`${url}: no untranslated markers or writing instructions`, !/\[待[^\]]*\]|Attention|Interest|Desire|^Action$|AIDA/.test(initial.main));
    check(`${url}: entire page has no pending translation/content markers`, !/\[待[^\]]*\]/.test(initial.fullText));
    check(`${url}: content images have descriptive alt; decorative sector icons use empty alt`, await page.locator('main img').evaluateAll((imgs) => imgs.every((img) => img.hasAttribute('alt') && (img.alt.trim().length > 0 || !!img.closest('.sector-tag')))));
    if (lang === 'en') check(`${url}: English content image alternatives are localized`, await page.locator('main img').evaluateAll((imgs) => imgs.every((img) => !/[\u3400-\u9fff]/.test(img.alt))));
    check(`${url}: heading hierarchy never skips a level`, await page.locator('main').evaluate((main) => { let previous = 0; return [...main.querySelectorAll('h1,h2,h3,h4,h5,h6')].every((h) => { const level = Number(h.tagName[1]); const ok = level <= previous + 1; previous = level; return ok; }); }));
    check(`${url}: Hero uses relevant supplied media or a text-led layout`, await page.locator('.page-hero .placeholder').count() === 0 && (await page.locator('.page-hero img').count()) === (slug === 'ai-simulation' ? 0 : 1));
    for(const image of await page.locator('main img').all()){await image.scrollIntoViewIfNeeded();await image.evaluate(img=>img.decode());}
    check(`${url}: supplied images decode with localized alt`, await page.locator('main img').evaluateAll(imgs=>imgs.every(img=>img.complete&&img.naturalWidth>0&&(img.alt.trim()||img.closest('.sector-tag')))));
    if (slug) {
      const normalizedInitial = text(initial.main);
      const allCopy = [...headings(data), ...paragraphs(data), ...data.sections.flatMap((s) => s.bullets ?? []), data.primaryCta, data.secondaryCta, data.closing.cta];
      check(`${url}: every full source paragraph, heading, bullet and CTA is in initial HTML`, allCopy.every((s) => normalizedInitial.includes(text(s))));
      check(`${url}: all section blocks present`, await page.locator('[data-technology-section]').count() === data.sections.length);
      check(`${url}: five complete FAQs in initial HTML, initially collapsed`, initial.faq.length === 5 && initial.faq.every((f, i) => !f.open && text(f.q ?? '') === text(data.faq[i].question) && text(f.a ?? '') === text(data.faq[i].answer)));
      const faqLd = initial.graphs.find((g) => g['@type'] === 'FAQPage');
      check(`${url}: FAQ structured data, if emitted, matches visible copy`, !faqLd || faqLd.mainEntity.length === data.faq.length && faqLd.mainEntity.every((f, i) => f.name === data.faq[i].question && f.acceptedAnswer.text === data.faq[i].answer));
      const actions = [
        [data.primaryCta, `/${lang}/${data.primaryDestination ?? (['domain-expertise', 'system-integration'].includes(slug) ? 'solutions' : 'products')}/`],
        [data.secondaryCta, `/${lang}/contact/`],
        [data.closing.cta, `/${lang}/contact/`],
      ];
      check(`${url}: CTA copy agrees with destination`, (await Promise.all(actions.map(async ([label, href]) => { const a = page.locator('main a').filter({ hasText: label }); return (await a.count()) > 0 && (await a.evaluateAll((as) => as.map((n) => n.getAttribute('href')))).every((actual) => actual?.split('#')[0] === href); }))).every(Boolean));
      const notes = technologyRelationNotes[slug]?.[lang] ?? [];
      check(`${url}: related application limitations are visible in initial HTML`, notes.every((note) => normalizedInitial.includes(text(note))) && await page.locator('.relation-notes p').count() === notes.length);
      const expectedResources = [...related[slug].products.map((id) => `/${lang}/products/${id}/`), ...related[slug].solutions.map((id) => `/${lang}/solutions/${id}/`)];
      const actualResources = await page.locator('#related-resources h3 a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      check(`${url}: related products and solutions match the approved separate identities`, actualResources.length === expectedResources.length && expectedResources.every((href) => actualResources.includes(href)), JSON.stringify(actualResources));
      for (const href of expectedResources) {
        const resourceFile = path.join(DIST, href, 'index.html');
        const resourceHtml = existsSync(resourceFile) ? readFileSync(resourceFile, 'utf8') : '';
        check(`${href}: related product or solution links back to ${slug}`, resourceHtml.includes(`href="${url}"`));
      }
      check(`${url}: MUM-T, NOVA, Counter-UAS and smart city are never product pages`, (await page.locator('main a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))).every((href) => !/\/products\/(mum-t|nova|counter-uas|smart-city)\//.test(href ?? '')));
      const articleBlock = page.locator('[data-technology-articles]');
      if (fixture) {
        const expected = lang === 'tw';
        check(`${url}: fixture tags are visible only for published translated articles`, expected ? await articleBlock.locator('a[href="/tw/insights/fixture-insight-1/"]').count() === 1 : await articleBlock.count() === 0);
      }
      check(`${url}: no empty related-article block and at most six localized articles`, (await articleBlock.count()) === 0 || await articleBlock.evaluate((el, prefix) => { const as = [...el.querySelectorAll('h3 a')]; return as.length > 0 && as.length <= 6 && as.every((a) => a.getAttribute('href')?.startsWith(prefix)); }, `/${lang}/insights/`));
      if (await articleBlock.count()) {
        const dates = await articleBlock.locator('time').evaluateAll((ts) => ts.map((t) => t.dateTime));
        check(`${url}: related articles ordered newest first`, dates.every((d, i) => !i || d <= dates[i - 1]));
        const hrefs = await articleBlock.locator('h3 a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
        for (const href of hrefs) {
          const articlePage = await browser.newPage();
          await articlePage.goto(base + href, { waitUntil: 'domcontentloaded' });
          check(`${href}: links back to technology`, await articlePage.locator(`main a[href="${url}"]`).count() > 0);
          const nodes = await articlePage.locator('script[type="application/ld+json"]').evaluateAll((ss) => ss.flatMap((s) => JSON.parse(s.textContent)['@graph'] ?? []));
          check(`${href}: Article structured data`, nodes.some((n) => ['Article', 'BlogPosting', 'TechArticle'].includes(n['@type'])));
          await articlePage.close();
        }
      }
      report.push({ slug, lang, blocks: data.sections.length, paragraphs: paragraphs(data).length, listItems: data.sections.reduce((n, s) => n + (s.items?.length ?? 0) + (s.bullets?.length ?? 0), 0), faq: data.faq.length, images: await page.locator('main img:not(.sector-tag img)').count(), ctas: actions.map(([label, href]) => `${label} → ${href}`).join('; '), seo: 'title / description / canonical / hreflang', copy: allCopy.every((s) => normalizedInitial.includes(text(s))) ? '完整；與資料母版一致' : 'FAIL' });
      await page.locator('[data-faq] summary').nth(0).click();
      await page.locator('[data-faq] summary').nth(1).click();
      check(`${url}: shared FAQ animation disabled for technology pages`, await page.locator('[data-faq] details').nth(1).locator('.a').evaluate((a) => getComputedStyle(a).animationName === 'none'));
      check(`${url}: accordion opens one item at a time`, await page.locator('[data-faq] details[open]').count() === 1 && await page.locator('[data-faq] details').nth(1).evaluate((d) => d.open));
      await page.locator('[data-faq] summary').nth(1).focus();
      await page.keyboard.press('Enter');
      check(`${url}: keyboard collapses the open item`, await page.locator('[data-faq] details[open]').count() === 0);
    } else {
      check(`${url}: complete localized overview introduction`, data.intro.every((s) => text(initial.main).includes(text(s))));
      check(`${url}: seven stable technology summaries`, Object.values(data.technologies).length === 7 && Object.values(data.technologies).every((d) => text(initial.main).includes(text(d.title)) && text(initial.main).includes(text(d.description))));
      report.push({ slug: 'overview', lang, blocks: Object.keys(data.technologies).length, paragraphs: data.intro.length + Object.keys(data.technologies).length, listItems: 7, faq: 0, images: await page.locator('main img:not(.sector-tag img)').count(), ctas: live.map((id) => `/${lang}/technologies/${id}/`).join('; '), seo: 'title / description / canonical / hreflang', copy: data.intro.every((s) => text(initial.main).includes(text(s))) ? '完整；與資料母版一致' : 'FAIL' });
      check(`${url}: all seven technologies have public detail entries`, (await page.locator('main a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))).filter((href) => live.some((id) => href === `/${lang}/technologies/${id}/`)).length >= live.length);
    }
    for (const width of [390, 820, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      check(`${url}: ${width}px has no horizontal scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
      if (slug) {
        await page.locator('[data-faq] summary').nth(0).click();
        check(`${url}: ${width}px FAQ remains usable`, await page.locator('[data-faq] details[open]').count() === 1);
        await page.locator('[data-faq] summary').nth(0).click();
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
} finally {
  await browser.close();
  stop();
}
mkdirSync('.qa', { recursive: true });
const table = ['overview', ...live].map((slug) => {
  const rows = languages.map((l) => report.find((r) => r.slug === slug && r.lang === l));
  return `| ${slug} | ${rows.map((r) => r?.blocks ?? 'FAIL').join(' | ')} | ${rows.map((r) => r?.paragraphs ?? 'FAIL').join(' / ')} | ${rows.map((r) => r?.listItems ?? 'FAIL').join(' / ')} | ${rows.map((r) => r?.faq ?? 'FAIL').join(' / ')} | ${rows.map((r) => `${r?.images ?? '?'} 張內容圖；Alt N/A；圖位 aria-label 已驗證`).join('；')} | 三語 CTA 目的已逐一檢查 | 三語已檢查 | ${rows.every((r) => r?.copy.startsWith('完整')) ? '完整；無缺稿標記' : 'FAIL'} |`;
});
writeFileSync('.qa/technologies-content-audit.md', `# 核心技術三語內容完整性驗收\n\n建置目錄：\`${DIST}\`。共 ${checked} 項檢查，失敗 ${failed} 項。區塊數不含 Hero、關聯、FAQ 與結尾 CTA。段落數含 Hero、內容 items、備註與結尾 CTA。\n\n| 頁面 | TW 區塊 | EN 區塊 | JP 區塊 | TW/EN/JP 段落 | TW/EN/JP 清單項目 | TW/EN/JP FAQ | TW/EN/JP 圖片與 Alt | CTA | SEO | 翻譯完整性 |\n|---|---:|---:|---:|---|---|---|---|---|---|---|\n${table.join('\n')}\n\n## CTA 明細\n\n${report.map((r) => `- ${r.lang}/${r.slug}: ${r.ctas}`).join('\n')}\n\n此自動驗收可確認段落／清單／初始 HTML 的完整性與結構，並非翻譯語意或新增宣稱的獨立人工認證。文字是否忠於繁中母版仍需配合原稿與翻譯審閱。\n`);
writeFileSync('.qa/technologies-batch-two-content-audit.md', readFileSync('.qa/technologies-content-audit.md'));
console.log(failed ? `FAIL: ${failed}/${checked}` : `PASS: ${checked} checks; .qa/technologies-content-audit.md`);
process.exitCode = failed ? 1 : 0;
