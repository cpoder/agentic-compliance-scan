import { describe, expect, it } from "vitest";
import { recommendPolicies } from "../src/policy/recommend.js";
import { renderPolicyMarkdown } from "../src/policy/render.js";
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

describe("recommendPolicies", () => {
  it("recommends a policy for a high-blast tool and skips a read-only one", () => {
    const tools = recommendPolicies(inventory).map((rec) => rec.tool);
    expect(tools).toContain("is_shutdown");
    expect(tools).not.toContain("read_status");
  });

  it("matches on the tools/call body and stays honest about enforcement", () => {
    const rec = recommendPolicies(inventory).find((item) => item.tool === "is_shutdown");
    expect(rec?.jsonrpcMatch).toEqual({ method: "tools/call", paramsName: "is_shutdown" });
    expect(rec?.webMethods.condition).toContain("params.name");
    expect(rec?.webMethods.condition).toContain("is_shutdown");
    expect(rec?.enforcementStatus).toBe("buildable-custom");
    expect(rec?.action).toBe("require_approval");
  });

  it("renders markdown with the not-a-native-feature disclaimer", () => {
    const md = renderPolicyMarkdown(recommendPolicies(inventory), "wm-ops");
    expect(md).toContain("not a native gateway feature");
    expect(md).toContain("is_shutdown");
  });
});
