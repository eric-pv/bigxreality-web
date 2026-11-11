import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSlot } from "../src/lib/slot.ts";

const photo = { src: "photo", alt: "實際照片" };
const stand = { src: "stand-in", alt: "示意圖" };

test("a public approved photo is shown without a label", () => {
  const r = resolveSlot({ ...photo, kind: "approved" });
  assert.equal(r.src, "photo");
  assert.equal(r.illustration, false);
});

test("an illustration is labelled", () => {
  assert.equal(resolveSlot({ ...photo, kind: "illustration" }).illustration, true);
});

test("a withheld original is never shown, the substitute is, labelled as an illustration", () => {
  const r = resolveSlot({ ...photo, status: "withheld", substitute: stand });
  assert.equal(r.src, "stand-in");
  assert.equal(r.alt, "示意圖");
  assert.equal(r.illustration, true);
});

test("a withheld original without a substitute shows nothing (the CIS placeholder takes over)", () => {
  const r = resolveSlot({ ...photo, status: "withheld", need: "素材需求" });
  assert.equal(r.src, undefined);
  assert.equal(r.alt, undefined);
  assert.equal(r.illustration, false);
  assert.equal(r.need, "素材需求");
});

test("a substitute is ignored while the original is public", () => {
  const r = resolveSlot({ ...photo, substitute: stand });
  assert.equal(r.src, "photo");
  assert.equal(r.illustration, false);
});

test("an illustration without a picture is not labelled", () => {
  assert.equal(resolveSlot({ kind: "illustration", need: "x" }).illustration, false);
});

test("full-image presentation preserves equipment labels without publishing withheld originals", () => {
  const visible = resolveSlot({ ...photo, fit: "contain" });
  assert.equal(visible.fit, "contain");
  assert.equal(visible.src, photo.src);
  const hidden = resolveSlot({ ...photo, fit: "contain", status: "withheld" });
  assert.equal(hidden.src, undefined);
  assert.equal(hidden.alt, undefined);
});
