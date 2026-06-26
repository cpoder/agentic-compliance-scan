import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  getDefaultEnvironment,
  StdioClientTransport,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export interface McpServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}

export interface DiscoveredTool {
  name: string;
  description?: string;
}

export interface DiscoveredServer {
  name: string;
  transport: "stdio" | "http";
  remote: boolean;
  tools: DiscoveredTool[];
}

function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out after ${ms}ms while trying to ${what}`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/**
 * Connect to one configured MCP server and list its tools. This is STATIC
 * discovery: a tools/list handshake over a stdio subprocess or an http
 * connection. It does not monitor the server or invoke any tool.
 */
export async function discoverServer(
  name: string,
  config: McpServerConfig,
  timeoutMs = 20000,
): Promise<DiscoveredServer> {
  const remote = config.url !== undefined;
  if (!remote && config.command === undefined) {
    throw new Error(`server "${name}" has neither a command (stdio) nor a url (http)`);
  }

  const client = new Client(
    { name: "agentic-compliance-scan", version: "0.0.0" },
    { capabilities: {} },
  );
  const transport = remote
    ? new StreamableHTTPClientTransport(new URL(config.url as string))
    : new StdioClientTransport({
        command: config.command as string,
        args: config.args ?? [],
        env: { ...getDefaultEnvironment(), ...(config.env ?? {}) },
      });

  try {
    await withTimeout(client.connect(transport), timeoutMs, `connect to "${name}"`);
    const result = await withTimeout(client.listTools(), timeoutMs, `list tools of "${name}"`);
    const tools: DiscoveredTool[] = result.tools.map((tool) => {
      const entry: DiscoveredTool = { name: tool.name };
      if (typeof tool.description === "string") {
        entry.description = tool.description;
      }
      return entry;
    });
    return { name, transport: remote ? "http" : "stdio", remote, tools };
  } finally {
    await client.close().catch(() => undefined);
  }
}
