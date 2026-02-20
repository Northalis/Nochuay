"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  ChevronRight,
  FileText,
  Plus,
  Trash2,
  Pencil,
  MoreHorizontal,
} from "lucide-react";
import { PageNode } from "@/lib/types";
import { useCreatePage, useDeletePage, useUpdatePage } from "@/hooks/use-pages";
import { useSidebarStore } from "@/store/use-sidebar-store";

interface SidebarItemProps {
  node: PageNode;
}

export default function SidebarItem({ node }: SidebarItemProps) {
  const router = useRouter();
  const pathname = usePathname();

  const { expandedIds, toggle, expand } = useSidebarStore();
  const { renamingId, setRenamingId } = useSidebarStore();

  const expanded = expandedIds.has(node.id);
  const isRenaming = renamingId === node.id;
  const isActive = pathname === `/documents/${node.id}`;

  const hasChildren = node.children.length > 0;
  const paddingLeft = 12 + node.depth * 12;

  // ── Mutations ──────────────────────────────────────────────
  const createPage = useCreatePage();
  const deletePage = useDeletePage();
  const updatePage = useUpdatePage();

  // ── Inline rename ─────────────────────────────────────────
  const [renameValue, setRenameValue] = useState(node.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      setRenameValue(node.title);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isRenaming, node.title]);

  function commitRename() {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== node.title) {
      updatePage.mutate({ id: node.id, title: trimmed });
    }
    setRenamingId(null);
  }

  function handleRenameKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitRename();
    }
    if (e.key === "Escape") {
      setRenamingId(null);
    }
  }

  // ── Context menu (three-dot) ─────────────────────────────
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  // ── Handlers ──────────────────────────────────────────────
  function handleNavigate() {
    if (isRenaming) return;
    router.push(`/documents/${node.id}`);
  }

  function handleAddChild(e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    expand(node.id);
    createPage.mutate({ parentId: node.id, title: "Untitled" });
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    deletePage.mutate(node.id, {
      onSuccess: () => {
        if (pathname === `/documents/${node.id}`) {
          router.push("/");
        }
      },
    });
  }

  function handleStartRename(e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    setRenamingId(node.id);
  }

  return (
    <div>
      {/* Row */}
      <div
        className={`group flex items-center w-full py-1 text-sm rounded cursor-pointer
          ${
            isActive
              ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
          }`}
        style={{ paddingLeft: `${paddingLeft}px`, paddingRight: "4px" }}
        onClick={handleNavigate}
      >
        {/* Expand/Collapse Toggle */}
        <span
          className={`shrink-0 mr-1 transition-transform duration-150 ${
            hasChildren
              ? "opacity-100 cursor-pointer"
              : "opacity-0 pointer-events-none"
          } ${expanded ? "rotate-90" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            toggle(node.id);
          }}
        >
          <ChevronRight size={14} className="text-neutral-400" />
        </span>

        {/* Page Icon */}
        <span className="shrink-0 mr-1.5 text-base leading-none">
          {node.icon || <FileText size={15} className="text-neutral-400" />}
        </span>

        {/* Title or Rename Input */}
        {isRenaming ? (
          <input
            ref={inputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleRenameKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 min-w-0 bg-white dark:bg-neutral-900 border border-blue-400 rounded px-1 py-0 text-sm outline-none"
          />
        ) : (
          <span className="truncate flex-1">{node.title}</span>
        )}

        {/* Action Buttons (visible on hover) */}
        {!isRenaming && (
          <div className="shrink-0 flex items-center gap-0.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleAddChild}
              className="p-0.5 rounded hover:bg-neutral-300 dark:hover:bg-neutral-700"
              title="Add sub-page"
            >
              <Plus size={14} className="text-neutral-500" />
            </button>

            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="p-0.5 rounded hover:bg-neutral-300 dark:hover:bg-neutral-700"
                title="More actions"
              >
                <MoreHorizontal size={14} className="text-neutral-500" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-6 z-50 w-36 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg py-1">
                  <button
                    onClick={handleStartRename}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <Pencil size={14} />
                    Rename
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recursive Children */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <SidebarItem key={child.id} node={child} />
          ))}
        </div>
      )}
    </div>
  );
}
