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

      <!-- Brand -->
      <section class="login-brand" aria-label="StudyLink sign in">
        <svg class="unimas-logo" viewBox="0 0 640 240" aria-hidden="true" role="img">
          <defs>
            <linearGradient id="unimasBlue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#214c8f" />
              <stop offset="100%" stop-color="#173d7a" />
            </linearGradient>
            <linearGradient id="unimasGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ffd861" />
              <stop offset="100%" stop-color="#f2a81f" />
            </linearGradient>
          </defs>
          <g transform="translate(8 18)">
            <path d="M133 26 98 0 63 26v14h70Z" fill="url(#unimasBlue)" />
            <path d="M98 10c-19 0-35 16-35 35 0 12 6 22 15 28l20 14 20-14c9-6 15-16 15-28 0-19-16-35-35-35Z" fill="#d92f3a" />
            <path d="M98 20c-13 0-24 11-24 24 0 8 4 15 10 19l14 9 14-9c6-4 10-11 10-19 0-13-11-24-24-24Z" fill="url(#unimasGold)" />
            <path d="M89 44c0-9 5-15 12-18-2 5-2 9 1 12 4 4 10 4 15 1-2 10-10 18-20 18-5 0-8-2-8-13Z" fill="#ff7d2a" />
            <circle cx="142" cy="58" r="16" fill="none" stroke="#173d7a" stroke-width="2.5" />
            <circle cx="142" cy="58" r="24" fill="none" stroke="#173d7a" stroke-width="1.5" opacity="0.8" />
            <circle cx="142" cy="58" r="32" fill="none" stroke="#173d7a" stroke-width="1.2" opacity="0.55" />
          </g>
          <text x="18" y="160" fill="#021A54" font-family="Josefin Sans, Trebuchet MS, sans-serif" font-size="86" font-weight="700" letter-spacing="0.5">UNIMAS</text>
          <text x="20" y="198" fill="#021A54" font-family="DM Sans, Segoe UI, sans-serif" font-size="28" font-weight="500" letter-spacing="0.9">UNIVERSITI MALAYSIA SARAWAK</text>
        </svg>
        <span class="studylink-brand">StudyLink</span>
      </section>

      <!-- Login Card -->
      <section class="login-card" aria-labelledby="loginTitle">
        <h2 id="loginTitle">Sign in to your account</h2>

        <!-- FIX: authMessage moved ABOVE form. User sees error before retrying. -->
        <p v-if="authMessage" class="message" role="alert" aria-live="assertive">
          {{ authMessage }}
        </p>

        <form class="login-form" @submit.prevent="handleLogin" novalidate>

          <label class="field">
            <span>Email</span>
            <!-- FIX: @blur trims whitespace (bypass attempt fix) -->
            <input
              type="email"
              v-model="email"
              @blur="email = email.trim()"
              autocomplete="username"
              required
              :disabled="isLoading"
            />
          </label>

          <label class="field">
            <span>Password</span>
            <div class="password-row">
              <!-- FIX: input-weak only shows after blur, not live typing -->
              <input
                :type="isPasswordHidden ? 'password' : 'text'"
                v-model="password"
                :class="{ 'input-weak': passwordTouched && password.length > 0 && password.length < 8 }"
                @blur="passwordTouched = true"
                autocomplete="current-password"
                required
                :disabled="isLoading"
              />
              <button
                class="password-toggle"
                :class="{ 'is-visible': !isPasswordHidden }"
                type="button"
                @click="togglePassword"
                :aria-label="isPasswordHidden ? 'Show password' : 'Hide password'"
                :aria-pressed="(!isPasswordHidden).toString()"
              >
                <svg class="password-icon password-icon-open" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 5c5 0 9.27 3.11 11 7-1.73 3.89-6 7-11 7S2.73 15.89 1 12c1.73-3.89 6-7 11-7Zm0 2C8.14 7 4.8 9.32 3.35 12 4.8 14.68 8.14 17 12 17s7.2-2.32 8.65-5C19.2 9.32 15.86 7 12 7Zm0 1.75A3.25 3.25 0 1 1 12 15a3.25 3.25 0 0 1 0-6.5Zm0 2A1.25 1.25 0 1 0 12 13a1.25 1.25 0 0 0 0-2.5Z" />
                </svg>
                <svg class="password-icon password-icon-closed" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m2.1 3.51 1.42-1.42 18 18-1.42 1.42-3.04-3.04A11.93 11.93 0 0 1 12 19C6.98 19 2.73 15.89 1 12a12.94 12.94 0 0 1 4.33-5.17L2.1 3.51ZM9.5 10.91l3.59 3.59A3.25 3.25 0 0 1 9.5 10.91Zm3.06-3.08L16.95 12A8.1 8.1 0 0 0 12 8.75c.2 0 .39.02.56.08ZM12 5c5 0 9.27 3.11 11 7a13.08 13.08 0 0 1-3.17 4.02l-1.45-1.45A11.07 11.07 0 0 0 21.65 12C20.2 9.32 16.86 7 13 7c-.42 0-.84.04-1.24.1L9.99 5.32C10.62 5.11 11.29 5 12 5Z" />
                </svg>
              </button>
            </div>
          </label>

          <label class="remember-row">
            <input type="checkbox" v-model="rememberMe" :disabled="isLoading" />
            <span>Remember me</span>
          </label>

          <!-- FIX: aria-busy for screen readers during load -->
          <button
            class="login-submit"
            type="submit"
            :disabled="isLoading"
            :aria-busy="isLoading"
          >
            <span v-if="isLoading" class="spinner" aria-hidden="true"></span>
            {{ isLoading ? 'Signing in…' : 'Sign In' }}
          </button>
        </form>

        <div class="login-footer-links">
          <router-link class="alt-link" to="/register">No account? Register here!</router-link>
          <span class="alt-link muted">Forgot password? Contact your administrator.</span>
        </div>
      </section>

    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api, getToken, getUser, setSession } from '@/api.js'
