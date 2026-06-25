import { describe, expect, it } from "vitest";
import { renderReport } from "../src/report/index.js";
import type { ReportInput } from "../src/report/types.js";
import type { Finding } from "../src/schemas/findings.js";

const stubFindings: Finding[] = [
  {
    ruleId: "ai-act.human-oversight.writing-tool-no-approval",
    category: "human-oversight",
    severity: "high",
    title: "Writing tool runs without a human approval step",
    guidance: "Add an approval gate before the tool can write.",
    jurisdiction: "FR",
    ref: { instrument: "ai-act", article: "Art. 26(5)", validated: true, source: "test-fixture" },
    evidence: "server:filesystem tool:write_file",
  },
];

const base: ReportInput = { deployment: "demo", jurisdiction: "FR", findings: stubFindings };

describe("renderReport markdown", () => {
  it("includes the disclaimer, the finding, the reference, and a severity summary", () => {
    const md = renderReport(base, "md");
    expect(md).toContain("not legal advice");
    expect(md).toContain("Writing tool runs without a human approval step");
    expect(md).toContain("Art. 26(5)");
    expect(md).toContain("high: 1");
  });

  it("says no gaps when findings are empty, and still carries the disclaimer", () => {
    const md = renderReport({ ...base, findings: [] }, "md");
    expect(md).toContain("No gaps found");
    expect(md).toContain("not legal advice");
  });
});

describe("renderReport json", () => {
  it("emits a stable shape with summary, disclaimer, and findings", () => {
    const parsed = JSON.parse(renderReport(base, "json"));
    expect(parsed.summary.total).toBe(1);
    expect(parsed.summary.bySeverity.high).toBe(1);
    expect(parsed.disclaimer).toContain("not legal advice");
    expect(parsed.findings[0].ref.article).toBe("Art. 26(5)");
  });
});
