import type { PolicyRecommendation } from "../recommend.js";
import type { GatewayArtifact } from "./types.js";

const WARNINGS = [
  "Envoy's MCP filter parses MCP JSON-RPC and exposes the tool name as dynamic metadata, so per-tool RBAC is closer to native here than on a generic API gateway",
  "Envoy denies or allows; it does not hold a call for approval, so route require_approval matches to an external approval flow",
];

/** Envoy proxy with the MCP filter (the cleanest per-tool reference today). */
export function envoyArtifact(recommendation: PolicyRecommendation): GatewayArtifact {
  const action =
    recommendation.action === "require_approval"
      ? "RBAC: deny, and route the call to an external approval flow (Envoy does not hold calls itself)"
      : recommendation.action === "deny"
        ? "RBAC: deny"
        : `RBAC: allow only principals carrying ${
            recommendation.callerConstraint.join(", ") || "the required scope"
          }`;
  return {
    gateway: "envoy-mcp-filter",
    match: `metadata mcp.method == "tools/call" and mcp.tool == "${recommendation.tool}"`,
    action,
    warnings: WARNINGS,
  };
}
