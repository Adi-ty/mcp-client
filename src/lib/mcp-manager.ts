import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { z } from "zod";

// Schema for MCP server configuration
export const McpServerConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional().default([]),
  env: z.record(z.string(), z.string()).optional().default({}),
});

export const McpConfigInputSchema = z.object({
  mcpServers: z.record(z.string(), McpServerConfigSchema),
});

export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;
export type McpConfigInput = z.infer<typeof McpConfigInputSchema>;

export interface McpTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  serverName: string;
}

interface ConnectedServer {
  client: Client;
  transport: StdioClientTransport;
  tools: McpTool[];
}

class McpManager {
  private servers: Map<string, ConnectedServer> = new Map();

  async connect(
    serverName: string,
    config: McpServerConfig
  ): Promise<McpTool[]> {
    // Disconnect existing server if any
    if (this.servers.has(serverName)) {
      await this.disconnect(serverName);
    }

    try {
      // Create transport with spawned process
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: { ...process.env, ...config.env } as Record<string, string>,
      });

      // Create and connect client
      const client = new Client({
        name: "mcp-client-web",
        version: "1.0.0",
      });

      await client.connect(transport);

      // List available tools
      const toolsResult = await client.listTools();
      const tools: McpTool[] = toolsResult.tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema as Record<string, unknown>,
        serverName,
      }));

      // Store connection
      this.servers.set(serverName, { client, transport, tools });

      console.log(
        `Connected to MCP server: ${serverName} with ${tools.length} tools`
      );
      return tools;
    } catch (error) {
      console.error(`Failed to connect to MCP server ${serverName}:`, error);
      throw new Error(
        `Failed to connect to MCP server: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async disconnect(serverName: string): Promise<void> {
    const server = this.servers.get(serverName);
    if (server) {
      try {
        await server.client.close();
      } catch (error) {
        console.error(`Error disconnecting from ${serverName}:`, error);
      }
      this.servers.delete(serverName);
      console.log(`Disconnected from MCP server: ${serverName}`);
    }
  }

  async disconnectAll(): Promise<void> {
    const serverNames = Array.from(this.servers.keys());
    await Promise.all(serverNames.map((name) => this.disconnect(name)));
  }

  getTools(serverName: string): McpTool[] {
    const server = this.servers.get(serverName);
    return server?.tools || [];
  }

  getAllTools(): McpTool[] {
    const allTools: McpTool[] = [];
    for (const server of this.servers.values()) {
      allTools.push(...server.tools);
    }
    return allTools;
  }

  async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<string> {
    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`MCP server not connected: ${serverName}`);
    }

    try {
      const result = await server.client.callTool({
        name: toolName,
        arguments: args,
      });

      // Extract text content from result
      if (result.content && Array.isArray(result.content)) {
        return result.content
          .map((c) => {
            if (typeof c === "object" && c !== null && "text" in c) {
              return c.text;
            }
            return JSON.stringify(c);
          })
          .join("\n");
      }

      return JSON.stringify(result);
    } catch (error) {
      console.error(`Error calling tool ${toolName}:`, error);
      throw new Error(
        `Tool execution failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  isConnected(serverName: string): boolean {
    return this.servers.has(serverName);
  }

  getConnectedServers(): string[] {
    return Array.from(this.servers.keys());
  }
}

// Singleton instance
const globalForMcp = globalThis as unknown as {
  mcpManager: McpManager | undefined;
};

export const mcpManager = globalForMcp.mcpManager ?? new McpManager();

if (process.env.NODE_ENV !== "production") {
  globalForMcp.mcpManager = mcpManager;
}
