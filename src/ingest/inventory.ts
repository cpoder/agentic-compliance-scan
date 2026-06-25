import { readFileSync } from "node:fs";
import { type Inventory, InventorySchema } from "../schemas/inventory.js";

/** Validate an already-parsed value as an inventory. Throws on a schema mismatch. */
export function parseInventory(data: unknown): Inventory {
  return InventorySchema.parse(data);
}

/** Read a JSON inventory file from disk and validate it. */
export function loadInventoryFile(path: string): Inventory {
  return parseInventory(JSON.parse(readFileSync(path, "utf8")));
}
