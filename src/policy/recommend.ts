import { toolBlastRadius } from "../engine/risk.js";
import type { Inventory, McpTool } from "../schemas/inventory.js";

export type PolicyAction = "deny" | "require_approval" | "restrict_callers";

/**
 * A gateway policy recommendation for one MCP tool. Two layers: a portable,
 * gateway-agnostic intent, plus a webMethods API Gateway artifact stub. The
 * enforcement is NOT a native gateway feature (no MCP product, IBM's included,
 * gates on params.name today): it is a custom policy you build, so every
 * recommendation is marked `buildable-custom`, never `supported`.
 */
export interface PolicyRecommendation {
  tool: string;
  server: string;
  /** The tool lives in the JSON-RPC body, not the URL: a gateway must inspect this. */
  jsonrpcMatch: { method: "tools/call"; paramsName: string };
  action: PolicyAction;
  rationale: string;
  blastRadius: number;
  /** For restrict_callers: the OAuth scopes / identities that should be allowed. */
  callerConstraint: string[];
  transportAssumption: "streamable-http";
  enforcementStatus: "buildable-custom";
  webMethods: {
    gateway: "webmethods-api-gateway";
    condition: string;
    gatewayAction: string;
    warnings: string[];
  };
}

const WARNINGS = [
  "deny is synthesized via a Transformation status code or an Invoke webMethods IS service; it is not a native routing verb",
  "validate in a PoC that the gateway buffers a POST whose response is text/event-stream (Streamable HTTP)",
  "for MCP protocol revisions up to 2025-03-26, iterate over JSON-RPC batch arrays inside an IS service",
  "a coarser native lever exists today: restrict which tools surface via OAuth scope (IBM WxMCPServer) or a tool subset (IBM ContextForge MCP Gateway)",
];

const ADMIN_SCOPE = /(^|[:_-])(admin|administrator|root|superuser)([:_-]|$)/i;

function chooseAction(blast: number): PolicyAction {
  return blast >= 6 ? "require_approval" : "restrict_callers";
}

function buildRationale(tool: McpTool): string {
  const effects = tool.effects;
  const reasons: string[] = [];
  if (effects.scope.some((scope) => ADMIN_SCOPE.test(scope))) reasons.push("admin scope");
  if (effects.dataCategories.includes("credentials")) reasons.push("handles credentials");
  if (effects.dataCategories.includes("personal-data")) reasons.push("handles personal data");
  if (effects.writes) reasons.push("writes");
  else if (effects.sideEffects) reasons.push("has side effects");
  if (!effects.humanInTheLoop && (effects.writes || effects.sideEffects))
    reasons.push("no approval step");
  return reasons.join(", ") || "elevated risk";
}

function gatewayAction(action: PolicyAction, callerConstraint: string[]): string {
  if (action === "require_approval") {
    return "Invoke webMethods IS service: read the body, hold the call for human approval or reject with status 403";
  }
  const scopes =
    callerConstraint.length > 0 ? callerConstraint.join(", ") : "an authorised OAuth scope";
  return `Conditional Routing: require ${scopes}; otherwise set status 403 via a Transformation policy`;
}

/**
 * Recommend a gateway policy for every tool whose blast radius crosses the
 * threshold, most critical first. Read-only, low-risk tools get no policy.
 */
export function recommendPolicies(inventory: Inventory, minBlast = 3): PolicyRecommendation[] {
  const recommendations: PolicyRecommendation[] = [];
  for (const server of inventory.servers) {
    for (const tool of server.tools) {
      const blastRadius = toolBlastRadius(tool);
      if (blastRadius < minBlast) continue;
      const action = chooseAction(blastRadius);
      const callerConstraint =
        tool.effects.scope.length > 0 ? tool.effects.scope.map((scope) => `oauth:${scope}`) : [];
      recommendations.push({
        tool: tool.name,
        server: server.name,
        jsonrpcMatch: { method: "tools/call", paramsName: tool.name },
        action,
        rationale: buildRationale(tool),
        blastRadius,
        callerConstraint,
        transportAssumption: "streamable-http",
        enforcementStatus: "buildable-custom",
        webMethods: {
          gateway: "webmethods-api-gateway",
          condition: `\${request.payload.jsonPath[$.params.name]} == "${tool.name}"`,
          gatewayAction: gatewayAction(action, callerConstraint),
          warnings: WARNINGS,
        },
      });
    }
  }
  recommendations.sort((a, b) => b.blastRadius - a.blastRadius);
  return recommendations;
}
