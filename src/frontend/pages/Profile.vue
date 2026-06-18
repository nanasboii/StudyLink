<template>
  <div class="view page active">

    <!-- HERO CARD -->
    <section class="card profile-hero">
      <div class="profile-hero-top">

        <!-- AVATAR -->
        <div class="profile-pic-container" :class="{ 'is-uploading': uploadingProfilePicture }">
          <img
            v-if="avatarSrc"
            :src="avatarSrc"
            alt="Profile picture"
            class="profile-pic"
            @error="handleAvatarRenderError"
          />
          <div v-else class="profile-avatar-fallback" aria-label="Profile initials">
            {{ profileInitials }}
          </div>
          <div v-if="uploadingProfilePicture" class="avatar-upload-overlay" aria-hidden="true">
            <span class="avatar-spinner" />
          </div>
          <input
            ref="profilePictureInput"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            class="profile-picture-input"
            @change="handleProfilePictureSelected"
          />
        </div>

        <!-- META -->
        <div class="profile-hero-meta">
          <div>
            <h2>{{ profileData.fullName || '—' }}</h2>
            <p class="profile-sub">Student ID: {{ profileData.studentId || '—' }}</p>
          </div>
          <span class="role-badge">{{ roleLabel }}</span>
        </div>
      </div>

      <!-- STATS STRIP -->
      <div class="profile-stats-strip">
        <div class="mini-stat-item">
          <span class="mini-stat-label">Learning Points</span>
          <span class="mini-stat-value">{{ profileData.points ?? 0 }}</span>
        </div>
        <div class="mini-stat-item">
          <span class="mini-stat-label">Rating</span>
          <span class="mini-stat-value">{{ (profileData.rating || 0).toFixed(2) }}</span>
        </div>
        <div class="mini-stat-item">
          <span class="mini-stat-label">Verified</span>
          <span class="mini-stat-value">{{ profileData.isVerified ? '✓ Yes' : '✗ No' }}</span>
        </div>
      </div>
    </section>

    <!-- INFO PANEL -->
    <section class="card profile-panel">
      <div class="profile-header">
        <h3>Profile Information</h3>
        <div class="profile-header-actions">
          <button @click="toggleEdit" class="chip" type="button">
            {{ isEditing ? 'Cancel' : 'Edit Profile' }}
          </button>
          <button
            v-if="isEditing"
            @click="triggerProfilePictureUpload"
            class="chip chip-soft"
            type="button"
            :disabled="uploadingProfilePicture"
          >
            Change Picture
          </button>
          <!-- FIX: was disabled on !avatarSrc — now checks server url OR pending preview -->
          <button
            v-if="isEditing"
            @click="removeProfilePicture"
            class="chip chip-soft chip-soft-danger"
            type="button"
            :disabled="uploadingProfilePicture || (!avatarSrc && !pendingAvatarPreview)"
          >
            Remove Picture
          </button>
        </div>
      </div>

      <form @submit.prevent="saveProfile" class="profile-form">
        <div class="profile-field">
          <label class="field-label">Full Name</label>
          <input v-model="profileData.fullName" :disabled="!isEditing" />
        </div>
        <div class="profile-field">
          <label class="field-label">Email <span class="field-hint">(read-only)</span></label>
          <input :value="profileData.email" readonly />
        </div>
        <div class="profile-field">
          <label class="field-label">Phone Number</label>
          <input v-model="profileData.phoneNumber" :disabled="!isEditing" />
        </div>
        <div class="profile-field">
          <label class="field-label">Major</label>
          <input v-model="profileData.major" :disabled="!isEditing" />
        </div>
        <div class="profile-field">
          <label class="field-label">Year of Study</label>
          <input v-model.number="profileData.yearOfStudy" type="number" min="1" max="7" :disabled="!isEditing" />
        </div>
        <div class="profile-field">
          <label class="field-label">Bio</label>
          <textarea v-model="profileData.bio" :disabled="!isEditing" rows="4" />
        </div>
        <div class="profile-field" v-if="profileData.role === 'tutee'">
          <label class="field-label">
            Target Subjects <span class="field-hint">(comma-separated, e.g. Database, Java)</span>
          </label>
          <input v-model="profileData.targetSubjects" :disabled="!isEditing" placeholder="e.g. Database, Algorithms" />
        </div>
        <div class="profile-field" v-if="profileData.role === 'tutor'">
          <label class="field-label">
            Expertise <span class="field-hint">(comma-separated, e.g. Java, SQL)</span>
          </label>
          <input v-model="expertiseInput" :disabled="!isEditing" placeholder="e.g. Java, SQL, Computer Graphics" />
        </div>
        <div v-if="isEditing" class="edit-actions">
          <button class="primary" type="submit" :disabled="uploadingProfilePicture">Save Changes</button>
        </div>
      </form>
    </section>

    <!-- FIX: message uses role, not hardcoded color. Auto-dismiss via watcher -->
    <transition name="msg-fade">
      <p v-if="message" class="message" :class="messageType === 'error' ? 'message--error' : 'message--ok'">
        {{ message }}
      </p>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { api, getToken, getUser, setSession } from '@/api.js'
