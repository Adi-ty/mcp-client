import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mcpManager, McpServerConfigSchema } from "@/lib/mcp-manager";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/mcp/servers/[id] - Get single config
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const config = await prisma.mcpConfig.findUnique({
      where: { id, userId: session.user.id },
    });

    if (!config) {
      return NextResponse.json(
        { error: "Configuration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      server: {
        ...config,
        isConnected: mcpManager.isConnected(config.name),
        tools: mcpManager.getTools(config.name),
      },
    });
  } catch (error) {
    console.error("Error fetching MCP config:", error);
    return NextResponse.json(
      { error: "Failed to fetch configuration" },
      { status: 500 }
    );
  }
}

// PATCH /api/mcp/servers/[id] - Update config
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { name, config } = await request.json();

    // Verify ownership
    const existing = await prisma.mcpConfig.findUnique({
      where: { id },
      select: { userId: true, name: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Configuration not found" },
        { status: 404 }
      );
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // If connected and config changes, disconnect first
    if (mcpManager.isConnected(existing.name)) {
      await mcpManager.disconnect(existing.name);
    }

    const updated = await prisma.mcpConfig.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(config && { config }),
      },
    });

    return NextResponse.json({ server: updated });
  } catch (error) {
    console.error("Error updating MCP config:", error);
    return NextResponse.json(
      { error: "Failed to update configuration" },
      { status: 500 }
    );
  }
}

// DELETE /api/mcp/servers/[id] - Delete config
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const config = await prisma.mcpConfig.findUnique({
      where: { id },
      select: { userId: true, name: true },
    });

    if (!config) {
      return NextResponse.json(
        { error: "Configuration not found" },
        { status: 404 }
      );
    }

    if (config.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Disconnect if connected
    if (mcpManager.isConnected(config.name)) {
      await mcpManager.disconnect(config.name);
    }

    await prisma.mcpConfig.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting MCP config:", error);
    return NextResponse.json(
      { error: "Failed to delete configuration" },
      { status: 500 }
    );
  }
}

// POST /api/mcp/servers/[id] - Connect to this server
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { action } = await request.json();

    const config = await prisma.mcpConfig.findUnique({
      where: { id, userId: session.user.id },
    });

    if (!config) {
      return NextResponse.json(
        { error: "Configuration not found" },
        { status: 404 }
      );
    }

    if (action === "connect") {
      // Parse and validate the config
      const serverConfig = config.config as { command: string; args?: string[]; env?: Record<string, string> };
      const validated = McpServerConfigSchema.parse(serverConfig);
      
      const tools = await mcpManager.connect(config.name, validated);
      
      return NextResponse.json({
        success: true,
        isConnected: true,
        tools,
      });
    } else if (action === "disconnect") {
      await mcpManager.disconnect(config.name);
      
      return NextResponse.json({
        success: true,
        isConnected: false,
        tools: [],
      });
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'connect' or 'disconnect'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error with MCP connection:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Connection failed" },
      { status: 500 }
    );
  }
}
