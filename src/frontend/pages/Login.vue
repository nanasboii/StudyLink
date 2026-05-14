<template>
  <div class="login-page-wrapper">
    
    <svg xmlns="http://www.w3.org/2000/svg" style="position: absolute; width:0; height:0;" aria-hidden="true" focusable="false">
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
      <div class="login-scene-art" aria-hidden="true">
        <span class="scene-cloud scene-cloud-left"></span>
        <span class="scene-cloud scene-cloud-right"></span>
        <span class="scene-sun"></span>
        <span class="scene-lake"></span>
        <span class="scene-lake-glow"></span>
        <span class="scene-hill scene-hill-left"></span>
        <span class="scene-hill scene-hill-right"></span>
        <span class="scene-campus scene-campus-left"></span>
        <span class="scene-campus scene-campus-center"></span>
        <span class="scene-tower"></span>
        <span class="scene-bridge"></span>
        <span class="scene-tree scene-tree-left"></span>
        <span class="scene-tree scene-tree-right"></span>
      </div>

      <section class="login-brand" aria-label="UNIMAS sign in branding">
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

          <text x="18" y="160" fill="#214c8f" font-family="Josefin Sans, Trebuchet MS, sans-serif" font-size="86" font-weight="700" letter-spacing="0.5">UNIMAS</text>
          <text x="20" y="198" fill="#214c8f" font-family="DM Sans, Segoe UI, sans-serif" font-size="28" font-weight="500" letter-spacing="0.9">UNIVERSITI MALAYSIA SARAWAK</text>
        </svg>
        <span class="studylink-brand">StudyLink</span>
      </section>

      <section class="login-card" aria-labelledby="loginTitle">
        <h2 id="loginTitle">Sign in to your account</h2>
        
        <form v-if="!requires2FA" class="login-form" @submit.prevent="handleLogin" novalidate>
          <label class="field">
            <span>Email</span>
            <input type="email" v-model="email" autocomplete="username" required />
          </label>

          <label class="field">
            <span>Password</span>
            <div class="password-row">
              <input 
                :type="isPasswordHidden ? 'password' : 'text'" 
                v-model="password" 
                autocomplete="current-password" 
                required 
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
            <input type="checkbox" v-model="rememberMe" />
            <span>Remember me</span>
          </label>

          <button class="primary login-submit" type="submit">Sign In</button>
        </form>

        <form v-else class="login-form otp-form" @submit.prevent="handleVerifyOTP" novalidate>
          <p class="otp-instructions">We've sent a one-time password to your email. Please enter it below.</p>
          <label class="field">
            <span>OTP Code</span>
            <input type="text" v-model="otp" required placeholder="123456" />
          </label>
          <button class="primary login-submit" type="submit">Verify OTP</button>
          
          <div class="otp-actions">
            <button 
              class="resend-btn" 
              type="button" 
              @click="handleResendOTP"
              :disabled="!canResendOTP"
            >
              {{ canResendOTP ? 'Resend OTP' : `Resend in ${resendCountdown}s` }}
            </button>
            <button class="secondary back-btn" type="button" @click="requires2FA = false; authMessage = ''">Back to Login</button>
          </div>
        </form>

        <div style="display:flex; gap:12px; align-items:center; justify-content:space-between; margin-top:12px;">
          <router-link class="alt-link" to="/register">No account? Register here!</router-link>
          <router-link class="alt-link" to="/forgot-password">Forgot password?</router-link>
        </div>
        
        <p v-if="authMessage" class="message">{{ authMessage }}</p>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api, getToken, getUser, setSession } from '@/api.js'; 
import { PAGES } from '@/routes.js';

const router = useRouter();

// Form state
const email = ref('');
const password = ref('');
const otp = ref('');
const requires2FA = ref(false);
const rememberMe = ref(true);
const isPasswordHidden = ref(true);
const authMessage = ref('');
const resendCountdown = ref(0);
const canResendOTP = ref(false);