import { normalizeAssetUrl, normalizeUserProfile } from '@/utils/records.js'

// ─── STATE ───────────────────────────────────────────────────────────────────
const initialUser = getUser() || {}
const profileData          = ref(normalizeUserProfile(initialUser))
const originalProfileData  = ref({ ...profileData.value })
const isEditing            = ref(false)
const message              = ref('')
const messageType          = ref('ok')           // FIX: track error vs success
const avatarLoadFailed     = ref(false)
const uploadingProfilePicture = ref(false)
const profilePictureInput  = ref(null)
const avatarVersion        = ref(Date.now())
const pendingAvatarPreview = ref('')
const pendingAvatarServerUrl = ref('')

let messageDismissTimer = null

// ─── AUTO-DISMISS MESSAGE ────────────────────────────────────────────────────
// FIX: message leaked — never cleared
watch(message, (val) => {
  if (!val) return
  clearTimeout(messageDismissTimer)
  messageDismissTimer = setTimeout(() => { message.value = '' }, 4000)
})

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const setMessage = (text, type = 'ok') => {
  messageType.value = type
  message.value = text
}

const buildVersionedUrl = (rawUrl, version = Date.now()) => {
  const src = normalizeAssetUrl(rawUrl)
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return src
  const sep = src.includes('?') ? '&' : '?'
  return `${src}${sep}v=${version}`
}

const clearPendingAvatarPreview = () => {
  if (pendingAvatarPreview.value?.startsWith('blob:')) {
    URL.revokeObjectURL(pendingAvatarPreview.value)
  }
  pendingAvatarPreview.value = ''
  pendingAvatarServerUrl.value = ''
}

const waitForImageAvailability = async (rawUrl, attempts = 12, delayMs = 250) => {
  const src = normalizeAssetUrl(rawUrl)
  if (!src) return false
  for (let i = 0; i < attempts; i++) {
    const ok = await new Promise((resolve) => {
      const img = new Image()
      img.onload  = () => resolve(true)
      img.onerror = () => resolve(false)
      img.src = buildVersionedUrl(src, Date.now())
    })
    if (ok) return true
    await new Promise((r) => setTimeout(r, delayMs))
  }
  return false
}

// ─── COMPUTED ────────────────────────────────────────────────────────────────
const avatarSrc = computed(() => {
  if (pendingAvatarPreview.value) return pendingAvatarPreview.value
  if (avatarLoadFailed.value) return ''
  return buildVersionedUrl(profileData.value.profilePicture, avatarVersion.value)
})

const profileInitials = computed(() => {
  const name = String(profileData.value.fullName || '').trim()
  if (!name) return 'SL'
  return name.split(/\s+/).slice(0, 2).map((p) => p[0].toUpperCase()).join('')
})

const roleLabel = computed(() => {
  const r = String(profileData.value.role || '').trim()
  if (!r) return 'Member'
  return r.charAt(0).toUpperCase() + r.slice(1)
})

const expertiseInput = computed({
  get: () => (profileData.value.expertise || []).join(', '),
  set: (val) => {
    profileData.value.expertise = val.split(',').map((s) => s.trim()).filter(Boolean)
  },
})

// ─── ACTIONS ─────────────────────────────────────────────────────────────────
const loadProfile = async () => {
  try {
    const resp = await api('/me')
    const normalized = normalizeUserProfile(resp.user || {})
    profileData.value = normalized
    originalProfileData.value = { ...normalized }
    avatarVersion.value = Date.now()
    avatarLoadFailed.value = false
  } catch (err) {
    setMessage(`Error: ${err.message}`, 'error')
  }
}

const toggleEdit = () => {
  if (isEditing.value) {
    profileData.value = { ...originalProfileData.value }
  }
  isEditing.value = !isEditing.value
}

const saveProfile = async () => {
  try {
    const payload = {
      fullName:       profileData.value.fullName,
      phoneNumber:    profileData.value.phoneNumber,
      major:          profileData.value.major,
      yearOfStudy:    profileData.value.yearOfStudy || null,
      targetSubjects: profileData.value.targetSubjects || null,
      expertise:      Array.isArray(profileData.value.expertise) ? profileData.value.expertise : [],
      bio:            profileData.value.bio,
    }
    const resp = await api('/me/profile', 'PUT', payload)
    const normalized = normalizeUserProfile(resp.user || profileData.value)
    profileData.value = normalized
    originalProfileData.value = { ...normalized }
    const token = getToken()
    if (token && resp.user) setSession(token, resp.user)
    isEditing.value = false
    setMessage('Profile updated!', 'ok')
  } catch (err) {
    setMessage(`Error: ${err.message}`, 'error')
  }
}

