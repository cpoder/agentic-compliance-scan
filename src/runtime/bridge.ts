import { createInterface } from "node:readline";
import type { Inventory } from "../schemas/inventory.js";
import { enrichEvent, type RawToolCall } from "./event.js";
import type { Sink } from "./sinks/index.js";

export interface BridgeResult {
  emitted: number;
  skipped: number;
}

/**
 * Read gateway-captured tool calls as NDJSON on stdin, enrich each with the
 * static scan's risk profile, and write the resulting McpToolCall events to the
 * sink. A line that is blank, unparseable, or carries no tool name is skipped
 * rather than aborting the stream.
 */
export async function runBridge(inventory: Inventory, sink: Sink): Promise<BridgeResult> {
  let emitted = 0;
  let skipped = 0;
  const rl = createInterface({ input: process.stdin, crlfDelay: Number.POSITIVE_INFINITY });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    let raw: RawToolCall;
    try {
      raw = JSON.parse(trimmed) as RawToolCall;
    } catch {
      skipped++;
      continue;
    }
    const event = enrichEvent(raw, inventory);
    if (event === null) {
      skipped++;
      continue;
    }
    await sink.write(event);
    emitted++;
  }
  await sink.close();
  return { emitted, skipped };
}
