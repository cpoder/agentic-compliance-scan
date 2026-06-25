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
  return [...findings].sort((a, b) => b.riskScore - a.riskScore);
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
  const hasNonBinding = report.findings.some(
    (finding) => finding.ref.status === "draft" || finding.ref.status === "deferred",
  );
  if (hasNonBinding) {
    lines.push(
      "Some citations are not yet binding (draft or deferred): they are marked inline below.",
    );
    lines.push("");
  }

  // Findings grouped by the jurisdiction of the citation: national law first,
  // then the EU Regulation (AI Act).
  const groups = new Map<string, Finding[]>();
  for (const finding of sortFindings(report.findings)) {
    const key = finding.ref.jurisdiction;
    const list = groups.get(key) ?? [];
    list.push(finding);
    groups.set(key, list);
  }
  const orderedKeys = [...groups.keys()].sort((a, b) => {
    if (a === "EU") return 1;
    if (b === "EU") return -1;
    if (a === report.jurisdiction) return -1;
    if (b === report.jurisdiction) return 1;
    return a.localeCompare(b);
  });

  for (const key of orderedKeys) {
    lines.push(key === "EU" ? "## EU regulation (AI Act)" : `## National law (${key})`);
    lines.push("");
    for (const finding of groups.get(key) ?? []) {
      lines.push(`### [${finding.severity}] ${finding.title}`);
      lines.push("");
      lines.push(`- Category: ${finding.category}`);
      if (finding.severity !== finding.baseSeverity) {
        lines.push(
          `- Severity: ${finding.severity} (escalated from ${finding.baseSeverity} by the blast radius of the triggering tools)`,
        );
      }
      lines.push(`- Rule: ${finding.ruleId}`);
      lines.push(`- Triggered by: ${finding.evidence.join(", ")}`);
      lines.push(`- Reference: ${formatRef(finding)}`);
      if (finding.guidance) {
        lines.push(`- Guidance: ${finding.guidance}`);
      }
      lines.push("");
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
