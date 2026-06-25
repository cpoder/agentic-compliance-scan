#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const HELP = `agentic-compliance-scan

Static gap-scan of an MCP agent deployment against AI Act deployer obligations
and NIS2, grouped by jurisdiction.

Usage:
  agentic-compliance-scan --inventory <file.json> --jurisdiction <EU|FR|IT|PT|BE|DE|AT> [--format md|json]

Options:
  --inventory <file>       Path to a static inventory JSON file.
  --jurisdiction <code>    Jurisdiction to report against.
  --format <md|json>       Output format. Defaults to md.
  -h, --help               Show this help.

This is not legal advice.
`;

/** Parse arguments and dispatch. Business logic arrives in later phases. */
export function run(argv: string[]): number {
  const { values } = parseArgs({
    args: argv,
    options: {
      inventory: { type: "string" },
      jurisdiction: { type: "string" },
      format: { type: "string", default: "md" },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: false,
  });

  if (values.help || values.inventory === undefined) {
    process.stdout.write(HELP);
    return values.help ? 0 : 1;
  }

  process.stderr.write(
    "not implemented yet: ingest, evaluate, and report arrive in later phases\n",
  );
  return 1;
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  process.exit(run(process.argv.slice(2)));
}
