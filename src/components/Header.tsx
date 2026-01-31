"use client";

import { signOut } from "next-auth/react";

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default function Header({ user }: HeaderProps) {
  return (
    <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-gray-900">MCP Client</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          {user.image && (
            <img
              src={user.image}
              alt={user.name || "User"}
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="text-sm text-gray-700">{user.name || user.email}</span>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
