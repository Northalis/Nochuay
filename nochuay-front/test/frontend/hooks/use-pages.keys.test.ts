/**
 * Unit Tests: page query keys
 *
 * Ensures query keys are user-scoped so cache entries cannot leak across accounts.
 */
import { pageKeys } from "@/hooks/use-pages";

describe("pageKeys", () => {
  test("sidebar key is scoped by user id", () => {
    expect(pageKeys.sidebar.byUser("user-a")).toEqual([
      "pages",
      "sidebar",
      "user-a",
    ]);

    expect(pageKeys.sidebar.byUser("user-b")).toEqual([
      "pages",
      "sidebar",
      "user-b",
    ]);
  });

  test("sidebar key differs between users", () => {
    expect(pageKeys.sidebar.byUser("user-a")).not.toEqual(
      pageKeys.sidebar.byUser("user-b"),
    );
  });

  test("detail key is scoped by user and page id", () => {
    expect(pageKeys.detail("user-a", "page-1")).toEqual([
      "pages",
      "detail",
      "user-a",
      "page-1",
    ]);

    expect(pageKeys.detail("user-b", "page-1")).toEqual([
      "pages",
      "detail",
      "user-b",
      "page-1",
    ]);
  });

  test("search key is scoped by user and query", () => {
    expect(pageKeys.search.byUser("user-a", "roadmap")).toEqual([
      "pages",
      "search",
      "user-a",
      "roadmap",
    ]);

    expect(pageKeys.search.byUser("user-b", "roadmap")).toEqual([
      "pages",
      "search",
      "user-b",
      "roadmap",
    ]);
  });

  test("trash key is scoped by user", () => {
    expect(pageKeys.trash.byUser("user-a")).toEqual([
      "pages",
      "trash",
      "user-a",
    ]);

    expect(pageKeys.trash.byUser("user-b")).toEqual([
      "pages",
      "trash",
      "user-b",
    ]);
  });

  test("anonymous fallback is stable when user id is absent", () => {
    expect(pageKeys.sidebar.byUser(null)).toEqual([
      "pages",
      "sidebar",
      "anonymous",
    ]);

    expect(pageKeys.detail(null, "page-1")).toEqual([
      "pages",
      "detail",
      "anonymous",
      "page-1",
    ]);

    expect(pageKeys.search.byUser(null, "roadmap")).toEqual([
      "pages",
      "search",
      "anonymous",
      "roadmap",
    ]);

    expect(pageKeys.trash.byUser(null)).toEqual([
      "pages",
      "trash",
      "anonymous",
    ]);
  });
});
