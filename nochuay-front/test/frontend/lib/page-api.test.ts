/**
 * Unit Tests: page-api functions
 *
 * Tests the page API wrapper functions: fetchSidebarTree, createPage, getPage, updatePage, deletePage.
 */

// Mock the apiFetch function
jest.mock("@/lib/api", () => ({
  apiFetch: jest.fn(),
}));

import { apiFetch } from "@/lib/api";
import {
  fetchSidebarTree,
  createPage,
  getPage,
  updatePage,
  deletePage,
} from "@/lib/page-api";

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe("page-api", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchSidebarTree", () => {
    test("calls apiFetch with correct path", async () => {
      const mockTree = [
        { id: "1", title: "Page 1", children: [], depth: 0 },
      ];
      mockApiFetch.mockResolvedValueOnce(mockTree);

      const result = await fetchSidebarTree();

      expect(mockApiFetch).toHaveBeenCalledWith("/pages/sidebar");
      expect(result).toEqual(mockTree);
    });
  });

  describe("createPage", () => {
    test("creates a root page with title", async () => {
      const mockPage = { id: "new-1", title: "My Page" };
      mockApiFetch.mockResolvedValueOnce(mockPage);

      const result = await createPage({ title: "My Page" });

      expect(mockApiFetch).toHaveBeenCalledWith("/pages", {
        method: "POST",
        body: JSON.stringify({ parentId: null, title: "My Page" }),
      });
      expect(result).toEqual(mockPage);
    });

    test("creates a child page with parentId", async () => {
      const mockPage = { id: "new-2", title: "Child" };
      mockApiFetch.mockResolvedValueOnce(mockPage);

      const result = await createPage({
        parentId: "parent-123",
        title: "Child",
      });

      expect(mockApiFetch).toHaveBeenCalledWith("/pages", {
        method: "POST",
        body: JSON.stringify({ parentId: "parent-123", title: "Child" }),
      });
      expect(result).toEqual(mockPage);
    });

    test("defaults title to 'Untitled' when not provided", async () => {
      mockApiFetch.mockResolvedValueOnce({ id: "new-3", title: "Untitled" });

      await createPage({});

      expect(mockApiFetch).toHaveBeenCalledWith("/pages", {
        method: "POST",
        body: JSON.stringify({ parentId: null, title: "Untitled" }),
      });
    });
  });

  describe("getPage", () => {
    test("fetches a page by id", async () => {
      const mockPage = { id: "p1", title: "Page 1", content: "[]" };
      mockApiFetch.mockResolvedValueOnce(mockPage);

      const result = await getPage("p1");

      expect(mockApiFetch).toHaveBeenCalledWith("/pages/p1");
      expect(result).toEqual(mockPage);
    });
  });

  describe("updatePage", () => {
    test("sends PATCH with title update", async () => {
      const mockPage = { id: "p1", title: "Updated" };
      mockApiFetch.mockResolvedValueOnce(mockPage);

      const result = await updatePage("p1", { title: "Updated" });

      expect(mockApiFetch).toHaveBeenCalledWith("/pages/p1", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
      });
      expect(result).toEqual(mockPage);
    });

    test("sends PATCH with icon update", async () => {
      mockApiFetch.mockResolvedValueOnce({ id: "p1", icon: "📝" });

      await updatePage("p1", { icon: "📝" });

      expect(mockApiFetch).toHaveBeenCalledWith("/pages/p1", {
        method: "PATCH",
        body: JSON.stringify({ icon: "📝" }),
      });
    });
  });

  describe("deletePage", () => {
    test("sends DELETE request and returns success", async () => {
      mockApiFetch.mockResolvedValueOnce({ success: true });

      const result = await deletePage("p1");

      expect(mockApiFetch).toHaveBeenCalledWith("/pages/p1", {
        method: "DELETE",
      });
      expect(result).toEqual({ success: true });
    });
  });
});