// Constants
const LOGIN_STREAK_STORAGE_KEY = 'studylinkLoginStreak';
const REMEMBERED_EMAIL_KEY = 'studylinkRememberedEmail';

// Initial Load
onMounted(() => {
  if (getToken() && getUser()) {
    router.push(PAGES.resources); // Use Vue Router instead of window.location
  }

  const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
  if (rememberedEmail) {
    email.value = rememberedEmail;
    rememberMe.value = true;
  }
});

// UI Logic
const togglePassword = () => {
  isPasswordHidden.value = !isPasswordHidden.value;
};

// Submission Logic
const handleLogin = async () => {
  authMessage.value = '';
  const currentEmail = email.value.trim();

  if (rememberMe.value && currentEmail) {
    localStorage.setItem(REMEMBERED_EMAIL_KEY, currentEmail);
  } else {
    localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  }

  try {
    const result = await api('/auth/login', 'POST', {
      email: currentEmail,
      password: password.value
    });

    if (result.requires2FA) {
      requires2FA.value = true;
      authMessage.value = result.message;
      startResendCountdown();
      return;
    }

    setSession(result.token, result.user);
    sessionStorage.removeItem(LOGIN_STREAK_STORAGE_KEY);

    if (result.loginStreak) {
      sessionStorage.setItem(LOGIN_STREAK_STORAGE_KEY, JSON.stringify(result.loginStreak));
    }

    // Redirect on success
    router.push(PAGES.resources);
  } catch (error) {
    authMessage.value = error.message || 'An error occurred during login.';
  }
};

const handleVerifyOTP = async () => {
  authMessage.value = '';
  try {
    const result = await api('/auth/verify-otp', 'POST', {
      email: email.value.trim(),
      otp: otp.value.trim()
    });

    setSession(result.token, result.user);
    sessionStorage.removeItem(LOGIN_STREAK_STORAGE_KEY);

    if (result.loginStreak) {
      sessionStorage.setItem(LOGIN_STREAK_STORAGE_KEY, JSON.stringify(result.loginStreak));
    }

    router.push(PAGES.resources);
  } catch (error) {
    authMessage.value = error.message || 'Invalid OTP.';
  }
};

const startResendCountdown = () => {
  resendCountdown.value = 60;
  canResendOTP.value = false;

  const interval = setInterval(() => {
    resendCountdown.value--;
    if (resendCountdown.value <= 0) {
      clearInterval(interval);
      canResendOTP.value = true;
    }
  }, 1000);
};

const handleResendOTP = async () => {
  authMessage.value = '';
  try {
    await api('/auth/resend-otp', 'POST', {
      email: email.value.trim()
    });
    authMessage.value = 'OTP resent successfully! Check your email.';
    startResendCountdown();
  } catch (error) {
    authMessage.value = error.message || 'Failed to resend OTP.';
  }
};
</script>

