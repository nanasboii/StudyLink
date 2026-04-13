import { api, getToken, getUser, setMessage, setSession } from '../api.js';
import { PAGES } from '../routes.js';

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
    window.location.href = PAGES.resources;
  } catch (error) {
    setMessage('authMessage', error.message);
  }
});
