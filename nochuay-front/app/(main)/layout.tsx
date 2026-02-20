"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import AuthGuard from "@/components/providers/auth-guard";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "w-60" : "w-0"
          } shrink-0 bg-neutral-100 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 transition-all duration-200 overflow-hidden`}
        >
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar (shows toggle when sidebar is closed) */}
          {!sidebarOpen && (
            <div className="flex items-center px-3 py-2 border-b border-neutral-200 dark:border-neutral-800">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500"
                aria-label="Open sidebar"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Page Content */}
          <div className="flex-1 overflow-y-auto">{children}</div>
        </main>
      </div>
    </AuthGuard>
  );
}
