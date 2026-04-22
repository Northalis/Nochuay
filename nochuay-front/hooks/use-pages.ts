import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSidebarTree,
  createPage,
  updatePage,
  deletePage,
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

/* ── Create page mutation ────────────────────────────────────── */
export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { parentId?: string | null; title?: string }) =>
      createPage(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pageKeys.sidebar.all });
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
      qc.invalidateQueries({ queryKey: pageKeys.detailPrefix });
    },
  });
}
