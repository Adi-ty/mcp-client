import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { mcpManager } from "@/lib/mcp-manager";

// GET /api/mcp/servers - List user's saved MCP configs with connection status
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const configs = await prisma.mcpConfig.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    // Add connection status to each config
    const serversWithStatus = configs.map((config) => ({
      id: config.id,
      name: config.name,
      config: config.config,
      isActive: config.isActive,
      isConnected: mcpManager.isConnected(config.name),
      tools: mcpManager.getTools(config.name),
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }));

    return NextResponse.json({ servers: serversWithStatus });
  } catch (error) {
    console.error("Error fetching MCP configs:", error);
    return NextResponse.json(
      { error: "Failed to fetch configurations" },
      { status: 500 }
    );
  }
}

// POST /api/mcp/servers - Save new MCP config
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, config } = await request.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!config || typeof config !== "object") {
      return NextResponse.json(
        { error: "Config JSON is required" },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existing = await prisma.mcpConfig.findFirst({
      where: { userId: session.user.id, name },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A configuration with this name already exists" },
        { status: 409 }
      );
    }

    const mcpConfig = await prisma.mcpConfig.create({
      data: {
        name,
        config,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ server: mcpConfig }, { status: 201 });
  } catch (error) {
    console.error("Error saving MCP config:", error);
    return NextResponse.json(
      { error: "Failed to save configuration" },
      { status: 500 }
    );
  }
}
