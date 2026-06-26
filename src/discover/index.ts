import { type Inventory, InventorySchema } from "../schemas/inventory.js";
import { classifyEffects } from "./classify.js";
import { type DiscoveredServer, discoverServer, type McpServerConfig } from "./mcp.js";

export interface McpConfig {
  mcpServers: Record<string, McpServerConfig>;
}

export interface DraftResult {
  inventory: Inventory;
  notes: string[];
}

type DiscoverFn = (name: string, config: McpServerConfig) => Promise<DiscoveredServer>;

/**
 * Discover every server in an MCP config, classify each tool's effects, and
 * assemble a DRAFT inventory for review. The catalog and the effects are
 * auto-generated; the deployment-level inputs (isHighRiskAiSystem, inScopeSystems,
 * controls) and any low-confidence effect are left for a human to fill or correct.
 * `notes` records what was discovered and which classifications need review.
 */
export async function buildDraftInventory(
  config: McpConfig,
  deploymentName: string,
  discover: DiscoverFn = discoverServer,
): Promise<DraftResult> {
  const notes: string[] = [];
  const servers: unknown[] = [];

  for (const [name, serverConfig] of Object.entries(config.mcpServers ?? {})) {
    try {
      const discovered = await discover(name, serverConfig);
      const tools = discovered.tools.map((tool) => {
        const classification = classifyEffects(tool.name, tool.description, discovered.remote);
        if (classification.confidence !== "high") {
          notes.push(
            `review ${name}:${tool.name} (effects ${classification.confidence} confidence: ${classification.rationale})`,
          );
        }
        return {
          name: tool.name,
          ...(tool.description ? { description: tool.description } : {}),
          effects: classification.effects,
        };
      });
      servers.push({ name, transport: discovered.transport, tools, resources: [], prompts: [] });
      notes.unshift(`${name}: discovered ${tools.length} tool(s)`);
    } catch (error) {
      notes.push(
        `${name}: discovery failed (${error instanceof Error ? error.message : String(error)})`,
      );
    }
  }

  const inventory = InventorySchema.parse({
    deployment: { name: deploymentName, inScopeSystems: [] },
    servers,
  });
  return { inventory, notes };
}
