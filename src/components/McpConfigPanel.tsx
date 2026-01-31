"use client";

import { useState } from "react";
import { McpTool } from "@/lib/mcp-manager";

interface McpConfigPanelProps {
  onToolsUpdate: (tools: McpTool[]) => void;
  tools: McpTool[];
}

export default function McpConfigPanel({
  onToolsUpdate,
  tools,
}: McpConfigPanelProps) {
  const [config, setConfig] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      // Parse JSON to validate
      const parsedConfig = JSON.parse(config);

      const response = await fetch("/api/mcp/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedConfig),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to connect");
      }

      onToolsUpdate(data.tools);
      setConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON or connection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      // Get connected servers and disconnect all
      const response = await fetch("/api/mcp/connect");
      const data = await response.json();

      for (const serverName of data.servers) {
        await fetch("/api/mcp/disconnect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serverName }),
        });
      }

      onToolsUpdate([]);
      setConnected(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 bg-gray-50 border-r border-gray-200">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        MCP Configuration
      </h2>

      <div className="flex-1 flex flex-col gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paste your MCP server config JSON:
          </label>
          <textarea
            value={config}
            onChange={(e) => setConfig(e.target.value)}
            placeholder={`{
  "mcpServers": {
    "notionApi": {
      "command": "npx",
      "args": ["-y", "@notionhq/notion-mcp-server"],
      "env": {
        "NOTION_TOKEN": "ntn_****"
      }
    }
  }
}`}
            className="w-full h-48 p-3 text-sm font-mono border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            disabled={connected}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          {!connected ? (
            <button
              onClick={handleConnect}
              disabled={loading || !config.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Connecting..." : "Connect"}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Disconnecting..." : "Disconnect"}
            </button>
          )}
        </div>

        {tools.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Available Tools ({tools.length}):
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tools.map((tool) => (
                <div
                  key={`${tool.serverName}-${tool.name}`}
                  className="p-2 bg-white border border-gray-200 rounded text-sm"
                >
                  <div className="font-medium text-gray-900">{tool.name}</div>
                  {tool.description && (
                    <div className="text-gray-500 text-xs mt-1">
                      {tool.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
