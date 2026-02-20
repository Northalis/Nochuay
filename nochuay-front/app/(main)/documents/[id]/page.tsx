"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Page } from "@/lib/types";
import { Loader2, FileText } from "lucide-react";
import dynamic from "next/dynamic";

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
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPage() {
      try {
        const data = await apiFetch<Page>(`/pages/${id}`);
        setPage(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load page");
      } finally {
        setLoading(false);
      }
    }
    loadPage();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error || !page) {
    const isNotFound = error?.includes("404") || error?.includes("not found");
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <FileText size={40} className="text-neutral-300" />
        <p className="text-neutral-500 text-lg font-medium">
          {isNotFound
            ? "This page has been deleted"
            : (error ?? "Page not found")}
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
      {/* Page title header */}
      <div className="px-12 pt-10 pb-4">
        {page.icon && <span className="text-5xl block mb-3">{page.icon}</span>}
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
