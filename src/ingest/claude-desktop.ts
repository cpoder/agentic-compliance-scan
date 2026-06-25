import { readFileSync } from "node:fs";
import { z } from "zod";
import { type Inventory, InventorySchema } from "../schemas/inventory.js";

const ClaudeDesktopServerSchema = z.object({
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  url: z.string().optional(),
});

const ClaudeDesktopConfigSchema = z.object({
  mcpServers: z.record(z.string(), ClaudeDesktopServerSchema).default({}),
});

/**
 * Normalize a Claude Desktop config into an inventory SKELETON.
 *
 * A Claude Desktop config only lists servers (command, args, env, url). It does
 * not describe their tools or any governance property. The skeleton therefore
 * has empty tool lists and all declared controls set to false: the operator
 * must annotate tools and controls before a scan is meaningful. This is a
 * bootstrap convenience, not auto-discovery (auto-discovery needs a live
 * connection, which is out of scope for v0).
 */
export function importClaudeDesktopConfig(
  data: unknown,
  deploymentName = "imported-deployment",
): Inventory {
  const config = ClaudeDesktopConfigSchema.parse(data);
  const servers = Object.entries(config.mcpServers).map(([name, def]) => ({
    name,
    transport: def.url ? "http" : "stdio",
    tools: [],
    resources: [],
    prompts: [],
  }));
  return InventorySchema.parse({
    deployment: {
      name: deploymentName,
      inScopeSystems: [],
    },
    servers,
  });
}

/** Read a Claude Desktop config file and normalize it into an inventory skeleton. */
export function loadClaudeDesktopConfigFile(path: string, deploymentName?: string): Inventory {
  return importClaudeDesktopConfig(JSON.parse(readFileSync(path, "utf8")), deploymentName);
}
