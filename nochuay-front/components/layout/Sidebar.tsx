"use client";

import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  PlusCircle,
  Search,
  Settings,
  FileText,
  Trash2,
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
  useTrashPages,
  useRestorePage,
  useDeletePagePermanently,
} from "@/hooks/use-pages";
import {
  useUpdateAccountEmail,
  useUpdateAccountPassword,
} from "@/hooks/use-account";
import { useUserStore } from "@/store/use-user-store";
import { useSidebarStore } from "@/store/use-sidebar-store";
import { useThemeStore } from "@/store/use-theme-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  onClose: () => void;
}

type SettingsSection = "account" | "preference";
type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

export default function Sidebar({ onClose }: SidebarProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: pages, isLoading, isError } = useSidebarTree();
  const createPage = useCreatePage();
  const { user, logout } = useUserStore();
  const resetSidebar = useSidebarStore((state) => state.reset);
  const themeMode = useThemeStore((state) => state.mode);
  const setThemeMode = useThemeStore((state) => state.setMode);
  const updateEmailMutation = useUpdateAccountEmail();
  const updatePasswordMutation = useUpdateAccountPassword();

  const restorePageMutation = useRestorePage();
  const deletePagePermanentlyMutation = useDeletePagePermanently();

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

  // ── Trash modal ───────────────────────────────────────────
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashFilter, setTrashFilter] = useState("");
  const {
    data: trashPages,
    isLoading: isTrashLoading,
    isError: isTrashError,
  } = useTrashPages(trashOpen);

  // ── Settings modal ────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] =
    useState<SettingsSection>("account");

  const [emailFormOpen, setEmailFormOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [emailFeedback, setEmailFeedback] = useState<Feedback>(null);

  const [passwordFormOpen, setPasswordFormOpen] = useState(false);
  const [passwordCurrent, setPasswordCurrent] = useState("");
  const [passwordNext, setPasswordNext] = useState("");
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);

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
    if (!searchOpen && !settingsOpen && !trashOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      if (searchOpen) {
        setSearchOpen(false);
        setSearchInput("");
        setDebouncedSearchQuery("");
      }

      if (settingsOpen) {
        setSettingsOpen(false);
        setEmailFormOpen(false);
        setPasswordFormOpen(false);
        setEmailCurrentPassword("");
        setPasswordCurrent("");
        setPasswordNext("");
        setEmailFeedback(null);
        setPasswordFeedback(null);
      }

      if (trashOpen) {
        closeTrashModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [searchOpen, settingsOpen, trashOpen]);

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

  function openTrashModal() {
    setProfileOpen(false);
    setTrashOpen(true);
  }

  function closeTrashModal() {
    setTrashOpen(false);
    setTrashFilter("");
  }

  function openSettingsModal() {
    setProfileOpen(false);
    setSettingsOpen(true);
    setSettingsSection("account");
    setNewEmail(user?.email ?? "");
    setEmailFeedback(null);
    setPasswordFeedback(null);
  }

  function closeSettingsModal() {
    setSettingsOpen(false);
    setEmailFormOpen(false);
    setPasswordFormOpen(false);
    setEmailCurrentPassword("");
    setPasswordCurrent("");
    setPasswordNext("");
    setEmailFeedback(null);
    setPasswordFeedback(null);
  }

  function handleSearchNavigate(pageID: string) {
    closeSearchModal();
    router.push(`/documents/${pageID}`);
  }

  function handleRestoreTrash(pageID: string) {
    restorePageMutation.mutate(pageID);
  }

  function handleDeleteTrash(pageID: string) {
    const confirmed = window.confirm(
      "Delete this page permanently? This cannot be undone.",
    );
    if (!confirmed) return;
    deletePagePermanentlyMutation.mutate(pageID);
  }

  function handleUpdateEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailFeedback(null);

    const trimmedEmail = newEmail.trim();
    if (!trimmedEmail || !emailCurrentPassword) {
      setEmailFeedback({
        type: "error",
        message: "newEmail and currentPassword are required",
      });
      return;
    }

    updateEmailMutation.mutate(
      {
        newEmail: trimmedEmail,
        currentPassword: emailCurrentPassword,
      },
      {
        onSuccess: () => {
          setEmailFeedback({
            type: "success",
            message: "Email updated successfully.",
          });
          setEmailCurrentPassword("");
          setEmailFormOpen(false);
        },
        onError: (error) => {
          setEmailFeedback({
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "Failed to update account email",
          });
        },
      },
    );
  }

  function handleUpdatePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordFeedback(null);

    if (!passwordCurrent || !passwordNext) {
      setPasswordFeedback({
        type: "error",
        message: "currentPassword and newPassword are required",
      });
      return;
    }

    if (passwordNext.length < 6) {
      setPasswordFeedback({
        type: "error",
        message: "newPassword must be at least 6 characters",
      });
      return;
    }

    updatePasswordMutation.mutate(
      {
        currentPassword: passwordCurrent,
        newPassword: passwordNext,
      },
      {
        onSuccess: () => {
          setPasswordFeedback({
            type: "success",
            message: "Password updated successfully.",
          });
          setPasswordCurrent("");
          setPasswordNext("");
          setPasswordFormOpen(false);
        },
        onError: (error) => {
          setPasswordFeedback({
            type: "error",
            message:
              error instanceof Error
                ? error.message
                : "Failed to update account password",
          });
        },
      },
    );
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
        <button
          onClick={openSettingsModal}
          className="flex items-center gap-2 px-2 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 w-full text-left"
        >
          <Settings size={16} />
          <span>Settings</span>
        </button>
        <button
          onClick={openTrashModal}
          className="flex items-center gap-2 px-2 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 rounded hover:bg-neutral-200 dark:hover:bg-neutral-800 w-full text-left"
        >
          <Trash2 size={16} />
          <span>Trash</span>
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
          Nochuay v2.0.0
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

      {trashOpen && (
        <div
          className="fixed inset-0 z-70 flex items-start justify-center bg-neutral-950/45 px-4 py-20"
          onClick={closeTrashModal}
          role="presentation"
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Trash"
          >
            <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <Trash2 size={16} className="text-neutral-500" />
              <input
                value={trashFilter}
                onChange={(event) => setTrashFilter(event.target.value)}
                placeholder="Filter trash by title..."
                className="w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100 dark:placeholder:text-neutral-500"
              />
              <button
                onClick={closeTrashModal}
                className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                aria-label="Close trash"
              >
                <X size={14} />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-2">
              {isTrashLoading && (
                <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-neutral-500 dark:text-neutral-400">
                  <Loader2 size={16} className="animate-spin" />
                  Loading trash...
                </div>
              )}

              {!isTrashLoading && isTrashError && (
                <p className="px-3 py-4 text-sm text-red-500">
                  Failed to load trash.
                </p>
              )}

              {!isTrashLoading &&
                !isTrashError &&
                (!trashPages || trashPages.length === 0) && (
                  <p className="px-3 py-4 text-sm text-neutral-500 dark:text-neutral-400">
                    Your trash is empty.
                  </p>
                )}

              {!isTrashLoading &&
                !isTrashError &&
                trashPages &&
                trashPages.length > 0 &&
                (() => {
                  const normalized = trashFilter.trim().toLowerCase();
                  const filtered = normalized
                    ? trashPages.filter((item) =>
                        item.title.toLowerCase().includes(normalized),
                      )
                    : trashPages;

                  if (filtered.length === 0) {
                    return (
                      <p className="px-3 py-4 text-sm text-neutral-500 dark:text-neutral-400">
                        No trashed pages match that filter.
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-1">
                      {filtered.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="text-base leading-none">
                              {item.icon ?? "📄"}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm text-neutral-800 dark:text-neutral-100">
                                {item.title}
                              </p>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                Deleted{" "}
                                {new Date(item.deletedAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRestoreTrash(item.id)}
                              disabled={restorePageMutation.isPending}
                              className="rounded px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => handleDeleteTrash(item.id)}
                              disabled={deletePagePermanentlyMutation.isPending}
                              className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                              Delete forever
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
            </div>
          </div>
        </div>
      )}

      {settingsOpen && (
        <div
          className="fixed inset-0 z-70 flex items-start justify-center bg-neutral-950/45 px-4 py-14"
          onClick={closeSettingsModal}
          role="presentation"
        >
          <div
            className="w-full max-w-3xl rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3 dark:border-neutral-800">
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                Settings
              </p>
              <button
                onClick={closeSettingsModal}
                className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                aria-label="Close settings"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex max-h-[70vh] min-h-96">
              <aside className="w-44 border-r border-neutral-200 p-3 dark:border-neutral-800">
                <button
                  onClick={() => setSettingsSection("account")}
                  className={`mb-1 w-full rounded px-2 py-1.5 text-left text-sm ${
                    settingsSection === "account"
                      ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  }`}
                >
                  Account
                </button>
                <button
                  onClick={() => setSettingsSection("preference")}
                  className={`w-full rounded px-2 py-1.5 text-left text-sm ${
                    settingsSection === "preference"
                      ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  }`}
                >
                  Preference
                </button>
              </aside>

              <section className="flex-1 overflow-y-auto p-4">
                {settingsSection === "account" && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <div className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                            Change Email
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            Update your sign-in email address.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEmailFormOpen((prev) => !prev)}
                        >
                          {emailFormOpen ? "Cancel" : "Edit"}
                        </Button>
                      </div>

                      {emailFormOpen && (
                        <form
                          onSubmit={handleUpdateEmailSubmit}
                          className="border-t border-neutral-200 px-4 py-3 dark:border-neutral-800"
                        >
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label htmlFor="settings-new-email">
                                New Email
                              </Label>
                              <Input
                                id="settings-new-email"
                                type="email"
                                value={newEmail}
                                onChange={(event) =>
                                  setNewEmail(event.target.value)
                                }
                                placeholder="you@example.com"
                                required
                              />
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor="settings-email-password">
                                Current Password
                              </Label>
                              <Input
                                id="settings-email-password"
                                type="password"
                                value={emailCurrentPassword}
                                onChange={(event) =>
                                  setEmailCurrentPassword(event.target.value)
                                }
                                placeholder="********"
                                required
                              />
                            </div>

                            <Button
                              type="submit"
                              size="sm"
                              disabled={updateEmailMutation.isPending}
                            >
                              {updateEmailMutation.isPending
                                ? "Saving..."
                                : "Save Email"}
                            </Button>
                          </div>
                        </form>
                      )}

                      {emailFeedback && (
                        <p
                          className={`px-4 pb-3 text-xs ${
                            emailFeedback.type === "success"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-500"
                          }`}
                        >
                          {emailFeedback.message}
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
                      <div className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                            Change Password
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            Protect your account with a new password.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPasswordFormOpen((prev) => !prev)}
                        >
                          {passwordFormOpen ? "Cancel" : "Edit"}
                        </Button>
                      </div>

                      {passwordFormOpen && (
                        <form
                          onSubmit={handleUpdatePasswordSubmit}
                          className="border-t border-neutral-200 px-4 py-3 dark:border-neutral-800"
                        >
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label htmlFor="settings-current-password">
                                Current Password
                              </Label>
                              <Input
                                id="settings-current-password"
                                type="password"
                                value={passwordCurrent}
                                onChange={(event) =>
                                  setPasswordCurrent(event.target.value)
                                }
                                placeholder="********"
                                required
                              />
                            </div>

                            <div className="space-y-1">
                              <Label htmlFor="settings-new-password">
                                New Password
                              </Label>
                              <Input
                                id="settings-new-password"
                                type="password"
                                value={passwordNext}
                                onChange={(event) =>
                                  setPasswordNext(event.target.value)
                                }
                                placeholder="********"
                                minLength={6}
                                required
                              />
                            </div>

                            <Button
                              type="submit"
                              size="sm"
                              disabled={updatePasswordMutation.isPending}
                            >
                              {updatePasswordMutation.isPending
                                ? "Saving..."
                                : "Save Password"}
                            </Button>
                          </div>
                        </form>
                      )}

                      {passwordFeedback && (
                        <p
                          className={`px-4 pb-3 text-xs ${
                            passwordFeedback.type === "success"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-500"
                          }`}
                        >
                          {passwordFeedback.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {settingsSection === "preference" && (
                  <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                    <div className="mb-3">
                      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                        Theme
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Choose how Nochuay looks in your workspace.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={themeMode === "light" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setThemeMode("light")}
                        className="gap-1"
                      >
                        <Sun size={14} />
                        Light
                      </Button>
                      <Button
                        type="button"
                        variant={themeMode === "dark" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setThemeMode("dark")}
                        className="gap-1"
                      >
                        <Moon size={14} />
                        Dark
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
