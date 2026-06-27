import { describe, expect, it } from "vitest";
import { enrichEvent } from "../src/runtime/event.js";
import { generateVpl } from "../src/runtime/vpl.js";
import { InventorySchema } from "../src/schemas/inventory.js";

const inventory = InventorySchema.parse({
  deployment: { name: "wm-ops" },
  servers: [
    {
      name: "wm",
      tools: [
        {
          name: "is_shutdown",
          effects: {
            sideEffects: true,
            externalAccess: true,
            writes: false,
            humanInTheLoop: false,
            scope: ["admin"],
            dataCategories: [],
          },
        },
        {
          name: "setup_oauth",
          effects: {
            sideEffects: true,
            externalAccess: false,
            writes: true,
            humanInTheLoop: false,
            scope: ["wm:admin", "oauth"],
            dataCategories: ["credentials"],
          },
        },
        {
          name: "read_status",
          effects: {
            sideEffects: false,
            externalAccess: true,
            writes: false,
            humanInTheLoop: false,
            scope: [],
            dataCategories: [],
          },
        },
      ],
    },
  ],
});

describe("runtime enrichment", () => {
  it("enriches a known tool with the static risk profile", () => {
    const e = enrichEvent(
      { tool: "setup_oauth", agent: "bot", caller_scope: "oauth:iam" },
      inventory,
    );
    expect(e?.admin).toBe(true);
    expect(e?.credentials).toBe(true);
    expect(e?.writes).toBe(true);
    expect(e?.blast_radius).toBeGreaterThanOrEqual(6);
  });

  it("reads the tool name from a raw JSON-RPC body", () => {
    const e = enrichEvent({ method: "tools/call", params: { name: "is_shutdown" } }, inventory);
    expect(e?.tool).toBe("is_shutdown");
    expect(e?.admin).toBe(true);
  });

  it("emits an unknown tool with zeroed risk rather than dropping it", () => {
    const e = enrichEvent({ tool: "mystery" }, inventory);
    expect(e?.tool).toBe("mystery");
    expect(e?.blast_radius).toBe(0);
    expect(e?.admin).toBe(false);
  });

  it("returns null only when there is no tool name", () => {
    expect(enrichEvent({ agent: "bot" }, inventory)).toBeNull();
  });
});

describe("VPL generation", () => {
  const vpl = generateVpl(inventory);

  it("declares the McpToolCall event and the five rules", () => {
    expect(vpl).toContain("event McpToolCall:");
    for (const stream of [
      "HighBlastInvocation",
      "CallerScopeViolation",
      "PrivilegeEscalation",
      "CredentialExfil",
      "DestructiveBurst",
    ]) {
      expect(vpl).toContain(`stream ${stream} =`);
    }
  });

  it("inlines the allowed admin OAuth scopes from the inventory", () => {
    expect(vpl).toContain('"oauth:admin"');
    expect(vpl).toContain('"oauth:wm:admin"');
    expect(vpl).toContain('"oauth:oauth"');
  });

  it("uses verified VPL idioms (sequence, within, window + aggregate)", () => {
    expect(vpl).toContain("-> McpToolCall where admin and agent == a.agent as b");
    expect(vpl).toContain(".within(2m)");
    expect(vpl).toContain(".window(1m)");
    expect(vpl).toContain(".aggregate(agent: last(agent), n: count())");
  });

  it("honours threshold options", () => {
    const v = generateVpl(inventory, { highBlast: 8, burstCount: 3 });
    expect(v).toContain("blast_radius >= 8");
    expect(v).toContain("n >= 3");
  });
});
