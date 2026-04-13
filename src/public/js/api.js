import { PAGES } from './routes.js';

const TOKEN_KEY = 'studylinkToken';
const USER_KEY = 'studylinkUser';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function api(path, method = 'GET', body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
    }
    throw new Error(payload.message || 'Request failed');
  }

  return payload;
}

export function requireSession() {
  const token = getToken();
  const user = getUser();
  if (!token || !user) {
    window.location.href = PAGES.login;
    return null;
  }
  return user;
}

export function setMessage(id, text, isOk = false) {
  const element = document.getElementById(id);
  if (!element) {
    return;
  }
  element.textContent = text;
  element.style.color = isOk ? '#1f7a45' : '#bc2f2f';
}
