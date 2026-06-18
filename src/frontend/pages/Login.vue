<template>
  <div class="login-page-wrapper">
    <!-- SVG filter for background posterize effect -->
    <svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;" aria-hidden="true" focusable="false">
      <filter id="posterize">
        <feColorMatrix type="saturate" values="1.12" />
        <feComponentTransfer>
          <feFuncR type="discrete" tableValues="0 0.25 0.5 0.75 1" />
          <feFuncG type="discrete" tableValues="0 0.25 0.5 0.75 1" />
          <feFuncB type="discrete" tableValues="0 0.25 0.5 0.75 1" />
        </feComponentTransfer>
        <feGaussianBlur stdDeviation="0.4" />
      </filter>
    </svg>

    <main class="login-scene">
      <!-- Brand header -->
      <header class="login-brand" aria-label="StudyLink brand">
        <svg class="brand-logo" viewBox="0 0 180 210" aria-hidden="true" focusable="false">
          <!-- Shield shape -->
          <path d="M90 8 L170 45 L170 110 C170 158 90 202 90 202 C90 202 10 158 10 110 L10 45 Z"
                fill="rgba(255,133,187,0.18)" stroke="#FF85BB" stroke-width="2.5"/>
          <!-- Book icon -->
          <rect x="55" y="72" width="70" height="56" rx="5" fill="none" stroke="#021A54" stroke-width="3"/>
          <line x1="90" y1="72" x2="90" y2="128" stroke="#021A54" stroke-width="2.5"/>
          <line x1="65" y1="88" x2="85" y2="88" stroke="#FF85BB" stroke-width="2"/>
          <line x1="65" y1="98" x2="85" y2="98" stroke="#FF85BB" stroke-width="2"/>
          <line x1="65" y1="108" x2="85" y2="108" stroke="#FF85BB" stroke-width="2"/>
          <line x1="95" y1="88" x2="115" y2="88" stroke="#FF85BB" stroke-width="2"/>
          <line x1="95" y1="98" x2="115" y2="98" stroke="#FF85BB" stroke-width="2"/>
          <line x1="95" y1="108" x2="115" y2="108" stroke="#FF85BB" stroke-width="2"/>
        </svg>
        <span class="brand-name">StudyLink</span>
        <span class="brand-sub">UNIMAS Learning Portal</span>
      </header>

      <!-- Login card -->
      <section class="login-card glass-card" aria-labelledby="loginTitle">
        <h1 id="loginTitle" class="login-title">Welcome back</h1>
        <p class="login-subtitle">Sign in to continue learning</p>

        <!-- Error / success message -->
        <transition name="msg-fade">
          <div
            v-if="authMessage"
            class="auth-message"
            :class="authMessageType"
            role="alert"
            aria-live="polite"
          >
            <span class="auth-message-icon" aria-hidden="true">
              {{ authMessageType === 'error' ? '⚠' : '✓' }}
            </span>
            {{ authMessage }}
          </div>
        </transition>

        <form class="login-form" @submit.prevent="handleLogin" novalidate>
          <!-- Email -->
          <div class="field-group">
            <label class="field-label" for="login-email">Email</label>
            <div class="input-wrap" :class="{ 'input-wrap--focus': emailFocused, 'input-wrap--error': emailError }">
              <svg class="field-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
              <input
                id="login-email"
                type="email"
                v-model="email"
                @blur="email = email.trim(); emailFocused = false; validateEmailField()"
                @focus="emailFocused = true; emailError = ''"
                autocomplete="username"
                placeholder="your@email.com"
                required
              />
            </div>
            <span v-if="emailError" class="field-error" role="alert">{{ emailError }}</span>
          </div>

          <!-- Password -->
          <div class="field-group">
            <label class="field-label" for="login-password">Password</label>
            <div class="input-wrap" :class="{ 'input-wrap--focus': passwordFocused, 'input-wrap--weak': password.length > 0 && password.length < 8 }">
              <svg class="field-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
              <input
                id="login-password"
                :type="isPasswordHidden ? 'password' : 'text'"
                v-model="password"
                @focus="passwordFocused = true"
                @blur="passwordFocused = false"
                autocomplete="current-password"
                placeholder="••••••••"
                required
              />
              <button
                class="pw-toggle"
                type="button"
                @click="togglePassword"
                :aria-label="isPasswordHidden ? 'Show password' : 'Hide password'"
                :aria-pressed="String(!isPasswordHidden)"
              >
                <!-- Eye open -->
                <svg v-if="isPasswordHidden" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5c5 0 9.27 3.11 11 7-1.73 3.89-6 7-11 7S2.73 15.89 1 12c1.73-3.89 6-7 11-7Zm0 2C8.14 7 4.8 9.32 3.35 12 4.8 14.68 8.14 17 12 17s7.2-2.32 8.65-5C19.2 9.32 15.86 7 12 7Zm0 1.75A3.25 3.25 0 1 1 12 15a3.25 3.25 0 0 1 0-6.5Zm0 2A1.25 1.25 0 1 0 12 13a1.25 1.25 0 0 0 0-2.5Z"/>
                </svg>
                <!-- Eye closed -->
                <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m2.1 3.51 1.42-1.42 18 18-1.42 1.42-3.04-3.04A11.93 11.93 0 0 1 12 19C6.98 19 2.73 15.89 1 12a12.94 12.94 0 0 1 4.33-5.17L2.1 3.51ZM9.5 10.91l3.59 3.59A3.25 3.25 0 0 1 9.5 10.91Zm3.06-3.08L16.95 12A8.1 8.1 0 0 0 12 8.75c.2 0 .39.02.56.08ZM12 5c5 0 9.27 3.11 11 7a13.08 13.08 0 0 1-3.17 4.02l-1.45-1.45A11.07 11.07 0 0 0 21.65 12C20.2 9.32 16.86 7 13 7c-.42 0-.84.04-1.24.1L9.99 5.32C10.62 5.11 11.29 5 12 5Z"/>
                </svg>
              </button>
            </div>
            <!-- Weak password hint -->
            <span v-if="password.length > 0 && password.length < 8" class="field-hint">
              Password too short (min 8 chars)
            </span>
          </div>

          <!-- Remember me row -->
          <div class="remember-row">
            <label class="checkbox-label">
              <input type="checkbox" v-model="rememberMe" class="checkbox-input" />
              <span class="checkbox-custom" aria-hidden="true"></span>
              <span>Remember me</span>
            </label>
          </div>

          <!-- Submit -->
          <button
            class="btn-submit"
            type="submit"
            :disabled="isLoading"
            :aria-busy="isLoading"
          >
            <span v-if="isLoading" class="btn-spinner" aria-hidden="true"></span>
            <span>{{ isLoading ? 'Signing in…' : 'Sign In' }}</span>
          </button>
        </form>

        <!-- Footer links -->
        <footer class="login-footer">
          <router-link class="footer-link" to="/register">No account? Register →</router-link>
          <span class="footer-link footer-link--muted">Forgot password? Contact admin.</span>
        </footer>
      </section>

      <!-- Streak chip — shown after loading streak data -->
      <transition name="streak-pop">
        <div v-if="streakCount > 0" class="streak-chip glass-chip" aria-label="Login streak">
          <span class="streak-flame">🔥</span>
          <span class="streak-count">{{ streakCount }}</span>
          <span class="streak-label">day streak</span>
        </div>
      </transition>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api, getToken, getUser, setSession } from '@/api.js';