import { PAGES } from '@/routes.js'

const router = useRouter()

// — Form state —
const email           = ref('')
const password        = ref('')
const rememberMe      = ref(true)
const isPasswordHidden = ref(true)
const authMessage     = ref('')
const isLoading       = ref(false)
// FIX: track blur so input-weak doesn't fire immediately on focus
const passwordTouched = ref(false)

// — Constants —
const REMEMBERED_EMAIL_KEY = 'studylinkRememberedEmail'

// — Mount —
onMounted(() => {
  // FIX: guard against corrupt/missing token before redirecting
  try {
    if (getToken() && getUser()) {
      const user = getUser()
      router.push(user?.role === 'admin' ? PAGES.adminAnalytics : PAGES.resources)
      return
    }
  } catch {
    // bad stored session → stay on login
  }

  const remembered = localStorage.getItem(REMEMBERED_EMAIL_KEY)
  if (remembered) {
    email.value = remembered
    rememberMe.value = true
  }
})

// — UI —
const togglePassword = () => {
  isPasswordHidden.value = !isPasswordHidden.value
}

// — Submit —
const handleLogin = async () => {
  // FIX: double-submit guard
  if (isLoading.value) return

  authMessage.value = ''

  const currentEmail    = email.value.trim()
  const currentPassword = password.value

  // FIX: validate before any state mutation
  if (!currentEmail) {
    authMessage.value = 'Please enter your email address.'
    return
  }
  if (!currentPassword) {
    authMessage.value = 'Please enter your password.'
    return
  }

  isLoading.value = true

  // FIX: persist remember-me BEFORE await (avoids race on slow network)
  if (rememberMe.value) {
    localStorage.setItem(REMEMBERED_EMAIL_KEY, currentEmail)
  } else {
    localStorage.removeItem(REMEMBERED_EMAIL_KEY)
  }

  try {
    const result = await api('/auth/login', 'POST', {
      email: currentEmail,
      password: currentPassword
    })

    // FIX: guard missing token/user in response
    if (!result?.token || !result?.user) {
      throw new Error('Invalid response from server. Please try again.')
    }

    setSession(result.token, result.user)
    sessionStorage.setItem('studylinkShowStreakAfterLogin', '1')

    router.push(result.user?.role === 'admin' ? PAGES.adminAnalytics : PAGES.resources)
  } catch (error) {
    authMessage.value = error?.message || 'An error occurred during login.'
  } finally {
    // FIX: always reset loading — even on nav (router guards may abort)
    isLoading.value = false
  }
}
</script>

