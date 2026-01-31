import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { mcpManager } from "@/lib/mcp-manager";
import {
  buildToolPrompt,
  parseToolCall,
  ChatMessage,
  chatCompletion,
} from "@/lib/cerebras";
import { prisma } from "@/lib/prisma";

const MAX_TOOL_ITERATIONS = 5;

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { message, conversationId } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message required" },
        { status: 400 }
      );
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId, userId: session.user.id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId: session.user.id,
          title: message.slice(0, 50),
        },
        include: { messages: true },
      });
    }

    // Save user message
    await prisma.message.create({
      data: {
        role: "user",
        content: message,
        conversationId: conversation.id,
      },
    });

    // Build messages array for LLM
    const tools = mcpManager.getAllTools();
    const systemPrompt = buildToolPrompt(tools);

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      // Add previous messages from conversation
      ...conversation.messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    // Tool execution loop
    let iteration = 0;
    let response = "";
    const toolResults: Array<{ tool: string; result: string }> = [];

    while (iteration < MAX_TOOL_ITERATIONS) {
      iteration++;

      // Get LLM response
      response = await chatCompletion(messages);

      // Check for tool call
      const toolCall = parseToolCall(response);
      if (!toolCall) {
        // No tool call, we have the final response
        break;
      }

      // Find the tool's server
      const tool = tools.find((t) => t.name === toolCall.name);
      if (!tool) {
        // Tool not found, add error and continue
        messages.push({ role: "assistant", content: response });
        messages.push({
          role: "user",
          content: `Error: Tool "${toolCall.name}" not found. Available tools: ${tools.map((t) => t.name).join(", ")}`,
        });
        continue;
      }

      // Execute the tool
      try {
        const result = await mcpManager.callTool(
          tool.serverName,
          toolCall.name,
          toolCall.arguments
        );

        toolResults.push({ tool: toolCall.name, result });

        // Add to messages for next iteration
        messages.push({ role: "assistant", content: response });
        messages.push({
          role: "user",
          content: `Tool result for ${toolCall.name}:\n${result}`,
        });
      } catch (error) {
        messages.push({ role: "assistant", content: response });
        messages.push({
          role: "user",
          content: `Tool error for ${toolCall.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      }
    }

    // Save assistant message
    await prisma.message.create({
      data: {
        role: "assistant",
        content: response,
        toolResults: toolResults.length > 0 ? toolResults : undefined,
        conversationId: conversation.id,
      },
    });

    return NextResponse.json({
      response,
      conversationId: conversation.id,
      toolResults: toolResults.length > 0 ? toolResults : undefined,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process chat" },
      { status: 500 }
    );
  }
}
