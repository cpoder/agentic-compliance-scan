import { z } from "zod";

export const JurisdictionSchema = z.enum(["EU", "FR", "IT", "PT", "BE", "DE", "AT"]);
export type Jurisdiction = z.infer<typeof JurisdictionSchema>;

/**
 * A small, declarative condition language. Rule data is pure data: there is no
 * executable code in a rule, so a rule cannot do anything other than describe
 * when it applies. The engine interprets this tree against the inventory.
 */
export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { toolEffect: "sideEffects" | "externalAccess" | "writes" | "humanInTheLoop"; equals: boolean }
  | { toolScopeIncludes: string }
  | { toolDataCategory: string }
  | { controlAbsent: "recordKeeping" | "humanOversight" | "transparencyNotice" | "riskManagement" }
  | { deploymentTouchesInScopeSystem: true };

export const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(ConditionSchema) }),
    z.object({ any: z.array(ConditionSchema) }),
    z.object({ not: ConditionSchema }),
    z.object({
      toolEffect: z.enum(["sideEffects", "externalAccess", "writes", "humanInTheLoop"]),
      equals: z.boolean(),
    }),
    z.object({ toolScopeIncludes: z.string().min(1) }),
    z.object({ toolDataCategory: z.string().min(1) }),
    z.object({
      controlAbsent: z.enum([
        "recordKeeping",
        "humanOversight",
        "transparencyNotice",
        "riskManagement",
      ]),
    }),
    z.object({ deploymentTouchesInScopeSystem: z.literal(true) }),
  ]),
);

/**
 * The legal anchor of a rule. Supplied from a validated source, never invented
 * by a model. `source` records provenance. `validated` stays false until the
 * maintainer confirms the reference and the rule-to-obligation mapping.
 */
export const LegalRefSchema = z.object({
  instrument: z.enum(["ai-act", "nis2"]),
  article: z.string().min(1),
  jurisdiction: JurisdictionSchema.optional(),
  nationalRef: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  source: z.string().optional(),
  validated: z.boolean().default(false),
});
export type LegalRef = z.infer<typeof LegalRefSchema>;

export const RuleCategorySchema = z.enum([
  "record-keeping",
  "human-oversight",
  "transparency",
  "nis2-risk-management",
]);
export type RuleCategory = z.infer<typeof RuleCategorySchema>;

export const SeveritySchema = z.enum(["info", "low", "medium", "high"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const RuleSchema = z.object({
  id: z.string().min(1),
  category: RuleCategorySchema,
  jurisdictions: z.array(JurisdictionSchema).min(1),
  /** Operational title. Not a legal claim. */
  title: z.string().min(1),
  /** Operational remediation guidance. Not a legal claim. */
  guidance: z.string().optional(),
  severity: SeveritySchema,
  appliesWhen: ConditionSchema,
  /** Null until a reference is sourced and validated. */
  ref: LegalRefSchema.nullable(),
});
export type Rule = z.infer<typeof RuleSchema>;

export const RuleSetSchema = z.object({
  rules: z.array(RuleSchema).default([]),
});
export type RuleSet = z.infer<typeof RuleSetSchema>;
