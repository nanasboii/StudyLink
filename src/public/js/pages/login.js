import { api, getToken, getUser, setMessage, setSession } from '../api.js';
import { PAGES } from '../routes.js';

const LOGIN_STREAK_STORAGE_KEY = 'studylinkLoginStreak';

if (getToken() && getUser()) {
  window.location.href = PAGES.resources;
}

const form = document.getElementById('loginForm');
const passwordInput = document.getElementById('loginPassword');
const passwordToggle = document.getElementById('toggleLoginPassword');

if (passwordInput && passwordToggle) {
  passwordToggle.addEventListener('click', () => {
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    passwordToggle.textContent = isHidden ? 'Hide' : 'Show';
    passwordToggle.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    passwordToggle.setAttribute('aria-pressed', String(isHidden));
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('authMessage', '');
  const data = new FormData(form);

  try {
    const result = await api('/auth/login', 'POST', {
      email: data.get('email'),
      password: data.get('password')
    });

    setSession(result.token, result.user);
    sessionStorage.removeItem(LOGIN_STREAK_STORAGE_KEY);

    if (result.loginStreak) {
      sessionStorage.setItem(LOGIN_STREAK_STORAGE_KEY, JSON.stringify(result.loginStreak));
    }

    window.location.href = PAGES.resources;
  } catch (error) {
    setMessage('authMessage', error.message);
  }
});
