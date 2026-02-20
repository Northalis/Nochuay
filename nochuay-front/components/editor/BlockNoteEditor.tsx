"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
} from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
} from "@blocknote/core/extensions";
import { FileText } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Page, PageNode } from "@/lib/types";
import { pageKeys, useSidebarTree } from "@/hooks/use-pages";
import { schema } from "./editor-schema";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

/** Recursively collect all page IDs from the sidebar tree */
function collectPageIds(nodes: PageNode[]): Set<string> {
  const ids = new Set<string>();
  for (const node of nodes) {
    ids.add(node.id);
    if (node.children.length > 0) {
      for (const childId of collectPageIds(node.children)) {
        ids.add(childId);
      }
    }
  }
  return ids;
}

interface BlockNoteEditorProps {
  pageId: string;
  initialContent: string; // JSON-stringified Block[]
}

export default function BlockNoteEditor({
  pageId,
  initialContent,
}: BlockNoteEditorProps) {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  // Track page-block pageIds so we can detect removals in onChange
  const knownPageBlockIds = useRef<Set<string>>(new Set());

  // Parse initial content safely
  const parsedContent = (() => {
    try {
      const parsed = JSON.parse(initialContent);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Seed the known page-block IDs from initial content
        for (const block of parsed) {
          if (block.type === "page" && block.props?.pageId) {
            knownPageBlockIds.current.add(block.props.pageId);
          }
        }
        return parsed;
      }
      return undefined;
    } catch {
      return undefined;
    }
  })();

  const editor = useCreateBlockNote({
    schema,
    initialContent: parsedContent,
  });

  // Auto-save: debounced PATCH to /pages/:pageId
  const saveContent = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (blocks: any[]) => {
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

  // Subscribe to sidebar tree data to detect deleted pages
  const { data: sidebarPages } = useSidebarTree();

  // Auto-remove page blocks whose referenced page no longer exists
  useEffect(() => {
    if (!sidebarPages) return;

    const existingIds = collectPageIds(sidebarPages);
    const staleBlockIds: string[] = [];

    for (const block of editor.document) {
      if (
        block.type === "page" &&
        "pageId" in block.props &&
        (block.props as { pageId: string }).pageId &&
        !existingIds.has((block.props as { pageId: string }).pageId)
      ) {
        staleBlockIds.push(block.id);
      }
    }

    if (staleBlockIds.length > 0) {
      editor.removeBlocks(staleBlockIds);
      // Trigger auto-save to persist the cleanup
      saveContent(editor.document);
    }
  }, [sidebarPages, editor, saveContent]);

  // Build the slash menu items: default items + custom "Page" command
  const getSlashMenuItems = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editorInstance: typeof editor,
  ) => [
    ...getDefaultReactSlashMenuItems(editorInstance),
    {
      title: "Page",
      onItemClick: async () => {
        try {
          // Create a new child page under the current page
          const newPage = await apiFetch<Page>("/pages", {
            method: "POST",
            body: JSON.stringify({
              parentId: pageId,
              title: "Untitled",
            }),
          });

          // Insert the page block into the editor
          insertOrUpdateBlockForSlashMenu(editorInstance, {
            type: "page" as const,
            props: {
              pageId: newPage.id,
              pageTitle: newPage.title,
            },
          });

          // Track the new page block so it isn't treated as "removed"
          knownPageBlockIds.current.add(newPage.id);

          // Refresh the sidebar to show the new child page
          queryClient.invalidateQueries({ queryKey: pageKeys.sidebar });
        } catch (err) {
          console.error("Failed to create nested page:", err);
        }
      },
      aliases: ["page", "subpage", "nested", "child"],
      group: "Other",
      icon: <FileText size={18} />,
      subtext: "Create a nested page",
    },
  ];

  // Detect page blocks removed from editor and delete the actual pages
  const handleRemovedPageBlocks = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (blocks: any[]) => {
      const currentPageIds = new Set<string>();
      for (const block of blocks) {
        if (block.type === "page" && block.props?.pageId) {
          currentPageIds.add(block.props.pageId);
        }
      }

      // Find page IDs that were known but are no longer in the document
      const removedIds: string[] = [];
      for (const id of knownPageBlockIds.current) {
        if (!currentPageIds.has(id)) {
          removedIds.push(id);
        }
      }

      // Delete each removed page from the backend
      for (const removedPageId of removedIds) {
        apiFetch(`/pages/${removedPageId}`, { method: "DELETE" })
          .then(() => {
            queryClient.invalidateQueries({ queryKey: pageKeys.sidebar });
          })
          .catch((err) => {
            console.error("Failed to delete nested page:", err);
          });
      }

      // Update the known set to the current state
      knownPageBlockIds.current = currentPageIds;
    },
    [queryClient],
  );

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4">
      <BlockNoteView
        editor={editor}
        onChange={() => {
          const blocks = editor.document;
          handleRemovedPageBlocks(blocks);
          saveContent(blocks);
        }}
        theme="light"
        slashMenu={false}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(getSlashMenuItems(editor), query)
          }
        />
      </BlockNoteView>
    </div>
  );
}
