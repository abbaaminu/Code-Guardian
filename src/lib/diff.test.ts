import { describe, expect, it } from "vitest";
import { diffLines, MAX_INPUT_LINES, MAX_DIFF_ROWS } from "./diff";

describe("diffLines", () => {
  it("returns all-equal rows for identical input", () => {
    const rows = diffLines("a\nb\nc", "a\nb\nc");
    expect(rows.every((r) => r.op === "equal")).toBe(true);
    expect(rows).toHaveLength(3);
  });

  it("detects a pure insertion", () => {
    const rows = diffLines("a\nc", "a\nb\nc");
    expect(rows.map((r) => r.op)).toEqual(["equal", "ins", "equal"]);
  });

  it("detects a pure deletion", () => {
    const rows = diffLines("a\nb\nc", "a\nc");
    expect(rows.map((r) => r.op)).toEqual(["equal", "del", "equal"]);
  });

  it("coalesces an adjacent del+ins into a single mod row", () => {
    const rows = diffLines("const x = 1;", "const x = 2;");
    expect(rows).toHaveLength(1);
    expect(rows[0].op).toBe("mod");
    expect(rows[0].left).toBe("const x = 1;");
    expect(rows[0].right).toBe("const x = 2;");
  });

  it("assigns sequential line numbers only to the side each row has content on", () => {
    const rows = diffLines("a\nc", "a\nb\nc");
    const ins = rows.find((r) => r.op === "ins")!;
    expect(ins.leftNo).toBeNull();
    expect(ins.rightNo).toBe(2);
  });

  it("caps oversized inputs and marks the result as truncated (H3)", () => {
    const a = Array.from(
      { length: MAX_INPUT_LINES + 100 },
      (_, i) => `left-${i}`,
    ).join("\n");
    const b = Array.from(
      { length: MAX_INPUT_LINES + 200 },
      (_, i) => `right-${i}`,
    ).join("\n");
    const rows = diffLines(a, b);
    // 2000 del + 2000 ins rows + the always-appended truncation marker.
    expect(rows.length).toBeLessThanOrEqual(MAX_DIFF_ROWS + 1);
    expect(rows.some((r) => (r.left ?? "").includes("truncated"))).toBe(true);
  });

  it("handles large identical inputs without exceeding the row cap", () => {
    const big = Array.from({ length: 10_000 }, (_, i) => `line ${i}`).join(
      "\n",
    );
    const rows = diffLines(big, big);
    // 2000 equal rows + 1 truncation marker.
    expect(rows).toHaveLength(MAX_INPUT_LINES + 1);
  });

  it("never allocates a quadratic table for huge inputs (sanity: same as cap case)", () => {
    const a = Array.from({ length: 100_000 }, (_, i) => `a${i}`).join("\n");
    const b = Array.from({ length: 100_000 }, (_, i) => `b${i}`).join("\n");
    const rows = diffLines(a, b);
    expect(rows.length).toBeLessThanOrEqual(MAX_DIFF_ROWS);
  });
});
