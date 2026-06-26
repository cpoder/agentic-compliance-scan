cd /home/cpo/agentic-compliance-scan
A="node dist/cli.js"
C=$'\033[36m'; B=$'\033[1m'; G=$'\033[32m'; Y=$'\033[33m'; D=$'\033[90m'; R=$'\033[0m'
printf '%s\n' "${C}# An AI agent connects to MCP servers. Each one hands it tools.${R}"
printf '%s\n' "${C}# Which of those tools are a compliance problem, and how do you contain them?${R}"
sleep 2.5
printf '\n%s\n' "${B}# Step 1: discover what the agent can actually do${R}"
printf '%s\n' "${D}\$ agentic-compliance-scan --discover mcp-config.json > my-agent.json${R}"
$A --discover mcp-config.json --name my-agent >/tmp/inv.json 2>/tmp/n.txt
printf '%s' "$G"; grep -E 'discovered [0-9]+ tool' /tmp/n.txt; printf '%s' "$R"
printf '%s\n' "${D}# tools listed and effects classified, no hand-listing.${R}"
sleep 2.5
printf '\n%s\n' "${B}# Step 2: scan against the law, for Germany${R}"
printf '%s\n' "${D}\$ agentic-compliance-scan --inventory my-agent.json --jurisdiction DE${R}"
$A --inventory examples/wm-ops-agent.inventory.json --jurisdiction DE 2>/dev/null | grep -E '^[0-9]+ gap|National law|^### |Reference:' | head -4
sleep 3
printf '\n%s\n' "${B}# Step 3: recommend the policy to lock down the dangerous tools, on any gateway${R}"
printf '%s\n' "${D}\$ agentic-compliance-scan --policy my-agent.json${R}"
$A --policy examples/wm-ops-agent.inventory.json 2>/dev/null | grep -E '^## wm|^- Match:' | head -4
printf '%s\n' "${D}# add --gateway webmethods (or envoy) for a ready-to-paste snippet${R}"
sleep 3
printf '\n%s\n' "${Y}${B}# The full loop:${R}"
printf '%s\n' "${Y}# discover a real MCP server, cite the gaps in your own national law,${R}"
printf '%s\n' "${Y}# and recommend the policy to close them, on any gateway. In seconds.${R}"
printf '%s\n' "${D}# github.com/cpoder/agentic-compliance-scan${R}"
sleep 3
