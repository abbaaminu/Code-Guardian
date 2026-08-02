import { describe, expect, it } from "vitest";
import { diffLines } from "./diff";

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
});
