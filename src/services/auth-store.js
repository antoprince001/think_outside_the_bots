const AUTH_SESSION_KEY = 'outside-bots:authenticated';

export const DEFAULT_USERNAME = import.meta.env.VITE_DEFAULT_USERNAME ?? '';
export const DEFAULT_PASSWORD = import.meta.env.VITE_DEFAULT_PASSWORD ?? '';
export const authConfigured = Boolean(DEFAULT_USERNAME && DEFAULT_PASSWORD);

export function isLoggedIn() {
  return sessionStorage.getItem(AUTH_SESSION_KEY) === 'true';
}

export function login(username, password) {
  if (!authConfigured) {
    return false;
  }

  const normalizedUsername = String(username ?? '').trim();
  const providedPassword = String(password ?? '');

  if (normalizedUsername === DEFAULT_USERNAME && providedPassword === DEFAULT_PASSWORD) {
    sessionStorage.setItem(AUTH_SESSION_KEY, 'true');
    return true;
  }

  return false;
}

export function logout() {
  sessionStorage.removeItem(AUTH_SESSION_KEY);
}