<style scoped>
.login-page-wrapper {
  min-height: 100vh;
  width: 100vw;
  position: relative;
  overflow: hidden;
  isolation: isolate;
  --login-bg-image: url('/assets/login-bg.jpg');
  background: linear-gradient(180deg, #ffeef6 0%, #ffd6e8 38%, #ffc4de 100%);
}

.login-page-wrapper::before,
.login-page-wrapper::after {
  content: '';
  position: absolute; /* Changed from fixed to absolute to stick inside wrapper */
  inset: 0;
  pointer-events: none;
  z-index: -2;
}

.login-page-wrapper::before {
  background-image:
    var(--login-bg-image),
    linear-gradient(180deg, #ffeef6 0%, #ffd6e8 38%, #ffc4de 100%);
  background-size: cover;
  background-position: center top;
  background-repeat: no-repeat;
  filter: url(#posterize) saturate(1.08) contrast(1.07) brightness(1.02);
}

.login-page-wrapper::after {
  background:
    radial-gradient(110% 46% at 50% 2%, rgba(255, 214, 234, 0.42) 0%, rgba(255, 214, 234, 0.18) 40%, transparent 78%),
    radial-gradient(130% 70% at 22% 12%, rgba(255, 236, 245, 0.3) 0%, transparent 62%),
    radial-gradient(130% 70% at 82% 16%, rgba(255, 225, 239, 0.28) 0%, transparent 64%),
    linear-gradient(180deg, rgba(255, 197, 224, 0.2) 0%, rgba(255, 190, 220, 0.12) 34%, rgba(255, 179, 209, 0.08) 58%, rgba(255, 170, 200, 0.05) 100%);
  mix-blend-mode: soft-light;
  opacity: 0.84;
}

.login-page-wrapper .page-bg {
  width: min(100%, 500px);
  margin-top: 8px;
  padding: 24px 28px 22px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background: rgba(238, 244, 244, 0.68);
  box-shadow: 0 22px 42px rgba(31, 50, 67, 0.16), inset 0 1px 0 rgba(255, 255, 255, 0.68);
  backdrop-filter: blur(20px) saturate(1.05);
}

.login-scene {
  position: relative;
  width: 100vw;
  min-height: 100vh;
  margin-inline: auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  overflow: hidden;
  padding: 0 16px;
}

.login-scene-art {
  display: none;
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.login-scene-art::before,
.login-scene-art::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.login-scene-art::before {
  inset: auto 0 0;
  height: 48%;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(246, 248, 255, 0.15) 18%, rgba(237, 246, 226, 0.42) 58%, rgba(140, 184, 148, 0.4) 100%),
    radial-gradient(circle at 50% 92%, rgba(255, 255, 255, 0.38) 0 12%, transparent 13%),
    linear-gradient(180deg, rgba(96, 124, 104, 0) 0 48%, rgba(90, 128, 98, 0.46) 48% 54%, rgba(53, 88, 73, 0.48) 54% 100%);
  clip-path: polygon(0 56%, 6% 50%, 12% 53%, 18% 47%, 25% 50%, 32% 44%, 40% 48%, 48% 42%, 57% 47%, 65% 41%, 74% 46%, 81% 39%, 89% 44%, 100% 38%, 100% 100%, 0 100%);
  opacity: 0.95;
}

.login-scene-art::after {
  inset: auto 0 0;
  height: 26%;
  background:
    radial-gradient(circle at 23% 66%, rgba(255, 255, 255, 0.4) 0 1.8%, transparent 1.9%),
    radial-gradient(circle at 78% 64%, rgba(255, 255, 255, 0.34) 0 1.8%, transparent 1.9%),
    linear-gradient(180deg, rgba(188, 225, 239, 0) 0%, rgba(185, 223, 233, 0.42) 24%, rgba(156, 203, 221, 0.7) 100%);
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
  filter: blur(2px);
}

.scene-cloud::before,
.scene-cloud::after {
  content: '';
  position: absolute;
  background: inherit;
  border-radius: 50%;
}

.scene-cloud::before {
  width: 56px;
  height: 56px;
  left: 18px;
  top: -22px;
}

.scene-cloud::after {
  width: 70px;
  height: 70px;
  right: 12px;
  top: -28px;
}

.scene-cloud-left {
  top: 96px;
  left: 110px;
  opacity: 0.68;
}

.scene-cloud-right {
  top: 84px;
  right: 260px;
  width: 108px;
  opacity: 0.52;
}

.scene-lake {
  inset: auto 0 0;
  height: 34%;
  background:
    linear-gradient(180deg, rgba(210, 235, 242, 0.68) 0%, rgba(164, 209, 228, 0.65) 28%, rgba(134, 187, 212, 0.75) 65%, rgba(121, 182, 210, 0.9) 100%);
  opacity: 0.85;
}

.scene-lake::before,
.scene-lake::after {
  content: '';
  position: absolute;
  inset: 8% 0 auto;
  height: 18px;
  background: linear-gradient(90deg, transparent 0 16%, rgba(255, 255, 255, 0.24) 18%, transparent 20% 36%, rgba(255, 255, 255, 0.2) 39%, transparent 42% 60%, rgba(255, 255, 255, 0.18) 62%, transparent 64% 100%);
  filter: blur(3px);
}

.scene-lake::after {
  inset: 18% 0 auto;
  opacity: 0.65;
}

.scene-lake-glow {
  left: 50%;
  bottom: 22%;
  width: 420px;
  height: 150px;
  transform: translateX(-50%);
  background: radial-gradient(circle, rgba(255, 255, 255, 0.34) 0%, rgba(255, 255, 255, 0.06) 42%, transparent 72%);
  filter: blur(12px);
}

.scene-hill {
  bottom: 23%;
  width: 38%;
  height: 16%;
  background: linear-gradient(180deg, rgba(120, 162, 137, 0.38), rgba(73, 115, 88, 0.74));
  clip-path: polygon(0 100%, 8% 82%, 20% 88%, 30% 76%, 44% 82%, 56% 68%, 70% 74%, 82% 60%, 100% 72%, 100% 100%);
}

.scene-hill-left {
  left: -1%;
  opacity: 0.72;
}

.scene-hill-right {
  right: -1%;
  width: 42%;
  opacity: 0.68;
  clip-path: polygon(0 72%, 14% 62%, 28% 72%, 40% 55%, 55% 65%, 70% 50%, 84% 57%, 100% 43%, 100% 100%, 0 100%);
}

.scene-campus {
  bottom: 20%;
  background: linear-gradient(180deg, #bed0d0 0%, #879fac 45%, #5d7586 100%);
  box-shadow: 0 12px 30px rgba(48, 72, 78, 0.14);
}

.scene-campus::before,
.scene-campus::after {
  content: '';
  position: absolute;
  inset: auto 12% 10%;
  height: 72%;
  border-radius: 0 0 12px 12px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.36) 0 16%, rgba(255, 255, 255, 0.1) 16% 100%);
}

.scene-campus-left {
  left: 14%;
  width: 170px;
  height: 138px;
  clip-path: polygon(0 100%, 0 28%, 52% 18%, 100% 30%, 100% 100%);
}

.scene-campus-center {
  left: 37%;
  width: 198px;
  height: 118px;
  clip-path: polygon(0 100%, 0 34%, 50% 24%, 100% 36%, 100% 100%);
}

.scene-campus-center::before,
.scene-campus-center::after,
.scene-campus-left::before,
.scene-campus-left::after {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.52) 0 12%, rgba(255, 255, 255, 0.12) 12% 100%);
  opacity: 0.55;
}

