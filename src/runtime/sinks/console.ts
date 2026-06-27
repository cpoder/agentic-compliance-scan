import type { Sink } from "./types.js";

/**
 * NDJSON to stdout — one event per line. Varpulis's Console connector reads this
 * straight off the pipe, which makes it the right sink for a screencast or a
 * local `varpulis run` against the generated ruleset.
 */
export function consoleSink(): Sink {
  return {
    async write(event) {
      process.stdout.write(`${JSON.stringify(event)}\n`);
    },
    async close() {},
  };
}
