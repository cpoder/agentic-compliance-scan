import type { McpToolCallEvent } from "../event.js";

/** Where the bridge writes enriched events — i.e. Varpulis's input connector. */
export interface Sink {
  write(event: McpToolCallEvent): Promise<void>;
  close(): Promise<void>;
}

export interface SinkOptions {
  /** Connector target, e.g. the Varpulis HTTP endpoint for the `http` sink. */
  target?: string;
}

export type SinkFactory = (opts: SinkOptions) => Sink;
