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
  severity: Severity;
  title: string;
  guidance?: string;
  jurisdiction: Jurisdiction;
  ref: LegalRef;
  /** Where in the inventory this triggered, e.g. "server:filesystem tool:write_file". */
  evidence: string;
}
