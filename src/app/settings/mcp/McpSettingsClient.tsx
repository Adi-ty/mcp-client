"use client";

import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import { McpTool } from "@/lib/mcp-manager";

interface McpServer {
  id: string;
  name: string;
  config: Record<string, unknown>;
  isConnected: boolean;
  tools: McpTool[];
  createdAt: string;
  updatedAt: string;
}

interface McpSettingsClientProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function McpSettingsClient({ user }: McpSettingsClientProps) {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServer | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const fetchServers = useCallback(async () => {
    try {
      const response = await fetch("/api/mcp/servers");
      if (response.ok) {
        const data = await response.json();
        setServers(data.servers);
      }
    } catch (error) {
      console.error("Failed to fetch servers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const handleConnect = async (server: McpServer) => {
    setConnectingId(server.id);
    try {
      const response = await fetch(`/api/mcp/servers/${server.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect" }),
      });

      if (response.ok) {
        const data = await response.json();
        setServers((prev) =>
          prev.map((s) =>
            s.id === server.id
              ? { ...s, isConnected: true, tools: data.tools }
              : s
          )
        );
      } else {
        const error = await response.json();
        alert(`Failed to connect: ${error.error}`);
      }
    } catch (error) {
      console.error("Connection error:", error);
    } finally {
      setConnectingId(null);
    }
  };

  const handleDisconnect = async (server: McpServer) => {
    setConnectingId(server.id);
    try {
      const response = await fetch(`/api/mcp/servers/${server.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });

      if (response.ok) {
        setServers((prev) =>
          prev.map((s) =>
            s.id === server.id ? { ...s, isConnected: false, tools: [] } : s
          )
        );
      }
    } catch (error) {
      console.error("Disconnect error:", error);
    } finally {
      setConnectingId(null);
    }
  };

  const handleDelete = async (server: McpServer) => {
    if (!confirm(`Delete "${server.name}"? This cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/mcp/servers/${server.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setServers((prev) => prev.filter((s) => s.id !== server.id));
      }
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  return (
    <AppLayout user={user}>
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {/* Page Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-gray-900">MCP Server Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">
            Add and manage your MCP server connections
          </p>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-6 py-8">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading...</div>
          ) : (
            <>
              {/* Server List */}
              <div className="space-y-4 mb-8">
                {servers.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <div className="text-gray-400 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                      </svg>
                    </div>
                    <p className="text-gray-500">No MCP servers configured yet</p>
                  </div>
                ) : (
                  servers.map((server) => (
                    <div
                      key={server.id}
                      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-medium text-gray-900">{server.name}</h3>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                server.isConnected
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  server.isConnected ? "bg-green-500" : "bg-gray-400"
                                }`}
                              />
                              {server.isConnected ? "Connected" : "Saved"}
                            </span>
                          </div>
                          {server.isConnected && server.tools.length > 0 && (
                            <p className="text-sm text-gray-500 mt-1">
                              {server.tools.length} tool{server.tools.length !== 1 ? "s" : ""} available
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {server.isConnected ? (
                            <button
                              onClick={() => handleDisconnect(server)}
                              disabled={connectingId === server.id}
                              className="px-3 py-1.5 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {connectingId === server.id ? "..." : "Disconnect"}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleConnect(server)}
                              disabled={connectingId === server.id}
                              className="px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {connectingId === server.id ? "Connecting..." : "Connect"}
                            </button>
                          )}
                          <button
                            onClick={() => setEditingServer(server)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(server)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Show tools when connected */}
                      {server.isConnected && server.tools.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex flex-wrap gap-2">
                            {server.tools.slice(0, 6).map((tool) => (
                              <span
                                key={tool.name}
                                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                                title={tool.description}
                              >
                                {tool.name}
                              </span>
                            ))}
                            {server.tools.length > 6 && (
                              <span className="px-2 py-1 text-gray-500 text-xs">
                                +{server.tools.length - 6} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Add Button */}
              <button
                onClick={() => setShowAddDialog(true)}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add MCP Server
              </button>
            </>
          )}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      {(showAddDialog || editingServer) && (
        <McpServerDialog
          server={editingServer}
          onClose={() => {
            setShowAddDialog(false);
            setEditingServer(null);
          }}
          onSave={() => {
            setShowAddDialog(false);
            setEditingServer(null);
            fetchServers();
          }}
        />
      )}
    </AppLayout>
  );
}

interface McpServerDialogProps {
  server: McpServer | null;
  onClose: () => void;
  onSave: () => void;
}

function McpServerDialog({ server, onClose, onSave }: McpServerDialogProps) {
  const [name, setName] = useState(server?.name || "");
  const [config, setConfig] = useState(
    server ? JSON.stringify(server.config, null, 2) : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const parsedConfig = JSON.parse(config);

      const url = server ? `/api/mcp/servers/${server.id}` : "/api/mcp/servers";
      const method = server ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, config: parsedConfig }),
      });

      if (response.ok) {
        onSave();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save");
      }
    } catch {
      setError("Invalid JSON configuration");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {server ? "Edit MCP Server" : "Add MCP Server"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Server Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Notion, GitHub, Filesystem"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Configuration JSON
              </label>
              <textarea
                value={config}
                onChange={(e) => setConfig(e.target.value)}
                placeholder={`{
  "command": "npx",
  "args": ["-y", "@notionhq/notion-mcp-server"],
  "env": {
    "NOTION_TOKEN": "ntn_****"
  }
}`}
                className="w-full h-48 px-3 py-2 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the server config (command, args, env) as JSON
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim() || !config.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
