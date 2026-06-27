import type { Sink, SinkOptions } from "./types.js";

/**
 * POST each event to Varpulis's HTTP/Webhook connector endpoint — the realistic
 * sink for a running deployment. Needs --target <url>.
 */
export function httpSink(opts: SinkOptions): Sink {
  const url = opts.target;
  if (!url) {
    throw new Error("--sink http needs --target <url> (the Varpulis HTTP connector endpoint)");
  }
  return {
    async write(event) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(event),
      });
      if (!res.ok) {
        throw new Error(`http sink ${res.status}: ${await res.text()}`);
      }
    },
    async close() {},
  };
}
