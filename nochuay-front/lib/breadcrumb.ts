import { PageNode } from "@/lib/types";

export interface BreadcrumbSegment {
  id: string | null;
  title: string;
}

function findPathToPage(
  nodes: PageNode[],
  targetID: string,
): PageNode[] | null {
  for (const node of nodes) {
    if (node.id === targetID) {
      return [node];
    }

    if (node.children.length > 0) {
      const childPath = findPathToPage(node.children, targetID);
      if (childPath) {
        return [node, ...childPath];
      }
    }
  }

  return null;
}

export function buildBreadcrumbSegments(
  sidebarTree: PageNode[] | undefined,
  currentPageID: string,
  fallbackTitle?: string,
): BreadcrumbSegment[] {
  const segments: BreadcrumbSegment[] = [{ id: null, title: "main" }];

  if (!sidebarTree || sidebarTree.length === 0) {
    if (fallbackTitle) {
      segments.push({ id: currentPageID, title: fallbackTitle });
    }
    return segments;
  }

  const path = findPathToPage(sidebarTree, currentPageID);
  if (!path) {
    if (fallbackTitle) {
      segments.push({ id: currentPageID, title: fallbackTitle });
    }
    return segments;
  }

  for (const page of path) {
    segments.push({ id: page.id, title: page.title });
  }

  return segments;
}
