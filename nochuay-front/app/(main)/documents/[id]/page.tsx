"use client";

import { use } from "react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText } from "lucide-react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { getPage } from "@/lib/page-api";
import { pageKeys, useSidebarTree } from "@/hooks/use-pages";
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

export default function DocumentPage({ params }: DocumentPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const userID = useUserStore((state) => state.user?.id ?? null);
  const { data: sidebarTree } = useSidebarTree();

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
      <div className="px-6 pt-5 pb-2 border-b border-neutral-200 dark:border-neutral-800">
        <BreadcrumbNavigator
          segments={breadcrumbSegments}
          currentPageID={id}
          onNavigate={(pageID) =>
            router.push(pageID ? `/documents/${pageID}` : "/")
          }
        />
      </div>

      {/* Centered page title */}
      <div className="w-full max-w-4xl mx-auto px-6 pt-6 pb-3 text-left">
        {page.icon && <span className="text-5xl block mb-2">{page.icon}</span>}
        <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">
          {page.title}
        </h1>
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
