import type { Deployment, McpTool } from "../schemas/inventory.js";
import type { Condition } from "../schemas/rules.js";

export interface EvalContext {
  deployment: Deployment;
  /** Present for tool-scoped evaluation, absent for deployment-scoped evaluation. */
  tool?: McpTool;
}

/**
 * Evaluate a declarative condition against the deployment and, when present, a
 * single tool. Tool-level predicates are false when no tool is in context, so a
 * deployment-scoped rule that references a tool predicate simply never matches.
 */
export function evaluateCondition(condition: Condition, ctx: EvalContext): boolean {
  if ("all" in condition) {
    return condition.all.every((child) => evaluateCondition(child, ctx));
  }
  if ("any" in condition) {
    return condition.any.some((child) => evaluateCondition(child, ctx));
  }
  if ("not" in condition) {
    return !evaluateCondition(condition.not, ctx);
  }
  if ("toolEffect" in condition) {
    return ctx.tool ? ctx.tool.effects[condition.toolEffect] === condition.equals : false;
  }
  if ("toolScopeIncludes" in condition) {
    return ctx.tool ? ctx.tool.effects.scope.includes(condition.toolScopeIncludes) : false;
  }
  if ("toolDataCategory" in condition) {
    return ctx.tool ? ctx.tool.effects.dataCategories.includes(condition.toolDataCategory) : false;
  }
  if ("controlAbsent" in condition) {
    return ctx.deployment.controls[condition.controlAbsent] === false;
  }
  if ("deploymentTouchesInScopeSystem" in condition) {
    return ctx.deployment.inScopeSystems.length > 0;
  }
  if ("deploymentIsHighRiskAiSystem" in condition) {
    return ctx.deployment.isHighRiskAiSystem;
  }
  if ("deploymentInteractsWithPeople" in condition) {
    return ctx.deployment.interactsWithPeople;
  }
  return ctx.deployment.generatesSyntheticContent;
}
