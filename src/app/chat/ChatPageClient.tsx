"use client";

import { useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
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
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [connectedServers, setConnectedServers] = useState<{ name: string; tools: McpTool[] }[]>([]);

  const handleNewChat = useCallback(() => {
    setConversationId(null);
  }, []);

  const handleSelectConversation = useCallback((id: string | null) => {
    setConversationId(id);
  }, []);

  const handleConversationIdChange = useCallback((id: string) => {
    setConversationId(id);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Calculate total tools from connected servers (fetched by AppLayout)
  const totalTools = connectedServers.reduce((sum, s) => sum + s.tools.length, 0);

  return (
    <AppLayout
      user={user}
      activeConversationId={conversationId}
      onSelectConversation={handleSelectConversation}
      onNewChat={handleNewChat}
      refreshTrigger={refreshTrigger}
    >
      {/* Tools indicator */}
      {totalTools > 0 && (
        <div className="px-4 py-2 bg-green-50 border-b border-green-100 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-green-700">
            {totalTools} tool{totalTools !== 1 ? "s" : ""} available
          </span>
        </div>
      )}
      <div className="flex-1 min-h-0">
        <ChatInterface
          conversationId={conversationId}
          onConversationIdChange={handleConversationIdChange}
        />
      </div>
    </AppLayout>
  );
}


