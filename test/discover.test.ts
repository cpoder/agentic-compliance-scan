import { describe, expect, it } from "vitest";
import { classifyEffects } from "../src/discover/classify.js";
import { buildDraftInventory } from "../src/discover/index.js";
import type { DiscoveredServer } from "../src/discover/mcp.js";

describe("classifyEffects", () => {
  it("classifies a read verb as read-only with high confidence", () => {
    const c = classifyEffects("list_files", "List files in a directory.", false);
    expect(c.effects.writes).toBe(false);
    expect(c.effects.sideEffects).toBe(false);
    expect(c.confidence).toBe("high");
  });

  it("classifies a write verb as writing with high confidence", () => {
    const c = classifyEffects("create_user", "Create a user account.", false);
    expect(c.effects.writes).toBe(true);
    expect(c.effects.sideEffects).toBe(true);
    expect(c.effects.dataCategories).toContain("personal-data");
    expect(c.confidence).toBe("high");
  });

  it("tags credential-handling and remote tools", () => {
    const c = classifyEffects("setup_oauth", "Register OAuth clients.", true);
    expect(c.effects.dataCategories).toContain("credentials");
    expect(c.effects.externalAccess).toBe(true);
  });

  it("flags an unrecognised name as low confidence and read-only", () => {
    const c = classifyEffects("frobnicate", undefined, false);
    expect(c.confidence).toBe("low");
    expect(c.effects.writes).toBe(false);
  });
});

describe("buildDraftInventory", () => {
  it("discovers, classifies, and assembles a draft inventory", async () => {
    const stub = async (name: string): Promise<DiscoveredServer> => ({
      name,
      transport: "stdio",
      remote: false,
      tools: [
        { name: "read_file", description: "Read a file." },
        { name: "delete_file", description: "Delete a file." },
      ],
    });
    const { inventory, notes } = await buildDraftInventory(
      { mcpServers: { fs: { command: "x" } } },
      "demo",
      stub,
    );
    expect(inventory.deployment.name).toBe("demo");
    const tools = inventory.servers[0]?.tools ?? [];
    expect(tools.map((tool) => tool.name).sort()).toEqual(["delete_file", "read_file"]);
    expect(tools.find((tool) => tool.name === "delete_file")?.effects.writes).toBe(true);
    expect(tools.find((tool) => tool.name === "read_file")?.effects.writes).toBe(false);
    expect(notes.some((note) => note.includes("discovered 2 tool"))).toBe(true);
  });

  it("records a note when a server fails to discover", async () => {
    const stub = async (): Promise<DiscoveredServer> => {
      throw new Error("connection refused");
    };
    const { inventory, notes } = await buildDraftInventory(
      { mcpServers: { broken: { command: "x" } } },
      "demo",
      stub,
    );
    expect(inventory.servers).toHaveLength(0);
    expect(notes.some((note) => note.includes("discovery failed"))).toBe(true);
  });
});
