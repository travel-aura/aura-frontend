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
