// Line-level LCS diff producing aligned side-by-side rows.
// Each row has a `left` and/or `right` line; missing side = "" placeholder.
//
// H3 notes (memory + DoS hardening):
//  - The LCS DP table is stored in Uint32Array rows (~4 bytes/cell) instead of
//    `number[][]` (~8 bytes/cell plus per-row object overhead). For two
//    2k-line inputs this is ~16 MB instead of well over 64 MB, and each row is
//    one contiguous block, which is dramatically friendlier to the allocator.
//  - Inputs are capped at MAX_INPUT_LINES per side. Previously a 100k-line
//    paste would allocate a (100001 × 100001) DP table — that OOMs or hangs the
//    tab. Over-long tails are truncated and a marker row is appended so the UI
//    never silently shows a partial diff.
//  - Output rows are additionally capped at MAX_DIFF_ROWS as a safety valve.

export type DiffOp = "equal" | "del" | "ins" | "mod";

export interface DiffRow {
  op: DiffOp;
  left: string | null; // vulnerable side; null = blank filler
  right: string | null; // fixed side; null = blank filler
  leftNo: number | null;
  rightNo: number | null;
}

/** Maximum number of lines taken from each input before truncation. */
export const MAX_INPUT_LINES = 2000;
/** Hard cap on the number of emitted diff rows (post-merge). */
export const MAX_DIFF_ROWS = 4000;

const TRUNCATED_MARKER = `… diff truncated at ${MAX_INPUT_LINES} lines`;

export function diffLines(a: string, b: string): DiffRow[] {
  let aLines = a.split("\n");
  let bLines = b.split("\n");

  const truncated =
    aLines.length > MAX_INPUT_LINES || bLines.length > MAX_INPUT_LINES;
  if (truncated) {
    aLines = aLines.slice(0, MAX_INPUT_LINES);
    bLines = bLines.slice(0, MAX_INPUT_LINES);
  }

  const n = aLines.length;
  const m = bLines.length;

  // Standard LCS DP, but backed by Uint32Array rows to keep the allocation
  // tight (H3). LCS lengths here are bounded by min(n, m) ≤ MAX_INPUT_LINES,
  // so a u32 per cell is exact and overflow-free.
  const dp: Uint32Array[] = new Array(n + 1);
  for (let i = 0; i <= n; i++) dp[i] = new Uint32Array(m + 1);

  for (let i = n - 1; i >= 0; i--) {
    const aLine = aLines[i];
    const nextRow = dp[i + 1];
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        aLine === bLines[j]
          ? nextRow[j + 1] + 1
          : Math.max(nextRow[j], dp[i][j + 1]);
    }
  }

  const rows: DiffRow[] = [];
  const pushRow = (row: DiffRow) => {
    if (rows.length < MAX_DIFF_ROWS) rows.push(row);
  };

  let i = 0,
    j = 0;
  let la = 1,
    lb = 1;
  while (i < n && j < m) {
    if (aLines[i] === bLines[j]) {
      pushRow({
        op: "equal",
        left: aLines[i],
        right: bLines[j],
        leftNo: la++,
        rightNo: lb++,
      });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      pushRow({
        op: "del",
        left: aLines[i],
        right: null,
        leftNo: la++,
        rightNo: null,
      });
      i++;
    } else {
      pushRow({
        op: "ins",
        left: null,
        right: bLines[j],
        leftNo: null,
        rightNo: lb++,
      });
      j++;
    }
  }
  while (i < n)
    pushRow({
      op: "del",
      left: aLines[i++],
      right: null,
      leftNo: la++,
      rightNo: null,
    });
  while (j < m)
    pushRow({
      op: "ins",
      left: null,
      right: bLines[j++],
      leftNo: null,
      rightNo: lb++,
    });

  // The truncation marker is pushed unconditionally — it's the only signal the
  // UI has that the diff was cut off, and it adds at most one row.
  if (truncated) {
    rows.push({
      op: "mod",
      left: TRUNCATED_MARKER,
      right: TRUNCATED_MARKER,
      leftNo: null,
      rightNo: null,
    });
  }

  // Coalesce adjacent del+ins into a "mod" pair (aligned row) for readability.
  const merged: DiffRow[] = [];
  for (let k = 0; k < rows.length; k++) {
    const cur = rows[k];
    const nxt = rows[k + 1];
    if (cur.op === "del" && nxt && nxt.op === "ins") {
      merged.push({
        op: "mod",
        left: cur.left,
        right: nxt.right,
        leftNo: cur.leftNo,
        rightNo: nxt.rightNo,
      });
      k++;
    } else {
      merged.push(cur);
    }
  }
  return merged;
}
