import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type RuleSet, RuleSetSchema } from "../schemas/rules.js";

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(here, "data");

/** Load and validate one rule data file from the bundled data directory. */
export function loadRuleSet(file: string): RuleSet {
  const raw = readFileSync(join(DATA_DIR, file), "utf8");
  return RuleSetSchema.parse(JSON.parse(raw));
}

/** The data files that ship with the tool. Empty in v0 until rules are authored. */
export const RULE_FILES = ["ai-act-deployer.json", "nis2.json"] as const;

/** Load every shipped rule set and concatenate the rules. */
export function loadAllRules(): RuleSet {
  const rules = RULE_FILES.flatMap((file) => loadRuleSet(file).rules);
  return { rules };
}
