import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  mcpManager,
  McpConfigInputSchema,
  McpServerConfig,
} from "@/lib/mcp-manager";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Validate the config
    const parseResult = McpConfigInputSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid config format", details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const config = parseResult.data;
    const allTools = [];

    // Connect to each server
    for (const [serverName, serverConfig] of Object.entries(config.mcpServers)) {
      try {
        const tools = await mcpManager.connect(serverName, serverConfig as McpServerConfig);
        allTools.push(...tools);
      } catch (error) {
        console.error(`Failed to connect to ${serverName}:`, error);
        return NextResponse.json(
          {
            error: `Failed to connect to ${serverName}`,
            details: error instanceof Error ? error.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      servers: Object.keys(config.mcpServers),
      tools: allTools,
    });
  } catch (error) {
    console.error("MCP connect error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    servers: mcpManager.getConnectedServers(),
    tools: mcpManager.getAllTools(),
  });
}
