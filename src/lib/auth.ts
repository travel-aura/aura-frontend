// Auth token management utilities

export const saveToken = (token: string) => {
  localStorage.setItem('aura_token', token);
};

export const getToken = (): string | null => {
  return localStorage.getItem('aura_token');
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
