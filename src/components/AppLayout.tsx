"use client";

import { useState, useCallback, useEffect, ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import Header from "@/components/Header";
import ConversationSidebar from "@/components/ConversationSidebar";
import { McpTool } from "@/lib/mcp-manager";

interface AppLayoutProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  children: ReactNode;
  activeConversationId?: string | null;
  onSelectConversation?: (id: string | null) => void;
  onNewChat?: () => void;
  refreshTrigger?: number;
}

export default function AppLayout({
  user,
  children,
  activeConversationId = null,
  onSelectConversation,
  onNewChat,
  refreshTrigger = 0,
}: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [connectedServers, setConnectedServers] = useState<{ name: string; tools: McpTool[] }[]>([]);

  // Fetch connected servers count
  const fetchConnectedServers = useCallback(async () => {
    try {
      const response = await fetch("/api/mcp/servers");
      if (response.ok) {
        const data = await response.json();
        const connected = data.servers
          .filter((s: { isConnected: boolean }) => s.isConnected)
          .map((s: { name: string; tools: McpTool[] }) => ({ name: s.name, tools: s.tools }));
        setConnectedServers(connected);
      }
    } catch (error) {
      console.error("Failed to fetch servers:", error);
    }
  }, []);

  useEffect(() => {
    fetchConnectedServers();
    const interval = setInterval(fetchConnectedServers, 5000);
    return () => clearInterval(interval);
  }, [fetchConnectedServers]);

  // Load sidebar collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") {
      setSidebarCollapsed(true);
    }
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem("sidebar-collapsed", String(newValue));
      return newValue;
    });
  }, []);

  const handleNewChat = useCallback(() => {
    if (onNewChat) {
      onNewChat();
    } else {
      // Navigate to chat page
      window.location.href = "/chat";
    }
  }, [onNewChat]);

  const handleSelectConversation = useCallback((id: string | null) => {
    if (onSelectConversation) {
      onSelectConversation(id);
    } else if (id) {
      // Navigate to chat with conversation
      window.location.href = `/chat?conversation=${id}`;
    }
  }, [onSelectConversation]);

  return (
    <SessionProvider>
      <div className="h-screen flex flex-col bg-white">
        <Header user={user} />

        <div className="flex-1 flex min-h-0">
          {/* Collapsible Sidebar */}
          <div className={`flex-shrink-0 transition-all duration-200 ${sidebarCollapsed ? "w-14" : "w-64"}`}>
            <ConversationSidebar
              activeConversationId={activeConversationId}
              onSelectConversation={handleSelectConversation}
              onNewChat={handleNewChat}
              refreshTrigger={refreshTrigger}
              connectedServersCount={connectedServers.length}
              collapsed={sidebarCollapsed}
              onToggleCollapse={handleToggleCollapse}
            />
          </div>

          {/* Main content area */}
          <div className="flex-1 min-w-0 flex flex-col">
            {children}
          </div>
        </div>
      </div>
    </SessionProvider>
  );
}
