import { api, getToken, getUser, setMessage, setSession } from '../api.js';
import { PAGES } from '../routes.js';

const LOGIN_STREAK_STORAGE_KEY = 'studylinkLoginStreak';
const REMEMBERED_EMAIL_KEY = 'studylinkRememberedEmail';

if (getToken() && getUser()) {
  window.location.href = PAGES.resources;
}

const form = document.getElementById('loginForm');
const passwordInput = document.getElementById('loginPassword');
const passwordToggle = document.getElementById('toggleLoginPassword');
const rememberMe = document.getElementById('rememberMe');
const emailInput = form ? form.querySelector('input[name="email"]') : null;

if (emailInput) {
  const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
  if (rememberedEmail) {
    emailInput.value = rememberedEmail;
    if (rememberMe) {
      rememberMe.checked = true;
    }
  }
}

if (passwordInput && passwordToggle) {
  passwordToggle.addEventListener('click', () => {
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    passwordToggle.classList.toggle('is-visible', isHidden);
    passwordToggle.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');
    passwordToggle.setAttribute('aria-pressed', String(isHidden));
  });
}

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage('authMessage', '');

    const data = new FormData(form);
    const email = String(data.get('email') || '').trim();

    if (rememberMe) {
      if (rememberMe.checked && email) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
    }

    try {
      const result = await api('/auth/login', 'POST', {
        email,
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
}
