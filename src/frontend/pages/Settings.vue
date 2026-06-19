<template>
  <div class="settings-page">

    <!-- 🏔️ Hero Header -->
    <section class="glass-hero">
      <div class="hero-icon">⚙️</div>
      <div>
        <h1>Account Settings</h1>
        <p class="hero-sub">Manage security & preferences</p>
      </div>
    </section>

    <!-- ✅ Toast Banner -->
    <transition name="toast-slide">
      <div
        v-if="toast.visible"
        class="toast"
        :class="toast.type"
        role="alert"
        aria-live="polite"
      >
        <span>{{ toast.type === 'success' ? '✅' : '❌' }}</span>
        {{ toast.message }}
      </div>
    </transition>

    <!-- 🔒 Security Section -->
    <section class="glass-card settings-section">
      <h2 class="section-title">🔒 Security</h2>

      <!-- Change Password -->
      <div class="settings-row">
        <div class="row-info">
          <strong>Change Password</strong>
          <p class="hint">Update regularly → stay safe</p>
        </div>
        <button class="btn-pill" @click="openPasswordModal">Change</button>
      </div>

      <div class="row-divider" />

      <!-- Push Notifications -->
      <div class="settings-row">
        <div class="row-info">
          <strong>Push Notifications</strong>
          <p class="hint">
            Alerts for messages & activity
            <span v-if="!pushSupported" class="hint-warn">→ Not supported here</span>
            <span v-if="pushError" class="hint-error">→ {{ pushError }}</span>
          </p>
        </div>
        <button
          class="btn-toggle"
          :class="{ active: pushEnabled, loading: pushLoading }"
          :disabled="pushLoading || !pushSupported"
          @click="togglePush"
          :aria-pressed="pushEnabled"
        >
          <span class="toggle-dot" />
          <span class="toggle-label">{{ pushLoading ? '…' : pushEnabled ? 'On' : 'Off' }}</span>
        </button>
      </div>
    </section>

    <!-- 💀 Danger Zone -->
    <section class="glass-card settings-section danger-zone">
      <h2 class="section-title danger-title">⚠️ Danger Zone</h2>

      <div class="settings-row danger-row">
        <div class="row-info">
          <strong>Delete Account</strong>
          <p class="hint">Permanent → no undo → all data gone</p>
        </div>
        <button class="btn-danger-pill" @click="openDeleteModal">Delete</button>
      </div>
    </section>

    <!-- 🔑 Change Password Modal -->
    <teleport to="body">
      <transition name="modal-fade">
        <div
          v-if="showPasswordModal"
          class="modal-backdrop"
          @click.self="closePasswordModal"
          @keydown.esc="closePasswordModal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwd-modal-title"
        >
          <div class="glass-modal" ref="pwdModalEl">
            <div class="modal-header">
              <h2 id="pwd-modal-title">🔑 Change Password</h2>
              <button class="close-x" @click="closePasswordModal" aria-label="Close">×</button>
            </div>

            <div class="modal-body">
              <div class="field">
                <label>Current Password</label>
                <input
                  ref="pwdCurrentRef"
                  v-model="passwordForm.current"
                  type="password"
                  placeholder="••••••••"
                  autocomplete="current-password"
                />
              </div>
              <div class="field">
                <label>New Password</label>
                <input
                  v-model="passwordForm.new"
                  type="password"
                  placeholder="Min 8 chars"
                  autocomplete="new-password"
                />
                <!-- 🛠️ Strength bar -->
                <div class="strength-bar" v-if="passwordForm.new">
                  <div
                    class="strength-fill"
                    :class="passwordStrength.cls"
                    :style="{ width: passwordStrength.pct + '%' }"
                  />
                </div>
                <span v-if="passwordForm.new" class="strength-label">{{ passwordStrength.label }}</span>
              </div>
              <div class="field">
                <label>Confirm Password</label>
                <input
                  v-model="passwordForm.confirm"
                  type="password"
                  placeholder="••••••••"
                  autocomplete="new-password"
                />
                <!-- 🛠️ Mismatch inline -->
                <span v-if="passwordForm.confirm && passwordForm.new !== passwordForm.confirm" class="field-error">
                  → Passwords no match
                </span>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-ghost" @click="closePasswordModal">Cancel</button>
              <button
                class="btn-primary"
                @click="changePassword"
                :disabled="pwdLoading || !canSubmitPassword"
              >
                {{ pwdLoading ? '…Saving' : 'Save Password' }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </teleport>

    <!-- 💀 Delete Account Modal -->
    <teleport to="body">
      <transition name="modal-fade">
        <div
          v-if="showDeleteModal"
          class="modal-backdrop"
          @click.self="closeDeleteModal"
          @keydown.esc="closeDeleteModal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="del-modal-title"
        >
          <div class="glass-modal danger-modal" ref="delModalEl">
            <div class="modal-header">
              <h2 id="del-modal-title">💀 Delete Account</h2>
              <button class="close-x" @click="closeDeleteModal" aria-label="Close">×</button>
            </div>

            <div class="danger-banner">
              ⚠️ Cannot be undone → all data gone forever
            </div>

            <div class="modal-body">
              <div class="field">
                <label>Confirm your email</label>
                <input
                  ref="delEmailRef"
                  v-model="deleteForm.confirmEmail"
                  type="email"
                  :placeholder="userEmail || 'your@email.com'"
                  autocomplete="email"
                />
                <!-- 🛠️ Email mismatch guard -->
                <span v-if="deleteForm.confirmEmail && deleteForm.confirmEmail !== userEmail" class="field-error">
                  → Email no match
                </span>
              </div>
              <div class="field">
                <label>Confirm your password</label>
                <input
                  v-model="deleteForm.password"
                  type="password"
                  placeholder="••••••••"
                  autocomplete="current-password"
                />
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-ghost" @click="closeDeleteModal">Cancel</button>
              <button
                class="btn-delete"
                @click="deleteAccount"
                :disabled="delLoading || !canSubmitDelete"
              >
                {{ delLoading ? '…Deleting' : '🗑️ Delete Forever' }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { api, getUser, clearSession } from '@/api.js'
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
} from '@/push.js'

// ─── State ────────────────────────────────────────────────
const router = useRouter()
const user = getUser() || {}
const userEmail = ref(user.email || '')

// Push
const pushEnabled  = ref(false)
const pushLoading  = ref(false)
const pushSupported = ref(false)
const pushError    = ref('')

// Modals
const showPasswordModal = ref(false)
const showDeleteModal   = ref(false)

// Password form
const passwordForm = ref({ current: '', new: '', confirm: '' })
const pwdLoading   = ref(false)
const pwdCurrentRef = ref(null)

// Delete form
const deleteForm = ref({ confirmEmail: '', password: '' })
const delLoading = ref(false)
const delEmailRef = ref(null)

// Modal refs (for focus trap fallback)
const pwdModalEl = ref(null)
const delModalEl = ref(null)

// Toast
const toast = ref({ visible: false, message: '', type: 'success' })
let toastTimer = null

// ─── Computed ─────────────────────────────────────────────

// 🛠️ Password strength meter
const passwordStrength = computed(() => {
  const pw = passwordForm.value.new
  if (!pw) return { pct: 0, cls: '', label: '' }
  let score = 0
  if (pw.length >= 8)  score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  if (score <= 1) return { pct: 20,  cls: 'weak',   label: '→ Weak' }
  if (score <= 3) return { pct: 60,  cls: 'medium', label: '→ Medium' }
  return               { pct: 100, cls: 'strong', label: '→ Strong 💪' }
})

// 🛠️ Submit guards — no empty / mismatch submits
const canSubmitPassword = computed(() =>
  passwordForm.value.current.length > 0 &&
  passwordForm.value.new.length >= 8 &&
  passwordForm.value.new === passwordForm.value.confirm
)

const canSubmitDelete = computed(() =>
  deleteForm.value.confirmEmail === userEmail.value &&
  deleteForm.value.password.length > 0
)

// ─── Toast ────────────────────────────────────────────────
const showToast = (message, type = 'success') => {
  clearTimeout(toastTimer)
  toast.value = { visible: true, message, type }
  toastTimer = setTimeout(() => { toast.value.visible = false }, 3500)
}

// ─── Modal helpers ────────────────────────────────────────
// 🛠️ Scroll lock + Escape listener + auto-focus

const openPasswordModal = async () => {
  showPasswordModal.value = true
  document.body.style.overflow = 'hidden'
  await nextTick()
  pwdCurrentRef.value?.focus()
}
const closePasswordModal = () => {
  showPasswordModal.value = false
  document.body.style.overflow = ''
  passwordForm.value = { current: '', new: '', confirm: '' }
}

const openDeleteModal = async () => {
  showDeleteModal.value = true
  document.body.style.overflow = 'hidden'
  await nextTick()
  delEmailRef.value?.focus()
}
const closeDeleteModal = () => {
  showDeleteModal.value = false
  document.body.style.overflow = ''
  deleteForm.value = { confirmEmail: '', password: '' }
}

// ─── Push notifications ───────────────────────────────────
const togglePush = async () => {
  pushLoading.value = true
  pushError.value   = ''
  try {
    if (pushEnabled.value) {
      await unsubscribeFromPush()
      pushEnabled.value = false
      showToast('Push notifications off')
    } else {
      await subscribeToPush()
      pushEnabled.value = true
      showToast('Push notifications on! 🔔')
    }
  } catch (err) {
    pushError.value = err?.message || 'Push failed'
    showToast(pushError.value, 'error')
  } finally {
    pushLoading.value = false
  }
}

// ─── Change password ──────────────────────────────────────
const changePassword = async () => {
  if (!canSubmitPassword.value || pwdLoading.value) return
  pwdLoading.value = true
  try {
    await api('/me/password', 'PUT', {
      currentPassword: passwordForm.value.current,
      newPassword:     passwordForm.value.new,
    })
    showToast('Password changed! 🔐')
    closePasswordModal()
  } catch (err) {
    // 🛠️ Surfaces API error message properly
    showToast(err?.message || 'Password change failed', 'error')
  } finally {
    pwdLoading.value = false
  }
}

// ─── Delete account ───────────────────────────────────────
const deleteAccount = async () => {
  if (!canSubmitDelete.value || delLoading.value) return
  delLoading.value = true
  try {
    await api('/auth/delete-account', 'POST', { password: deleteForm.value.password })
    clearSession()
    router.push('/login')
  } catch (err) {
    showToast(err?.message || 'Delete failed', 'error')
  } finally {
    delLoading.value = false
  }
}

// ─── Mount ────────────────────────────────────────────────
onMounted(async () => {
  // 🛠️ Safe push check — no crash if push.js throws
  try {
    pushSupported.value = await isPushSupported()
    if (pushSupported.value) {
      const sub = await getCurrentSubscription()
      pushEnabled.value = !!sub
    }
  } catch {
    pushSupported.value = false
  }
})

onUnmounted(() => {
  // 🛠️ Cleanup scroll lock on nav away
  document.body.style.overflow = ''
  clearTimeout(toastTimer)
})
</script>

<style scoped>
/* ─── Page ───────────────────────────────────────────────── */
.settings-page {
  padding: 24px 20px;
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: fadeIn 220ms ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ─── Glass Hero ─────────────────────────────────────────── */
.glass-hero {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  border-radius: 16px;
  background: linear-gradient(135deg, #021A54 0%, #1a3a8a 100%);
  box-shadow: 0 8px 32px rgba(2, 26, 84, 0.28);
  color: #fff;
}

.hero-icon {
  font-size: 2rem;
  line-height: 1;
}

.glass-hero h1 {
  margin: 0 0 4px;
  font-size: 1.3rem;
  font-weight: 700;
  color: #fff;
}

.hero-sub {
  margin: 0;
  font-size: 0.85rem;
  color: #FFCEE3;
  opacity: 0.9;
}

/* ─── Glass Card ─────────────────────────────────────────── */
.glass-card {
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 133, 187, 0.22);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(2, 26, 84, 0.08);
  padding: 20px 24px;
}

.settings-section {}

.section-title {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-muted, #6e6e73);
  margin: 0 0 16px;
}

.danger-title {
  color: #c0392b;
}

/* ─── Settings Row ───────────────────────────────────────── */
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
}

.row-divider {
  height: 1px;
  background: rgba(224, 224, 224, 0.6);
  margin: 0;
}

.row-info strong {
  display: block;
  font-size: 0.93rem;
  font-weight: 600;
  color: #021A54;
  margin-bottom: 3px;
}

.hint {
  margin: 0;
  font-size: 0.78rem;
  color: #6e6e73;
  line-height: 1.4;
}

.hint-warn { color: #888; display: block; font-size: 0.74rem; margin-top: 2px; }
.hint-error { color: #c0392b; display: block; font-size: 0.74rem; margin-top: 2px; }

/* ─── Danger Zone ────────────────────────────────────────── */
.danger-zone {
  border-color: rgba(192, 57, 43, 0.25);
  background: rgba(255, 240, 240, 0.7);
}

.danger-row strong { color: #a93226; }

/* ─── Buttons ────────────────────────────────────────────── */
.btn-pill {
  padding: 8px 20px;
  border-radius: 20px;
  border: 1.5px solid #FF85BB;
  background: transparent;
  color: #FF85BB;
  font-size: 0.83rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 140ms, color 140ms, box-shadow 140ms;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-pill:hover {
  background: #FF85BB;
  color: #fff;
  box-shadow: 0 4px 12px rgba(255, 133, 187, 0.35);
}

.btn-danger-pill {
  padding: 8px 20px;
  border-radius: 20px;
  border: 1.5px solid #e74c3c;
  background: transparent;
  color: #e74c3c;
  font-size: 0.83rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 140ms, color 140ms;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-danger-pill:hover {
  background: #e74c3c;
  color: #fff;
}

/* ─── Toggle ─────────────────────────────────────────────── */
.btn-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px 6px 8px;
  border-radius: 20px;
  border: 1.5px solid #ccc;
  background: #f5f5f5;
  color: #6e6e73;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms ease;
  flex-shrink: 0;
}

.btn-toggle.active {
  border-color: #FF85BB;
  background: #FFCEE3;
  color: #021A54;
}

.btn-toggle:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.toggle-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ccc;
  transition: background 200ms;
  flex-shrink: 0;
}

.btn-toggle.active .toggle-dot {
  background: #FF85BB;
}

.btn-toggle.loading .toggle-dot {
  animation: pulse 900ms infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}

/* ─── Toast ──────────────────────────────────────────────── */
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 12px;
  font-size: 0.87rem;
  font-weight: 500;
  box-shadow: 0 6px 20px rgba(0,0,0,0.1);
}

.toast.success {
  background: rgba(232, 255, 240, 0.95);
  color: #1a6b3a;
  border: 1px solid rgba(26, 107, 58, 0.2);
}

.toast.error {
  background: rgba(255, 235, 235, 0.95);
  color: #a93226;
  border: 1px solid rgba(192, 57, 43, 0.2);
}

.toast-slide-enter-active,
.toast-slide-leave-active { transition: all 260ms ease; }
.toast-slide-enter-from { opacity: 0; transform: translateY(-10px); }
.toast-slide-leave-to   { opacity: 0; transform: translateY(-6px); }

/* ─── Modal backdrop ─────────────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 26, 84, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 20px;
}

.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity 220ms ease; }
.modal-fade-enter-from,
.modal-fade-leave-to     { opacity: 0; }

/* ─── Glass Modal ────────────────────────────────────────── */
.glass-modal {
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 133, 187, 0.3);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(2, 26, 84, 0.22);
  width: 100%;
  max-width: 420px;
  overflow: hidden;
  animation: modalPop 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.93); }
  to   { opacity: 1; transform: scale(1); }
}

