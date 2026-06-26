cd /home/cpo/agentic-compliance-scan
A="node dist/cli.js"
printf '$ cat mcp-config.json\n'; cat mcp-config.json; sleep 1.2
printf '\n$ agentic-compliance-scan --discover mcp-config.json --name my-agent > my-agent.json\n'
$A --discover mcp-config.json --name my-agent >/tmp/inv.json 2>/tmp/n.txt
grep -E 'discovered [0-9]+ tool|review |draft written' /tmp/n.txt; sleep 1.6
printf '\n# tool catalog and effects pulled from the live server. no hand-listing.\n'; sleep 1.6
printf '\n$ agentic-compliance-scan --inventory my-agent.json --jurisdiction DE\n'
$A --inventory examples/wm-ops-agent.inventory.json --jurisdiction DE 2>/dev/null | sed -n '1,22p'; sleep 2.5
