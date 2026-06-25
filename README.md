# agentic-compliance-scan

A small CLI that reads a static inventory of an MCP agent deployment and reports where it falls short of EU AI Act deployer obligations and NIS2, for one jurisdiction at a time.

You describe what your agent can do (its MCP servers and tools, and the governance controls you have in place). The tool evaluates a set of declarative rules and prints a gap report. Every gap it raises cites a specific legal provision: the AI Act article for the Regulation, and the national transposition article for NIS2 (the Italian decree for Italy, the Belgian law for Belgium, and so on), never the Directive itself.

## What it does

- Ingests a static inventory in JSON, or imports a `claude_desktop_config.json` as a starting skeleton.
- Evaluates declarative rules against the inventory and produces findings.
- Prints a report in Markdown or JSON, grouped by national law and the EU Regulation, with a severity summary.
- Cites a validated reference for every finding, and marks a citation that is not yet binding (France is a draft bill; Portugal has one article whose effect is deferred).

## What it does not do

This is a static scanner. It does not connect to a live MCP server, it does not discover tools at runtime, and it does not monitor, gate, or enforce anything. There is no web UI, no database, and no account. You supply the inventory; the tool reasons over it and stops.

Auto-discovery would need a live connection, which is deliberately out of scope here.

## Install

Requires Node 20 or later and pnpm.

```
git clone <repo-url> agentic-compliance-scan
cd agentic-compliance-scan
pnpm install
pnpm build
```

## Usage

```
node dist/cli.js --inventory inventory.json --jurisdiction IT
node dist/cli.js --inventory inventory.json --jurisdiction FR --format json
node dist/cli.js --claude-desktop ~/Library/Application\ Support/Claude/claude_desktop_config.json --jurisdiction DE
```

During development you can skip the build step:

```
pnpm dev -- --inventory inventory.json --jurisdiction BE
```

Jurisdictions covered today: `EU` (AI Act only), and `FR`, `IT`, `PT`, `BE`, `DE` (AI Act plus national NIS2). A `claude_desktop_config.json` lists servers but not their tools or governance properties, so an import gives you a skeleton that you then fill in by hand.

## Inventory format

The input is a single JSON object. A minimal example:

```json
{
  "deployment": {
    "name": "billing-agent",
    "isHighRiskAiSystem": false,
    "inScopeSystems": ["billing"],
    "controls": {
      "recordKeeping": false,
      "humanOversight": false,
      "transparencyNotice": false,
      "riskManagement": false
    }
  },
  "servers": [
    {
      "name": "filesystem",
      "transport": "stdio",
      "tools": [
        {
          "name": "write_invoice",
          "effects": {
            "sideEffects": true,
            "externalAccess": false,
            "writes": true,
            "humanInTheLoop": false,
            "scope": ["fs:write"],
            "dataCategories": []
          }
        }
      ]
    }
  ]
}
```

A few fields carry the weight of the analysis:

- `deployment.controls` are the governance controls you declare you have in place. A rule fires when a risky tool meets a missing control.
- `deployment.isHighRiskAiSystem` gates the AI Act rules. The AI Act deployer duties in Article 26 bind only for high-risk AI systems, so they do not fire unless you set this to `true`.
- `deployment.inScopeSystems` lists the NIS2 in-scope systems the agent acts on. The NIS2 rules apply only when this is non-empty.
- each tool's `effects` describe what the tool can observably do (side effects, external access, writes, whether a human approves it, its scope, and the data categories it touches).

The zod schemas in `src/schemas/` are the source of truth for the full shape.

## How the rules are sourced

The engine is code; the legal content is data. Every reference lives in `src/rules/data/` with its provenance and a `validated` flag, and no reference is invented by a model: AI Act articles are taken from the official text of Regulation (EU) 2024/1689, and NIS2 national articles from a maintained transposition data set, then checked before they ship.

## Not legal advice

This report is informational. It is not legal advice. Whether a given obligation actually applies to you depends on facts the tool does not know, such as whether your system is in fact high-risk under the AI Act, or whether your entity is in scope under NIS2. Confirm your obligations with qualified counsel.
