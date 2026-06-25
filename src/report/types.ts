import type { Finding } from "../schemas/findings.js";
import type { Jurisdiction, Severity } from "../schemas/rules.js";

export interface ReportInput {
  deployment: string;
  jurisdiction: Jurisdiction;
  /** Optional ISO timestamp. Injected by the caller so rendering stays deterministic. */
  generatedAt?: string;
  findings: Finding[];
}

export interface ReportSummary {
  total: number;
  bySeverity: Record<Severity, number>;
}

export function summarize(findings: Finding[]): ReportSummary {
  const bySeverity: Record<Severity, number> = { info: 0, low: 0, medium: 0, high: 0 };
  for (const finding of findings) {
    bySeverity[finding.severity] += 1;
  }
  return { total: findings.length, bySeverity };
}
