import type { McpTool } from "../schemas/inventory.js";
import type { Severity } from "../schemas/rules.js";

const SEVERITY_RANK: Record<Severity, number> = { info: 0, low: 1, medium: 2, high: 3 };
const RANK_TO_SEVERITY: Severity[] = ["info", "low", "medium", "high"];

// An admin/root-like permission scope, matched as a whole token (so "wm:admin"
// and "db-admin" hit, but "administer_self" does not over-trigger).
export const ADMIN_SCOPE = /(^|[:_-])(admin|administrator|root|superuser)([:_-]|$)/i;

/**
 * A rough blast-radius score for a single tool: how much damage it could do if
 * the agent misused it. This is the richest signal in the inventory (admin
 * scope, credentials, personal data, unattended writes) and feeds severity.
 */
export function toolBlastRadius(tool: McpTool): number {
  const effects = tool.effects;
  let score = 0;
  if (effects.writes) score += 2;
  if (effects.sideEffects) score += 1;
  if (effects.externalAccess) score += 1;
  if (effects.scope.some((scope) => ADMIN_SCOPE.test(scope))) score += 3;
  if (effects.dataCategories.includes("credentials")) score += 3;
  if (effects.dataCategories.includes("personal-data")) score += 2;
  if (!effects.humanInTheLoop && (effects.writes || effects.sideEffects)) score += 1;
  return score;
}

/** Raise a rule's base severity according to the blast radius of the tools involved. */
export function escalateSeverity(base: Severity, blast: number): Severity {
  let rank = SEVERITY_RANK[base];
  if (blast >= 6) rank += 2;
  else if (blast >= 3) rank += 1;
  return RANK_TO_SEVERITY[Math.min(rank, 3)] ?? base;
}

/** A sort key: higher means more urgent. Severity dominates, blast radius breaks ties. */
export function riskScore(severity: Severity, blast: number): number {
  return SEVERITY_RANK[severity] * 100 + blast;
}
