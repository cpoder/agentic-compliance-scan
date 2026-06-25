import { describe, expect, it } from "vitest";
import {
  importClaudeDesktopConfig,
  loadClaudeDesktopConfigFile,
} from "../src/ingest/claude-desktop.js";
import { loadInventoryFile, parseInventory } from "../src/ingest/inventory.js";

describe("parseInventory", () => {
  it("loads and validates the minimal inventory fixture", () => {
    const inventory = loadInventoryFile("fixtures/inventories/minimal.json");
    expect(inventory.servers[0]?.name).toBe("filesystem");
    expect(inventory.servers[0]?.tools[0]?.effects.writes).toBe(true);
  });

  it("rejects an inventory whose deployment has no name", () => {
    expect(() => parseInventory({ deployment: {}, servers: [] })).toThrow();
  });
});

describe("importClaudeDesktopConfig", () => {
  it("produces a skeleton with server names, empty tools, and no declared controls", () => {
    const inventory = importClaudeDesktopConfig({
      mcpServers: {
        filesystem: { command: "npx", args: ["-y", "server-filesystem"] },
        github: { command: "npx", env: { TOKEN: "x" } },
      },
    });
    expect(inventory.servers.map((server) => server.name).sort()).toEqual(["filesystem", "github"]);
    expect(inventory.servers.every((server) => server.tools.length === 0)).toBe(true);
    expect(inventory.deployment.controls.aiActLogging).toBe(false);
  });

  it("loads the claude desktop config fixture from disk", () => {
    const inventory = loadClaudeDesktopConfigFile(
      "fixtures/inventories/claude-desktop-config.json",
      "demo",
    );
    expect(inventory.deployment.name).toBe("demo");
    expect(inventory.servers.map((server) => server.name).sort()).toEqual(["filesystem", "github"]);
  });
});
