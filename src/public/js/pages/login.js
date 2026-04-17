import { api, getToken, getUser, setMessage, setSession } from '../api.js';
import { PAGES } from '../routes.js';

const LOGIN_STREAK_STORAGE_KEY = 'studylinkLoginStreak';

if (getToken() && getUser()) {
  window.location.href = PAGES.resources;
}

const form = document.getElementById('loginForm');

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

    if (result.loginStreak?.shouldShow) {
      sessionStorage.setItem(LOGIN_STREAK_STORAGE_KEY, JSON.stringify(result.loginStreak));
    }

    window.location.href = PAGES.resources;
  } catch (error) {
    setMessage('authMessage', error.message);
  }
});
