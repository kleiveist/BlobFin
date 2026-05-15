const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export interface BackendHealth {
  status?: string;
  [key: string]: unknown;
}

export async function getBackendHealth(signal?: AbortSignal): Promise<BackendHealth> {
  const response = await fetch(`${API_BASE_URL}/health`, { signal });
  if (!response.ok) {
    throw new Error(`Backend health check failed with HTTP ${response.status}`);
  }
  return response.json() as Promise<BackendHealth>;
}

export async function postJson<TResponse>(path: string, payload: unknown, signal?: AbortSignal): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Backend request failed with HTTP ${response.status}`);
  }
  return data as TResponse;
}
