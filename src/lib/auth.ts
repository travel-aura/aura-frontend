// Auth token management utilities

export const saveToken = (token: string) => {
  localStorage.setItem('aura_token', token);
};

export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('aura_token');
  if (!token) return null;
  // Auto-clear expired JWTs so stale sessions don't bypass auth guards
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