<style scoped>
/* ─── Wrapper & Background ──────────────────────────────────── */
.login-page-wrapper {
  min-height: 100vh;
  width: 100vw;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  --login-bg-image: url('/assets/login-bg.jpg');
  /* FIX: use brand palette blush-to-primary gradient */
  background: linear-gradient(180deg, #fff0f7 0%, #FFCEE3 42%, #ffb3d5 100%);
}

.login-page-wrapper::before,
.login-page-wrapper::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -2;
}

.login-page-wrapper::before {
  background-image:
    var(--login-bg-image),
    linear-gradient(180deg, #fff0f7 0%, #FFCEE3 42%, #ffb3d5 100%);
  background-size: cover;
  background-position: center top;
  background-repeat: no-repeat;
  filter: url(#posterize) saturate(1.08) contrast(1.07) brightness(1.02);
}

.login-page-wrapper::after {
  background:
    radial-gradient(110% 46% at 50% 2%, rgba(255, 206, 227, 0.45) 0%, rgba(255, 133, 187, 0.1) 50%, transparent 80%),
    radial-gradient(130% 70% at 22% 12%, rgba(255, 240, 247, 0.3) 0%, transparent 60%),
    radial-gradient(130% 70% at 82% 16%, rgba(255, 206, 227, 0.25) 0%, transparent 65%);
  mix-blend-mode: soft-light;
  opacity: 0.9;
}

/* ─── Scene layout ──────────────────────────────────────────── */
.login-scene {
  position: relative;
  width: 100vw;
  min-height: 100vh;
  margin-inline: auto;
  display: grid;
  place-items: center;
  justify-items: center;
  align-content: center;
  gap: clamp(10px, 2vh, 20px);
  overflow: hidden;
  padding: clamp(18px, 4vh, 36px) 16px;
}

/* ─── Brand ─────────────────────────────────────────────────── */
.login-brand {
  position: relative;
  z-index: 3;
  display: grid;
  justify-items: center;
  gap: 6px;
}

.unimas-logo {
  width: min(100%, 320px);
  height: auto;
  display: block;
}

.studylink-brand {
  font-family: "Josefin Sans", "Trebuchet MS", sans-serif;
  font-size: clamp(24px, 3.2vw, 44px);
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  /* FIX: brand navy #021A54 */
  color: #021A54;
}

/* ─── Card — glass panel ────────────────────────────────────── */
.login-card {
  position: relative;
  z-index: 2;
  width: min(100%, 470px);
  padding: 28px 30px 24px;
  border-radius: 24px;
  /* FIX: glass uses brand palette */
  border: 1px solid rgba(255, 255, 255, 0.68);
  background: rgba(255, 245, 250, 0.76);
  box-shadow:
    0 24px 48px rgba(2, 26, 84, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px) saturate(1.1);
  -webkit-backdrop-filter: blur(20px) saturate(1.1);
}

.login-card h2 {
  margin: 0 0 20px;
  text-align: center;
  font-family: "DM Sans", "Segoe UI", sans-serif;
  font-size: clamp(20px, 2.6vw, 26px);
  font-weight: 700;
  line-height: 1.2;
  /* FIX: navy ink */
  color: #021A54;
}

/* ─── Form ──────────────────────────────────────────────────── */
.login-form {
  display: grid;
  gap: 16px;
}

.field {
  display: grid;
  gap: 6px;
  font-size: 14px;
  color: #021A54;
}

.field span {
  font-weight: 600;
  letter-spacing: 0.01em;
}

.field input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1.5px solid rgba(2, 26, 84, 0.18);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.88);
  color: #021A54;
  font: inherit;
  font-size: 15px;
  transition: border-color 0.18s, box-shadow 0.18s;
}

