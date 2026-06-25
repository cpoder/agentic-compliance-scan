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
  | {
      controlAbsent:
        | "aiActLogging"
        | "aiActHumanOversight"
        | "aiActTransparency"
        | "nis2RiskAnalysis"
        | "nis2IncidentHandling"
        | "nis2BusinessContinuity"
        | "nis2SupplyChainSecurity"
        | "nis2SecureDevelopment"
        | "nis2EffectivenessAssessment"
        | "nis2CyberHygiene"
        | "nis2Cryptography"
        | "nis2AccessControl"
        | "nis2Mfa"
        | "nis2Governance";
    }
  | { deploymentTouchesInScopeSystem: true }
  | { deploymentIsHighRiskAiSystem: true }
  | { deploymentInteractsWithPeople: true }
  | { deploymentGeneratesSyntheticContent: true };

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
        "aiActLogging",
        "aiActHumanOversight",
        "aiActTransparency",
        "nis2RiskAnalysis",
        "nis2IncidentHandling",
        "nis2BusinessContinuity",
        "nis2SupplyChainSecurity",
        "nis2SecureDevelopment",
        "nis2EffectivenessAssessment",
        "nis2CyberHygiene",
        "nis2Cryptography",
        "nis2AccessControl",
        "nis2Mfa",
        "nis2Governance",
      ]),
    }),
    z.object({ deploymentTouchesInScopeSystem: z.literal(true) }),
    z.object({ deploymentIsHighRiskAiSystem: z.literal(true) }),
    z.object({ deploymentInteractsWithPeople: z.literal(true) }),
    z.object({ deploymentGeneratesSyntheticContent: z.literal(true) }),
  ]),
);

/**
 * The legal anchor of a rule, for one jurisdiction. Supplied from a validated
 * source, never invented by a model. `source` records provenance. `validated`
 * stays false until the maintainer confirms the reference and the
 * rule-to-obligation mapping.
 *
 * The `jurisdiction` is where this reference is the binding citation:
 *   - "EU" for a directly-applicable Regulation (the AI Act): the EU article is
 *     cited as-is in every member state.
 *   - a country code for a transposed Directive (NIS2): the citation is that
 *     country's national transposition (`article` + `nationalRef`), NEVER the
 *     Directive article, because the Directive does not bind the entity once a
 *     country has transposed it.
 */
export const LegalRefSchema = z.object({
  instrument: z.enum(["ai-act", "nis2"]),
  jurisdiction: JurisdictionSchema,
  /** The cited provision: the AI Act article, or the national transposition article. */
  article: z.string().min(1),
  /** For a national citation, the law or decree that carries the article. */
  nationalRef: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  source: z.string().optional(),
  /**
   * In-force status of the cited provision. "draft" means the national law is
   * not yet promulgated (e.g. France in 2026); "deferred" means it is enacted
   * but its effect is postponed (e.g. Portugal art. 27 pending CNCS regulations).
   * Omitted means in force. The report surfaces a non-in-force status so a user
   * is never told a draft obligation already binds.
   */
  status: z.enum(["in-force", "draft", "deferred"]).optional(),
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

/**
 * Whether a rule is evaluated once per tool (evidence is the tool) or once for
 * the whole deployment (evidence is the deployment). Deployment-scoped rules use
 * only deployment-level conditions.
 */
export const RuleScopeSchema = z.enum(["tool", "deployment"]);
export type RuleScope = z.infer<typeof RuleScopeSchema>;

export const RuleSchema = z.object({
  id: z.string().min(1),
  category: RuleCategorySchema,
  scope: RuleScopeSchema.default("tool"),
  jurisdictions: z.array(JurisdictionSchema).min(1),
  /** Operational title. Not a legal claim. */
  title: z.string().min(1),
  /** Operational remediation guidance. Not a legal claim. */
  guidance: z.string().optional(),
  severity: SeveritySchema,
  appliesWhen: ConditionSchema,
  /**
   * One reference per jurisdiction this rule applies in. Empty until references
   * are sourced and validated. The engine resolves the reference for the
   * requested jurisdiction and fails loud when none resolves, so a finding never
   * surfaces without a citation that binds in that country.
   */
  references: z.array(LegalRefSchema).default([]),
});
export type Rule = z.infer<typeof RuleSchema>;

export const RuleSetSchema = z.object({
  rules: z.array(RuleSchema).default([]),
});
export type RuleSet = z.infer<typeof RuleSetSchema>;
