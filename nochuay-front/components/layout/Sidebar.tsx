"use client";

import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  PlusCircle,
  Search,
  Settings,
  FileText,
  LogOut,
  User,
  Loader2,
  Moon,
  Sun,
  X,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import SidebarItem from "./SidebarItem";
import {
  useSidebarTree,
  useCreatePage,
  usePageSearch,
} from "@/hooks/use-pages";
import { useUserStore } from "@/store/use-user-store";
import { useSidebarStore } from "@/store/use-sidebar-store";
import { useThemeStore } from "@/store/use-theme-store";

interface SidebarProps {
  onClose: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: pages, isLoading, isError } = useSidebarTree();
  const createPage = useCreatePage();
  const { user, logout } = useUserStore();
  const resetSidebar = useSidebarStore((state) => state.reset);
  const themeMode = useThemeStore((state) => state.mode);
  const toggleThemeMode = useThemeStore((state) => state.toggleMode);

  // ── Profile dropdown ──────────────────────────────────────
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // ── Search modal ───────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const {
    data: searchResults,
    isLoading: isSearching,
    isError: isSearchError,
  } = usePageSearch(debouncedSearchQuery, searchOpen);

  useEffect(() => {
    if (!profileOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [profileOpen]);

  useEffect(() => {
    if (!searchOpen) return;

    const focusTimer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
    };
  }, [searchOpen]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchQuery(searchInput.trim());
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchInput]);

  useEffect(() => {
    if (!searchOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSearchOpen(false);
        setSearchInput("");
        setDebouncedSearchQuery("");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [searchOpen]);

  function handleLogout() {
    setProfileOpen(false);
    resetSidebar();
    queryClient.clear();
    logout();
    router.push("/login");
  }

  function handleNewPage() {
    createPage.mutate({ title: "Untitled" });
  }

  function closeSearchModal() {
    setSearchOpen(false);
    setSearchInput("");
    setDebouncedSearchQuery("");
  }

  function handleSearchNavigate(pageID: string) {
    closeSearchModal();
    router.push(`/documents/${pageID}`);
  }

  return (
    <div className="flex flex-col h-full w-60">
      {/* Header / Profile */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200 truncate hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded px-1 py-0.5"
          >
            <User size={16} className="shrink-0 text-neutral-500" />
            <span className="truncate">
              {user?.email ?? "Nochuay Workspace"}
            </span>
          </button>

          {profileOpen && (
            <div className="absolute left-0 top-8 z-50 w-52 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg py-1">
              {user && (
                <div className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-700 truncate">
                  {user.email}
                </div>
              )}
              <button
                onClick={toggleThemeMode}
                className="flex items-center justify-between gap-2 w-full px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <span className="flex items-center gap-2">
                  {themeMode === "dark" ? (
                    <Sun size={14} />
                  ) : (
                    <Moon size={14} />
                  )}
                  Theme
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">
                  {themeMode}
                </span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <LogOut size={14} />
                Log out
              </button>
            </div>
          )}
        </div>

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
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2 px-2 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 w-full text-left"
        >
          <Search size={16} />
          <span>Search</span>
        </button>
        <button className="flex items-center gap-2 px-2 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 w-full text-left">
          <Settings size={16} />
          <span>Settings</span>
        </button>
        <button
          onClick={handleNewPage}
          disabled={createPage.isPending}
          className="flex items-center gap-2 px-2 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 w-full text-left disabled:opacity-50"
        >
          <PlusCircle size={16} />
          <span>New Page</span>
        </button>
      </div>

      {/* Page Tree */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        <p className="px-2 text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">
          Pages
        </p>

        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={20} className="animate-spin text-neutral-400" />
          </div>
        )}

        {isError && (
          <p className="px-2 text-sm text-red-500">Failed to load pages.</p>
        )}

        {!isLoading && !isError && pages && pages.length === 0 && (
          <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-neutral-500 dark:text-neutral-400 rounded">
            <FileText size={16} />
            <span className="italic">No pages yet</span>
          </div>
        )}

        {!isLoading &&
          !isError &&
          pages &&
          pages.map((node) => <SidebarItem key={node.id} node={node} />)}
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-neutral-200 dark:border-neutral-800">
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          Nochuay v1.3.0
        </p>
      </div>

      {searchOpen && (
        <div
          className="fixed inset-0 z-70 flex items-start justify-center bg-neutral-950/45 px-4 py-20"
          onClick={closeSearchModal}
          role="presentation"
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Search pages"
          >
            <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <Search size={16} className="text-neutral-500" />
              <input
                ref={searchInputRef}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search pages by title..."
                className="w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100 dark:placeholder:text-neutral-500"
              />
              <button
                onClick={closeSearchModal}
                className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                aria-label="Close search"
              >
                <X size={14} />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {debouncedSearchQuery.length === 0 && (
                <p className="px-3 py-4 text-sm text-neutral-500 dark:text-neutral-400">
                  Type to search across your page tree.
                </p>
              )}

              {debouncedSearchQuery.length > 0 && isSearching && (
                <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-neutral-500 dark:text-neutral-400">
                  <Loader2 size={16} className="animate-spin" />
                  Searching...
                </div>
              )}

              {debouncedSearchQuery.length > 0 &&
                !isSearching &&
                isSearchError && (
                  <p className="px-3 py-4 text-sm text-red-500">
                    Failed to search pages.
                  </p>
                )}

              {debouncedSearchQuery.length > 0 &&
                !isSearching &&
                !isSearchError &&
                searchResults &&
                searchResults.length === 0 && (
                  <p className="px-3 py-4 text-sm text-neutral-500 dark:text-neutral-400">
                    No pages found.
                  </p>
                )}

              {debouncedSearchQuery.length > 0 &&
                !isSearching &&
                !isSearchError &&
                searchResults &&
                searchResults.length > 0 && (
                  <div className="space-y-1">
                    {searchResults.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSearchNavigate(item.id)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        <span className="text-base leading-none">
                          {item.icon ?? "📄"}
                        </span>
                        <span className="truncate text-sm text-neutral-800 dark:text-neutral-100">
                          {item.title}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
