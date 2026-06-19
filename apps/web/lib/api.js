const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function apiFetch(path, options = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("sipadi_token") : null;
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) {
    const errorPayload = contentType.includes("application/json") ? await response.json() : { message: response.statusText };
    throw new Error(errorPayload.message || "Request gagal");
  }

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response;
}

export async function downloadFromApi(path, filename) {
  const response = await apiFetch(path, { method: "GET" });
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
