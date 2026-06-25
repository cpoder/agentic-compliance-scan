#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { loadClaudeDesktopConfigFile } from "./ingest/claude-desktop.js";
import { loadInventoryFile } from "./ingest/inventory.js";
import type { Inventory } from "./schemas/inventory.js";
import { JurisdictionSchema } from "./schemas/rules.js";

const HELP = `agentic-compliance-scan

Static gap-scan of an MCP agent deployment against AI Act deployer obligations
and NIS2, grouped by jurisdiction.

Usage:
  agentic-compliance-scan --inventory <file.json> --jurisdiction <EU|FR|IT|PT|BE|DE|AT> [--format md|json]

Options:
  --inventory <file>       Path to a static inventory JSON file.
  --claude-desktop <file>  Path to a claude_desktop_config.json to import as a skeleton inventory.
  --jurisdiction <code>    Jurisdiction to report against. Defaults to EU.
  --format <md|json>       Output format. Defaults to md.
  -h, --help               Show this help.

This is not legal advice.
`;

/**
 * Parse arguments, ingest the inventory, and summarize what was parsed. Rule
 * evaluation and report rendering are wired in the next phase.
 */
export function run(argv: string[]): number {
  const { values } = parseArgs({
    args: argv,
    options: {
      inventory: { type: "string" },
      "claude-desktop": { type: "string" },
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
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`failed to load inventory: ${message}\n`);
    return 1;
  }

  const toolCount = inventory.servers.reduce((sum, server) => sum + server.tools.length, 0);
  process.stdout.write(
    `Parsed inventory "${inventory.deployment.name}" for ${jurisdiction.data}: ${inventory.servers.length} server(s), ${toolCount} tool(s).\n`,
  );
  process.stdout.write("Rule evaluation and report rendering are wired in the next phase.\n");
  return 0;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  process.exit(run(process.argv.slice(2)));
}
