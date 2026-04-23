"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
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
import { FileImage, FileText, Paperclip } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Page, PageNode } from "@/lib/types";
import { pageKeys, useSidebarTree } from "@/hooks/use-pages";
import { uploadPageAsset } from "@/lib/page-api";
import { useThemeStore } from "@/store/use-theme-store";
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
  titleForSync?: string;
  onFirstHeadingChange?: (title: string) => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

function toAbsoluteAssetURL(pathOrURL: string): string {
  if (pathOrURL.startsWith("http://") || pathOrURL.startsWith("https://")) {
    return pathOrURL;
  }

  const normalizedBase = API_BASE.replace(/\/api\/?$/, "").replace(/\/$/, "");
  const normalizedPath = pathOrURL.startsWith("/")
    ? pathOrURL
    : `/${pathOrURL}`;
  return `${normalizedBase}${normalizedPath}`;
}

export default function BlockNoteEditor({
  pageId,
  initialContent,
  titleForSync,
  onFirstHeadingChange,
}: BlockNoteEditorProps) {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();
  const themeMode = useThemeStore((state) => state.mode);
  const isApplyingTitleToHeading = useRef(false);
  const lastHeadingTitleSent = useRef<string>("Untitled");

  // Track page-block pageIds so we can detect removals in onChange
  const knownPageBlockIds = useRef<Set<string>>(new Set());

  // Parse initial content safely
  const parsedContent = useMemo(() => {
    try {
      const parsed = JSON.parse(initialContent);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }, [initialContent]);

  const editor = useCreateBlockNote({
    schema,
    initialContent: parsedContent,
  });

  const normalizeTitle = useCallback((value: string): string => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : "Untitled";
  }, []);

  const extractInlineText = useCallback((inlineContent: unknown): string => {
    if (typeof inlineContent === "string") {
      return inlineContent;
    }

    if (!Array.isArray(inlineContent)) {
      return "";
    }

    const collectText = (node: unknown): string => {
      if (!node || typeof node !== "object") {
        return "";
      }

      const candidate = node as {
        type?: string;
        text?: string;
        content?: unknown;
      };

      if (candidate.type === "text" && typeof candidate.text === "string") {
        return candidate.text;
      }

      if (candidate.type === "link" && Array.isArray(candidate.content)) {
        return candidate.content.map(collectText).join("");
      }

      return "";
    };

    return inlineContent.map(collectText).join("");
  }, []);

  const getFirstHeadingBlock = useCallback(() => {
    return editor.document.find((block) => block.type === "heading");
  }, [editor]);

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

  useEffect(() => {
    const next = new Set<string>();
    if (parsedContent) {
      for (const block of parsedContent) {
        if (block.type === "page" && block.props?.pageId) {
          next.add(block.props.pageId as string);
        }
      }
    }
    knownPageBlockIds.current = next;
  }, [pageId, parsedContent]);

  useEffect(() => {
    if (!titleForSync) return;

    const firstHeading = getFirstHeadingBlock();
    if (!firstHeading) return;

    const normalizedTargetTitle = normalizeTitle(titleForSync);
    const currentHeadingTitle = normalizeTitle(
      extractInlineText(firstHeading.content),
    );

    if (normalizedTargetTitle === currentHeadingTitle) {
      return;
    }

    isApplyingTitleToHeading.current = true;
    editor.updateBlock(firstHeading, { content: normalizedTargetTitle });
    lastHeadingTitleSent.current = normalizedTargetTitle;

    queueMicrotask(() => {
      isApplyingTitleToHeading.current = false;
    });
  }, [
    titleForSync,
    editor,
    extractInlineText,
    getFirstHeadingBlock,
    normalizeTitle,
  ]);

  const pickFile = useCallback((accept: string) => {
    return new Promise<File | null>((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = accept;
      input.onchange = () => {
        resolve(input.files?.[0] ?? null);
      };
      input.click();
    });
  }, []);

  const handleUploadSlashAction = useCallback(
    async (
      editorInstance: typeof editor,
      kind: "image" | "file",
      accept: string,
    ) => {
      const selectedFile = await pickFile(accept);
      if (!selectedFile) return;

      try {
        const uploaded = await uploadPageAsset(pageId, kind, selectedFile);
        const assetURL = toAbsoluteAssetURL(uploaded.url);

        if (kind === "image") {
          insertOrUpdateBlockForSlashMenu(
            editorInstance as never,
            {
              type: "image",
              props: {
                url: assetURL,
              },
            } as never,
          );
          return;
        }

        try {
          insertOrUpdateBlockForSlashMenu(
            editorInstance as never,
            {
              type: "file",
              props: {
                url: assetURL,
                name: uploaded.name,
              },
            } as never,
          );
        } catch {
          // Fallback for environments where file blocks are unavailable.
          editorInstance.insertBlocks(
            [
              {
                type: "paragraph",
                content: `${uploaded.name}: ${assetURL}`,
              },
            ],
            editorInstance.getTextCursorPosition().block,
            "after",
          );
        }
      } catch (err) {
        console.error("Upload failed:", err);
        window.alert("Upload failed. Please check file type and size.");
      }
    },
    [pageId, pickFile],
  );

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
  const getSlashMenuItems = (editorInstance: typeof editor) => {
    const makeImageItem = () => ({
      title: "Image",
      onItemClick: async () => {
        await handleUploadSlashAction(
          editorInstance,
          "image",
          ".png,.jpg,.jpeg,.webp,.gif,.svg,image/*",
        );
      },
      aliases: ["image", "photo", "picture", "upload"],
      group: "Media",
      icon: <FileImage size={18} />,
      subtext: "Upload an image from your device",
    });

    const makeFileItem = () => ({
      title: "File",
      onItemClick: async () => {
        await handleUploadSlashAction(
          editorInstance,
          "file",
          ".pdf,.txt,.doc,.docx",
        );
      },
      aliases: ["file", "document", "attachment", "upload"],
      group: "Media",
      icon: <Paperclip size={18} />,
      subtext: "Upload a file from your device",
    });

    const defaultItems = getDefaultReactSlashMenuItems(editorInstance);
    let hasImageItem = false;
    let hasFileItem = false;

    const menuItems = defaultItems.map((item) => {
      const title = item.title.toLowerCase();

      if (title === "image") {
        hasImageItem = true;
        return makeImageItem();
      }

      if (title === "file") {
        hasFileItem = true;
        return makeFileItem();
      }

      return item;
    });

    if (!hasImageItem || !hasFileItem) {
      const mediaIndices = menuItems
        .map((item, index) => (item.group === "Media" ? index : -1))
        .filter((index) => index >= 0);

      const insertionIndex =
        mediaIndices.length > 0 ? mediaIndices[mediaIndices.length - 1] + 1 : 0;

      const missingMediaItems = [];
      if (!hasImageItem) {
        missingMediaItems.push(makeImageItem());
      }
      if (!hasFileItem) {
        missingMediaItems.push(makeFileItem());
      }

      menuItems.splice(insertionIndex, 0, ...missingMediaItems);
    }

    return [
      ...menuItems,
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
            queryClient.invalidateQueries({ queryKey: pageKeys.sidebar.all });
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
  };

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
            queryClient.invalidateQueries({ queryKey: pageKeys.sidebar.all });
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

          const firstHeading = getFirstHeadingBlock();
          if (firstHeading && onFirstHeadingChange) {
            const headingTitle = normalizeTitle(
              extractInlineText(firstHeading.content),
            );

            if (headingTitle !== lastHeadingTitleSent.current) {
              lastHeadingTitleSent.current = headingTitle;

              if (!isApplyingTitleToHeading.current) {
                onFirstHeadingChange(headingTitle);
              }
            }
          }

          handleRemovedPageBlocks(blocks);
          saveContent(blocks);
        }}
        theme={themeMode}
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
