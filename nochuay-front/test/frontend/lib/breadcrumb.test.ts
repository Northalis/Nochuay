import { buildBreadcrumbSegments } from "@/lib/breadcrumb";
import { PageNode } from "@/lib/types";

function makeNode(
  id: string,
  title: string,
  parentId: string | null,
  depth: number,
  children: PageNode[] = [],
): PageNode {
  return {
    id,
    userId: "user-1",
    parentId,
    title,
    content: "[]",
    createdAt: new Date().toISOString(),
    children,
    depth,
  };
}

describe("buildBreadcrumbSegments", () => {
  const tree: PageNode[] = [
    makeNode("page-1", "page1", null, 0, [
      makeNode("page-2", "page2", "page-1", 1, [
        makeNode("page-3", "page3", "page-2", 2),
      ]),
    ]),
  ];

  test("returns main + root when current page is top-level", () => {
    const segments = buildBreadcrumbSegments(tree, "page-1", "page1");

    expect(segments).toEqual([
      { id: null, title: "main" },
      { id: "page-1", title: "page1" },
    ]);
  });

  test("returns full ancestor path for deep page", () => {
    const segments = buildBreadcrumbSegments(tree, "page-3", "page3");

    expect(segments).toEqual([
      { id: null, title: "main" },
      { id: "page-1", title: "page1" },
      { id: "page-2", title: "page2" },
      { id: "page-3", title: "page3" },
    ]);
  });

  test("falls back to main + current title when tree is missing current page", () => {
    const segments = buildBreadcrumbSegments(
      tree,
      "missing-id",
      "fallback-page",
    );

    expect(segments).toEqual([
      { id: null, title: "main" },
      { id: "missing-id", title: "fallback-page" },
    ]);
  });

  test("collapses naturally when navigating from deep page to ancestor", () => {
    const deep = buildBreadcrumbSegments(tree, "page-3", "page3");
    const ancestor = buildBreadcrumbSegments(tree, "page-1", "page1");

    expect(deep.map((segment) => segment.title).join(">")).toBe(
      "main>page1>page2>page3",
    );
    expect(ancestor.map((segment) => segment.title).join(">")).toBe(
      "main>page1",
    );
  });
});
