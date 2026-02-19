"use client";

import { useCallback, useRef } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { Block } from "@blocknote/core";
import { apiFetch } from "@/lib/api";

import "@blocknote/core/fonts/inter.css";

import "@blocknote/mantine/style.css";

interface BlockNoteEditorProps {
  pageId: string;
  initialContent: string; // JSON-stringified Block[]
}

export default function BlockNoteEditor({
  pageId,
  initialContent,
}: BlockNoteEditorProps) {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parse initial content safely
  const parsedContent = (() => {
    try {
      const parsed = JSON.parse(initialContent);
      return Array.isArray(parsed) && parsed.length > 0
        ? (parsed as Block[])
        : undefined;
    } catch {
      return undefined;
    }
  })();

  const editor = useCreateBlockNote({
    initialContent: parsedContent,
  });

  // Auto-save: debounced PATCH to /pages/:pageId
  const saveContent = useCallback(
    (blocks: Block[]) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(async () => {
        try {
          await apiFetch(`/pages/${pageId}`, {
            method: "PATCH",
            body: JSON.stringify({ content: JSON.stringify(blocks) }),
          });
        } catch (err) {
          console.error("Auto-save failed:", err);
        }
      }, 1000);
    },
    [pageId],
  );

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4">
      <BlockNoteView
        editor={editor}
        onChange={() => {
          saveContent(editor.document as Block[]);
        }}
        theme="light"
      />
    </div>
  );
}
