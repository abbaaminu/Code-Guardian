// Line-level LCS diff producing aligned side-by-side rows.
// Each row has a `left` and/or `right` line; missing side = "" placeholder.

export type DiffOp = "equal" | "del" | "ins" | "mod";

export interface DiffRow {
  op: DiffOp;
  left: string | null;   // vulnerable side; null = blank filler
  right: string | null;  // fixed side; null = blank filler
  leftNo: number | null;
  rightNo: number | null;
}

export function diffLines(a: string, b: string): DiffRow[] {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const n = aLines.length;
  const m = bLines.length;

  // Standard LCS DP.
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = aLines[i] === bLines[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const rows: DiffRow[] = [];
  let i = 0, j = 0;
  let la = 1, lb = 1;
  while (i < n && j < m) {
    if (aLines[i] === bLines[j]) {
      rows.push({ op: "equal", left: aLines[i], right: bLines[j], leftNo: la++, rightNo: lb++ });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ op: "del", left: aLines[i], right: null, leftNo: la++, rightNo: null });
      i++;
    } else {
      rows.push({ op: "ins", left: null, right: bLines[j], leftNo: null, rightNo: lb++ });
      j++;
    }
  }
  while (i < n) rows.push({ op: "del", left: aLines[i++], right: null, leftNo: la++, rightNo: null });
  while (j < m) rows.push({ op: "ins", left: null, right: bLines[j++], leftNo: null, rightNo: lb++ });

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
