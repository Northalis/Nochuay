import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSidebarTree,
  searchPages,
  fetchTrashPages,
  createPage,
  updatePage,
  deletePage,
  restorePage,
  deletePagePermanently,
} from "@/lib/page-api";
import { useUserStore } from "@/store/use-user-store";

/* ── Query keys ──────────────────────────────────────────────── */
export const pageKeys = {
  all: ["pages"] as const,
  sidebar: {
    all: ["pages", "sidebar"] as const,
    byUser: (userID: string | null) =>
      ["pages", "sidebar", userID ?? "anonymous"] as const,
  },
  detailPrefix: ["pages", "detail"] as const,
  detail: (userID: string | null, id: string) =>
    ["pages", "detail", userID ?? "anonymous", id] as const,
  search: {
    all: ["pages", "search"] as const,
    byUser: (userID: string | null, query: string) =>
      ["pages", "search", userID ?? "anonymous", query] as const,
  },
  trash: {
    all: ["pages", "trash"] as const,
    byUser: (userID: string | null) =>
      ["pages", "trash", userID ?? "anonymous"] as const,
  },
};

/* ── Sidebar tree query ──────────────────────────────────────── */
export function useSidebarTree() {
  const userID = useUserStore((state) => state.user?.id ?? null);

  return useQuery({
    queryKey: pageKeys.sidebar.byUser(userID),
    queryFn: fetchSidebarTree,
    enabled: !!userID,
  });
}

/* ── Page search query ──────────────────────────────────────── */
export function usePageSearch(rawQuery: string, enabled = true) {
  const userID = useUserStore((state) => state.user?.id ?? null);
  const query = rawQuery.trim();

  return useQuery({
    queryKey: pageKeys.search.byUser(userID, query.toLowerCase()),
    queryFn: () => searchPages(query),
    enabled: enabled && !!userID && query.length > 0,
  });
}

/* ── Trash list query ───────────────────────────────────────── */
export function useTrashPages(enabled = true) {
  const userID = useUserStore((state) => state.user?.id ?? null);

  return useQuery({
    queryKey: pageKeys.trash.byUser(userID),
    queryFn: fetchTrashPages,
    enabled: enabled && !!userID,
  });
}

/* ── Create page mutation ────────────────────────────────────── */
export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { parentId?: string | null; title?: string }) =>
      createPage(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pageKeys.sidebar.all });
      qc.invalidateQueries({ queryKey: pageKeys.search.all });
    },
  });
}

/* ── Update page mutation ────────────────────────────────────── */
export function useUpdatePage() {
  const qc = useQueryClient();
  const userID = useUserStore((state) => state.user?.id ?? null);

  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      title?: string;
      icon?: string;
      content?: unknown;
    }) => updatePage(id, body),
    onSuccess: (updatedPage, variables) => {
      const pageID = updatedPage.id || variables.id;

      qc.invalidateQueries({ queryKey: pageKeys.sidebar.all });
      qc.invalidateQueries({ queryKey: pageKeys.search.all });
      qc.setQueryData(pageKeys.detail(userID, pageID), updatedPage);
      qc.invalidateQueries({ queryKey: pageKeys.detailPrefix });
    },
  });
}

/* ── Delete page mutation ────────────────────────────────────── */
export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pageKeys.sidebar.all });
      qc.invalidateQueries({ queryKey: pageKeys.search.all });
      qc.invalidateQueries({ queryKey: pageKeys.detailPrefix });
      qc.invalidateQueries({ queryKey: pageKeys.trash.all });
    },
  });
}

/* ── Restore page mutation ─────────────────────────────────── */
export function useRestorePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restorePage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pageKeys.sidebar.all });
      qc.invalidateQueries({ queryKey: pageKeys.search.all });
      qc.invalidateQueries({ queryKey: pageKeys.detailPrefix });
      qc.invalidateQueries({ queryKey: pageKeys.trash.all });
    },
  });
}

/* ── Permanent delete mutation ─────────────────────────────── */
export function useDeletePagePermanently() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePagePermanently(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pageKeys.sidebar.all });
      qc.invalidateQueries({ queryKey: pageKeys.search.all });
      qc.invalidateQueries({ queryKey: pageKeys.detailPrefix });
      qc.invalidateQueries({ queryKey: pageKeys.trash.all });
    },
  });
}
