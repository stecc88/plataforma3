import { useAppStore, TOKEN_KEY } from '@/store/app-store';

/**
 * Get the current auth token.
 * Checks Zustand store first, then falls back to localStorage.
 */
function getAuthToken(): string | null {
  // Primary: read from Zustand store (fast, in-memory)
  const storeToken = useAppStore.getState().token;
  if (storeToken) return storeToken;

  // Fallback: read from localStorage (persists across page reloads)
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Fetch utility with automatic Bearer token from localStorage.
 * Returns the raw JSON response as-is from the API.
 */
export async function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      ...(options?.body && typeof options.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) {
    // If 401, clear the stored token (session expired)
    if (res.status === 401 && typeof window !== 'undefined') {
      try {
        localStorage.removeItem(TOKEN_KEY);
      } catch {
        // ignore
      }
    }
    const error = await res.json().catch(() => ({ error: 'Errore di rete' }));
    throw new Error(error.error || 'Errore del server');
  }
  return (await res.json()) as T;
}
