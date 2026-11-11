import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';
import { startPreview, CHROMIUM, DIST } from './lib/serve.mjs';

const out = 'docs/reviews/natural-typography';
fs.mkdirSync(out, { recursive: true });
function routes(dir, list = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && !['_astro', 'pagefind', 'admin', 'fonts', 'media', 'video'].includes(e.name)) routes(p, list);
    else if (e.name === 'index.html') {
      const r = '/' + path.relative(DIST, path.dirname(p)).replaceAll(path.sep, '/') + '/';
      if (/^\/(tw|en|jp)\//.test(r) && !r.includes('/news/filter/')) list.push(r);
    }
  }
  return list;
}
const widths = [320, 375, 390, 430, 768, 1024, 1440];
const all = routes(DIST);
function buildFingerprint() {
  const hash = createHash('sha256');
  for (const route of all) hash.update(route).update(fs.readFileSync(path.join(DIST, route, 'index.html')));
  return hash.digest('hex');
}
const fingerprint = buildFingerprint();
const jobs = widths.flatMap(width => all.map(route => ({ width, route })));
const server = await startPreview(4389);
const browser = await chromium.launch({ executablePath: CHROMIUM });
const issues = [], errors = [];
let checked = 0, blocks = 0;
try {
  // Independent pages share the same immutable build; no rebuild may run during this check.
  await Promise.all(Array.from({ length: 6 }, async () => {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', r => ['image', 'media'].includes(r.request().resourceType()) ? r.abort() : r.continue());
    while (jobs.length) {
      const { width, route } = jobs.shift();
      await page.setViewportSize({ width, height: 1000 });
      assert.equal((await page.goto(server.base + route, { waitUntil: 'domcontentloaded' })).status(), 200);
      await page.evaluate(() => {
        // Isolate the review state from the production single-open accordion controller.
        // Cloning removes its local toggle listeners; removing name disables native grouping.
        document.querySelectorAll('main [data-faq]').forEach(list => list.replaceWith(list.cloneNode(true)));
        document.querySelectorAll('main details').forEach(el => { el.removeAttribute('name'); el.open = true; });
        document.body.getBoundingClientRect();
      });
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(() => {
        const found = [];
        let blocks = 0;
        for (const el of document.querySelectorAll('main h1,main h2,main h3,main h4,main p,main figcaption,main dt,main dd,main .editorial-cover .headline,main li:not(:has(p,h1,h2,h3,h4,ul,ol)),main a.btn')) {
          const box = el.getBoundingClientRect();
          if (box.width < 1 || el.closest('.visually-hidden,[hidden]') || getComputedStyle(el).visibility === 'hidden') continue;
          blocks++;
          const tolerance = Math.max(3, parseFloat(getComputedStyle(el).lineHeight) / 3);
          const lines = new Map(), walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          let n;
          while ((n = walk.nextNode())) {
            if (n.parentElement.closest('.visually-hidden,[hidden]')) continue;
            const positions = [];
            for (let i = 0; i < n.length; i++) {
              const range = new Range(); range.setStart(n, i); range.setEnd(n, i + 1);
              const rect = range.getBoundingClientRect();
              // Line-clamped card excerpts have hidden text nodes. Audit visible lines only.
              if (rect.width > .1 && rect.top < box.bottom - .5) {
                const y = [...lines.keys()].find(y => Math.abs(y - rect.top) < tolerance) ?? Math.round(rect.top);
                lines.set(y, (lines.get(y) || '') + n.data[i]); positions[i] = y;
              }
            }
            if (document.documentElement.lang.startsWith('zh') && n.parentElement.closest('.type-phrase') && new Set(positions.filter(y => y !== undefined)).size > 1) {
              found.push({ reason: 'broken Chinese word', text: el.textContent.trim(), word: n.data });
            }
            for (const match of n.data.matchAll(/[A-Za-z]{3,}/g)) {
              if (/^https?:\/\//.test(n.parentElement.closest('a')?.textContent.trim() ?? '')) continue;
              const ys = new Set(positions.slice(match.index, match.index + match[0].length).filter(y => y !== undefined));
              // Emergency wrapping of an unbroken identifier wider than its container is allowed.
              if (ys.size > 1) {
                const range = new Range(); range.setStart(n, match.index); range.setEnd(n, match.index + match[0].length);
                const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
                ctx.font = getComputedStyle(n.parentElement).font;
                if (ctx.measureText(match[0]).width <= box.width) found.push({ reason: 'broken English word', text: el.textContent.trim(), word: match[0] });
              }
            }
          }
          const textLines = [...lines.values()].map(s => s.trim()).filter(Boolean);
          if (textLines.length < 2) continue;
          const tail = textLines.at(-1);
          const tailLetters = tail.replace(/[\p{P}\p{Z}\s]/gu, '');
          if (/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]{1,2}$/u.test(tailLetters)) {
            found.push({ reason: 'one/two-character final line', text: el.textContent.trim(), lines: textLines });
          }
          if (textLines.some(s => /^[，。、；：！？）」』】》〉〕〗〙〛・·”’]/u.test(s))) {
            found.push({ reason: 'closing punctuation at line start', text: el.textContent.trim(), lines: textLines });
          }
        }
        if (document.documentElement.scrollWidth > innerWidth + 1) found.push({ reason: 'horizontal page overflow' });
        return { found, blocks };
      });
      blocks += result.blocks;
      issues.push(...result.found.map(issue => ({ route, width, ...issue })));
      checked++;
      if (checked % 100 === 0) fs.writeFileSync(`${out}/ISSUES.json`, JSON.stringify(issues, null, 2) + "\n");
      if (checked % 100 === 0) console.log(`Typography: ${checked}/${all.length * widths.length} page/viewports`);
    }
    await page.close();
  }));
  assert.equal(buildFingerprint(), fingerprint, 'Build changed during typography QA; rerun against an immutable build');
  issues.sort((a, b) => a.width - b.width || a.route.localeCompare(b.route));
  fs.writeFileSync(`${out}/ISSUES.json`, JSON.stringify(issues, null, 2) + '\n');
  fs.writeFileSync(`${out}/RESULTS.json`, JSON.stringify({ buildFingerprint: fingerprint, routes: all.length, widths, pageViewportChecks: checked, visibleTextBlockChecks: blocks, issues: issues.length, jsErrors: errors }, null, 2) + '\n');
  assert.deepEqual(errors, [], 'Browser errors');
  assert.equal(issues.length, 0, `Typography failures: see ${out}/ISSUES.json`);
  console.log(`PASS: ${checked} page/viewports, ${blocks} visible text blocks`);
} finally {
  await browser.close(); server.stop();
}
