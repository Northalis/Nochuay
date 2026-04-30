const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api").replace(/\/$/, "");

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

  const headers: Record<string, string> = {};

  if (options.headers instanceof Headers) {
    options.headers.forEach((value, key) => {
      headers[key] = value;
    });
  } else if (Array.isArray(options.headers)) {
    for (const [key, value] of options.headers) {
      headers[key] = value;
    }
  } else if (options.headers) {
    Object.assign(headers, options.headers as Record<string, string>);
  }

  const hasContentType = Object.keys(headers).some(
    (key) => key.toLowerCase() === "content-type",
  );
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (!hasContentType && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const res = await fetch(`${API_BASE}${normalizedPath}`, {
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
