import type { PolicyAction, PolicyRecommendation } from "./recommend.js";

const ACTION_LABEL: Record<PolicyAction, string> = {
  deny: "deny",
  require_approval: "require human approval",
  restrict_callers: "restrict callers",
};

const DISCLAIMER =
  "Not legal advice, and not a native gateway feature. Each item is a policy you build on an MCP-aware gateway: it gates a single MCP tool by inspecting the tools/call body (params.name), which requires the Streamable HTTP transport. IBM's own MCP gateways govern at the endpoint or OAuth-scope level, not per tool, so this is buildable, not a toggle.";

export function renderPolicyMarkdown(
  recommendations: PolicyRecommendation[],
  deployment: string,
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

  for (const rec of recommendations) {
    lines.push(`## ${rec.server}:${rec.tool} (${ACTION_LABEL[rec.action]})`);
    lines.push("");
    lines.push(`- Why: ${rec.rationale} (blast radius ${rec.blastRadius})`);
    lines.push(`- Match: ${rec.jsonrpcMatch.method} where params.name == "${rec.tool}"`);
    if (rec.callerConstraint.length > 0) {
      lines.push(`- Allowed callers: ${rec.callerConstraint.join(", ")}`);
    }
    lines.push(`- webMethods condition: \`${rec.webMethods.condition}\``);
    lines.push(`- webMethods action: ${rec.webMethods.gatewayAction}`);
    lines.push("");
  }

  const warnings = recommendations[0]?.webMethods.warnings ?? [];
  if (warnings.length > 0) {
    lines.push("## Caveats");
    lines.push("");
    for (const warning of warnings) {
      lines.push(`- ${warning}`);
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}
