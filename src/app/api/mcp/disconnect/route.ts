import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { mcpManager } from "@/lib/mcp-manager";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { serverName } = await request.json();

    if (!serverName) {
      return NextResponse.json(
        { error: "Server name required" },
        { status: 400 }
      );
    }

    await mcpManager.disconnect(serverName);

    return NextResponse.json({
      success: true,
      message: `Disconnected from ${serverName}`,
    });
  } catch (error) {
    console.error("MCP disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}