.danger-modal {
  border-color: rgba(192, 57, 43, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #021A54;
}

.close-x {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  color: #6e6e73;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 140ms;
}

.close-x:hover {
  background: #f5f5f5;
  color: #021A54;
}

.modal-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 0 24px 20px;
}

/* ─── Danger banner ──────────────────────────────────────── */
.danger-banner {
  margin: 12px 24px 0;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255, 235, 235, 0.9);
  border: 1px solid rgba(192, 57, 43, 0.2);
  color: #a93226;
  font-size: 0.82rem;
  font-weight: 500;
}

/* ─── Fields ─────────────────────────────────────────────── */
.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #021A54;
  letter-spacing: 0.02em;
}

.field input {
  padding: 10px 13px;
  border: 1.5px solid #e0e0e0;
  border-radius: 10px;
  font-size: 0.9rem;
  font-family: inherit;
  color: #021A54;
  background: #fff;
  transition: border-color 150ms, box-shadow 150ms;
  outline: none;
}

.field input:focus {
  border-color: #FF85BB;
  box-shadow: 0 0 0 3px rgba(255, 133, 187, 0.18);
}

.field-error {
  font-size: 0.75rem;
  color: #c0392b;
  font-weight: 500;
}

/* ─── Strength bar ───────────────────────────────────────── */
.strength-bar {
  height: 4px;
  border-radius: 4px;
  background: #e0e0e0;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 300ms ease, background 300ms;
}

