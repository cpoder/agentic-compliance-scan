import { envoyArtifact } from "./envoy.js";
import type { GatewayAdapter } from "./types.js";
import { webMethodsArtifact } from "./webmethods.js";

/**
 * The gateway adapters. The core recommendation is gateway-agnostic; pick one
 * of these with `--gateway` to render a product-specific snippet. Adding a
 * gateway is one entry here plus an adapter file, nothing in the engine.
 */
export const GATEWAY_ADAPTERS: Record<string, GatewayAdapter> = {
  webmethods: webMethodsArtifact,
  envoy: envoyArtifact,
};

export const GATEWAY_NAMES = Object.keys(GATEWAY_ADAPTERS);

export type { GatewayAdapter, GatewayArtifact } from "./types.js";
