import { describe, expect, it } from "vitest";
import { loadAllRules } from "../src/rules/index.js";
import { InventorySchema } from "../src/schemas/inventory.js";

const validInventory = {
  deployment: {
    name: "demo",
    inScopeSystems: [],
    controls: {
      recordKeeping: false,
      humanOversight: false,
      transparencyNotice: false,
      riskManagement: false,
    },
  },
  servers: [],
};

describe("InventorySchema", () => {
  it("accepts a minimal valid inventory", () => {
    expect(InventorySchema.parse(validInventory).deployment.name).toBe("demo");
  });

  it("rejects an inventory whose deployment has no controls", () => {
    const bad = { deployment: { name: "x", inScopeSystems: [] }, servers: [] };
    expect(() => InventorySchema.parse(bad)).toThrow();
  });
});

describe("rule data", () => {
  it("ships valid rule sets whose references are not yet populated", () => {
    const { rules } = loadAllRules();
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.every((rule) => rule.references.length === 0)).toBe(true);
  });
});
