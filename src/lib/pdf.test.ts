import { describe, expect, it } from "vitest";
import { createRemediationReportPdf } from "./pdf";

describe("createRemediationReportPdf", () => {
  const base = {
    projectName: "acme/core-api",
    scanId: "12345678-1234-1234-1234-123456789abc",
    totalFindings: 3,
    appliedCount: 1,
    generatedAt: "2026-08-27T00:00:00.000Z",
  };

  it("produces a Blob typed as application/pdf (not a text blob)", async () => {
    const blob = createRemediationReportPdf(base);
    expect(blob.type).toBe("application/pdf");

    const text = await blob.text();
    // Real PDF structure markers.
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text.endsWith("%%EOF")).toBe(true);
    expect(text).toContain("/Type /Catalog");
    expect(text).toContain("/Type /Page");
    expect(text).toContain("startxref");
    expect(text).toContain("xref");
  });

  it("embeds the report content in the content stream", async () => {
    const blob = createRemediationReportPdf(base);
    const text = await blob.text();
    expect(text).toContain("(SecurePulse Remediation Report)");
    expect(text).toContain("(Project: acme/core-api)");
    expect(text).toContain("(Findings: 3)");
    expect(text).toContain("(Patches applied: 1)");
  });

  it("escapes PDF-literal special characters", async () => {
    const blob = createRemediationReportPdf({
      ...base,
      projectName: "weird (project) \\ name",
    });
    const text = await blob.text();
    expect(text).toContain("(Project: weird \\(project\\) \\\\ name)");
  });

  it("writes valid cross-reference offsets that point within the file", async () => {
    const blob = createRemediationReportPdf(base);
    const text = await blob.text();
    const startxref = /startxref\n(\d+)\n%%EOF$/.exec(text);
    expect(startxref).not.toBeNull();
    const xrefOffset = Number(startxref![1]);
    expect(text.slice(xrefOffset, xrefOffset + 4)).toBe("xref");
  });

  it("xref offsets all point at their corresponding object markers", async () => {
    const blob = createRemediationReportPdf(base);
    const text = await blob.text();
    const lines = text.split("\n");

    // xref layout: ["xref", "0 6", "<free entry: f>", "<obj1: n>", ...].
    const xrefStart = lines.findIndex((l) => l === "xref");
    expect(xrefStart).toBeGreaterThan(0);
    const entries: number[] = [];
    for (let i = xrefStart + 3; i < lines.length; i++) {
      const m = /^(\d{10}) \d{5} n/.exec(lines[i]);
      if (!m) break;
      entries.push(Number(m[1]));
    }
    // 5 real objects (object 1..5); the free head entry is skipped.
    expect(entries).toHaveLength(5);

    entries.forEach((offset, idx) => {
      const at = text.slice(offset, offset + 7);
      expect(at).toBe(`${idx + 1} 0 obj`);
    });
  });
});
