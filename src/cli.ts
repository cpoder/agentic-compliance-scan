#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { ZodError } from "zod";
import { buildDraftInventory, type McpConfig } from "./discover/index.js";
import { evaluate } from "./engine/evaluate.js";
import { loadClaudeDesktopConfigFile } from "./ingest/claude-desktop.js";
import { loadInventoryFile } from "./ingest/inventory.js";
import { GATEWAY_ADAPTERS, GATEWAY_NAMES } from "./policy/gateways/index.js";
import { recommendPolicies } from "./policy/recommend.js";
import { renderPolicyMarkdown } from "./policy/render.js";
import { renderReport } from "./report/index.js";
import { loadAllRules } from "./rules/index.js";
import { runBridge } from "./runtime/bridge.js";
import { SINK_NAMES, SINKS, type Sink } from "./runtime/sinks/index.js";
import { generateVpl } from "./runtime/vpl.js";
import type { Finding } from "./schemas/findings.js";
import type { Inventory } from "./schemas/inventory.js";
import { JurisdictionSchema } from "./schemas/rules.js";

const HELP = `agentic-compliance-scan

Static gap-scan of an MCP agent deployment against AI Act deployer obligations
and NIS2, grouped by jurisdiction.

Usage:
  agentic-compliance-scan --inventory <file.json> --jurisdiction <EU|FR|IT|PT|BE|DE|AT> [--format md|json]
  agentic-compliance-scan --discover <mcp-config.json> [--name <deployment>] > inventory.json
  agentic-compliance-scan --policy <inventory.json> [--gateway webmethods|envoy] [--format md|json]
  agentic-compliance-scan --runtime <inventory.json> > mcp-governance.vpl
  agentic-compliance-scan --bridge <inventory.json> --sink <console|http> [--target <url>] < calls.ndjson

Options:
  --inventory <file>       Path to a static inventory JSON file.
  --discover <file>        Connect to the MCP servers in a config (claude_desktop_config.json or .mcp.json), list their tools, classify the effects, and write a draft inventory to stdout for review.
  --policy <file>          Recommend gateway-agnostic policies to restrict the inventory's high-risk tools, ranked by blast radius (buildable, not a native gateway feature).
  --gateway <name>         With --policy, also render a product-specific snippet. One of: webmethods, envoy.
  --runtime <file>         Generate a Varpulis (VPL) runtime-governance ruleset from the inventory, so risky tool-call patterns are detected live, not just scanned statically.
  --bridge <file>          Read gateway-captured tool calls (NDJSON on stdin), enrich each with the static risk profile, and emit Varpulis McpToolCall events to --sink.
  --sink <name>            With --bridge, the event sink: console (NDJSON to stdout) or http (POST to --target). Defaults to console.
  --target <url>           With --sink http, the Varpulis HTTP connector endpoint.
  --name <deployment>      Deployment name for a discovered inventory. Defaults to discovered-deployment.
  --claude-desktop <file>  Path to a claude_desktop_config.json to import as a skeleton inventory.
  --jurisdiction <code>    Jurisdiction to report against. Defaults to EU.
  --format <md|json>       Output format. Defaults to md.
  -h, --help               Show this help.

This is not legal advice.
`;

