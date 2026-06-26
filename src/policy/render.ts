import type { GatewayAdapter } from "./gateways/index.js";
import { POLICY_CAVEATS, type PolicyAction, type PolicyRecommendation } from "./recommend.js";

const ACTION_LABEL: Record<PolicyAction, string> = {
  deny: "deny",
  require_approval: "require human approval",
  restrict_callers: "restrict callers",
};

const DISCLAIMER =
  "Not legal advice, and not a native gateway feature. Each item is a portable policy intent: constrain a single MCP tool by inspecting the tools/call body (params.name), which assumes the Streamable HTTP transport. No MCP gateway gates per tool out of the box, so this is buildable, not a toggle. Pass --gateway for a product-specific snippet.";

export function renderPolicyMarkdown(
  recommendations: PolicyRecommendation[],
  deployment: string,
  adapter?: GatewayAdapter,
): string {
  const lines: string[] = [];
  lines.push(`# Gateway policy recommendations: ${deployment}`);
  lines.push("");
  lines.push(`> ${DISCLAIMER}`);
  lines.push("");

  if (recommendations.length === 0) {
    lines.push("No tool crosses the risk threshold, so no gateway policy is recommended.");
    return `${lines.join("\n").trimEnd()}\n`;
  }

  lines.push(
    `${recommendations.length} tool(s) recommended for a gateway policy, most critical first.`,
  );
  lines.push("");

  const gatewayWarnings = new Set<string>();
  for (const rec of recommendations) {
    lines.push(`## ${rec.server}:${rec.tool} (${ACTION_LABEL[rec.action]})`);
    lines.push("");
    lines.push(`- Why: ${rec.rationale} (blast radius ${rec.blastRadius})`);
    lines.push(`- Match: ${rec.jsonrpcMatch.method} where params.name == "${rec.tool}"`);
    if (rec.callerConstraint.length > 0) {
      lines.push(`- Allowed callers: ${rec.callerConstraint.join(", ")}`);
    }
    if (adapter) {
      const artifact = adapter(rec);
      lines.push(`- ${artifact.gateway} match: \`${artifact.match}\``);
      lines.push(`- ${artifact.gateway} action: ${artifact.action}`);
      for (const warning of artifact.warnings) gatewayWarnings.add(warning);
    }
    lines.push("");
  }

  lines.push("## Caveats");
  lines.push("");
  for (const caveat of POLICY_CAVEATS) {
    lines.push(`- ${caveat}`);
  }
  for (const warning of gatewayWarnings) {
    lines.push(`- ${warning}`);
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
