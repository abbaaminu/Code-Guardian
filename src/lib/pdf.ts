// Minimal dependency-free PDF writer for the remediation report export (H6).
//
// The previous "export" in workspace-action-bar.tsx created a Blob with
// `type: "application/pdf"` but stuffed plain text into it — a file with a
// .pdf extension that no PDF reader could open. This module generates a real,
// spec-valid PDF 1.4 document: one US-Letter page, a single Helvetica text
// stream, correct xref offsets, and a matching trailer. No new dependencies.
//
// Coverage is intentionally narrow (ASCII text lines, one page). If the report
// ever needs layout, images, or multi-page output, swap in @react-pdf/renderer
// or pdf-lib — the public function below is the seam to replace.

const PAGE_WIDTH = 612; // US Letter, pt
const PAGE_HEIGHT = 792;
const MARGIN = 48;
const LINE_HEIGHT = 14;
const FONT_SIZE = 10;

/** Escapes a text string for a PDF literal-string operand. */
function escapePdfText(text: string): string {
  return (
    text
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      // PDF base fonts are Latin-1; replace everything else with '?' rather than
      // emitting bytes that will be misrendered.
      .replace(/[^\x20-\x7e]/g, "?")
  );
}

export interface RemediationReportData {
  projectName: string;
  scanId: string;
  totalFindings: number;
  appliedCount: number;
  generatedAt: string;
}

/** Builds the report as a real application/pdf Blob, ready for download. */
export function createRemediationReportPdf(data: RemediationReportData): Blob {
  const lines = [
    "SecurePulse Remediation Report",
    "",
    `Project: ${data.projectName}`,
    `Scan: ${data.scanId}`,
    `Generated: ${data.generatedAt}`,
    "",
    `Findings: ${data.totalFindings}`,
    `Patches applied: ${data.appliedCount}`,
    "",
    "This document summarizes AI-suggested remediations for identified vulnerabilities.",
  ];

  // One content stream: place each line with an absolute-positioned text op.
  const contentLines = lines.map((line, i) => {
    const y = PAGE_HEIGHT - MARGIN - i * LINE_HEIGHT;
    return `BT /F1 ${FONT_SIZE} Tf ${MARGIN} ${y} Td (${escapePdfText(line)}) Tj ET`;
  });
  const contentStream = contentLines.join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach((body, idx) => {
    offsets[idx + 1] = pdf.length;
    pdf += `${idx + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}
