"use client";

import { useState, useCallback } from "react";
import { SessionProvider } from "next-auth/react";
import Header from "@/components/Header";
import McpConfigPanel from "@/components/McpConfigPanel";
import ChatInterface from "@/components/ChatInterface";
import ConversationSidebar from "@/components/ConversationSidebar";
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleNewChat = useCallback(() => {
    setConversationId(null);
  }, []);

  const handleSelectConversation = useCallback((id: string | null) => {
    setConversationId(id);
  }, []);

  const handleConversationIdChange = useCallback((id: string) => {
    setConversationId(id);
    // Trigger refresh of conversation list when a new conversation is created
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <SessionProvider>
      <div className="h-screen flex flex-col bg-white">
        <Header user={user} />

        <div className="flex-1 flex min-h-0">
          {/* Left sidebar - Conversations */}
          <div className="w-64 flex-shrink-0">
            <ConversationSidebar
              activeConversationId={conversationId}
              onSelectConversation={handleSelectConversation}
              onNewChat={handleNewChat}
              refreshTrigger={refreshTrigger}
            />
          </div>

          {/* Middle panel - MCP Config */}
          <div className="w-80 flex-shrink-0">
            <McpConfigPanel tools={tools} onToolsUpdate={setTools} />
          </div>

          {/* Main chat area */}
          <div className="flex-1 min-w-0">
            <ChatInterface
              conversationId={conversationId}
              onConversationIdChange={handleConversationIdChange}
            />
          </div>
        </div>
      </div>
    </SessionProvider>
  );
}
