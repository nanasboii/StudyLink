<template>
  <div class="login-wrapper">
    <!-- SVG posterize filter -->
    <svg style="position:absolute;width:0;height:0" aria-hidden="true">
      <filter id="posterize">
        <feColorMatrix type="saturate" values="1.12"/>
        <feComponentTransfer>
          <feFuncR type="discrete" tableValues="0 0.25 0.5 0.75 1"/>
          <feFuncG type="discrete" tableValues="0 0.25 0.5 0.75 1"/>
          <feFuncB type="discrete" tableValues="0 0.25 0.5 0.75 1"/>
        </feComponentTransfer>
        <feGaussianBlur stdDeviation="0.4"/>
      </filter>
    </svg>

    <main class="login-scene">
      <!-- Brand -->
      <header class="login-brand" aria-label="StudyLink">
        <svg class="brand-logo" viewBox="0 0 180 210" aria-hidden="true">
          <path d="M90 8 L170 45 L170 110 C170 158 90 202 90 202 C90 202 10 158 10 110 L10 45 Z"
                fill="rgba(255,133,187,0.18)" stroke="#FF85BB" stroke-width="2.5"/>
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

      <!-- Card -->
      <section class="login-card glass-card" aria-labelledby="loginTitle">
        <h1 id="loginTitle" class="login-title">Welcome back</h1>
        <p class="login-subtitle">Sign in to continue learning</p>

        <Transition name="msg-fade">
          <div
            v-if="authMessage"
            class="auth-message"
            :class="authMessageType"
            role="alert"
            aria-live="polite"
          >
            <span aria-hidden="true">{{ authMessageType === 'error' ? '⚠' : '✓' }}</span>
            {{ authMessage }}
          </div>
        </Transition>

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
                @blur="email = email.trim(); emailFocused = false; validateEmail()"
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
            <div class="input-wrap" :class="{ 'input-wrap--focus': passwordFocused }">
              <svg class="field-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
              </svg>
              <input
                id="login-password"
                :type="showPassword ? 'text' : 'password'"
                v-model="password"
                @focus="passwordFocused = true"
                @blur="passwordFocused = false"
                autocomplete="current-password"
                placeholder="••••••••"
                required
              />
              <button class="pw-toggle" type="button" @click="showPassword = !showPassword"
                :aria-label="showPassword ? 'Hide password' : 'Show password'">
                <svg v-if="!showPassword" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5c5 0 9.27 3.11 11 7-1.73 3.89-6 7-11 7S2.73 15.89 1 12c1.73-3.89 6-7 11-7Zm0 2C8.14 7 4.8 9.32 3.35 12 4.8 14.68 8.14 17 12 17s7.2-2.32 8.65-5C19.2 9.32 15.86 7 12 7Zm0 1.75A3.25 3.25 0 1 1 12 15a3.25 3.25 0 0 1 0-6.5Z"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m2.1 3.51 1.42-1.42 18 18-1.42 1.42-3.04-3.04A11.93 11.93 0 0 1 12 19C6.98 19 2.73 15.89 1 12a12.94 12.94 0 0 1 4.33-5.17L2.1 3.51Zm9.94 6.87 3.59 3.59A3.25 3.25 0 0 1 9.5 10.91Z"/>
                </svg>
              </button>
            </div>
            <span v-if="password.length > 0 && password.length < 8" class="field-hint">Min 8 characters</span>
          </div>

          <!-- Remember -->
          <div class="remember-row">
            <label class="checkbox-label">
              <input type="checkbox" v-model="rememberMe" class="checkbox-input"/>
              <span class="checkbox-custom" aria-hidden="true"></span>
              <span>Remember me</span>
            </label>
          </div>

          <button class="btn-submit" type="submit" :disabled="isLoading" :aria-busy="isLoading">
            <span v-if="isLoading" class="btn-spinner" aria-hidden="true"></span>
            <span>{{ isLoading ? 'Signing in…' : 'Sign In' }}</span>
          </button>
        </form>

        <footer class="login-footer">
          <router-link class="footer-link" to="/register">No account? Register →</router-link>
          <span class="footer-link footer-link--muted">Forgot password? Contact admin.</span>
        </footer>
      </section>

      <!-- Streak chip -->
      <Transition name="streak-pop">
        <div v-if="streakCount > 0" class="streak-chip glass-chip" aria-label="`${streakCount}-day login streak`">
          <span aria-hidden="true">🔥</span>
          <span class="streak-count">{{ streakCount }}</span>
          <span class="streak-label">day streak</span>
        </div>
      </Transition>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { api, getToken, getUser, setSession } from '@/api.js'