import { PAGES } from '@/routes.js';

const router = useRouter();

// ── Form state ──────────────────────────────────────────
const email           = ref('');
const password        = ref('');
const rememberMe      = ref(true);
const isPasswordHidden = ref(true);
const isLoading       = ref(false);

// ── Validation state ────────────────────────────────────
const emailFocused    = ref(false);
const passwordFocused = ref(false);
const emailError      = ref('');

// ── Feedback message ────────────────────────────────────
// FIX: split message + type so we can style error vs success differently
const authMessage     = ref('');
const authMessageType = ref('error'); // 'error' | 'success'

let msgTimer = null;

const showMessage = (msg, type = 'error', autoDismiss = false) => {
  authMessage.value = msg;
  authMessageType.value = type;
  if (autoDismiss) {
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { authMessage.value = ''; }, 4000);
  }
};

// ── Streak state ────────────────────────────────────────
const streakCount    = ref(0);
const loggedInDates  = ref(new Set());

const LOGIN_STREAK_STORAGE_KEY = 'studylinkLoginStreak';
const REMEMBERED_EMAIL_KEY     = 'studylinkRememberedEmail';

// ── On mount ────────────────────────────────────────────
onMounted(() => {
  // FIX: guard — redirect if already logged in
  if (getToken() && getUser()) {
    const user = getUser();
    router.replace(user?.role === 'admin' ? PAGES.adminAnalytics : PAGES.resources);
    return;
  }

  loadLoginStreak();

  // Restore remembered email
  try {
    const saved = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (saved) {
      email.value = saved;
      rememberMe.value = true;
    }
  } catch {
    // localStorage blocked — silently ignore
  }
});

