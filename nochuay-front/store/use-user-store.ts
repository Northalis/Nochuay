import { create } from "zustand";

interface User {
  id: string;
  email: string;
}

interface UserState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  updateEmail: (email: string) => void;
  logout: () => void;
  /** Restore token + user from localStorage into Zustand state */
  hydrate: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  // Start as null — hydrate() will populate from localStorage
  token: null,
  user: null,

  setAuth: (token, user) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ token, user });
  },

  updateEmail: (email) => {
    set((state) => {
      if (!state.user) return state;

      const updatedUser = { ...state.user, email };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      return { user: updatedUser };
    });
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ token: null, user: null });
  },

  hydrate: () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    let user: User | null = null;
    try {
      const raw = localStorage.getItem("user");
      if (raw) user = JSON.parse(raw);
    } catch {
      // corrupted data — ignore
    }
    set({ token, user });
  },
}));