.scene-tower {
  left: 23%;
  bottom: 31%;
  width: 95px;
  height: 150px;
  background: linear-gradient(180deg, #d8d4c6 0%, #b0b1a7 45%, #77838b 100%);
  clip-path: polygon(35% 0, 65% 0, 78% 18%, 78% 40%, 68% 56%, 82% 100%, 18% 100%, 32% 56%, 22% 40%, 22% 18%);
  box-shadow: inset 0 0 0 8px rgba(255, 245, 209, 0.26);
}

.scene-tower::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -24px;
  height: 48px;
  background: linear-gradient(180deg, rgba(210, 177, 87, 0.95) 0%, rgba(242, 207, 136, 0.95) 52%, rgba(170, 139, 59, 0.85) 100%);
  clip-path: polygon(0 100%, 20% 12%, 38% 0, 50% 10%, 62% 0, 80% 12%, 100% 100%);
}

.scene-bridge {
  right: 10%;
  bottom: 27%;
  width: 240px;
  height: 176px;
  border-left: 4px solid rgba(116, 137, 157, 0.62);
  border-right: 4px solid rgba(116, 137, 157, 0.62);
  border-top: 4px solid transparent;
}

.scene-bridge::before,
.scene-bridge::after {
  content: '';
  position: absolute;
  top: -90px;
  width: 6px;
  height: 200px;
  background: linear-gradient(180deg, rgba(110, 125, 143, 0.88), rgba(139, 152, 167, 0.4));
  border-radius: 999px;
}

