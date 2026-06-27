import { consoleSink } from "./console.js";
import { httpSink } from "./http.js";
import type { SinkFactory } from "./types.js";

/**
 * The event sinks. `console` (NDJSON to stdout) is for a screencast or a local
 * `varpulis run`; `http` POSTs to Varpulis's HTTP connector for a real
 * deployment. Adding Kafka/NATS is one file here plus a factory — the bridge and
 * the CLI do not change.
 */
export const SINKS: Record<string, SinkFactory> = {
  console: () => consoleSink(),
  http: (opts) => httpSink(opts),
};

export const SINK_NAMES = Object.keys(SINKS);

export type { Sink, SinkFactory, SinkOptions } from "./types.js";
