// About BXR: empty CMS pages stay noindex; the partner page uses the shared logo catalogue.
// Fixture builds also verify the existing timeline, team and investor modules.
import { chromium } from "playwright-core";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { startPreview, CHROMIUM, DIST } from "./lib/serve.mjs";

const fixtures = DIST.includes("fixtures");
let failed = 0;
const check = (name, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok || !detail ? "" : `  — ${detail}`}`);
};
const LEAK = ["待提供", "待翻譯", "不得"];
const { base, stop } = await startPreview(4337);
const browser = await chromium.launch({ executablePath: CHROMIUM });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const robots = async () => page.getAttribute('meta[name=robots]', "content");
  const main = async () => page.locator("main").innerText();
  const sm = readFileSync(path.join(DIST, "sitemap.xml"), "utf8");

  await page.goto(`${base}/tw/company/`, { waitUntil: "networkidle" });
  check("about us: heading and three paragraphs", (await page.locator("h1").innerText()).trim() === "虛擬訓練．真實應變．守護未來" && (await page.locator(".page-hero .desc").count()) === 3);

  for (const slug of ["team", "partners", "investors"]) {
    await page.goto(`${base}/tw/company/${slug}/`, { waitUntil: "networkidle" });
    const text = await main();
    check(`${slug}: no placeholder text`, !LEAK.some((w) => text.includes(w)), LEAK.filter((w) => text.includes(w)).join(","));
    if (!fixtures && slug === "investors") {
      check(`${slug}: plain empty state, noindex, not in the sitemap`, (await page.locator("[data-company-empty]").isVisible()) && (await robots()) === "noindex" && !sm.includes(`/tw/company/${slug}/`));
      check(`${slug}: the contact page stays reachable from the empty state`, (await page.locator('[data-company-empty] a[href="/tw/contact/"]').count()) === 1);
    }
  }
  if (!fixtures) {
    await page.goto(`${base}/tw/company/investors/`, { waitUntil: "networkidle" });
    check("investors: no module is offered without records", (await page.locator("[data-investor-modules]").count()) === 0);
    check("investors: no module pages are built", ["profile", "financials", "governance", "shareholders", "announcements", "briefings", "contact"].every((m) => !existsSync(path.join(DIST, `tw/company/investors/${m}`))));
    check("sitemap has about and populated partners", sm.includes("/tw/company/") && sm.includes("/tw/company/partners/") && !/company\/(history|investors)/.test(sm));
  } else {
    await page.goto(`${base}/tw/company/partners/`, { waitUntil: "networkidle" });
    const heads = await page.$$eval(".logo-category h2", (hs) => hs.map((h) => h.textContent.trim()));
    const text = await main();
    check("partners: shared client catalogue groups in the fixed order", JSON.stringify(heads) === JSON.stringify(["國防與公共安全", "研究與技術機構", "政府與公共事業", "產業與專業協會"]), heads.join());
    check("partners: an unauthorised partner is never shown", !text.includes("未授權夥伴") && !readFileSync(path.join(DIST, "tw/company/partners/index.html"), "utf8").includes("未授權夥伴"));
    await page.goto(`${base}/tw/company/investors/`, { waitUntil: "networkidle" });
    const cards = await page.$$eval("[data-investor-modules] h2", (hs) => hs.map((h) => h.textContent.trim()));
    check("investors: only modules with published records, in the fixed order", JSON.stringify(cards) === JSON.stringify(["公司基本資料", "重大訊息與公告", "投資人聯絡窗口"]), cards.join());
    check("investors: modules without records have no page (incl. a future-dated record)", ["financials", "governance", "shareholders", "briefings"].every((m) => !existsSync(path.join(DIST, `tw/company/investors/${m}`))));
    await page.goto(`${base}/tw/company/investors/announcements/`, { waitUntil: "networkidle" });
    const titles = await page.$$eval(".record h2", (hs) => hs.map((h) => h.textContent.trim()));
    check("announcements: newest first", titles[0].includes("公告二") && titles[1].includes("公告一"), titles.join());
    check("announcements: attachment is a download link", (await page.locator('.files a[href="https://example.com/fixture.pdf"]').count()) === 1);
    check("module nav lists only enabled modules", (await page.locator(".modules a").count()) === 3);
    await page.goto(`${base}/tw/company/investors/profile/`, { waitUntil: "networkidle" });
    check("profile: facts list", (await page.locator(".facts > div").count()) === 2);
  }

  // Careers (docs/careers/104-INTEGRATION.md): job cards only from a validated 104 snapshot.
  const snap = JSON.parse(readFileSync(fixtures ? "tests/fixtures/careers-104.json" : "src/data/careers-104.json", "utf8"));
  const companyUrl = JSON.parse(readFileSync("src/data/site.json", "utf8")).careersUrl;
  for (const lang of ["tw", "en", "jp"]) {
    await page.goto(`${base}/${lang}/company/`, { waitUntil: "networkidle" });
    const sec = page.locator("[data-careers]");
    check(`${lang} careers: section on About BXR links to the 104 company page in a new tab`, (await sec.count()) === 1 && (await sec.locator(`a[data-careers-company][href="${companyUrl}"][target=_blank][rel~=noopener]`).count()) === 1);
    const hrefs = await sec.locator("[data-job] a.apply").evaluateAll((as) => as.map((a) => [a.closest("[data-job]").dataset.job, a.getAttribute("href"), a.target, a.rel]));
    if (snap.status !== "ok") {
      check(`${lang} careers: no job cards or sync date before the first validated sync`, hrefs.length === 0 && (await sec.locator("[data-careers-updated],[data-careers-none]").count()) === 0);
    } else {
      check(`${lang} careers: one card per opening, newest first`, JSON.stringify(hrefs.map((h) => h[0])) === JSON.stringify(snap.jobs.map((j) => j.jobNo)), hrefs.map((h) => h[0]).join());
      check(`${lang} careers: every apply button opens its own 104 job page`, hrefs.every(([no, href, target, rel]) => href === `https://www.104.com.tw/job/${no}` && target === "_blank" && rel.includes("noopener")));
      check(`${lang} careers: last successful sync date shown`, (await sec.locator("[data-careers-updated]").count()) === 1);
    }
  }

  for (const [w, label] of [[390, "phone"], [820, "tablet"]]) {
    const v = await browser.newPage({ viewport: { width: w, height: 900 } });
    for (const p of ["company", "company/team", "company/partners", "company/investors"]) {
      await v.goto(`${base}/tw/${p}/`, { waitUntil: "networkidle" });
      check(`${label} /${p}/: no horizontal scroll`, await v.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    }
    await v.close();
  }
} finally {
  await browser.close();
  stop();
}
console.log(failed ? `FAIL: ${failed}` : "PASS");
process.exit(failed ? 1 : 0);
