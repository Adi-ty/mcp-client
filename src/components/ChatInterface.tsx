"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolResults?: Array<{ tool: string; result: string }>;
}

interface ChatInterfaceProps {
  conversationId: string | null;
  onConversationIdChange: (id: string) => void;
}

export default function ChatInterface({
  conversationId,
  onConversationIdChange,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousConversationId = useRef<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation messages when conversationId changes
  const loadConversation = useCallback(async (id: string) => {
    setLoadingConversation(true);
    try {
      const response = await fetch(`/api/conversations/${id}`);
      if (response.ok) {
        const data = await response.json();
        const loadedMessages: Message[] = data.conversation.messages.map(
          (m: { id: string; role: string; content: string; toolResults?: unknown }) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            toolResults: m.toolResults as Array<{ tool: string; result: string }> | undefined,
          })
        );
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
    } finally {
      setLoadingConversation(false);
    }
  }, []);

  useEffect(() => {
    if (conversationId && conversationId !== previousConversationId.current) {
      loadConversation(conversationId);
    } else if (!conversationId && previousConversationId.current) {
      // Cleared conversation - reset messages
      setMessages([]);
    }
    previousConversationId.current = conversationId;
  }, [conversationId, loadConversation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    // Add user message immediately
    const userMsgId = Date.now().toString();
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: userMessage },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      // Update conversation ID if new
      if (data.conversationId && data.conversationId !== conversationId) {
        onConversationIdChange(data.conversationId);
      }

      // Add assistant message
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: data.response,
          toolResults: data.toolResults,
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `Error: ${error instanceof Error ? error.message : "Failed to get response"}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Chat</h2>
        {loadingConversation && (
          <span className="text-sm text-gray-500">Loading...</span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>Start a conversation or connect an MCP server</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Tool results */}
                {msg.toolResults && msg.toolResults.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <div className="text-xs font-medium text-gray-600 mb-2">
                      Tools used:
                    </div>
                    {msg.toolResults.map((tr, idx) => (
                      <div
                        key={idx}
                        className="text-xs bg-white/50 rounded p-2 mb-1"
                      >
                        <span className="font-medium">{tr.tool}:</span>{" "}
                        <span className="text-gray-600">
                          {tr.result.slice(0, 100)}
                          {tr.result.length > 100 ? "..." : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
