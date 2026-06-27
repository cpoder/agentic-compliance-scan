import type { McpToolCallEvent } from "../event.js";

/** Where the bridge writes enriched events — i.e. Varpulis's input connector. */
export interface Sink {
  write(event: McpToolCallEvent): Promise<void>;
  close(): Promise<void>;
}

export interface SinkOptions {
  /** Connector target: the Varpulis HTTP endpoint (`http`) or NATS server URL (`nats`). */
  target?: string;
  /** NATS subject to publish to (`nats` sink). */
  subject?: string;
}

export type SinkFactory = (opts: SinkOptions) => Sink;
