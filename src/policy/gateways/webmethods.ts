import type { PolicyRecommendation } from "../recommend.js";
import type { GatewayArtifact } from "./types.js";

const WARNINGS = [
  "deny is synthesized via a Transformation status code or an Invoke webMethods IS service; it is not a native routing verb",
  "validate in a PoC that the gateway buffers a POST whose response is text/event-stream",
  "a coarser native lever exists today: restrict which tools surface via OAuth scope (IBM WxMCPServer) or a tool subset (IBM ContextForge MCP Gateway)",
];

/** webMethods / IBM API Gateway (the IWHI stack). */
export function webMethodsArtifact(recommendation: PolicyRecommendation): GatewayArtifact {
  const scopes =
    recommendation.callerConstraint.length > 0
      ? recommendation.callerConstraint.join(", ")
      : "an authorised OAuth scope";
  const action =
    recommendation.action === "require_approval"
      ? "Invoke webMethods IS service: read the body, hold the call for human approval or reject with status 403"
      : `Conditional Routing: require ${scopes}; otherwise set status 403 via a Transformation policy`;
  return {
    gateway: "webmethods-api-gateway",
    match: `\${request.payload.jsonPath[$.params.name]} == "${recommendation.tool}"`,
    action,
    warnings: WARNINGS,
  };
}
