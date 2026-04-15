/**
 * Unit Tests: useThemeStore (Zustand)
 *
 * Tests theme persistence and toggle behavior.
 */
import { useThemeStore } from "@/store/use-theme-store";

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

describe("useThemeStore", () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
    useThemeStore.setState({ mode: "light" });
  });

  test("defaults to light mode", () => {
    expect(useThemeStore.getState().mode).toBe("light");
  });

  test("setMode updates mode and localStorage", () => {
    const { setMode } = useThemeStore.getState();

    setMode("dark");

    expect(useThemeStore.getState().mode).toBe("dark");
    expect(localStorageMock.setItem).toHaveBeenCalledWith("theme", "dark");
  });

  test("toggleMode switches between light and dark", () => {
    const { toggleMode } = useThemeStore.getState();

    toggleMode();
    expect(useThemeStore.getState().mode).toBe("dark");

    toggleMode();
    expect(useThemeStore.getState().mode).toBe("light");
  });

  test("hydrate restores stored dark mode", () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === "theme") return "dark";
      return null;
    });

    const { hydrate } = useThemeStore.getState();
    hydrate();

    expect(useThemeStore.getState().mode).toBe("dark");
  });

  test("hydrate falls back to light for invalid stored value", () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === "theme") return "invalid";
      return null;
    });

    const { hydrate } = useThemeStore.getState();
    hydrate();

    expect(useThemeStore.getState().mode).toBe("light");
  });
});