.scene-bridge::before {
  left: 40%;
}

.scene-bridge::after {
  left: 52%;
}

.scene-bridge {
  background:
    linear-gradient(180deg, transparent 0 42%, rgba(105, 133, 150, 0.55) 42% 44%, transparent 44% 100%),
    radial-gradient(circle at 30% 44%, transparent 0 4px, rgba(113, 129, 146, 0.72) 4px 5px, transparent 5px 100%),
    radial-gradient(circle at 48% 44%, transparent 0 4px, rgba(113, 129, 146, 0.72) 4px 5px, transparent 5px 100%);
}

.scene-tree {
  bottom: 24%;
  width: 34px;
  height: 56px;
  background: linear-gradient(180deg, #48624d 0%, #2b4c33 100%);
  clip-path: polygon(44% 0, 56% 0, 58% 72%, 72% 100%, 28% 100%, 42% 72%);
  filter: drop-shadow(0 6px 8px rgba(30, 58, 42, 0.12));
}

.scene-tree::before {
  content: '';
  position: absolute;
  left: 50%;
  top: -24px;
  width: 72px;
  height: 72px;
  transform: translateX(-50%);
  background: radial-gradient(circle at 40% 35%, rgba(96, 148, 79, 0.96) 0 34%, rgba(54, 110, 59, 0.9) 35% 58%, rgba(29, 72, 40, 0.0) 59% 100%);
  border-radius: 50%;
}

.scene-tree-left {
  left: 2%;
  transform: scale(0.95);
}

.scene-tree-right {
  right: 5%;
  transform: scale(1.15);
}

.login-brand {
  z-index: 3;
  display: grid;
  justify-items: center;
  gap: 6px;
  margin: 0 0 2rem 0;
}

.unimas-logo {
  width: min(100%, 320px);
  height: auto;
  display: block;
}

.studylink-brand {
  margin-top: 0;
  font-family: "Josefin Sans", "Trebuchet MS", sans-serif;
  font-size: clamp(24px, 3.2vw, 44px);
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #214c8f;
}

.login-card {
  position: relative;
  z-index: 2;
  width: min(100%, 470px);
  margin-top: 0;
  padding: 24px 28px 22px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.64);
  background: rgba(237, 245, 245, 0.72);
  box-shadow: 0 24px 40px rgba(31, 50, 67, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(18px);
}

.login-card h2 {
  margin: 0 0 22px;
  text-align: center;
  font-family: "DM Sans", "Segoe UI", sans-serif;
  font-size: clamp(21px, 2.8vw, 27px);
  line-height: 1.2;
  font-weight: 700;
  color: #343434;
}

.login-form {
  display: grid;
  gap: 16px;
}

.field {
  display: grid;
  gap: 6px;
  font-size: 15px;
  color: #535353;
}

.field span {
  font-weight: 500;
}

.field input {
  width: 100%;
  height: 38px;
  padding: 0 11px;
  border: 1px solid rgba(95, 95, 95, 0.26);
  border-radius: 0;
  background: rgba(255, 255, 255, 0.9);
  color: #263238;
  font: inherit;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.field input:focus-visible {
  outline: none;
  border-color: #1773cb;
  box-shadow: 0 0 0 3px rgba(23, 115, 203, 0.18);
}

.password-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 46px;
  align-items: stretch;
}

.password-row input {
  border-right: none;
}

.password-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(145, 167, 180, 0.34);
  border-left: 1px solid rgba(255, 255, 255, 0.34);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.72) 0%, rgba(227, 238, 242, 0.34) 100%);
  color: #274055;
  cursor: pointer;
  transition: transform 150ms ease, background-color 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
  backdrop-filter: blur(8px);
}

.password-toggle:hover {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82) 0%, rgba(227, 238, 242, 0.45) 100%);
}

