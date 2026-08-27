import { describe, expect, it } from "vitest";
import { mapCwe, summarizeCompliance } from "./compliance-mapping";

describe("mapCwe", () => {
  it("maps a known CWE to its OWASP category", () => {
    expect(mapCwe("CWE-89").owasp).toBe("A03:2021 - Injection");
  });

  it("normalizes bare CWE numbers and casing", () => {
    expect(mapCwe("cwe-89").owasp).toBe(mapCwe("CWE-89").owasp);
  });

  it("returns an unmapped record for unknown/null CWEs instead of throwing", () => {
    expect(mapCwe(null)).toEqual({
      owasp: null,
      cweTop25Rank: null,
      pciDss: [],
      soc2: [],
    });
    expect(mapCwe("CWE-999999")).toEqual({
      owasp: null,
      cweTop25Rank: null,
      pciDss: [],
      soc2: [],
    });
  });
});

describe("summarizeCompliance", () => {
  it("dedupes OWASP categories across repeated CWEs", () => {
    const summary = summarizeCompliance(["CWE-89", "CWE-79", "CWE-77"]);
    // CWE-89 and CWE-79 and CWE-77 are all A03:2021 - Injection
    expect(summary.owaspCategories).toEqual(["A03:2021 - Injection"]);
  });

  it("counts CWE Top 25 hits only for CWEs that are actually ranked", () => {
    const summary = summarizeCompliance(["CWE-89", "CWE-330"]); // CWE-330 has no rank in our table
    expect(summary.cweTop25Hits).toBe(1);
  });

  it("returns empty compliance lists for an empty/unmapped finding set", () => {
    const summary = summarizeCompliance([null, undefined]);
    expect(summary.owaspCategories).toEqual([]);
    expect(summary.pciDssRequirements).toEqual([]);
    expect(summary.soc2Criteria).toEqual([]);
  });
});
