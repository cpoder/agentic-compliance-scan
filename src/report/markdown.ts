import type { Finding } from "../schemas/findings.js";
import type { Severity } from "../schemas/rules.js";
import { DISCLAIMER } from "./disclaimer.js";
import { type ReportInput, summarize } from "./types.js";

const SEVERITY_ORDER: Severity[] = ["high", "medium", "low", "info"];

function formatRef(finding: Finding): string {
  const ref = finding.ref;
  const parts = [`${ref.instrument.toUpperCase()} ${ref.article}`];
  if (ref.jurisdiction) {
    parts.push(ref.nationalRef ? `${ref.jurisdiction} ${ref.nationalRef}` : ref.jurisdiction);
  }
  if (ref.sourceUrl) {
    parts.push(ref.sourceUrl);
  }
  if (ref.status === "draft") {
    parts.push("(draft, not yet in force)");
  } else if (ref.status === "deferred") {
    parts.push("(enacted, effect deferred)");
  }
  if (!ref.validated) {
    parts.push("(reference pending maintainer validation)");
  }
  return parts.join(", ");
}

function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );
}

export function renderMarkdown(report: ReportInput): string {
  const lines: string[] = [];
  lines.push(`# Compliance gap scan: ${report.deployment}`);
  lines.push("");
  lines.push(`Jurisdiction: ${report.jurisdiction}`);
  if (report.generatedAt) {
    lines.push(`Generated: ${report.generatedAt}`);
  }
  lines.push("");
  lines.push(`> ${DISCLAIMER}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");

  if (report.findings.length === 0) {
    lines.push("No gaps found.");
    return `${lines.join("\n").trimEnd()}\n`;
  }

  const summary = summarize(report.findings);
  const counts = SEVERITY_ORDER.filter((severity) => summary.bySeverity[severity] > 0).map(
    (severity) => `${severity}: ${summary.bySeverity[severity]}`,
  );
  lines.push(`${summary.total} gap(s) found (${counts.join(", ")}).`);
  lines.push("");
  lines.push("## Findings");
  lines.push("");

  for (const finding of sortFindings(report.findings)) {
    lines.push(`### [${finding.severity}] ${finding.title}`);
    lines.push("");
    lines.push(`- Category: ${finding.category}`);
    lines.push(`- Rule: ${finding.ruleId}`);
    lines.push(`- Evidence: ${finding.evidence}`);
    lines.push(`- Reference: ${formatRef(finding)}`);
    if (finding.guidance) {
      lines.push(`- Guidance: ${finding.guidance}`);
    }
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
