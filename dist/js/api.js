import { PAGES } from '../../frontend/routes.js';

const TOKEN_KEY = 'studylinkToken';
const USER_KEY = 'studylinkUser';
let toastContainer = null;

function ensureToastContainer() {
  if (toastContainer) {
    return toastContainer;
  }

  toastContainer = document.getElementById('toastContainer');
  if (toastContainer) {
    return toastContainer;
  }

  toastContainer = document.createElement('div');
  toastContainer.id = 'toastContainer';
  toastContainer.className = 'toast-stack';
  document.body.appendChild(toastContainer);
  return toastContainer;
}

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

export function requireRoleSession(...roles) {
  const user = requireSession();
  if (!user) {
    return null;
  }

  if (!roles.includes(user.role)) {
    window.location.href = PAGES.resources;
    return null;
  }

  return user;
}

export function debounce(fn, delay = 300) {
  let timer = null;
  return (...args) => {
    if (timer) {
      window.clearTimeout(timer);
    }
    timer = window.setTimeout(() => fn(...args), delay);
  };
}

export function showToast(message, isOk = false, duration = 2400) {
  const text = String(message || '').trim();
  if (!text) {
    return;
  }

  const container = ensureToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast ${isOk ? 'toast-ok' : 'toast-error'}`;
  toast.textContent = text;
  container.appendChild(toast);

  window.setTimeout(() => {
    toast.classList.add('toast-hide');
    window.setTimeout(() => {
      if (toast.parentElement) {
        toast.parentElement.removeChild(toast);
      }
    }, 180);
  }, duration);
}

export function setMessage(id, text, isOk = false) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = text;
    element.style.color = isOk ? '#1f7a45' : '#bc2f2f';
  }

  if (text) {
    showToast(text, isOk);
  }
}
