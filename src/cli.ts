#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { ZodError } from "zod";
import { evaluate } from "./engine/evaluate.js";
import { loadClaudeDesktopConfigFile } from "./ingest/claude-desktop.js";
import { loadInventoryFile } from "./ingest/inventory.js";
import { renderReport } from "./report/index.js";
import { loadAllRules } from "./rules/index.js";
import type { Finding } from "./schemas/findings.js";
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

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  process.exit(run(process.argv.slice(2)));
}
