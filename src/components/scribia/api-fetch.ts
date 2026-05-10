import { useAppStore } from '@/store/app-store';

// ─── localStorage key (must match app-store) ────────────────
const TOKEN_KEY = 'escribia_token';

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
 * Fetch utility that automatically unwraps single-key API responses.
 * For example: { essays: [...] } → [...], { stats: {...} } → {...}
 * Multi-key responses like { token, user } are returned as-is.
 *
 * Automatically includes Bearer token from localStorage (escribia_token).
 */
export async function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
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
  const json = await res.json();

  // Auto-unwrap single-key objects (e.g., { essays: [...] } → [...])
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    const keys = Object.keys(json);
    if (keys.length === 1 && keys[0] !== 'error') {
      return json[keys[0]] as T;
    }
  }

  return json as T;
}
