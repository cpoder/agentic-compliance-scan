import { z } from "zod";

/**
 * The observable, governance-relevant properties of a single MCP tool.
 * These are what the rule engine evaluates against. They are declared by the
 * person who curates the inventory (v0 has no live discovery).
 */
export const ToolEffectsSchema = z.object({
  /** Changes some state outside the agent itself. */
  sideEffects: z.boolean(),
  /** Calls the network or an external system. */
  externalAccess: z.boolean(),
  /** Writes or persists data. */
  writes: z.boolean(),
  /** A human approval or confirmation step gates the invocation. */
  humanInTheLoop: z.boolean(),
  /** Effective capability or permission scopes, free-form labels (e.g. "fs:write"). */
  scope: z.array(z.string()).default([]),
  /** Data categories the tool touches (e.g. "personal-data", "credentials"). */
  dataCategories: z.array(z.string()).default([]),
});
export type ToolEffects = z.infer<typeof ToolEffectsSchema>;

export const McpToolSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  effects: ToolEffectsSchema,
});
export type McpTool = z.infer<typeof McpToolSchema>;

export const McpResourceSchema = z.object({
  uri: z.string().min(1),
  name: z.string().optional(),
  mimeType: z.string().optional(),
});

export const McpPromptSchema = z.object({
  name: z.string().min(1),
  arguments: z.array(z.string()).optional(),
});

export const McpServerSchema = z.object({
  name: z.string().min(1),
  transport: z.enum(["stdio", "http", "sse"]).optional(),
  tools: z.array(McpToolSchema).default([]),
  resources: z.array(McpResourceSchema).default([]),
  prompts: z.array(McpPromptSchema).default([]),
});
export type McpServer = z.infer<typeof McpServerSchema>;

/**
 * Governance controls the deployment declares it has in place. Rules compare a
 * tool's risk signals against these declared controls to surface a gap.
 */
export const DeploymentControlsSchema = z.object({
  // AI Act deployer controls. Each maps 1:1 to the obligation a rule cites.
  aiActLogging: z.boolean().default(false),
  aiActHumanOversight: z.boolean().default(false),
  aiActTransparency: z.boolean().default(false),
  // NIS2 Art. 21(2) risk-management measures (a-j), one control each.
  nis2RiskAnalysis: z.boolean().default(false),
  nis2IncidentHandling: z.boolean().default(false),
  nis2BusinessContinuity: z.boolean().default(false),
  nis2SupplyChainSecurity: z.boolean().default(false),
  nis2SecureDevelopment: z.boolean().default(false),
  nis2EffectivenessAssessment: z.boolean().default(false),
  nis2CyberHygiene: z.boolean().default(false),
  nis2Cryptography: z.boolean().default(false),
  nis2AccessControl: z.boolean().default(false),
  nis2Mfa: z.boolean().default(false),
  // NIS2 Art. 20 management-body governance accountability.
  nis2Governance: z.boolean().default(false),
});
export type DeploymentControls = z.infer<typeof DeploymentControlsSchema>;

export const DeploymentSchema = z.object({
  name: z.string().min(1),
  /** Labels of NIS2 in-scope systems the agent acts on. Empty means none declared. */
  inScopeSystems: z.array(z.string()).default([]),
  /**
   * Whether the deployed system qualifies as a high-risk AI system (AI Act
   * Art. 6 / Annex III). Most AI Act deployer duties (Art. 26) bind only for
   * high-risk systems, so those rules are gated on this. Defaults to false.
   */
  isHighRiskAiSystem: z.boolean().default(false),
  /** Whether the agent interacts directly with natural persons (AI Act Art. 50(1) trigger). */
  interactsWithPeople: z.boolean().default(false),
  /** Whether the agent generates or manipulates synthetic content (AI Act Art. 50(4) trigger). */
  generatesSyntheticContent: z.boolean().default(false),
  controls: DeploymentControlsSchema.default(DeploymentControlsSchema.parse({})),
});
export type Deployment = z.infer<typeof DeploymentSchema>;

export const InventorySchema = z.object({
  deployment: DeploymentSchema,
  servers: z.array(McpServerSchema).default([]),
});
export type Inventory = z.infer<typeof InventorySchema>;
