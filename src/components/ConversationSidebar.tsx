"use client";

import { useState, useEffect, useCallback } from "react";

interface Conversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    messages: number;
  };
}

interface ConversationSidebarProps {
  activeConversationId: string | null;
  onSelectConversation: (id: string | null) => void;
  onNewChat: () => void;
  refreshTrigger?: number;
}

export default function ConversationSidebar({
  activeConversationId,
  onSelectConversation,
  onNewChat,
  refreshTrigger,
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/conversations");
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations, refreshTrigger]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }

    try {
      const response = await fetch(`/api/conversations?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) {
          onSelectConversation(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 border-r border-gray-200">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <button
          onClick={onNewChat}
          className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Chat
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-pulse">Loading...</div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">
            No conversations yet
          </div>
        ) : (
          <div className="py-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`group mx-2 mb-1 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                  activeConversationId === conversation.id
                    ? "bg-blue-100 border border-blue-200"
                    : "hover:bg-gray-100 border border-transparent"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {conversation.title || "Untitled"}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">
                        {formatDate(conversation.updatedAt)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {conversation._count.messages} messages
                      </span>
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(conversation.id, e)}
                    className={`p-1 rounded transition-colors ${
                      deleteConfirm === conversation.id
                        ? "bg-red-100 text-red-600"
                        : "opacity-0 group-hover:opacity-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                    }`}
                    title={
                      deleteConfirm === conversation.id
                        ? "Click again to confirm"
                        : "Delete"
                    }
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
