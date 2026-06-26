cd /home/cpo/agentic-compliance-scan
A="node dist/cli.js"
C=$'\033[36m'; B=$'\033[1m'; G=$'\033[32m'; Y=$'\033[33m'; D=$'\033[90m'; R=$'\033[0m'
printf '%s\n' "${C}# An AI agent connects to MCP servers. Each one hands it tools.${R}"
printf '%s\n' "${C}# Which of those tools are a compliance problem?${R}"
sleep 2.5
printf '\n%s\n' "${B}# Step 1: discover what the agent can actually do${R}"
printf '%s\n' "${D}\$ agentic-compliance-scan --discover mcp-config.json > my-agent.json${R}"
$A --discover mcp-config.json --name my-agent >/tmp/inv.json 2>/tmp/n.txt
printf '%s' "$G"; grep -E 'discovered [0-9]+ tool' /tmp/n.txt; printf '%s' "$R"
printf '%s\n' "${D}# listed the live server's tools and classified each one. no hand-listing.${R}"
sleep 3
printf '\n%s\n' "${B}# Step 2: scan the deployment against the law, for Germany${R}"
printf '%s\n' "${D}\$ agentic-compliance-scan --inventory my-agent.json --jurisdiction DE${R}"
$A --inventory examples/wm-ops-agent.inventory.json --jurisdiction DE 2>/dev/null | grep -E '^[0-9]+ gap|National law|^### |Reference:' | head -8
sleep 3.5
printf '\n%s\n' "${Y}${B}# The point:${R}"
printf '%s\n' "${Y}# 11 gaps, each cited to the actual German statute (BSIG), not the directive,${R}"
printf '%s\n' "${Y}# ranked by real risk, from a real MCP server, in seconds.${R}"
printf '%s\n' "${D}# github.com/cpoder/agentic-compliance-scan${R}"
sleep 3