import { PAGES } from '@/routes.js'

const router = useRouter()

const email          = ref('')
const password       = ref('')
const rememberMe     = ref(true)
const showPassword   = ref(false)
const isLoading      = ref(false)
const emailFocused   = ref(false)
const passwordFocused = ref(false)
const emailError     = ref('')
const authMessage    = ref('')
const authMessageType = ref('error')
const streakCount    = ref(0)

let msgTimer = null

const showMessage = (msg, type = 'error', auto = false) => {
  authMessage.value     = msg
  authMessageType.value = type
  if (auto) {
    clearTimeout(msgTimer)
    msgTimer = setTimeout(() => { authMessage.value = '' }, 4000)
  }
}

const validateEmail = () => {
  if (!email.value.trim()) {
    emailError.value = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    emailError.value = 'Enter a valid email.'
  } else {
    emailError.value = ''
  }
}

// FIX: load streak from localStorage, not API on login page
const loadLoginStreak = () => {
  try {
    const raw = localStorage.getItem('studylinkLoginStreak')
    if (raw) {
      const data = JSON.parse(raw)
      streakCount.value = Number(data?.count ?? 0)
    }
  } catch { streakCount.value = 0 }
}

onMounted(() => {
  // FIX: redirect if already logged in
  if (getToken() && getUser()) {
    const u = getUser()
    router.replace(u?.role === 'admin' ? PAGES.adminAnalytics : PAGES.resources)
    return
  }
  loadLoginStreak()
  // Restore remembered email
  try {
    const saved = localStorage.getItem('studylinkRememberedEmail')
    if (saved) { email.value = saved; rememberMe.value = true }
  } catch { /* blocked */ }
})

onUnmounted(() => { clearTimeout(msgTimer) })