const triggerProfilePictureUpload = () => {
  profilePictureInput.value?.click()
}

const handleProfilePictureSelected = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  e.target.value = ''

  clearPendingAvatarPreview()
  pendingAvatarPreview.value = URL.createObjectURL(file)
  uploadingProfilePicture.value = true

  try {
    const form = new FormData()
    form.append('profilePicture', file)
    const resp = await api('/me/profile-picture', 'POST', form)
    const uploadedUrl = resp.profilePictureUrl || resp.url || ''
    const normalized = normalizeUserProfile(resp.user || profileData.value)
    profileData.value = normalized
    originalProfileData.value = { ...normalized }

    pendingAvatarServerUrl.value = normalizeAssetUrl(normalized.profilePicture || uploadedUrl)
    const ready = await waitForImageAvailability(pendingAvatarServerUrl.value)
    if (ready) {
      clearPendingAvatarPreview()
      avatarVersion.value = Date.now()
    }
    avatarLoadFailed.value = false
    const token = getToken()
    if (token && resp.user) setSession(token, resp.user)
    setMessage('Profile picture updated!', 'ok')
  } catch (err) {
    clearPendingAvatarPreview()
    setMessage(`Error: ${err.message}`, 'error')
  } finally {
    uploadingProfilePicture.value = false
  }
}

// FIX: handleAvatarRenderError — was clearing fallback even during pending preview
const handleAvatarRenderError = () => {
  if (pendingAvatarPreview.value) return   // blob loaded — not a real error
  avatarLoadFailed.value = true
}

const removeProfilePicture = async () => {
  uploadingProfilePicture.value = true
  try {
    clearPendingAvatarPreview()
    const resp = await api('/me/profile', 'PUT', { removeProfilePicture: true })
    const normalized = normalizeUserProfile(resp.user || profileData.value)
    profileData.value = normalized
    originalProfileData.value = { ...normalized }
    avatarVersion.value = Date.now()
    avatarLoadFailed.value = false
    const token = getToken()
    if (token && resp.user) setSession(token, resp.user)
    setMessage('Profile picture removed.', 'ok')
  } catch (err) {
    setMessage(`Error: ${err.message}`, 'error')
  } finally {
    uploadingProfilePicture.value = false
  }
}

onMounted(loadProfile)
</script>

<style scoped>
/* ── LAYOUT ── */
.view {
  padding: 22px;
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  gap: 14px;
}

/* ── GLASS CARD ── */
.card {
  background:
    linear-gradient(
      160deg,
      rgba(255, 255, 255, 0.72) 0%,
      rgba(255, 206, 227, 0.18) 100%
    );
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
  border: 1px solid rgba(255, 133, 187, 0.28);
  border-radius: 20px;
  box-shadow:
    0 4px 6px rgba(2, 26, 84, 0.04),
    0 12px 28px rgba(2, 26, 84, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.65);
  padding: 22px;
}

/* ── HERO TOP ── */
.profile-hero {
  display: grid;
  gap: 18px;
}

.profile-hero-top {
  display: grid;
  grid-template-columns: 108px 1fr;
  gap: 18px;
  align-items: center;
}

/* ── AVATAR ── */
.profile-pic-container {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  position: relative;
  flex-shrink: 0;
}

.profile-pic-container.is-uploading {
  opacity: 0.65;
}

