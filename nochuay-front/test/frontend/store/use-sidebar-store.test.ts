/**
 * Unit Tests: useSidebarStore (Zustand)
 *
 * Tests the sidebar state: toggle, expand, collapse, and renaming.
 */
import { useSidebarStore } from "@/store/use-sidebar-store";

describe("useSidebarStore", () => {
  beforeEach(() => {
    // Reset store to initial state
    useSidebarStore.setState({
      expandedIds: new Set<string>(),
      renamingId: null,
    });
  });

  test("initial state has empty expandedIds and null renamingId", () => {
    const state = useSidebarStore.getState();
    expect(state.expandedIds.size).toBe(0);
    expect(state.renamingId).toBeNull();
  });

  test("toggle adds an id to expandedIds", () => {
    const { toggle } = useSidebarStore.getState();
    toggle("page-1");

    const state = useSidebarStore.getState();
    expect(state.expandedIds.has("page-1")).toBe(true);
    expect(state.expandedIds.size).toBe(1);
  });

  test("toggle removes an already expanded id", () => {
    const { toggle } = useSidebarStore.getState();
    toggle("page-1"); // expand
    toggle("page-1"); // collapse

    const state = useSidebarStore.getState();
    expect(state.expandedIds.has("page-1")).toBe(false);
    expect(state.expandedIds.size).toBe(0);
  });

  test("expand adds id without affecting others", () => {
    const { expand, toggle } = useSidebarStore.getState();
    toggle("page-1");
    expand("page-2");

    const state = useSidebarStore.getState();
    expect(state.expandedIds.has("page-1")).toBe(true);
    expect(state.expandedIds.has("page-2")).toBe(true);
    expect(state.expandedIds.size).toBe(2);
  });

  test("expand is idempotent", () => {
    const { expand } = useSidebarStore.getState();
    expand("page-1");
    expand("page-1");

    const state = useSidebarStore.getState();
    expect(state.expandedIds.has("page-1")).toBe(true);
    expect(state.expandedIds.size).toBe(1);
  });

  test("collapse removes a specific id", () => {
    const { expand, collapse } = useSidebarStore.getState();
    expand("page-1");
    expand("page-2");
    collapse("page-1");

    const state = useSidebarStore.getState();
    expect(state.expandedIds.has("page-1")).toBe(false);
    expect(state.expandedIds.has("page-2")).toBe(true);
    expect(state.expandedIds.size).toBe(1);
  });

  test("collapse on non-existing id does nothing", () => {
    const { expand, collapse } = useSidebarStore.getState();
    expand("page-1");
    collapse("page-999");

    const state = useSidebarStore.getState();
    expect(state.expandedIds.size).toBe(1);
  });

  test("setRenamingId sets the renaming page id", () => {
    const { setRenamingId } = useSidebarStore.getState();
    setRenamingId("page-5");

    const state = useSidebarStore.getState();
    expect(state.renamingId).toBe("page-5");
  });

  test("setRenamingId(null) clears the renaming state", () => {
    const { setRenamingId } = useSidebarStore.getState();
    setRenamingId("page-5");
    setRenamingId(null);

    const state = useSidebarStore.getState();
    expect(state.renamingId).toBeNull();
  });
});
