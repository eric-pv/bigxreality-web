import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveContentSource } from "../src/lib/content-source.ts";

test("Git Markdown is the default and only official content source", () => {
  assert.equal(resolveContentSource(undefined), "markdown");
  assert.equal(resolveContentSource("markdown"), "markdown");
});

test("TEST FIXTURE builds are the only other accepted source", () => {
  assert.equal(resolveContentSource("fixtures"), "fixtures");
});

test("retired remote CMS sources and unknown values fail the build", () => {
  for (const value of ["emdash", "bootstrap", "draft", ""]) {
    assert.throws(() => resolveContentSource(value), /must be markdown or fixtures/, value);
  }
});
