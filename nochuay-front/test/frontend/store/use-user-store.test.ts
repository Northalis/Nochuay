/**
 * Unit Tests: useUserStore (Zustand)
 *
 * Tests the user authentication store: setAuth, logout, hydrate.
 */
import { useUserStore } from "@/store/use-user-store";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("useUserStore", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    // Reset Zustand store to initial state
    useUserStore.setState({ token: null, user: null });
  });

  test("initial state is null token and null user", () => {
    const state = useUserStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });

  test("setAuth stores token and user in state and localStorage", () => {
    const { setAuth } = useUserStore.getState();
    const user = { id: "user-123", email: "test@example.com" };

    setAuth("jwt-token-abc", user);

    const state = useUserStore.getState();
    expect(state.token).toBe("jwt-token-abc");
    expect(state.user).toEqual(user);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "token",
      "jwt-token-abc",
    );
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "user",
      JSON.stringify(user),
    );
  });

  test("logout clears state and localStorage", () => {
    const { setAuth, logout } = useUserStore.getState();
    setAuth("jwt-token", { id: "1", email: "a@b.com" });

    logout();

    const state = useUserStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("token");
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("user");
  });

  test("hydrate restores token and user from localStorage", () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === "token") return "stored-token";
      if (key === "user")
        return JSON.stringify({ id: "u1", email: "stored@test.com" });
      return null;
    });

    const { hydrate } = useUserStore.getState();
    hydrate();

    const state = useUserStore.getState();
    expect(state.token).toBe("stored-token");
    expect(state.user).toEqual({ id: "u1", email: "stored@test.com" });
  });

  test("hydrate handles missing localStorage data gracefully", () => {
    localStorageMock.getItem.mockReturnValue(null);

    const { hydrate } = useUserStore.getState();
    hydrate();

    const state = useUserStore.getState();
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
  });

  test("hydrate handles corrupted user JSON gracefully", () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === "token") return "valid-token";
      if (key === "user") return "{corrupted-json";
      return null;
    });

    const { hydrate } = useUserStore.getState();
    hydrate();

    const state = useUserStore.getState();
    expect(state.token).toBe("valid-token");
    expect(state.user).toBeNull();
  });
});
