import { toolBlastRadius } from "../engine/risk.js";
import type { Inventory, McpTool } from "../schemas/inventory.js";

export type PolicyAction = "deny" | "require_approval" | "restrict_callers";

/**
 * A gateway-agnostic policy recommendation for one MCP tool: the intent, not a
 * vendor artifact. It says which tool to constrain, how hard, and on what
 * grounds. A gateway adapter (see ./gateways) turns this into a concrete
 * snippet for one product. The enforcement is not a native feature of any MCP
 * gateway today (they govern at the endpoint or OAuth-scope level, not per
 * tool), so every recommendation is marked `buildable-custom`, never
 * `supported`.
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
}

/**
 * Caveats that hold for any gateway, because they come from the MCP wire
 * protocol, not from a product. A gateway adapter adds its own on top.
 */
export const POLICY_CAVEATS = [
  "the tool name is in the tools/call JSON-RPC body (params.name), so a gateway must inspect the body, not route by URL",
  "this assumes the Streamable HTTP transport, where each tool call is a discrete request a gateway can see; a stdio server has no gateway to put a policy on",
  "a single request body may batch several JSON-RPC calls (MCP revisions up to 2025-03-26), so a per-tool rule must iterate the array",
  "per-tool gating is not native to most gateways; confirm yours can branch on a request-body field before relying on this",
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

/**
 * Recommend a policy for every tool whose blast radius crosses the threshold,
 * most critical first. Read-only, low-risk tools get no policy. The result is
 * gateway-agnostic; pass it to a gateway adapter for a product-specific snippet.
 */
export function recommendPolicies(inventory: Inventory, minBlast = 3): PolicyRecommendation[] {
  const recommendations: PolicyRecommendation[] = [];
  for (const server of inventory.servers) {
    for (const tool of server.tools) {
      const blastRadius = toolBlastRadius(tool);
      if (blastRadius < minBlast) continue;
      const callerConstraint =
        tool.effects.scope.length > 0 ? tool.effects.scope.map((scope) => `oauth:${scope}`) : [];
      recommendations.push({
        tool: tool.name,
        server: server.name,
        jsonrpcMatch: { method: "tools/call", paramsName: tool.name },
        action: chooseAction(blastRadius),
        rationale: buildRationale(tool),
        blastRadius,
        callerConstraint,
        transportAssumption: "streamable-http",
        enforcementStatus: "buildable-custom",
      });
    }
  }
  recommendations.sort((a, b) => b.blastRadius - a.blastRadius);
  return recommendations;
}
