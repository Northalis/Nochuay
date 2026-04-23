"use client";

import { use } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText } from "lucide-react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { getPage } from "@/lib/page-api";
import { pageKeys, useSidebarTree, useUpdatePage } from "@/hooks/use-pages";
import { useUserStore } from "@/store/use-user-store";
import BreadcrumbNavigator from "@/components/layout/BreadcrumbNavigator";
import { buildBreadcrumbSegments } from "@/lib/breadcrumb";

// Dynamically import the editor to avoid SSR issues with BlockNote
const BlockNoteEditor = dynamic(
  () => import("@/components/editor/BlockNoteEditor"),
  { ssr: false },
);

interface DocumentPageProps {
  params: Promise<{ id: string }>;
}

function normalizeTitle(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "Untitled";
}

export default function DocumentPage({ params }: DocumentPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const userID = useUserStore((state) => state.user?.id ?? null);
  const { data: sidebarTree } = useSidebarTree();
  const updatePageMutation = useUpdatePage();

  const [titleDraft, setTitleDraft] = useState("Untitled");
  const titleDraftRef = useRef("Untitled");
  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInputFocusedRef = useRef(false);
  const lastSavedTitleRef = useRef("Untitled");

  const {
    data: page,
    isLoading,
    error,
  } = useQuery({
    queryKey: pageKeys.detail(userID, id),
    queryFn: () => getPage(id),
    enabled: !!id,
  });

  const errorMessage =
    error instanceof Error ? error.message : "Failed to load page";

  const breadcrumbSegments = useMemo(
    () => buildBreadcrumbSegments(sidebarTree, id, page?.title),
    [sidebarTree, id, page?.title],
  );

  const commitTitle = useCallback(
    (incomingTitle: string) => {
      if (!page) return;

      const normalized = normalizeTitle(incomingTitle);
      setTitleDraft(normalized);

      if (normalized === lastSavedTitleRef.current) {
        return;
      }

      updatePageMutation.mutate(
        { id: page.id, title: normalized },
        {
          onSuccess: (updatedPage) => {
            const nextTitle = normalizeTitle(updatedPage.title ?? normalized);
            lastSavedTitleRef.current = nextTitle;
            setTitleDraft(nextTitle);
          },
          onError: () => {
            setTitleDraft(lastSavedTitleRef.current);
          },
        },
      );
    },
    [page, updatePageMutation],
  );

  const scheduleTitleSave = useCallback(
    (nextTitle: string) => {
      if (titleDebounceRef.current) {
        clearTimeout(titleDebounceRef.current);
      }

      titleDebounceRef.current = setTimeout(() => {
        commitTitle(nextTitle);
      }, 500);
    },
    [commitTitle],
  );

  useEffect(() => {
    titleDraftRef.current = titleDraft;
  }, [titleDraft]);

  useEffect(() => {
    if (!page) return;

    const normalized = normalizeTitle(page.title);
    lastSavedTitleRef.current = normalized;

    if (!titleInputFocusedRef.current) {
      queueMicrotask(() => {
        setTitleDraft(normalized);
      });
    }
  }, [page]);

  useEffect(() => {
    return () => {
      if (titleDebounceRef.current) {
        clearTimeout(titleDebounceRef.current);
      }
    };
  }, []);

  const handleTitleInputChange = useCallback(
    (value: string) => {
      setTitleDraft(value);
      scheduleTitleSave(value);
    },
    [scheduleTitleSave],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error || !page) {
    const isNotFound =
      errorMessage.includes("404") || errorMessage.includes("not found");
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <FileText size={40} className="text-neutral-300" />
        <p className="text-neutral-500 text-lg font-medium">
          {isNotFound ? "This page has been deleted" : errorMessage}
        </p>
        <p className="text-neutral-400 text-sm">
          {isNotFound
            ? "The page you're looking for no longer exists."
            : "Something went wrong while loading this page."}
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-2 text-sm text-blue-500 hover:underline"
        >
          ← Back to home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="px-6 pt-5 pb-1">
        <BreadcrumbNavigator
          segments={breadcrumbSegments}
          currentPageID={id}
          onNavigate={(pageID) =>
            router.push(pageID ? `/documents/${pageID}` : "/")
          }
        />
      </div>

      {/* Centered page title */}
      <div className="w-full max-w-4xl mx-auto px-6 pt-2 pb-3 text-left">
        {page.icon && <span className="text-5xl block mb-2">{page.icon}</span>}
        <input
          value={titleDraft}
          onChange={(event) => handleTitleInputChange(event.target.value)}
          onFocus={() => {
            titleInputFocusedRef.current = true;
          }}
          onBlur={() => {
            titleInputFocusedRef.current = false;
            if (titleDebounceRef.current) {
              clearTimeout(titleDebounceRef.current);
            }
            commitTitle(titleDraftRef.current);
          }}
          className="w-full rounded-xl border border-transparent bg-transparent px-1 py-1 text-4xl font-bold tracking-tight text-neutral-800 outline-none transition-colors placeholder:text-neutral-400 hover:border-neutral-200 focus:border-neutral-300 md:text-5xl dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:hover:border-neutral-700 dark:focus:border-neutral-600"
          placeholder="Untitled"
          aria-label="Page title"
        />
      </div>

      {/* Editor */}
      <div className="flex-1">
        <BlockNoteEditor
          key={page.id}
          pageId={page.id}
          initialContent={
            typeof page.content === "string"
              ? page.content
              : JSON.stringify(page.content)
          }
        />
      </div>
    </div>
  );
}
