import { describe, expect, it } from "vitest";
import { evaluateCondition } from "../src/engine/condition.js";
import { evaluate, MissingReferenceError } from "../src/engine/evaluate.js";
import { loadAllRules } from "../src/rules/index.js";
import { type Inventory, InventorySchema } from "../src/schemas/inventory.js";
import type { Rule } from "../src/schemas/rules.js";

const riskyInventory: Inventory = InventorySchema.parse({
  deployment: {
    name: "demo",
    inScopeSystems: ["billing-system"],
    isHighRiskAiSystem: false,
  },
  servers: [
    {
      name: "filesystem",
      transport: "stdio",
      tools: [
        {
          name: "write_file",
          effects: {
            sideEffects: true,
            externalAccess: false,
            writes: true,
            humanInTheLoop: false,
            scope: ["fs:write"],
            dataCategories: [],
          },
        },
      ],
      resources: [],
      prompts: [],
    },
  ],
});

const writeRule: Rule = {
  id: "test.human-oversight.writing-tool-no-approval",
  category: "human-oversight",
  scope: "tool",
  jurisdictions: ["EU"],
  title: "Writing tool with no approval and no oversight",
  guidance: "Add an approval gate.",
  severity: "high",
  appliesWhen: {
    all: [
      { toolEffect: "writes", equals: true },
      { toolEffect: "humanInTheLoop", equals: false },
      { controlAbsent: "aiActHumanOversight" },
    ],
  },
  references: [
    {
      instrument: "ai-act",
      jurisdiction: "EU",
      article: "Art. 26(5)",
      validated: true,
      source: "test-fixture",
    },
  ],
};

const deploymentRule: Rule = {
  id: "test.nis2.in-scope-no-risk-management",
  category: "nis2-risk-management",
  scope: "deployment",
  jurisdictions: ["FR"],
  title: "In-scope system with no risk management",
  severity: "high",
  appliesWhen: {
    all: [{ deploymentTouchesInScopeSystem: true }, { controlAbsent: "nis2RiskAnalysis" }],
  },
  references: [
    {
      instrument: "nis2",
      jurisdiction: "FR",
      article: "art-x",
      nationalRef: "loi-fr",
      validated: true,
      source: "t",
    },
  ],
};

describe("evaluateCondition", () => {
  it("matches a tool predicate and a deployment predicate together", () => {
    const tool = riskyInventory.servers[0]?.tools[0];
    expect(tool).toBeDefined();
    if (!tool) return;
    const matched = evaluateCondition(writeRule.appliesWhen, {
      deployment: riskyInventory.deployment,
      tool,
    });
    expect(matched).toBe(true);
  });
});

describe("evaluate", () => {
  it("produces a finding when a tool-scoped rule matches a tool", () => {
    const findings = evaluate(riskyInventory, [writeRule], "FR");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.ruleId).toBe(writeRule.id);
    expect(findings[0]?.evidence.join(" ")).toContain("write_file");
  });

  it("throws a MissingReferenceError when a matched rule has no reference", () => {
    const noRef: Rule = { ...writeRule, id: "test.no-ref", references: [] };
    expect(() => evaluate(riskyInventory, [noRef], "FR")).toThrow(MissingReferenceError);
  });

  it("skips a national rule for a different jurisdiction", () => {
    const italianOnly: Rule = { ...writeRule, jurisdictions: ["IT"] };
    expect(evaluate(riskyInventory, [italianOnly], "FR")).toHaveLength(0);
  });

  it("applies an EU rule to any member-state jurisdiction", () => {
    expect(evaluate(riskyInventory, [writeRule], "DE")).toHaveLength(1);
  });

  it("evaluates a deployment-scoped rule once, with deployment evidence", () => {
    const findings = evaluate(riskyInventory, [deploymentRule], "FR");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.evidence.join(" ")).toContain("deployment:");
  });

  it("collapses a tool-scoped rule into one finding listing all triggering tools", () => {
    const twoTools = InventorySchema.parse({
      deployment: { name: "d", inScopeSystems: [] },
      servers: [
        {
          name: "fs",
          tools: [
            {
              name: "write_a",
              effects: {
                sideEffects: true,
                externalAccess: false,
                writes: true,
                humanInTheLoop: false,
              },
            },
            {
              name: "write_b",
              effects: {
                sideEffects: true,
                externalAccess: false,
                writes: true,
                humanInTheLoop: false,
              },
            },
          ],
        },
      ],
    });
    const findings = evaluate(twoTools, [writeRule], "EU");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.evidence).toEqual(["fs:write_a", "fs:write_b"]);
  });

  it("escalates severity by the blast radius of a credential-handling admin tool", () => {
    const adminInv = InventorySchema.parse({
      deployment: { name: "d", inScopeSystems: [] },
      servers: [
        {
          name: "iam",
          tools: [
            {
              name: "create_user",
              effects: {
                sideEffects: true,
                externalAccess: true,
                writes: true,
                humanInTheLoop: false,
                scope: ["admin"],
                dataCategories: ["credentials"],
              },
            },
          ],
        },
      ],
    });
    const mediumRule: Rule = { ...writeRule, id: "test.medium", severity: "medium" };
    const findings = evaluate(adminInv, [mediumRule], "EU");
    expect(findings).toHaveLength(1);
    expect(findings[0]?.baseSeverity).toBe("medium");
    expect(findings[0]?.severity).toBe("high");
  });

  it("evaluates the shipped seed rules: NIS2 fires, AI Act stays gated off", () => {
    const seed = loadAllRules().rules;
    const findings = evaluate(riskyInventory, seed, "FR");
    // The deployment touches an in-scope system with no controls, so the NIS2
    // deployment rules fire. The AI Act rules do not, because the deployment is
    // not flagged as a high-risk AI system.
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((finding) => finding.ref.instrument === "nis2")).toBe(true);
  });

  it("fires AI Act rules only when the deployment is a high-risk AI system", () => {
    const seed = loadAllRules().rules;
    const highRisk: Inventory = {
      ...riskyInventory,
      deployment: { ...riskyInventory.deployment, isHighRiskAiSystem: true },
    };
    // EU jurisdiction: only AI Act rules apply (national NIS2 rules do not).
    expect(evaluate(riskyInventory, seed, "EU")).toHaveLength(0);
    const high = evaluate(highRisk, seed, "EU");
    expect(high.length).toBeGreaterThan(0);
    expect(high.every((finding) => finding.ref.instrument === "ai-act")).toBe(true);
  });
});
