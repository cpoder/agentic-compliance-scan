# Project: agentic-compliance-scan

## What this is
A small, static analysis CLI. Input: a static inventory of MCP servers and their
tools/resources/prompts. Output: a per-jurisdiction gap report (Markdown + JSON)
against AI Act deployer obligations and NIS2, for an agent deployment.
This is a lead-generation and credibility artifact, not a product. Keep it small.

## Hard scope boundary
In scope: static inventory ingestion, declarative rule engine, report rendering.
Out of scope and DEFERRED, do not build: live MCP server connection, runtime
monitoring, gateway, enforcement, runtime evidence engine, web UI, auth, database.
If a task drifts toward any deferred item, stop and ask.

## Regulatory content rule (non negotiable)
You build the engine and the schema. You never invent legal content.
All regulatory references (article numbers, per-country transpositions) come from
validated sources and are recorded in the rules data files. Every `ref` carries a
`source` (provenance) and a `validated` flag, and stays `validated: false` until
the maintainer confirms it. Every obligation surfaced in a report must trace to a
`ref`. No free-text legal claims in titles or guidance. The report must include a
"This is not legal advice" disclaimer. If a rule produces a finding while its `ref`
is null, fail loudly, do not guess.

## Stack and conventions
- Runtime: Node, TypeScript, ES modules. Dev run via tsx.
- Package manager: pnpm. Keep dependencies minimal.
- Validation: zod. CLI args: node:util parseArgs (no arg-parsing dependency).
- Tests: vitest. Lint and format: biome.
- All code, identifiers, comments, and the README are in English.
- No em dashes or en dashes anywhere in generated text, including README and
  report templates. Use colons, semicolons, commas, periods, parentheses.
- Small, reviewable commits. Conventional commit messages.

## Verification gate
After every change, this must pass before you stop or commit:
  pnpm lint && pnpm typecheck && pnpm test
(equivalently: pnpm gate)
Loop: implement, run the gate, fix failures, re-run, only stop when green, then commit.
Do not change tests to make them pass unless a test is provably wrong.

## Working mode
Start in plan mode for any new phase. Produce the plan, wait for approval, then code.
