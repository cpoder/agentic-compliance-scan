# agentic-compliance-scan

A small CLI that reads a static inventory of an MCP agent deployment and reports where it falls short of EU AI Act deployer obligations and NIS2, for one jurisdiction at a time.

You describe what your agent can do (its MCP servers and tools, and the governance controls you have in place). The tool evaluates a set of declarative rules and prints a gap report. Every gap it raises cites a specific legal provision: the AI Act article for the Regulation, and the national transposition article for NIS2 (the Italian decree for Italy, the Belgian law for Belgium, and so on), never the Directive itself.

## What it does

- Discovers your MCP servers' tools automatically over a `tools/list` handshake and classifies their governance effects into a draft inventory you review. You can also write the inventory by hand, or import a `claude_desktop_config.json` skeleton.
- Evaluates declarative rules against the inventory and produces findings, one per obligation, with the triggering tools listed.
- Derives each finding's severity from the blast radius of the tools involved (admin scope, credentials, write access) and sorts the report by real risk.
- Prints a report in Markdown or JSON, grouped by national law and the EU Regulation, with a severity summary.
- Cites a validated reference for every finding, and marks a citation that is not yet binding (France is a draft bill; Portugal has one article whose effect is deferred).

## What it does not do

It does not monitor, intercept, or enforce anything at runtime. There is no gateway, no web UI, no database, and no account. Discovery does a single `tools/list` handshake to read a server's catalog; it never invokes a tool or watches traffic. Whether your system is high-risk, which systems are in NIS2 scope, and which governance controls you have in place stay human inputs that you set on the draft.

## Install

Requires Node 20 or later and pnpm.

```
git clone <repo-url> agentic-compliance-scan
cd agentic-compliance-scan
pnpm install
pnpm build
```

## Usage

Discover your servers and write a draft inventory to review:

```
node dist/cli.js --discover claude_desktop_config.json --name my-agent > inventory.json
```

Discovery prints progress and review notes to stderr (including any tool whose effects it was unsure about). Review the draft, set `isHighRiskAiSystem`, `inScopeSystems`, and your `controls`, then scan it:

```
node dist/cli.js --inventory inventory.json --jurisdiction IT
node dist/cli.js --inventory inventory.json --jurisdiction FR --format json
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
    "interactsWithPeople": false,
    "generatesSyntheticContent": false,
    "inScopeSystems": ["billing"],
    "controls": {
      "nis2IncidentHandling": true,
      "nis2BusinessContinuity": true
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

- `deployment.controls` are the governance controls you declare you have in place, one key per obligation (the ten NIS2 Art. 21(2) measures, NIS2 Art. 20 governance, and the AI Act logging, oversight, and transparency duties). It is optional and every key defaults to false: declare only the controls you have, and a missing one becomes a gap. See `src/schemas/inventory.ts` for the full key list.
- `deployment.isHighRiskAiSystem` gates the AI Act Article 26 rules. Those deployer duties bind only for high-risk AI systems, so they do not fire unless you set this to `true`.
- `deployment.interactsWithPeople` and `deployment.generatesSyntheticContent` gate the AI Act Article 50 transparency rules, which apply regardless of high-risk status.
- `deployment.inScopeSystems` lists the NIS2 in-scope systems the agent acts on. The NIS2 rules apply only when this is non-empty.
- each tool's `effects` describe what the tool can observably do (side effects, external access, writes, whether a human approves it, its scope, and the data categories it touches).

The zod schemas in `src/schemas/` are the source of truth for the full shape.

## How the rules are sourced

The engine is code; the legal content is data. Every reference lives in `src/rules/data/` with its provenance and a `validated` flag, and no reference is invented by a model: AI Act articles are taken from the official text of Regulation (EU) 2024/1689, and NIS2 national articles from a maintained transposition data set, then checked before they ship.

## Not legal advice

This report is informational. It is not legal advice. Whether a given obligation actually applies to you depends on facts the tool does not know, such as whether your system is in fact high-risk under the AI Act, or whether your entity is in scope under NIS2. Confirm your obligations with qualified counsel.
