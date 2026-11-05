import { test } from "node:test";
import assert from "node:assert/strict";
import { TECHNOLOGY_IDS, LIVE_TECHNOLOGY_IDS, selectTechnologyArticles, technologyHref, technologyResources } from "../src/lib/technologies.ts";
const make = (day: number, overrides = {}) => ({
  collection: "insights", lang: "en" as const, pendingTranslation: false,
  base: { data: { publishDate: new Date(`2026-01-${String(day).padStart(2, "0")}T00:00:00Z`), technologyTags: ["xr"] } },
  loc: { data: { translationStatus: "translated" }, body: "Genuine translated article" }, ...overrides,
});
test("related localized cards exclude pending and missing translations while preserving editorial order", () => {
  const entries = [
    { slug: "second", pendingTranslation: false },
    { slug: "pending", pendingTranslation: true },
    { slug: "unrelated", pendingTranslation: false },
    { slug: "first", pendingTranslation: false },
  ];
  assert.deepEqual(technologyResources(entries, ["first", "missing", "pending", "second"]).map((entry) => entry.slug), ["first", "second"]);
  assert.deepEqual(technologyResources(entries, ["pending", "missing"]), []);
});
test("technology taxonomy keeps seven IDs and seven complete public details", () => {
  assert.equal(new Set(TECHNOLOGY_IDS).size, 7);
  assert.equal(LIVE_TECHNOLOGY_IDS.length, 7);
  assert.equal(technologyHref("xr", "jp"), "/jp/technologies/xr/");
  assert.equal(technologyHref("ai-simulation", "en"), "/en/technologies/ai-simulation/");
});
test("technology article query filters publication, locale and translation, sorts latest and limits six", () => {
  const valid = Array.from({ length: 8 }, (_, i) => make(i + 1));
  const invalid = [make(9, { lang: "jp" }), make(10, { pendingTranslation: true }), make(11, { collection: "news" }),
    make(12, { loc: { data: { translationStatus: "translated", draft: true }, body: "draft" } }),
    make(13, { loc: { data: { translationStatus: "translated" }, body: "" } }),
    make(14, { base: { data: { publishDate: new Date("2027-01-01"), technologyTags: ["xr"] } } }),
    make(15, { base: { data: { publishDate: new Date("2026-01-15"), technologyTags: ["training-design"] } } }),
    make(16, { base: { data: { publishDate: new Date("2026-01-16"), technologyTags: ["xr"], draft: true } } })];
  const result = selectTechnologyArticles([...valid, ...invalid], "xr", "en", 6, new Date("2026-02-01"));
  assert.deepEqual(result.map((a) => a.base.data.publishDate.getUTCDate()), [8, 7, 6, 5, 4, 3]);
  assert.deepEqual(selectTechnologyArticles(valid, "domain-expertise", "en"), []);
});

test('technology publication uses TW authority and excludes incomplete translations', async()=>{
  const {publishedTechnologyLanguages}=await import('../src/lib/technologies.ts');
  const entries={tw:{translationStatus:'source',draft:false},en:{translationStatus:'translated',draft:false},jp:{translationStatus:'pending',draft:false}};
  assert.deepEqual(publishedTechnologyLanguages(entries),['tw','en']);
  assert.deepEqual(publishedTechnologyLanguages({...entries,tw:{...entries.tw,draft:true}}),[]);
  assert.deepEqual(publishedTechnologyLanguages({...entries,en:{...entries.en,draft:true}}),['tw']);
});
