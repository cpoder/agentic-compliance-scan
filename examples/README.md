# Examples

## wm-ops-agent.inventory.json

A worked example for an agent that operates a webMethods Integration Server through [wm-mcp-server](https://github.com/cpoder/wm-mcp-server), alongside a Neon Postgres server and a local planning server.

wm-mcp-server exposes 336 tools. Annotating every one by hand is not the point of an example, so this inventory annotates five representative ones (a read-only status call, a service-create, user and OAuth management that touch credentials, and a server shutdown) plus a couple of Neon and planning tools. That is also the honest shape of the work in practice: the governance properties of a tool are a human judgment, not something the MCP server reports.

Run it:

```
node dist/cli.js --inventory examples/wm-ops-agent.inventory.json --jurisdiction DE
```

For Germany this raises eleven NIS2 gaps, because the agent acts on an in-scope system (the Integration Server) with none of the risk-management measures declared: the ten measures of Art. 21(2) (a to j) plus the management-body accountability of Art. 20, each cited to the matching paragraph of the BSIG. The AI Act rules stay silent because `isHighRiskAiSystem` is `false` and the agent neither interacts with people nor generates synthetic content. Flip `isHighRiskAiSystem` to `true` and the AI Act findings appear for the writing and externally-reaching tools, cited to Article 26. Whether an ops agent is in fact a high-risk AI system is a judgment for you to make, which is exactly why it is an input rather than something the tool guesses.
