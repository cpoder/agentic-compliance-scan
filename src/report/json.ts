import { DISCLAIMER } from "./disclaimer.js";
import { type ReportInput, summarize } from "./types.js";

export function renderJson(report: ReportInput): string {
  const payload = {
    deployment: report.deployment,
    jurisdiction: report.jurisdiction,
    generatedAt: report.generatedAt,
    disclaimer: DISCLAIMER,
    summary: summarize(report.findings),
    findings: report.findings,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}
