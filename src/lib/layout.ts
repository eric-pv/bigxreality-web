/**
 * Items per row of a side-by-side group (docs/LAYOUT-RULES.md §1, same as the `.balanced`
 * utility in styles/global.css): 1–3 in one row, 4 as 2 + 2, 5 or more in rows of 3.
 */
export function perRow(count: number): number {
  if (count <= 3) return Math.max(count, 1);
  return count === 4 ? 2 : 3;
}

/** True when item `index` (0-based) is the last one in its desktop row. */
export function endsRow(index: number, count: number): boolean {
  return index === count - 1 || (index + 1) % perRow(count) === 0;
}