/** Turn a schema or JSON parse failure into a readable, line-per-issue message. */
function formatLoadError(error: unknown): string {
  if (error instanceof ZodError) {
    const issues = error.issues.map(
      (issue) => `  - ${issue.path.length > 0 ? issue.path.join(".") : "(root)"}: ${issue.message}`,
    );
    return `the input does not match the expected schema:\n${issues.join("\n")}`;
  }
  if (error instanceof SyntaxError) {
    return `the file is not valid JSON: ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}

/** Parse arguments, ingest the inventory, evaluate the rules, and print the report. */
export function run(argv: string[]): number {
  const { values } = parseArgs({
    args: argv,
    options: {
      inventory: { type: "string" },
      "claude-desktop": { type: "string" },
      policy: { type: "string" },
      gateway: { type: "string" },
      runtime: { type: "string" },
      jurisdiction: { type: "string", default: "EU" },
      format: { type: "string", default: "md" },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: false,
  });

  if (values.help) {
    process.stdout.write(HELP);
    return 0;
  }

  if (values.policy !== undefined) {
    let inventory: Inventory;
    try {
      inventory = loadInventoryFile(values.policy);
    } catch (error) {
      process.stderr.write(`failed to load inventory: ${formatLoadError(error)}\n`);
      return 1;
    }
    const adapter = values.gateway === undefined ? undefined : GATEWAY_ADAPTERS[values.gateway];
    if (values.gateway !== undefined && adapter === undefined) {
      process.stderr.write(
        `unknown gateway: ${values.gateway}. Available: ${GATEWAY_NAMES.join(", ")}\n`,
      );
      return 1;
    }
    const recommendations = recommendPolicies(inventory);
    if (values.format === "json") {
      const enriched = adapter
        ? recommendations.map((rec) => ({ ...rec, gateway: adapter(rec) }))
        : recommendations;
      process.stdout.write(
        `${JSON.stringify({ deployment: inventory.deployment.name, recommendations: enriched }, null, 2)}\n`,
      );
    } else {
      process.stdout.write(
        renderPolicyMarkdown(recommendations, inventory.deployment.name, adapter),
      );
    }
    return 0;
  }

  if (values.runtime !== undefined) {
    let inventory: Inventory;
    try {
      inventory = loadInventoryFile(values.runtime);
    } catch (error) {
      process.stderr.write(`failed to load inventory: ${formatLoadError(error)}\n`);
      return 1;
    }
    process.stdout.write(generateVpl(inventory));
    return 0;
  }

  const usingClaudeDesktop = values["claude-desktop"] !== undefined;
  const path = usingClaudeDesktop ? values["claude-desktop"] : values.inventory;
  if (path === undefined) {
    process.stdout.write(HELP);
    return 1;
  }

  const jurisdiction = JurisdictionSchema.safeParse(values.jurisdiction);
  if (!jurisdiction.success) {
    process.stderr.write(`unknown jurisdiction: ${String(values.jurisdiction)}\n`);
    return 1;
  }

  let inventory: Inventory;
  try {
    inventory = usingClaudeDesktop ? loadClaudeDesktopConfigFile(path) : loadInventoryFile(path);
  } catch (error) {
    process.stderr.write(`failed to load inventory: ${formatLoadError(error)}\n`);
    return 1;
  }

  let findings: Finding[];
  try {
    findings = evaluate(inventory, loadAllRules().rules, jurisdiction.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`evaluation failed: ${message}\n`);
    return 1;
  }

  const format = values.format === "json" ? "json" : "md";
  const report = renderReport(
    {
      deployment: inventory.deployment.name,
      jurisdiction: jurisdiction.data,
      generatedAt: new Date().toISOString(),
      findings,
    },
    format,
  );
  process.stdout.write(report);
  return 0;
}

/**
 * Discover mode: connect to the MCP servers in a config, classify their tools,
 * and write a draft inventory to stdout for the user to review and complete.
 */
export async function runDiscover(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      discover: { type: "string" },
      name: { type: "string", default: "discovered-deployment" },
      inventory: { type: "string" },
      "claude-desktop": { type: "string" },
      jurisdiction: { type: "string" },
      format: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: false,
  });

  if (values.help || values.discover === undefined) {
    process.stdout.write(HELP);
    return values.help ? 0 : 1;
  }

  let config: McpConfig;
  try {
    config = JSON.parse(readFileSync(values.discover, "utf8")) as McpConfig;
  } catch (error) {
    process.stderr.write(`failed to read config: ${formatLoadError(error)}\n`);
    return 1;
  }

  const { inventory, notes } = await buildDraftInventory(
    config,
    values.name ?? "discovered-deployment",
  );
  for (const note of notes) {
    process.stderr.write(`# ${note}\n`);
  }

  const toolCount = inventory.servers.reduce((sum, server) => sum + server.tools.length, 0);
  if (toolCount === 0) {
    process.stderr.write("# no tools discovered; nothing to write\n");
    return 1;
  }
  process.stderr.write(
    "# draft written to stdout. Review the effects, then set isHighRiskAiSystem, inScopeSystems, and controls before scanning.\n",
  );
  process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
  return 0;
}

/**
 * Bridge mode: read gateway-captured tool calls (NDJSON on stdin), enrich each
 * with the static risk profile, and emit Varpulis McpToolCall events to the
 * chosen sink (console for a screencast, http for a real Varpulis deployment).
 */
export async function runBridgeCli(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      bridge: { type: "string" },
      sink: { type: "string", default: "console" },
      target: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: false,
  });

  if (values.help || values.bridge === undefined) {
    process.stdout.write(HELP);
    return values.help ? 0 : 1;
  }

  let inventory: Inventory;
  try {
    inventory = loadInventoryFile(values.bridge);
  } catch (error) {
    process.stderr.write(`failed to load inventory: ${formatLoadError(error)}\n`);
    return 1;
  }

  const sinkName = values.sink ?? "console";
  const factory = SINKS[sinkName];
  if (factory === undefined) {
    process.stderr.write(`unknown sink: ${sinkName}. Available: ${SINK_NAMES.join(", ")}\n`);
    return 1;
  }
  let sink: Sink;
  try {
    sink = factory({ target: values.target });
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }

  const { emitted, skipped } = await runBridge(inventory, sink);
  process.stderr.write(`# bridge: ${emitted} event(s) emitted, ${skipped} skipped\n`);
  return 0;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  const argv = process.argv.slice(2);
  const onResult = (code: number) => process.exit(code);
  const onError = (error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  };
  if (argv.includes("--bridge")) {
    runBridgeCli(argv).then(onResult, onError);
  } else if (argv.includes("--discover")) {
    runDiscover(argv).then(onResult, onError);
  } else {
    process.exit(run(argv));
  }
}