.field input:focus-visible {
  outline: none;
  /* FIX: pink focus ring matches brand primary */
  border-color: #FF85BB;
  box-shadow: 0 0 0 3px rgba(255, 133, 187, 0.22);
}

.field input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* FIX: weak password uses amber, not blue */
.field input.input-weak {
  border-color: #f0a500;
  box-shadow: 0 0 0 2px rgba(240, 165, 0, 0.14);
}

/* ─── Password row ──────────────────────────────────────────── */
.password-row {
  position: relative;
  display: block;
}

.password-row input {
  padding-right: 44px;
}

.password-toggle {
  position: absolute;
  top: 50%;
  right: 6px;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 999px;
  padding: 0;
  background: transparent;
  /* FIX: navy icon color */
  color: #021A54;
  cursor: pointer;
  transition: background 0.15s;
}

.password-toggle:hover {
  background: rgba(255, 133, 187, 0.14);
}

.password-toggle:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(255, 133, 187, 0.3);
}

.password-icon {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

.password-icon-closed { display: none; }
.password-toggle.is-visible .password-icon-open  { display: none; }
.password-toggle.is-visible .password-icon-closed { display: block; }

/* ─── Remember me ───────────────────────────────────────────── */
.remember-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  font-size: 13px;
  color: #021A54;
  user-select: none;
  cursor: pointer;
}

.remember-row input {
  margin: 0;
  /* FIX: checkbox accent = brand pink */
  accent-color: #FF85BB;
  cursor: pointer;
}

/* ─── Submit button — glass primary ─────────────────────────── */
.login-submit {
  position: relative;
  width: 100%;
  height: 46px;
  margin-top: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid rgba(255, 133, 187, 0.4);
  border-radius: 2rem;
  /* FIX: pink-to-navy glass gradient replaces old purple */
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.04) 100%),
    linear-gradient(135deg, #FF85BB 0%, #e0609a 100%);
  color: #ffffff;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow:
    inset 0 2px 12px rgba(255, 255, 255, 0.2),
    0 8px 28px rgba(255, 133, 187, 0.35);
  transition: background 0.25s, transform 0.18s, box-shadow 0.18s;
}

.login-submit:hover:not(:disabled) {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.06) 100%),
    linear-gradient(135deg, #ff6da9 0%, #c94d82 100%);
  transform: translateY(-2px);
  box-shadow:
    inset 0 3px 16px rgba(255, 255, 255, 0.22),
    0 12px 36px rgba(255, 133, 187, 0.45);
}

.login-submit:active:not(:disabled) {
  transform: scale(0.97);
}

.login-submit:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
}

.login-submit:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 4px rgba(255, 133, 187, 0.4),
    inset 0 2px 12px rgba(255, 255, 255, 0.2);
}

/* FIX: spinner for loading state */
.spinner {
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

/* ─── Footer links ──────────────────────────────────────────── */
.login-footer-links {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.alt-link {
  display: inline-block;
  /* FIX: use brand primary pink for links */
  color: #FF85BB;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: color 0.15s;
}

.alt-link:hover {
  color: #e0609a;
  text-decoration: underline;
}

.alt-link.muted {
  color: #6e6e73;
  text-decoration: none;
  cursor: default;
  font-weight: 400;
}

/* ─── Error message ─────────────────────────────────────────── */
/* FIX: moved above form in template; styles match glass palette */
.message {
  margin: 0 0 16px;
  padding: 10px 14px;
  border-radius: 10px;
  /* FIX: light pink error bg aligned to brand blush */
  background: rgba(255, 206, 227, 0.35);
  border: 1px solid rgba(255, 133, 187, 0.45);
  color: #a81040;
  font-size: 13px;
  line-height: 1.4;
}

/* ─── Responsive ────────────────────────────────────────────── */
@media (max-width: 640px) {
  .login-scene {
    padding: 16px 12px;
  }

  .unimas-logo {
    width: min(100%, 260px);
  }

  .studylink-brand {
    font-size: clamp(18px, 5vw, 26px);
    letter-spacing: 0.14em;
  }

  .login-card {
    padding: 22px 18px 18px;
    border-radius: 20px;
  }

  .login-submit {
    height: 44px;
  }
}
</style>
