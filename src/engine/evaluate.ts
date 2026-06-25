import type { Finding } from "../schemas/findings.js";
import type { Inventory } from "../schemas/inventory.js";
import type { Jurisdiction, LegalRef, Rule } from "../schemas/rules.js";
import { evaluateCondition } from "./condition.js";
import { escalateSeverity, riskScore, toolBlastRadius } from "./risk.js";

/**
 * Thrown when a rule matches the inventory but carries no reference that binds
 * in the requested jurisdiction. The engine refuses to surface a finding that
 * does not trace to a citation, so a missing reference is a loud failure rather
 * than a silent omission.
 */
export class MissingReferenceError extends Error {
  readonly ruleId: string;
  constructor(ruleId: string) {
    super(
      `rule "${ruleId}" matched the inventory but has no reference for the requested ` +
        "jurisdiction. Source and validate its references before running against real data.",
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

/**
 * Resolve the reference that binds in the requested jurisdiction. An exact
 * national match wins; otherwise an EU reference (a directly-applicable
 * Regulation such as the AI Act) applies. A Directive is never a fallback: a
 * transposed obligation must cite national law or it does not surface.
 */
function resolveReference(rule: Rule, jurisdiction: Jurisdiction): LegalRef | undefined {
  const national = rule.references.find((reference) => reference.jurisdiction === jurisdiction);
  if (national) {
    return national;
  }
  return rule.references.find((reference) => reference.jurisdiction === "EU");
}

function buildFinding(
  rule: Rule,
  jurisdiction: Jurisdiction,
  evidence: string[],
  blast: number,
): Finding {
  const reference = resolveReference(rule, jurisdiction);
  if (reference === undefined) {
    throw new MissingReferenceError(rule.id);
  }
  const severity = escalateSeverity(rule.severity, blast);
  return {
    ruleId: rule.id,
    category: rule.category,
    severity,
    baseSeverity: rule.severity,
    title: rule.title,
    guidance: rule.guidance,
    jurisdiction,
    ref: reference,
    evidence,
    riskScore: riskScore(severity, blast),
  };
}

/**
 * Apply the rules to the inventory and return the findings for the jurisdiction,
 * most urgent first. A tool-scoped rule produces ONE finding listing every tool
 * that triggered it (not one finding per tool), and its severity is escalated by
 * the blast radius of those tools.
 */
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
        const evidence = [`deployment:${inventory.deployment.name}`];
        findings.push(buildFinding(rule, jurisdiction, evidence, 0));
      }
      continue;
    }
    const evidence: string[] = [];
    let blast = 0;
    for (const server of inventory.servers) {
      for (const tool of server.tools) {
        if (evaluateCondition(rule.appliesWhen, { deployment: inventory.deployment, tool })) {
          evidence.push(`${server.name}:${tool.name}`);
          blast = Math.max(blast, toolBlastRadius(tool));
        }
      }
    }
    if (evidence.length > 0) {
      findings.push(buildFinding(rule, jurisdiction, evidence, blast));
    }
  }
  findings.sort((a, b) => b.riskScore - a.riskScore);
  return findings;
}
