import type { Codec, NatsConnection } from "nats";
import type { Sink, SinkOptions } from "./types.js";

/**
 * Publish each event to a NATS subject — the realistic broker sink. Varpulis
 * consumes it with `connector C = nats(...)` + `McpToolCall.from(C, topic: ...)`.
 * The connection opens lazily on the first event, so `nats` is only loaded when
 * this sink is actually used.
 */
export function natsSink(opts: SinkOptions): Sink {
  const url = opts.target ?? "nats://localhost:4222";
  const subject = opts.subject ?? "mcp.toolcalls";
  let conn: Promise<NatsConnection> | null = null;
  let codec: Codec<string> | null = null;

  async function connection(): Promise<NatsConnection> {
    if (conn === null) {
      const { connect, StringCodec } = await import("nats");
      codec = StringCodec();
      conn = connect({ servers: url });
    }
    return conn;
  }

  return {
    async write(event) {
      const nc = await connection();
      nc.publish(subject, codec?.encode(JSON.stringify(event)));
    },
    async close() {
      if (conn !== null) {
        const nc = await conn;
        await nc.flush();
        await nc.close();
      }
    },
  };
}
