import { apiFetch } from "@/lib/api";
import { Page, PageNode, UploadedAsset } from "@/lib/types";

/* ── Sidebar ────────────────────────────────────────────────── */
export function fetchSidebarTree(): Promise<PageNode[]> {
  return apiFetch<PageNode[]>("/pages/sidebar");
}

/* ── CRUD ────────────────────────────────────────────────────── */
export function createPage(body: {
  parentId?: string | null;
  title?: string;
}): Promise<Page> {
  return apiFetch<Page>("/pages", {
    method: "POST",
    body: JSON.stringify({
      parentId: body.parentId ?? null,
      title: body.title ?? "Untitled",
    }),
  });
}

export function getPage(id: string): Promise<Page> {
  return apiFetch<Page>(`/pages/${id}`);
}

export function updatePage(
  id: string,
  body: { title?: string; icon?: string; content?: unknown },
): Promise<Page> {
  return apiFetch<Page>(`/pages/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deletePage(id: string): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(`/pages/${id}`, {
    method: "DELETE",
  });
}

export function uploadPageAsset(
  id: string,
  kind: "image" | "file",
  file: File,
): Promise<UploadedAsset> {
  const formData = new FormData();
  formData.append("kind", kind);
  formData.append("file", file);

  return apiFetch<UploadedAsset>(`/pages/${id}/assets`, {
    method: "POST",
    body: formData,
  });
}