// ── Password toggle ──────────────────────────────────────
const togglePassword = () => {
  isPasswordHidden.value = !isPasswordHidden.value;
};

// ── Email validation ─────────────────────────────────────
const validateEmailField = () => {
  if (!email.value) {
    emailError.value = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    emailError.value = 'Enter a valid email address.';
  } else {
    emailError.value = '';
  }
};

// ── Streak loader ────────────────────────────────────────
const loadLoginStreak = () => {
  try {
    // FIX: use localStorage not sessionStorage so streak persists across tabs
    const raw = localStorage.getItem(LOGIN_STREAK_STORAGE_KEY);
    if (!raw) return;
    const streak = JSON.parse(raw);
    streakCount.value = streak.count ?? 0;
    if (Array.isArray(streak.dates)) {
      loggedInDates.value = new Set(streak.dates);
    }
  } catch {
    // Corrupt data — reset silently
    streakCount.value = 0;
  }
};

// ── Login submit ─────────────────────────────────────────
const handleLogin = async () => {
  // FIX: hard guard against double-submit
  if (isLoading.value) return;

  authMessage.value = '';

  const currentEmail    = email.value.trim();
  const currentPassword = password.value;

  // Client-side validation first — skip API if invalid
  if (!currentEmail) {
    emailError.value = 'Email is required.';
    showMessage('Please fill in all fields.');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentEmail)) {
    emailError.value = 'Enter a valid email address.';
    showMessage('Enter a valid email address.');
    return;
  }
  if (!currentPassword) {
    showMessage('Password is required.');
    return;
  }

  isLoading.value = true;

  // Persist or clear remembered email
  try {
    if (rememberMe.value) {
      localStorage.setItem(REMEMBERED_EMAIL_KEY, currentEmail);
    } else {
      localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    }
  } catch {
    // localStorage blocked — continue anyway
  }

  try {
    const result = await api('/auth/login', 'POST', {
      email: currentEmail,
      password: currentPassword,
    });

    // FIX: null guard — result or result.user could be undefined on bad API
    if (!result?.token || !result?.user) {
      throw new Error('Unexpected server response. Try again.');
    }

    setSession(result.token, result.user);

    // Signal Topbar to show streak modal on next page
    try {
      sessionStorage.setItem('studylinkShowStreakAfterLogin', '1');
    } catch { /* ignore */ }

    // FIX: use router.replace not push — prevent back-button returning to login
    router.replace(result.user.role === 'admin' ? PAGES.adminAnalytics : PAGES.resources);

  } catch (error) {
    // FIX: never expose raw error stack to user
    const msg = error?.message || 'Login failed. Please try again.';
    showMessage(msg, 'error');
  } finally {
    // FIX: always reset loading, even if redirect happened
    isLoading.value = false;
  }
};
</script>

<style scoped>
/* ── Screen reader only ─────────────────────────────── */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* ── Page wrapper ───────────────────────────────────── */
.login-page-wrapper {
  min-height: 100vh;
  width: 100vw;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  background: linear-gradient(155deg, #ffeef6 0%, #ffd6e8 45%, #ffcde2 100%);
}

/* Blurred bg blobs */
.login-page-wrapper::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  background:
    radial-gradient(ellipse 70% 50% at 20% 15%, rgba(255, 133, 187, 0.22) 0%, transparent 70%),
    radial-gradient(ellipse 60% 45% at 80% 80%, rgba(2, 26, 84, 0.10) 0%, transparent 65%),
    radial-gradient(ellipse 50% 40% at 55% 50%, rgba(255, 206, 227, 0.30) 0%, transparent 60%);
}

