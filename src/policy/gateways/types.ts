import type { PolicyRecommendation } from "../recommend.js";

/** A product-specific rendering of one gateway-agnostic recommendation. */
export interface GatewayArtifact {
  /** The gateway this artifact targets. */
  gateway: string;
  /** How the policy selects this tool, in the gateway's own expression language. */
  match: string;
  /** What the gateway does once the tool matches. */
  action: string;
  /** Caveats specific to this gateway, on top of the protocol-level ones. */
  warnings: string[];
}

/** Turns a gateway-agnostic recommendation into one product's snippet. */
export type GatewayAdapter = (recommendation: PolicyRecommendation) => GatewayArtifact;