.profile-pic,
.profile-avatar-fallback {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.profile-pic {
  object-fit: cover;
  border: 3px solid var(--primary-soft, #FFCEE3);
  background: #fff;
  display: block;
}

.profile-avatar-fallback {
  display: grid;
  place-items: center;
  border: 3px solid var(--primary-soft, #FFCEE3);
  background: linear-gradient(135deg, var(--primary-soft, #FFCEE3) 0%, var(--primary, #FF85BB) 100%);
  color: var(--ink, #021A54);
  font-weight: 800;
  font-size: 26px;
  letter-spacing: 0.03em;
}

.avatar-upload-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(2, 26, 84, 0.35);
  display: grid;
  place-items: center;
}

.avatar-spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.profile-picture-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
}

/* ── META ── */
.profile-hero-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.profile-hero-meta h2 {
  margin: 0;
  font-size: clamp(22px, 3vw, 34px);
  color: var(--ink, #021A54);
  line-height: 1.1;
}

.profile-sub {
  margin: 5px 0 0;
  color: var(--ink-muted, #6e6e73);
  font-size: 0.9rem;
}

.role-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--primary-soft, #FFCEE3);
  background: rgba(255, 255, 255, 0.7);
  color: var(--ink, #021A54);
  font-size: 0.8rem;
  font-weight: 700;
  backdrop-filter: blur(6px);
}

/* ── STATS STRIP ── */
.profile-stats-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.mini-stat-item {
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 133, 187, 0.22);
  border-radius: 14px;
  padding: 12px 10px;
  text-align: center;
  backdrop-filter: blur(8px);
}

.mini-stat-label {
  display: block;
  font-size: 0.7rem;
  color: var(--ink-muted, #6e6e73);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  font-weight: 700;
}

.mini-stat-value {
  display: block;
  margin-top: 5px;
  font-size: 1.2rem;
  color: var(--ink, #021A54);
  font-weight: 800;
}

/* ── PANEL ── */
.profile-panel {
  display: grid;
  gap: 16px;
}

.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.profile-header h3 {
  margin: 0;
  color: var(--ink, #021A54);
  font-size: 1.05rem;
}

.profile-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* ── CHIP ── */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(255, 133, 187, 0.35);
  background: rgba(255, 255, 255, 0.65);
  color: var(--ink, #021A54);
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 130ms ease, transform 130ms ease, box-shadow 130ms ease;
  backdrop-filter: blur(6px);
}

.chip:hover:not(:disabled) {
  background: rgba(255, 206, 227, 0.55);
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(2, 26, 84, 0.1);
}

.chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chip-soft {
  font-size: 0.8rem;
  padding: 7px 12px;
}

.chip-soft-danger {
  border-color: rgba(255, 80, 100, 0.35);
  color: #c0003c;
}

.chip-soft-danger:hover:not(:disabled) {
  background: rgba(255, 80, 100, 0.1);
}

/* ── FORM ── */
.profile-form {
  display: grid;
  gap: 12px;
}

.profile-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--ink, #021A54);
  letter-spacing: 0.03em;
}

.field-hint {
  margin-left: 4px;
  color: var(--ink-muted, #6e6e73);
  font-size: 0.74rem;
  font-weight: 500;
}

input,
textarea {
  width: 100%;
  border: 1px solid rgba(255, 133, 187, 0.35);
  border-radius: 12px;
  padding: 11px 14px;
  font-size: 0.9rem;
  background: rgba(255, 255, 255, 0.7);
  color: var(--ink, #021A54);
  font-family: inherit;
  backdrop-filter: blur(6px);
  transition: border-color 130ms ease, box-shadow 130ms ease;
  box-sizing: border-box;
}

input:disabled,
textarea:disabled {
  background: rgba(245, 245, 245, 0.7);
  color: var(--ink-muted, #6e6e73);
  border-color: rgba(255, 133, 187, 0.18);
}

input:focus,
textarea:focus {
  outline: none;
  border-color: var(--primary, #FF85BB);
  box-shadow: 0 0 0 3px rgba(255, 133, 187, 0.22);
}

input[readonly] {
  background: rgba(245, 245, 245, 0.5);
  color: var(--ink-muted, #6e6e73);
  cursor: default;
}

textarea {
  resize: vertical;
  min-height: 96px;
}

/* ── SAVE BUTTON ── */
.edit-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}

.primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 11px 28px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, var(--primary, #FF85BB) 0%, #ff5fa0 100%);
  color: #fff;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 130ms ease, transform 130ms ease, box-shadow 130ms ease;
  box-shadow: 0 4px 14px rgba(255, 133, 187, 0.45);
}

.primary:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(255, 133, 187, 0.55);
}

.primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* ── MESSAGE ── */
.message {
  margin: 0;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 0.88rem;
  font-weight: 600;
}

.message--ok {
  background: rgba(2, 26, 84, 0.06);
  border: 1px solid rgba(2, 26, 84, 0.14);
  color: var(--ink, #021A54);
}

.message--error {
  background: rgba(255, 80, 100, 0.08);
  border: 1px solid rgba(255, 80, 100, 0.25);
  color: #b00030;
}

.msg-fade-enter-active,
.msg-fade-leave-active { transition: opacity 300ms ease, transform 300ms ease; }
.msg-fade-enter-from,
.msg-fade-leave-to    { opacity: 0; transform: translateY(4px); }

/* ── RESPONSIVE ── */
@media (max-width: 860px) {
  .view { padding: 14px; }

  .profile-hero-top {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  .profile-hero-meta {
    width: 100%;
    flex-direction: column;
    align-items: center;
  }

  .profile-stats-strip {
    grid-template-columns: 1fr;
  }

  .profile-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .profile-header-actions {
    justify-content: flex-start;
  }

  .edit-actions { justify-content: stretch; }
  .edit-actions .primary { width: 100%; }
}
</style>
