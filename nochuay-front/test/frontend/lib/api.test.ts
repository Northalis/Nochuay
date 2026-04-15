/**
 * Unit Tests: apiFetch utility
 *
 * Tests the API fetch wrapper: auth header injection, error handling, response parsing.
 */

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

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { apiFetch } from "@/lib/api";

describe("apiFetch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  test("makes GET request and returns data from response wrapper", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ data: { id: "123", title: "Test" }, error: null }),
    });

    const result = await apiFetch<{ id: string; title: string }>("/pages/123");

    expect(result).toEqual({ id: "123", title: "Test" });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/pages/123");
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  test("does not force JSON content-type for FormData bodies", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: { ok: true }, error: null }),
    });

    const formData = new FormData();
    formData.append("kind", "image");

    await apiFetch("/pages/page-1/assets", {
      method: "POST",
      body: formData,
    });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["Content-Type"]).toBeUndefined();
  });

  test("attaches Authorization header when token exists in localStorage", async () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === "token") return "my-jwt-token";
      return null;
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: "ok", error: null }),
    });

    await apiFetch("/pages/sidebar");

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["Authorization"]).toBe("Bearer my-jwt-token");
  });

  test("does not attach Authorization header when no token", async () => {
    localStorageMock.getItem.mockReturnValue(null);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: "ok", error: null }),
    });

    await apiFetch("/auth/login");

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["Authorization"]).toBeUndefined();
  });

  test("makes POST request with JSON body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: { token: "abc", user: { id: "1" } },
          error: null,
        }),
    });

    const result = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "test@test.com", password: "pass" }),
    });

    expect(result).toEqual({ token: "abc", user: { id: "1" } });
    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe("POST");
  });

  test("throws error with message from API error response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({ data: null, error: "invalid email or password" }),
    });

    await expect(apiFetch("/auth/login")).rejects.toThrow(
      "invalid email or password",
    );
  });

  test("throws generic error when API returns non-JSON error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("not json")),
    });

    await expect(apiFetch("/pages")).rejects.toThrow("Request failed: 500");
  });

  test("passes custom headers alongside defaults", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: null, error: null }),
    });

    await apiFetch("/pages", {
      headers: { "X-Custom": "value" } as Record<string, string>,
    });

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["X-Custom"]).toBe("value");
    expect(options.headers["Content-Type"]).toBe("application/json");
  });
});