const handleLogin = async () => {
  validateEmail()
  if (emailError.value) return
  // FIX: trim whitespace before submit
  if (!email.value.trim() || !password.value) {
    showMessage('Enter email and password.')
    return
  }
  isLoading.value = true
  authMessage.value = ''
  try {
    const result = await api('/auth/login', 'POST', {
      email:    email.value.trim().toLowerCase(),
      password: password.value,
    })
    if (!result?.token || !result?.user) {
      throw new Error('Login response invalid. Try again.')
    }
    // FIX: save/clear remembered email based on checkbox
    try {
      if (rememberMe.value) {
        localStorage.setItem('studylinkRememberedEmail', email.value.trim().toLowerCase())
      } else {
        localStorage.removeItem('studylinkRememberedEmail')
      }
    } catch { /* blocked */ }

    setSession(result.token, result.user)
    try { sessionStorage.setItem('studylinkShowStreakAfterLogin', '1') } catch { /* blocked */ }
    // FIX: replace not push — no back to login
    router.replace(result.user.role === 'admin' ? PAGES.adminAnalytics : PAGES.resources)
  } catch (err) {
    showMessage(err?.message || 'Login failed. Try again.')
  } finally {
    // FIX: always reset loading
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  width: 100vw;
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #fff0f7 0%, #FFCEE3 50%, #ffb3d5 100%);
}
.login-wrapper::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('/assets/login-bg.jpg');
  background-size: cover;
  background-position: center top;
  background-repeat: no-repeat;
  filter: url(#posterize) saturate(1.08);
  z-index: 0;
  pointer-events: none;
}

.login-scene {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: clamp(14px, 2.5vh, 24px);
  padding: clamp(20px, 4vh, 40px) 16px;
}

/* Brand */
.login-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.brand-logo {
  width: 64px;
  height: 74px;
  filter: drop-shadow(0 4px 12px rgba(255,133,187,0.35));
}
.brand-name {
  font-size: 26px;
  font-weight: 800;
  color: #021A54;
  letter-spacing: -0.03em;
}
.brand-sub {
  font-size: 11px;
  font-weight: 600;
  color: #FF85BB;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* Glass Card */
.glass-card {
  width: min(400px, 100%);
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 2px solid #021A54;
  border-radius: 24px;
  padding: 32px 28px;
  box-shadow: 0 20px 60px rgba(2, 26, 84, 0.12);
}

.login-title {
  margin: 0 0 4px;
  font-size: 22px;
  font-weight: 800;
  color: #021A54;
}
.login-subtitle {
  margin: 0 0 20px;
  font-size: 13px;
  color: #6e6e73;
}

/* Auth message */
.auth-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 16px;
}
.auth-message.error {
  background: rgba(255, 133, 187, 0.15);
  border: 1px solid #FF85BB;
  color: #021A54;
}
.auth-message.success {
  background: rgba(34, 134, 82, 0.08);
  border: 1px solid rgba(34, 134, 82, 0.3);
  color: #1a6b40;
}

/* Form */
.login-form { display: flex; flex-direction: column; gap: 16px }

.field-group { display: flex; flex-direction: column; gap: 6px }
.field-label { font-size: 12px; font-weight: 700; color: #021A54; text-transform: uppercase; letter-spacing: 0.05em }

.input-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1.5px solid #e0e0e0;
  border-radius: 10px;
  padding: 10px 12px;
  background: #fff;
  transition: border-color 150ms;
}
.input-wrap--focus  { border-color: #FF85BB; box-shadow: 0 0 0 3px rgba(255,133,187,0.15) }
.input-wrap--error  { border-color: #FF85BB }

.field-icon { width: 16px; height: 16px; fill: #FF85BB; flex-shrink: 0 }

.input-wrap input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: #021A54;
  background: transparent;
  min-width: 0;
}
.input-wrap input::placeholder { color: #aaa }

.pw-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
}
.pw-toggle svg { width: 16px; height: 16px; fill: #6e6e73 }
.pw-toggle:hover svg { fill: #FF85BB }

.field-error { font-size: 11px; color: #FF85BB; font-weight: 600 }
.field-hint  { font-size: 11px; color: #6e6e73 }

.remember-row { margin-top: -4px }
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #021A54;
}
.checkbox-input { display: none }
.checkbox-custom {
  width: 16px;
  height: 16px;
  border: 2px solid #FFCEE3;
  border-radius: 4px;
  background: #fff;
  transition: all 150ms;
  flex-shrink: 0;
}
.checkbox-input:checked + .checkbox-custom {
  background: #FF85BB;
  border-color: #FF85BB;
}

.btn-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px;
  border: 2px solid #021A54;
  border-radius: 12px;
  background: #FF85BB;
  color: #021A54;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: background 150ms, transform 120ms;
}
.btn-submit:hover:not(:disabled) { background: #ff6da9 }
.btn-submit:active { transform: scale(0.97) }
.btn-submit:disabled { opacity: 0.65; cursor: not-allowed }

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(2,26,84,0.25);
  border-top-color: #021A54;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg) } }

.login-footer {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 20px;
  text-align: center;
}
.footer-link {
  font-size: 13px;
  color: #FF85BB;
  font-weight: 600;
  text-decoration: none;
  transition: color 120ms;
}
.footer-link:hover { color: #021A54 }
.footer-link--muted { color: #6e6e73; font-weight: 400 }

/* Streak chip */
.glass-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(12px);
  border: 2px solid #FF85BB;
  border-radius: 999px;
  box-shadow: 0 4px 16px rgba(255,133,187,0.2);
}
.streak-count { font-size: 16px; font-weight: 800; color: #021A54 }
.streak-label { font-size: 12px; font-weight: 600; color: #FF85BB }

/* Transitions */
.msg-fade-enter-active, .msg-fade-leave-active { transition: opacity 0.25s, transform 0.25s }
.msg-fade-enter-from, .msg-fade-leave-to { opacity: 0; transform: translateY(-6px) }
.streak-pop-enter-active { transition: opacity 0.4s 0.3s, transform 0.4s 0.3s }
.streak-pop-enter-from { opacity: 0; transform: scale(0.8) translateY(10px) }

@media (prefers-reduced-motion: reduce) {
  .btn-spinner { animation: none }
  .msg-fade-enter-active, .msg-fade-leave-active,
  .streak-pop-enter-active { transition: none }
}
</style>