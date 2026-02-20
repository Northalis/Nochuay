import { create } from "zustand";

interface SidebarState {
  /** Set of page IDs that are currently expanded in the tree */
  expandedIds: Set<string>;
  toggle: (id: string) => void;
  expand: (id: string) => void;
  collapse: (id: string) => void;

  /** Page currently being renamed inline (null = none) */
  renamingId: string | null;
  setRenamingId: (id: string | null) => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  expandedIds: new Set<string>(),

  toggle: (id) =>
    set((state) => {
      const next = new Set(state.expandedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { expandedIds: next };
    }),

  expand: (id) =>
    set((state) => {
      const next = new Set(state.expandedIds);
      next.add(id);
      return { expandedIds: next };
    }),

  collapse: (id) =>
    set((state) => {
      const next = new Set(state.expandedIds);
      next.delete(id);
      return { expandedIds: next };
    }),

  renamingId: null,
  setRenamingId: (id) => set({ renamingId: id }),
}));
