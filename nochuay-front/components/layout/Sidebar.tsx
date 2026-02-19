"use client";

import {
  ChevronLeft,
  PlusCircle,
  Search,
  Settings,
  FileText,
} from "lucide-react";
import SidebarItem from "./SidebarItem";
import { PageNode } from "@/lib/types";

// ── Mock data for visual testing ──────────────────────────────
// Remove this once connected to the real API via TanStack Query
const MOCK_PAGES: PageNode[] = [
  {
    id: "1",
    userId: "u1",
    parentId: null,
    title: "Getting Started",
    icon: "📖",
    content: "[]",
    createdAt: "",
    depth: 0,
    children: [
      {
        id: "1-1",
        userId: "u1",
        parentId: "1",
        title: "Installation Guide",
        icon: "🔧",
        content: "[]",
        createdAt: "",
        depth: 1,
        children: [
          {
            id: "1-1-1",
            userId: "u1",
            parentId: "1-1",
            title: "Prerequisites",
            content: "[]",
            createdAt: "",
            depth: 2,
            children: [],
          },
        ],
      },
      {
        id: "1-2",
        userId: "u1",
        parentId: "1",
        title: "Quick Start",
        icon: "🚀",
        content: "[]",
        createdAt: "",
        depth: 1,
        children: [],
      },
    ],
  },
  {
    id: "2",
    userId: "u1",
    parentId: null,
    title: "Project Notes",
    icon: "📝",
    content: "[]",
    createdAt: "",
    depth: 0,
    children: [
      {
        id: "2-1",
        userId: "u1",
        parentId: "2",
        title: "Meeting Minutes",
        icon: "📋",
        content: "[]",
        createdAt: "",
        depth: 1,
        children: [],
      },
    ],
  },
  {
    id: "3",
    userId: "u1",
    parentId: null,
    title: "Personal Diary",
    icon: "📔",
    content: "[]",
    createdAt: "",
    depth: 0,
    children: [],
  },
];
// ──────────────────────────────────────────────────────────────

interface SidebarProps {
  onClose: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  return (
    <div className="flex flex-col h-full w-60">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 truncate">
          Nochuay Workspace
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500"
          aria-label="Close sidebar"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-0.5 px-2 py-2">
        <button className="flex items-center gap-2 px-2 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 w-full text-left">
          <Search size={16} />
          <span>Search</span>
        </button>
        <button className="flex items-center gap-2 px-2 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 w-full text-left">
          <Settings size={16} />
          <span>Settings</span>
        </button>
        <button className="flex items-center gap-2 px-2 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 w-full text-left">
          <PlusCircle size={16} />
          <span>New Page</span>
        </button>
      </div>

      {/* Page Tree */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <p className="px-2 text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
          Pages
        </p>
        {MOCK_PAGES.length === 0 ? (
          <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-neutral-500 dark:text-neutral-400 rounded">
            <FileText size={16} />
            <span className="italic">No pages yet</span>
          </div>
        ) : (
          MOCK_PAGES.map((node) => <SidebarItem key={node.id} node={node} />)
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-neutral-200 dark:border-neutral-800">
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          Nochuay v1.0.0
        </p>
      </div>
    </div>
  );
}
