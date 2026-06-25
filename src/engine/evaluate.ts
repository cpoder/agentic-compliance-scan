import type { Finding } from "../schemas/findings.js";
import type { Inventory } from "../schemas/inventory.js";
import type { Jurisdiction, Rule } from "../schemas/rules.js";
import { evaluateCondition } from "./condition.js";

/**
 * Thrown when a rule matches the inventory but carries no legal reference. The
 * engine refuses to surface a finding that does not trace to a reference, so a
 * null `ref` is a loud failure rather than a silent omission.
 */
export class MissingReferenceError extends Error {
  readonly ruleId: string;
  constructor(ruleId: string) {
    super(
      `rule "${ruleId}" matched the inventory but has no legal reference (ref is null). ` +
        "Source and validate its reference before running against real data.",
    );
    this.name = "MissingReferenceError";
    this.ruleId = ruleId;
  }
}

/**
 * An EU rule applies to every requested jurisdiction. A national rule applies
 * only when the requested jurisdiction matches. A request for "EU" therefore
 * surfaces EU-wide obligations only, not national ones.
 */
function ruleAppliesToJurisdiction(rule: Rule, jurisdiction: Jurisdiction): boolean {
  if (rule.jurisdictions.includes("EU")) {
    return true;
  }
  return rule.jurisdictions.includes(jurisdiction);
}

function toFinding(rule: Rule, jurisdiction: Jurisdiction, evidence: string): Finding {
  if (rule.ref === null) {
    throw new MissingReferenceError(rule.id);
  }
  return {
    ruleId: rule.id,
    category: rule.category,
    severity: rule.severity,
    title: rule.title,
    guidance: rule.guidance,
    jurisdiction,
    ref: rule.ref,
    evidence,
  };
}

/** Apply the rules to the inventory and return the findings for the jurisdiction. */
export function evaluate(
  inventory: Inventory,
  rules: Rule[],
  jurisdiction: Jurisdiction,
): Finding[] {
  const findings: Finding[] = [];
  for (const rule of rules) {
    if (!ruleAppliesToJurisdiction(rule, jurisdiction)) {
      continue;
    }
    if (rule.scope === "deployment") {
      if (evaluateCondition(rule.appliesWhen, { deployment: inventory.deployment })) {
        findings.push(toFinding(rule, jurisdiction, `deployment:${inventory.deployment.name}`));
      }
      continue;
    }
    for (const server of inventory.servers) {
      for (const tool of server.tools) {
        if (evaluateCondition(rule.appliesWhen, { deployment: inventory.deployment, tool })) {
          findings.push(toFinding(rule, jurisdiction, `server:${server.name} tool:${tool.name}`));
        }
      }
    }
  }
  return findings;
}
