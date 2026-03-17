export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
        "Content-Type": "application/json",
    };

    // Add Authorization header if token exists (but not for login/register)
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('aura_token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    return headers;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include", // IMPORTANT: receive/send httpOnly cookie
        body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`);
    return data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Request failed: ${res.status}`);
    return data as T;
}

// Available API endpoints:
// - POST /auth/register
// - POST /auth/login
// - POST /auth/logout
// - GET /me
// - POST /api/auras/upload