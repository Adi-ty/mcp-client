"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import Header from "@/components/Header";
import McpConfigPanel from "@/components/McpConfigPanel";
import ChatInterface from "@/components/ChatInterface";
import { McpTool } from "@/lib/mcp-manager";

interface ChatPageClientProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function ChatPageClient({ user }: ChatPageClientProps) {
  const [tools, setTools] = useState<McpTool[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  return (
    <SessionProvider>
      <div className="h-screen flex flex-col bg-white">
        <Header user={user} />

        <div className="flex-1 flex min-h-0">
          {/* Left sidebar - MCP Config */}
          <div className="w-80 flex-shrink-0">
            <McpConfigPanel tools={tools} onToolsUpdate={setTools} />
          </div>

          {/* Main chat area */}
          <div className="flex-1 min-w-0">
            <ChatInterface
              conversationId={conversationId}
              onConversationIdChange={setConversationId}
            />
          </div>
        </div>
      </div>
    </SessionProvider>
  );
}
