# agentic-compliance-scan

Static gap-scan of an MCP agent deployment against AI Act deployer obligations and NIS2, grouped by jurisdiction.

Status: work in progress (v0).

## What it does
Reads a static inventory of MCP servers and their tools, evaluates a set of declarative rules, and emits a per-jurisdiction gap report in Markdown and JSON.

## What it does not do
No live connection to an MCP server, no runtime monitoring, no gateway, no enforcement, no web UI, no database. Those are out of scope for v0.

## Not legal advice
The report is informational. It is not legal advice. Every obligation it surfaces traces to a reference recorded in the rules data, and references are validated by a maintainer before they are treated as final.
