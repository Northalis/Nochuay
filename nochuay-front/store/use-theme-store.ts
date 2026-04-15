import { create } from "zustand";

export type ThemeMode = "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  hydrate: () => void;
}

const STORAGE_KEY = "theme";

export const useThemeStore = create<ThemeState>((set) => ({
  mode: "light",

  setMode: (mode) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, mode);
    }
    set({ mode });
  },

  toggleMode: () =>
    set((state) => {
      const nextMode: ThemeMode = state.mode === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, nextMode);
      }
      return { mode: nextMode };
    }),

  hydrate: () => {
    if (typeof window === "undefined") return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "dark" || stored === "light") {
      set({ mode: stored });
    } else {
      set({ mode: "light" });
    }
  },
}));
