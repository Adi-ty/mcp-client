import Cerebras from "@cerebras/cerebras_cloud_sdk";
import { McpTool } from "./mcp-manager";

// Lazy initialization to avoid build-time errors
let cerebrasClient: Cerebras | null = null;
function getCerebras(): Cerebras {
  if (!cerebrasClient) {
    cerebrasClient = new Cerebras({
      apiKey: process.env.CEREBRAS_API_KEY!,
    });
  }
  return cerebrasClient;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Build system prompt with available tools
 */
export function buildToolPrompt(tools: McpTool[]): string {
  if (tools.length === 0) {
    return `You are a helpful AI assistant. Answer questions clearly and concisely.`;
  }

  const toolDescriptions = tools
    .map((tool) => {
      const params = tool.inputSchema.properties
        ? Object.entries(
            tool.inputSchema.properties as Record<
              string,
              { type: string; description?: string }
            >
          )
            .map(([name, prop]) => `${name}: ${prop.type}`)
            .join(", ")
        : "";
      return `- ${tool.name}(${params}): ${tool.description || "No description"}`;
    })
    .join("\n");

  return `You are a helpful AI assistant with access to tools.

AVAILABLE TOOLS:
${toolDescriptions}

INSTRUCTIONS:
1. When you need to use a tool, respond ONLY with the tool call in this exact format:
<tool_call>{"name": "tool_name", "arguments": {"arg1": "value"}}</tool_call>

2. Do NOT include any other text when making a tool call.
3. Wait for the tool result before continuing.
4. After receiving tool results, provide a helpful response to the user.
5. Only use tools when necessary to answer the user's question.`;
}

/**
 * Parse tool call from LLM response
 */
export function parseToolCall(response: string): ToolCall | null {
  // Handle various formats the LLM might output
  // Try standard format first
  let toolCallMatch = response.match(/<tool_call>([\s\S]*?)<\/tool_call>/);
  
  // Also try with malformed closing tag (>< instead of </)
  if (!toolCallMatch) {
    toolCallMatch = response.match(/<tool_call>([\s\S]*?)>\s*<\/tool_call>/);
  }
  
  // Try without closing tag
  if (!toolCallMatch) {
    toolCallMatch = response.match(/<tool_call>([\s\S]*?})/);
  }

  if (!toolCallMatch) {
    return null;
  }

  try {
    // Clean up the JSON - remove any trailing >
    const jsonStr = toolCallMatch[1].trim().replace(/>$/, '');
    const parsed = JSON.parse(jsonStr);
    
    // Handle both 'arguments' and 'parameters' keys
    const args = parsed.arguments || parsed.parameters || {};
    
    if (parsed.name && typeof args === "object") {
      return { name: parsed.name, arguments: args };
    }
  } catch (error) {
    console.error("Failed to parse tool call:", error, toolCallMatch[1]);
  }

  return null;
}

/**
 * Send chat completion request to Cerebras
 */
export async function chatCompletion(
  messages: ChatMessage[]
): Promise<string> {
  const response = await getCerebras().chat.completions.create({
    model: "llama-3.3-70b",
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  }) as { choices: Array<{ message?: { content?: string } }> };

  return response.choices[0]?.message?.content || "";
}

/**
 * Stream chat completion from Cerebras
 */
export async function* streamChatCompletion(
  messages: ChatMessage[]
): AsyncGenerator<string, void, unknown> {
  const stream = await getCerebras().chat.completions.create({
    model: "llama-3.3-70b",
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    stream: true,
  }) as AsyncIterable<{ choices: Array<{ delta?: { content?: string } }> }>;

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
