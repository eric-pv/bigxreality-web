import { test } from "node:test";
import assert from "node:assert/strict";
import { tokenize, searchLanguage } from "../src/lib/search-tokenize.ts";

test("CJK runs become overlapping encoded bigrams; Latin words stay", () => {
  const t = tokenize("UAV 戰術訓練");
  assert.match(t, /^UAV( qz[a-z]{8}){3}$/);
  // a query's bigrams appear consecutively inside the document's tokens
  assert.ok(tokenize("SUT 戰術訓練系統").includes(tokenize("戰術訓練")));
  assert.equal(tokenize("術").split(" ").length, 1);
});

test("Japanese kana and the long-vowel mark are tokenized", () => {
  assert.equal(tokenize("シミュレーション").split(" ").length, "シミュレーション".length - 1);
});

test("search language codes are lower case", () => {
  assert.equal(searchLanguage("zh-Hant-TW"), "zh-hant-tw");
});
