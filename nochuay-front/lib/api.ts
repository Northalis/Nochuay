const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

/**
 * Thin wrapper around fetch for the Nochuay backend.
 * Automatically sets JSON headers and attaches the auth token when available.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Request failed: ${res.status}`);
  }

  const json = await res.json();
  return json.data as T;
}
