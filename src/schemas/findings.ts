import type { Jurisdiction, LegalRef, RuleCategory, Severity } from "./rules.js";

/**
 * One gap surfaced by the engine: a rule that applied to the inventory, with the
 * validated legal reference it traces to and the inventory location that
 * triggered it. A Finding always carries a non-null `ref`: the engine refuses to
 * emit a finding for a rule whose `ref` is null.
 */
export interface Finding {
  ruleId: string;
  category: RuleCategory;
  /** Severity after blast-radius escalation by the triggering tools. */
  severity: Severity;
  /** The rule's declared severity, before escalation. */
  baseSeverity: Severity;
  title: string;
  guidance?: string;
  jurisdiction: Jurisdiction;
  ref: LegalRef;
  /** Everything that triggered the rule: the tools (one finding lists them all) or the deployment. */
  evidence: string[];
  /** Sort key; higher means more urgent. Severity dominates, blast radius breaks ties. */
  riskScore: number;
}
