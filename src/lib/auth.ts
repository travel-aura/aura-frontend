// Auth token management utilities

export const saveToken = (token: string) => {
  localStorage.setItem('aura_token', token);
};

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('aura_token');
  if (!token) return null;
  // Treat an expired JWT as logged out. Keep the refresh token: refreshSession() can renew it.
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('aura_token');
      return null;
    }
  } catch {
    // Not a decodable JWT or no exp claim — trust it as-is
  }
  return token;
};

export const removeToken = () => {
  localStorage.removeItem('aura_token');
  localStorage.removeItem(REFRESH_KEY);
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

export const saveUserId = (id: string) => {
  localStorage.setItem('aura_user_id', id);
};

export const getUserId = (): string | null => {
  return localStorage.getItem('aura_user_id');
};

// ── Session refresh ──────────────────────────────────────────────────────────
// Supabase access tokens expire after about an hour. The refresh token lasts
// much longer and is swapped for a new access token via POST /auth/refresh.

const REFRESH_KEY = 'aura_refresh_token';
const REFRESH_EARLY_MS = 5 * 60 * 1000; // renew when less than 5 minutes remain

export const saveRefreshToken = (refreshToken: string) => {
  localStorage.setItem(REFRESH_KEY, refreshToken);
};

export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
};

function accessTokenExpiresAt(): number | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('aura_token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

let inFlight: Promise<string | null> | null = null;

/**
 * Renews the session if the access token is missing, expired or about to
 * expire and a refresh token is stored. Returns the current access token, or
 * null if the user is logged out. Pass force=true after a 401.
 * Concurrent calls share one request, because refresh tokens are single-use.
 */
export function refreshSession(force = false): Promise<string | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  const refreshToken = getRefreshToken();
  const expiresAt = accessTokenExpiresAt();
  const needsRefresh = force || expiresAt === null || expiresAt - Date.now() < REFRESH_EARLY_MS;

  if (!needsRefresh) return Promise.resolve(getToken());
  if (!refreshToken) return Promise.resolve(getToken());
  if (inFlight) return inFlight;

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  inFlight = (async () => {
    try {
      const res = await fetch(`${apiBase}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (res.status === 400 || res.status === 401) {
        // Refresh token is no longer valid: the user has to log in again.
        removeToken();
        return null;
      }
      if (!res.ok) return getToken(); // server hiccup: keep what we have
      const data = await res.json();
      const session = data?.session;
      if (session?.access_token) {
        saveToken(session.access_token);
        if (session.refresh_token) saveRefreshToken(session.refresh_token);
        return session.access_token as string;
      }
      return getToken();
    } catch {
      return getToken(); // offline: try again later
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}
