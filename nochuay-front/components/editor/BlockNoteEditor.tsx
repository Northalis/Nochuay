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
import { pageKeys, useSidebarTree, useUpdatePage } from "@/hooks/use-pages";
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

/** Recursively build a map of pageId -> title from the sidebar tree */
function buildPageTitleMap(nodes: PageNode[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const node of nodes) {
    map.set(node.id, node.title);
    if (node.children.length > 0) {
      for (const [id, title] of buildPageTitleMap(node.children)) {
        map.set(id, title);
      }
    }
  }
  return map;
}

/** Find the direct children of a target page ID within the sidebar tree */
function findDirectChildren(nodes: PageNode[], targetId: string): PageNode[] | null {
  for (const node of nodes) {
    if (node.id === targetId) {
      return node.children;
    }
    if (node.children.length > 0) {
      const found = findDirectChildren(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
}

interface BlockNoteEditorProps {
  pageId: string;
  initialContent: string; // JSON-stringified Block[]
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
}: BlockNoteEditorProps) {
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();
  const themeMode = useThemeStore((state) => state.mode);
  const { mutate: savePageContent } = useUpdatePage();

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

  // Auto-save: debounced PATCH to /pages/:pageId
  const saveContent = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (blocks: any[]) => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        savePageContent(
          { id: pageId, content: JSON.stringify(blocks) },
          {
            onError: (err) => console.error("Auto-save failed:", err),
          }
        );
      }, 1000);
    },
    [pageId, savePageContent],
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

  // Auto-remove page blocks whose referenced page no longer exists,
  // sync pageTitle prop of page blocks to match the latest sidebar title,
  // and insert new page blocks for children added via the sidebar.
  useEffect(() => {
    if (!sidebarPages) return;

    const titleMap = buildPageTitleMap(sidebarPages);
    const directChildren = findDirectChildren(sidebarPages, pageId) || [];

    const staleBlockIds: string[] = [];
    const blocksToUpdate: { id: string; title: string }[] = [];
    const existingChildIds = new Set<string>();

    for (const block of editor.document) {
      if (
        block.type === "page" &&
        "pageId" in block.props &&
        (block.props as { pageId: string }).pageId
      ) {
        const blockPageId = (block.props as { pageId: string }).pageId;
        existingChildIds.add(blockPageId);
        const latestTitle = titleMap.get(blockPageId);

        if (latestTitle === undefined) {
          // Page no longer exists → mark for removal
          staleBlockIds.push(block.id);
        } else if ((block.props as { pageTitle: string }).pageTitle !== latestTitle) {
          // Title changed → mark for update
          blocksToUpdate.push({ id: block.id, title: latestTitle });
        }
      }
    }

    const missingChildren = directChildren.filter(child => !existingChildIds.has(child.id));

    if (staleBlockIds.length > 0 || blocksToUpdate.length > 0 || missingChildren.length > 0) {
      // Defer modifications to avoid React render cycle conflicts (isConnected error)
      setTimeout(() => {
        let changed = false;

        for (const update of blocksToUpdate) {
          try {
            editor.updateBlock(update.id, {
              type: "page",
              props: { pageTitle: update.title },
            });
            changed = true;
          } catch (e) {
            console.error("Failed to update page block:", e);
          }
        }

        if (staleBlockIds.length > 0) {
          try {
            editor.removeBlocks(staleBlockIds);
            changed = true;
          } catch (e) {
            console.error("Failed to remove stale page blocks:", e);
          }
        }

        if (missingChildren.length > 0) {
          try {
            const newBlocks = missingChildren.map(child => ({
              type: "page" as const,
              props: { pageId: child.id, pageTitle: child.title },
            }));
            
            // Insert them at the end of the document
            const lastBlock = editor.document[editor.document.length - 1];
            editor.insertBlocks(newBlocks as never[], lastBlock, "after");
            
            // Track the new page blocks so they aren't treated as removed
            for (const child of missingChildren) {
              knownPageBlockIds.current.add(child.id);
            }
            changed = true;
          } catch (e) {
            console.error("Failed to insert missing child page blocks:", e);
          }
        }

        if (changed) {
          // Trigger auto-save to persist the cleanup
          saveContent(editor.document);
        }
      }, 0);
    }
  }, [sidebarPages, editor, saveContent, pageId]);

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

  // Detect page blocks removed from editor and move the actual pages to trash
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

      // Move each removed page to trash in the backend
      for (const removedPageId of removedIds) {
        apiFetch(`/pages/${removedPageId}`, { method: "DELETE" })
          .then(() => {
            queryClient.invalidateQueries({ queryKey: pageKeys.sidebar.all });
          })
          .catch((err) => {
            console.error("Failed to move nested page to trash:", err);
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