/* ── Scene ──────────────────────────────────────────── */
.login-scene {
  position: relative;
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(14px, 2.5vh, 24px);
  padding: clamp(20px, 4vh, 40px) 16px;
}

/* ── Brand header ───────────────────────────────────── */
.login-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.brand-logo {
  width: 64px;
  height: 74px;
  filter: drop-shadow(0 4px 12px rgba(255, 133, 187, 0.35));
}

.brand-name {
  font-family: 'Josefin Sans', 'Trebuchet MS', sans-serif;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--ink, #021A54);
  line-height: 1.1;
}

.brand-sub {
  font-size: 11px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--ink-muted, #6e6e73);
}

/* ── Glass card ─────────────────────────────────────── */
.glass-card {
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(24px) saturate(1.1);
  -webkit-backdrop-filter: blur(24px) saturate(1.1);
  box-shadow:
    0 8px 32px rgba(2, 26, 84, 0.10),
    0 2px 8px rgba(255, 133, 187, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.90);
}

.login-card {
  width: min(100%, 420px);
  border-radius: 24px;
  padding: clamp(24px, 4vw, 36px);
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── Card headings ──────────────────────────────────── */
.login-title {
  font-family: 'Josefin Sans', 'Trebuchet MS', sans-serif;
  font-size: clamp(22px, 5vw, 28px);
  font-weight: 700;
  color: var(--ink, #021A54);
  margin: 0 0 4px;
  letter-spacing: 0.3px;
}

.login-subtitle {
  font-size: 14px;
  color: var(--ink-muted, #6e6e73);
  margin: 0 0 20px;
}

/* ── Auth message ───────────────────────────────────── */
.auth-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 500;
  margin-bottom: 16px;
}

.auth-message.error {
  background: rgba(255, 59, 48, 0.09);
  border: 1px solid rgba(255, 59, 48, 0.22);
  color: #c0392b;
}

.auth-message.success {
  background: rgba(52, 199, 89, 0.09);
  border: 1px solid rgba(52, 199, 89, 0.22);
  color: #1a7a35;
}

.auth-message-icon {
  font-size: 15px;
  flex-shrink: 0;
}

/* ── Form ───────────────────────────────────────────── */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Field group ────────────────────────────────────── */
.field-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink, #021A54);
  letter-spacing: 0.2px;
}

/* ── Input wrap ─────────────────────────────────────── */
.input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  border-radius: 12px;
  border: 1.5px solid var(--theme-border, #e0e0e0);
  background: rgba(255, 255, 255, 0.80);
  transition: border-color 0.18s, box-shadow 0.18s;
  overflow: hidden;
}

.input-wrap--focus {
  border-color: var(--primary, #FF85BB);
  box-shadow: 0 0 0 3px rgba(255, 133, 187, 0.18);
}

.input-wrap--error {
  border-color: #e74c3c;
  box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.10);
}

/* FIX: weak password visual cue via class on wrapper, not input */
.input-wrap--weak {
  border-color: #f39c12;
  box-shadow: 0 0 0 3px rgba(243, 156, 18, 0.10);
}

.field-icon {
  position: absolute;
  left: 12px;
  width: 16px;
  height: 16px;
  fill: var(--ink-muted, #6e6e73);
  pointer-events: none;
  flex-shrink: 0;
}

.input-wrap input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 11px 12px 11px 36px;
  font-size: 14.5px;
  color: var(--ink, #021A54);
  outline: none;
  width: 100%;
  /* FIX: remove red border from browser native validation */
  box-shadow: none;
}

.input-wrap input::placeholder {
  color: #bbb;
}

/* ── Password toggle ────────────────────────────────── */
.pw-toggle {
  background: none;
  border: none;
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  color: var(--ink-muted, #6e6e73);
  border-radius: 0 10px 10px 0;
  transition: color 0.15s;
  flex-shrink: 0;
}

.pw-toggle:hover {
  color: var(--primary, #FF85BB);
}

.pw-toggle svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

/* ── Inline hints/errors ────────────────────────────── */
.field-error {
  font-size: 12px;
  color: #e74c3c;
  padding-left: 2px;
}

.field-hint {
  font-size: 12px;
  color: #f39c12;
  padding-left: 2px;
}

/* ── Remember me ────────────────────────────────────── */
.remember-row {
  margin-top: 2px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13.5px;
  color: var(--ink, #021A54);
  user-select: none;
}

.checkbox-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

/* FIX: custom checkbox — native checkbox hidden, custom styled */
.checkbox-custom {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1.5px solid var(--theme-border, #e0e0e0);
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-color 0.15s, background 0.15s;
  position: relative;
}

.checkbox-input:checked + .checkbox-custom {
  border-color: var(--primary, #FF85BB);
  background: var(--primary, #FF85BB);
}

.checkbox-input:checked + .checkbox-custom::after {
  content: '';
  display: block;
  width: 5px;
  height: 9px;
  border: 2px solid #fff;
  border-top: none;
  border-left: none;
  transform: rotate(45deg) translate(-1px, -1px);
}

.checkbox-input:focus-visible + .checkbox-custom {
  outline: 2px solid var(--primary, #FF85BB);
  outline-offset: 2px;
}

/* ── Submit button ──────────────────────────────────── */
.btn-submit {
  margin-top: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 13px 24px;
  border: none;
  border-radius: 12px;
  background: var(--primary, #FF85BB);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.3px;
  cursor: pointer;
  transition: background 0.18s, box-shadow 0.18s, transform 0.12s;
  box-shadow: 0 4px 14px rgba(255, 133, 187, 0.38);
}

.btn-submit:hover:not(:disabled) {
  background: var(--primary-hover, #ff6da9);
  box-shadow: 0 6px 18px rgba(255, 133, 187, 0.48);
}

.btn-submit:active:not(:disabled) {
  transform: scale(0.97);
}

.btn-submit:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* ── Spinner ────────────────────────────────────────── */
.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Footer links ───────────────────────────────────── */
.login-footer {
  margin-top: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.footer-link {
  font-size: 13.5px;
  color: var(--primary, #FF85BB);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.15s;
}

.footer-link:hover {
  color: var(--primary-hover, #ff6da9);
  text-decoration: underline;
}

.footer-link--muted {
  color: var(--ink-muted, #6e6e73);
  font-size: 12.5px;
  cursor: default;
}

.footer-link--muted:hover {
  color: var(--ink-muted, #6e6e73);
  text-decoration: none;
}

/* ── Streak chip ────────────────────────────────────── */
.glass-chip {
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid rgba(255, 255, 255, 0.80);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 4px 16px rgba(2, 26, 84, 0.08), inset 0 1px 0 rgba(255,255,255,0.90);
}

.streak-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 50px;
}

.streak-flame {
  font-size: 18px;
  line-height: 1;
}

.streak-count {
  font-size: 18px;
  font-weight: 800;
  color: var(--ink, #021A54);
  line-height: 1;
}

.streak-label {
  font-size: 12px;
  color: var(--ink-muted, #6e6e73);
  font-weight: 500;
}

/* ── Transitions ────────────────────────────────────── */
.msg-fade-enter-active,
.msg-fade-leave-active {
  transition: opacity 0.22s, transform 0.22s;
}

.msg-fade-enter-from,
.msg-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.streak-pop-enter-active {
  transition: opacity 0.35s, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.streak-pop-enter-from {
  opacity: 0;
  transform: scale(0.7);
}

/* ── Responsive ─────────────────────────────────────── */
@media (max-width: 480px) {
  .login-card {
    border-radius: 18px;
    padding: 20px 18px;
  }

  .brand-logo {
    width: 52px;
    height: 60px;
  }

  .brand-name {
    font-size: 22px;
  }
}

/* ── Reduced motion ─────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .btn-spinner {
    animation: none;
    opacity: 0.6;
  }

  .msg-fade-enter-active,
  .msg-fade-leave-active,
  .streak-pop-enter-active {
    transition: none;
  }
}
</style>
