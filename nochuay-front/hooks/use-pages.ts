import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSidebarTree,
  createPage,
  updatePage,
  deletePage,
} from "@/lib/page-api";

/* ── Query keys ──────────────────────────────────────────────── */
export const pageKeys = {
  sidebar: ["pages", "sidebar"] as const,
  detail: (id: string) => ["pages", id] as const,
};

/* ── Sidebar tree query ──────────────────────────────────────── */
export function useSidebarTree() {
  return useQuery({
    queryKey: pageKeys.sidebar,
    queryFn: fetchSidebarTree,
  });
}

/* ── Create page mutation ────────────────────────────────────── */
export function useCreatePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { parentId?: string | null; title?: string }) =>
      createPage(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pageKeys.sidebar });
    },
  });
}

/* ── Update page mutation ────────────────────────────────────── */
export function useUpdatePage() {
  const qc = useQueryClient();
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pageKeys.sidebar });
    },
  });
}

/* ── Delete page mutation ────────────────────────────────────── */
export function useDeletePage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: pageKeys.sidebar });
    },
  });
}