.password-toggle:focus-visible {
  outline: none;
  border-color: #1773cb;
  box-shadow: 0 0 0 3px rgba(23, 115, 203, 0.18);
}

.password-icon {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.password-icon-closed {
  display: none;
}

.password-toggle.is-visible .password-icon-open {
  display: none;
}

.password-toggle.is-visible .password-icon-closed {
  display: block;
}

.remember-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  font-size: 13px;
  color: #505050;
  user-select: none;
}

.remember-row input {
  margin: 0;
  accent-color: #1773cb;
}

.login-submit {
  width: 100%;
  height: 46px;
  margin-top: 6px;
  border: 1px solid rgba(255, 255, 255, 0.26);
  border-radius: 2rem;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.03) 100%),
    linear-gradient(135deg, rgba(64, 73, 98, 0.52) 0%, rgba(96, 70, 121, 0.5) 100%);
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.01em;
  text-align: center;
  cursor: pointer;
  backdrop-filter: blur(12px) saturate(170%);
  -webkit-backdrop-filter: blur(12px) saturate(170%);
  box-shadow:
    inset 0 3px 18px rgba(255, 255, 255, 0.18),
    0 10px 34px rgba(22, 24, 39, 0.22);
  transition: background 0.3s ease, transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.otp-instructions {
  font-size: 0.9rem;
  color: #555;
  text-align: center;
  margin-bottom: 0.5rem;
}

.back-btn {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #173d7a !important;
  border: 1px solid rgba(23, 61, 122, 0.3) !important;
}

.otp-actions {
  display: flex;
  gap: 10px;
  flex-direction: column;
  margin-top: 15px;
}

.resend-btn {
  width: 100%;
  padding: 10px;
  font-size: 14px;
  background: transparent;
  color: #1773cb;
  border: 1px solid #1773cb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.resend-btn:hover:not(:disabled) {
  background: #1773cb;
  color: white;
}

.resend-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  color: #999;
  border-color: #ccc;
}

.login-submit:hover {
  border-color: rgba(255, 255, 255, 0.32);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.06) 100%),
    linear-gradient(135deg, rgba(74, 84, 112, 0.58) 0%, rgba(110, 80, 137, 0.56) 100%);
  transform: translateY(-2px);
  box-shadow:
    inset 0 4px 20px rgba(255, 255, 255, 0.22),
    0 12px 38px rgba(22, 24, 39, 0.26);
}

.login-submit:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 4px rgba(255, 183, 197, 0.38),
    inset 0 4px 20px rgba(255, 255, 255, 0.2),
    0 10px 34px rgba(22, 24, 39, 0.24);
}

.alt-link {
  display: inline-block;
  margin-top: 4px;
  color: #1b73c9;
  font-size: 14px;
  text-decoration: none;
}

.alt-link:hover {
  text-decoration: underline;
}

.message {
  min-height: 1.2em;
  margin: 10px 0 0;
  font-size: 13px;
  color: #d92f3a; /* Added error color to ensure visibility */
}

@media (max-width: 640px) {
  .login-page-wrapper .phone-shell {
    padding: 18px 14px;
  }

  .login-scene {
    min-height: 100vh;
  }

  .login-scene-art::before {
    clip-path: polygon(0 60%, 8% 54%, 15% 58%, 23% 50%, 30% 54%, 39% 48%, 48% 53%, 58% 46%, 67% 51%, 77% 45%, 87% 50%, 100% 42%, 100% 100%, 0 100%);
  }

  .unimas-logo {
    width: min(100%, 280px);
  }

  .login-card {
    width: 100%;
    padding: 22px 18px 18px;
    border-radius: 20px;
  }

  .login-brand {
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    gap: 6px;
  }

  .studylink-brand {
    font-size: clamp(18px, 2.8vw, 24px);
    letter-spacing: 0.18em;
  }

  .login-submit {
    height: 42px;
  }

  .password-row {
    grid-template-columns: minmax(0, 1fr) 44px;
  }
}
</style>