.strength-fill.weak   { background: #e74c3c; }
.strength-fill.medium { background: #f39c12; }
.strength-fill.strong { background: #27ae60; }

.strength-label {
  font-size: 0.73rem;
  font-weight: 600;
  color: #6e6e73;
}

/* ─── Modal buttons ──────────────────────────────────────── */
.btn-primary {
  padding: 10px 22px;
  border-radius: 10px;
  border: none;
  background: #FF85BB;
  color: #fff;
  font-size: 0.87rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 140ms, box-shadow 140ms, opacity 140ms;
}

.btn-primary:hover:not(:disabled) {
  background: #ff6da9;
  box-shadow: 0 4px 14px rgba(255, 133, 187, 0.4);
}

.btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-ghost {
  padding: 10px 18px;
  border-radius: 10px;
  border: 1.5px solid #e0e0e0;
  background: transparent;
  color: #6e6e73;
  font-size: 0.87rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 140ms;
}

.btn-ghost:hover {
  background: #f5f5f5;
}

.btn-delete {
  padding: 10px 22px;
  border-radius: 10px;
  border: none;
  background: #e74c3c;
  color: #fff;
  font-size: 0.87rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 140ms, opacity 140ms;
}

.btn-delete:hover:not(:disabled) {
  background: #c0392b;
}

.btn-delete:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ─── Mobile ─────────────────────────────────────────────── */
@media (max-width: 560px) {
  .settings-page { padding: 16px 14px; }
  .settings-row { flex-wrap: wrap; }
  .btn-pill,
  .btn-danger-pill { width: 100%; text-align: center; }
  .glass-modal { border-radius: 16px; }
}
</style>