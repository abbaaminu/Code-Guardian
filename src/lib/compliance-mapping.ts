// Maps CWE identifiers to the standardized frameworks enterprise buyers
// actually ask about: OWASP Top 10 (2021), CWE/SANS Top 25 (2024), PCI-DSS v4.0,
// and SOC 2 (Trust Services Criteria). Findings from either the AST engine or the
// AI engine carry a `cwe_id`; everything else is derived from this table so the
// mapping is consistent across the UI, the SARIF export, and the PDF/JSON report —
// instead of the previous hardcoded "OWASP Top 10 mapped" bullet list that was not
// actually computed from the findings.

export interface ComplianceMapping {
  owasp: string | null;
  cweTop25Rank: number | null; // null = not in the current CWE Top 25
  pciDss: string[]; // relevant PCI-DSS v4.0 requirement IDs
  soc2: string[]; // relevant SOC 2 Trust Services Criteria
}

const UNMAPPED: ComplianceMapping = {
  owasp: null,
  cweTop25Rank: null,
  pciDss: [],
  soc2: [],
};

// Source: OWASP Top 10:2021 CWE mapping, 2024 CWE/SANS Top 25 Most Dangerous
// Software Weaknesses, PCI-DSS v4.0 requirement list, SOC 2 TSC (CC6/CC7/CC8).
const CWE_TABLE: Record<string, ComplianceMapping> = {
  "CWE-79": {
    owasp: "A03:2021 - Injection",
    cweTop25Rank: 2,
    pciDss: ["6.2.4"],
    soc2: ["CC6.1", "CC6.6"],
  },
  "CWE-89": {
    owasp: "A03:2021 - Injection",
    cweTop25Rank: 3,
    pciDss: ["6.2.4"],
    soc2: ["CC6.1", "CC6.6"],
  },
  "CWE-77": {
    owasp: "A03:2021 - Injection",
    cweTop25Rank: 9,
    pciDss: ["6.2.4"],
    soc2: ["CC6.1", "CC6.6"],
  },
  "CWE-78": {
    owasp: "A03:2021 - Injection",
    cweTop25Rank: 5,
    pciDss: ["6.2.4"],
    soc2: ["CC6.1", "CC6.6"],
  },
  "CWE-94": {
    owasp: "A03:2021 - Injection",
    cweTop25Rank: 11,
    pciDss: ["6.2.4"],
    soc2: ["CC6.1", "CC6.6"],
  },
  "CWE-798": {
    owasp: "A07:2021 - Identification and Authentication Failures",
    cweTop25Rank: 15,
    pciDss: ["3.5", "6.3.1", "8.3.1"],
    soc2: ["CC6.1", "CC6.3"],
  },
  "CWE-259": {
    owasp: "A07:2021 - Identification and Authentication Failures",
    cweTop25Rank: null,
    pciDss: ["3.5", "8.3.1"],
    soc2: ["CC6.1"],
  },
  "CWE-321": {
    owasp: "A02:2021 - Cryptographic Failures",
    cweTop25Rank: null,
    pciDss: ["3.5", "3.6"],
    soc2: ["CC6.1"],
  },
  "CWE-327": {
    owasp: "A02:2021 - Cryptographic Failures",
    cweTop25Rank: null,
    pciDss: ["4.2.1"],
    soc2: ["CC6.1", "CC6.7"],
  },
  "CWE-330": {
    owasp: "A02:2021 - Cryptographic Failures",
    cweTop25Rank: null,
    pciDss: ["3.5"],
    soc2: ["CC6.1"],
  },
  "CWE-502": {
    owasp: "A08:2021 - Software and Data Integrity Failures",
    cweTop25Rank: 18,
    pciDss: ["6.2.4"],
    soc2: ["CC7.1"],
  },
  "CWE-611": {
    owasp: "A05:2021 - Security Misconfiguration",
    cweTop25Rank: null,
    pciDss: ["6.2.4"],
    soc2: ["CC6.1"],
  },
  "CWE-918": {
    owasp: "A10:2021 - Server-Side Request Forgery",
    cweTop25Rank: 19,
    pciDss: ["6.2.4"],
    soc2: ["CC6.1", "CC6.6"],
  },
  "CWE-22": {
    owasp: "A01:2021 - Broken Access Control",
    cweTop25Rank: 8,
    pciDss: ["6.2.4"],
    soc2: ["CC6.1"],
  },
  "CWE-284": {
    owasp: "A01:2021 - Broken Access Control",
    cweTop25Rank: null,
    pciDss: ["7.2.1"],
    soc2: ["CC6.3"],
  },
  "CWE-285": {
    owasp: "A01:2021 - Broken Access Control",
    cweTop25Rank: 4,
    pciDss: ["7.2.1"],
    soc2: ["CC6.3"],
  },
  "CWE-862": {
    owasp: "A01:2021 - Broken Access Control",
    cweTop25Rank: 13,
    pciDss: ["7.2.1"],
    soc2: ["CC6.3"],
  },
  "CWE-863": {
    owasp: "A01:2021 - Broken Access Control",
    cweTop25Rank: 20,
    pciDss: ["7.2.1"],
    soc2: ["CC6.3"],
  },
  "CWE-352": {
    owasp: "A01:2021 - Broken Access Control",
    cweTop25Rank: 21,
    pciDss: ["6.2.4"],
    soc2: ["CC6.1"],
  },
  "CWE-269": {
    owasp: "A01:2021 - Broken Access Control",
    cweTop25Rank: 22,
    pciDss: ["7.2.1"],
    soc2: ["CC6.3"],
  },
  "CWE-434": {
    owasp: "A04:2021 - Insecure Design",
    cweTop25Rank: 12,
    pciDss: ["6.2.4"],
    soc2: ["CC6.1"],
  },
  "CWE-corsmisconfig": UNMAPPED,
};

export function mapCwe(cweId: string | null | undefined): ComplianceMapping {
  if (!cweId) return UNMAPPED;
  return (
    CWE_TABLE[
      cweId
        .trim()
        .toUpperCase()
        .replace(/^CWE-?/i, "CWE-")
    ] ?? UNMAPPED
  );
}

export interface ComplianceSummary {
  owaspCategories: string[]; // deduped, sorted
  cweTop25Hits: number;
  pciDssRequirements: string[];
  soc2Criteria: string[];
}

export function summarizeCompliance(
  cweIds: Array<string | null | undefined>,
): ComplianceSummary {
  const owasp = new Set<string>();
  const pci = new Set<string>();
  const soc2 = new Set<string>();
  let top25 = 0;

  for (const id of cweIds) {
    const m = mapCwe(id);
    if (m.owasp) owasp.add(m.owasp);
    if (m.cweTop25Rank != null) top25++;
    for (const p of m.pciDss) pci.add(p);
    for (const s of m.soc2) soc2.add(s);
  }

  return {
    owaspCategories: [...owasp].sort(),
    cweTop25Hits: top25,
    pciDssRequirements: [...pci].sort(),
    soc2Criteria: [...soc2].sort(),
  };
}
