import { describe, expect, it } from "vitest";
import { envoyArtifact } from "../src/policy/gateways/envoy.js";
import { webMethodsArtifact } from "../src/policy/gateways/webmethods.js";
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

  it("stays gateway-agnostic: the core recommendation names no vendor", () => {
    const rec = recommendPolicies(inventory).find((item) => item.tool === "is_shutdown");
    expect(rec?.jsonrpcMatch).toEqual({ method: "tools/call", paramsName: "is_shutdown" });
    expect(rec?.enforcementStatus).toBe("buildable-custom");
    expect(rec?.action).toBe("require_approval");
    expect(JSON.stringify(rec).toLowerCase()).not.toContain("webmethods");
  });

  it("renders portable markdown by default, with no gateway snippet", () => {
    const md = renderPolicyMarkdown(recommendPolicies(inventory), "wm-ops");
    expect(md).toContain("not a native gateway feature");
    expect(md).toContain("is_shutdown");
    expect(md).not.toContain("webmethods-api-gateway");
  });
});

describe("gateway adapters", () => {
  const rec = recommendPolicies(inventory).find((item) => item.tool === "is_shutdown");

  it("webMethods renders a params.name condition only when asked", () => {
    const artifact = webMethodsArtifact(rec!);
    expect(artifact.match).toContain("params.name");
    expect(artifact.match).toContain("is_shutdown");
    const md = renderPolicyMarkdown([rec!], "wm-ops", webMethodsArtifact);
    expect(md).toContain("webmethods-api-gateway match");
  });

  it("envoy is a second adapter over the same recommendation", () => {
    const artifact = envoyArtifact(rec!);
    expect(artifact.gateway).toBe("envoy-mcp-filter");
    expect(artifact.match).toContain("is_shutdown");
  });
});
