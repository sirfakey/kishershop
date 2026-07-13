const API_BASE = import.meta.env.VITE_API_URL as string;

/**
 * Thin wrapper around fetch() that attaches the Sanctum Bearer token.
 * Use inside components via `useAuth()` to get the token.
 */
export async function apiFetch(
  path: string,
  token: string | null,
  options: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  return response;
}

/**
 * Fetch + parse JSON + throw on non-ok status in one call.
 */
export async function apiJson<T = unknown>(
  path: string,
  token: string | null,
  options: RequestInit = {},
): Promise<T> {
  const response = await apiFetch(path, token, options);

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const err = await response.json();
      message = err.message || message;
    } catch {
      // Response body wasn't valid JSON — try to read as text
      try {
        const text = await response.text();
        if (text) message = `${message}: ${text.slice(0, 200)}`;
      } catch {
        // Couldn't read body at all
      }
    }
    throw new Error(message);
  }

  // Parse JSON defensively — throw a clear error when the body is empty
  try {
    return await response.json() as Promise<T>;
  } catch {
    throw new Error("Server returned a non-JSON response.");
  }
}

/**
 * Upload files via multipart/form-data. Does NOT set Content-Type so the
 * browser can set the correct multipart boundary automatically.
 */
export async function apiUpload(
  path: string,
  token: string | null,
  formData: FormData,
): Promise<{ message: string; urls: string[] }> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    let message = `Upload failed (${response.status})`;
    try {
      const err = await response.json();
      message = err.message || message;
    } catch {
      // stick with status-based message
    }
    throw new Error(message);
  }

  return response.json();
}

/**
 * Trigger a file download from an authenticated endpoint.
 */
export async function apiDownload(
  path: string,
  token: string | null,
  filename: string,
): Promise<void> {
  const response = await apiFetch(path, token, { method: "GET" });

  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}