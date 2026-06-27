import { ADMIN_SCOPE, toolBlastRadius } from "../engine/risk.js";
import type { Inventory, ToolEffects } from "../schemas/inventory.js";

/**
 * A McpToolCall event, as Varpulis consumes it: one gateway-captured tools/call
 * enriched with the risk profile the static scan already computed for that tool.
 * Field names are snake_case to match the generated VPL `event McpToolCall`.
 */
export interface McpToolCallEvent {
  ts: number;
  agent: string;
  server: string;
  tool: string;
  caller_scope: string;
  writes: boolean;
  side_effects: boolean;
  external_access: boolean;
  admin: boolean;
  credentials: boolean;
  personal_data: boolean;
  blast_radius: number;
}

/**
 * A raw tool call as a gateway emits it: the calling identity + the tool, with
 * optional server/scope/timestamp context. A bare JSON-RPC body is also accepted
 * (the tool name is read from params.name).
 */
export interface RawToolCall {
  ts?: number;
  agent?: string;
  server?: string;
  tool?: string;
  caller_scope?: string;
  method?: string;
  params?: { name?: string };
}

const NEUTRAL: ToolEffects = {
  sideEffects: false,
  externalAccess: false,
  writes: false,
  humanInTheLoop: false,
  scope: [],
  dataCategories: [],
};

function lookupEffects(
  inventory: Inventory,
  server: string | undefined,
  tool: string,
): ToolEffects | undefined {
  // Prefer the exact server match, then fall back to any server exposing the tool.
  for (const s of inventory.servers) {
    if (server && s.name !== server) continue;
    const found = s.tools.find((t) => t.name === tool);
    if (found) return found.effects;
  }
  for (const s of inventory.servers) {
    const found = s.tools.find((t) => t.name === tool);
    if (found) return found.effects;
  }
  return undefined;
}

/**
 * Enrich a raw gateway tool call into a McpToolCall event using the inventory's
 * known effects. An unknown tool still produces an event (zeroed risk) so it
 * stays observable rather than silently dropped. Returns null only when there is
 * no tool name to key on.
 */
export function enrichEvent(raw: RawToolCall, inventory: Inventory): McpToolCallEvent | null {
  const tool = raw.tool ?? raw.params?.name;
  if (!tool) return null;
  const effects = lookupEffects(inventory, raw.server, tool);
  const e = effects ?? NEUTRAL;
  return {
    ts: raw.ts ?? Date.now(),
    agent: raw.agent ?? "unknown",
    server: raw.server ?? "",
    tool,
    caller_scope: raw.caller_scope ?? "",
    writes: e.writes,
    side_effects: e.sideEffects,
    external_access: e.externalAccess,
    admin: e.scope.some((scope) => ADMIN_SCOPE.test(scope)),
    credentials: e.dataCategories.includes("credentials"),
    personal_data: e.dataCategories.includes("personal-data"),
    blast_radius: effects ? toolBlastRadius({ name: tool, effects: e }) : 0,
  };
}
