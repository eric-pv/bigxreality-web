import { plain } from "./text";

const key = (s: string | undefined) => plain(s ?? "").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, "");

/** True when two short texts name the same thing ("產品" / "產品", "訓練挑戰" / "警勤訓練挑戰", "Related" / "Related Products"). */
function repeats(label: string, heading: string): boolean {
  if (!label || !heading) return false;
  if (label === heading || label.includes(heading)) return true;
  // A long headline that happens to contain the label word still says something else.
  return heading.includes(label) && heading.length <= label.length * 2 + 6;
}

/**
 * A label line (eyebrow, subtitle) adds nothing when it repeats a heading next to it;
 * it is then left out, so one idea is shown once.
 */
export function distinctLabel(label: string | undefined, ...headings: (string | undefined)[]): string | undefined {
  const k = key(label);
  if (!k) return undefined;
  return headings.some((h) => repeats(k, key(h))) ? undefined : label;
}
