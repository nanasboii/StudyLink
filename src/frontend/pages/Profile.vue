<template>
  <div class="view page active">

    <!-- ── HERO ── -->
    <section class="glass-card profile-hero">
      <div class="profile-hero-top">

        <!-- Avatar -->
        <div class="profile-pic-wrap" :class="{ uploading: uploadingProfilePicture }">
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
          <div v-if="uploadingProfilePicture" class="upload-spinner" aria-label="Uploading…">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10" opacity=".25"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
            </svg>
          </div>
          <input
            ref="profilePictureInput"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            class="profile-picture-input"
            @change="handleProfilePictureSelected"
          />
        </div>

        <!-- Name + meta -->
        <div class="profile-hero-meta">
          <div>
            <h2>{{ profileData.fullName || 'Your Profile' }}</h2>
            <p class="profile-sub">{{ profileData.email }}</p>
            <p class="profile-sub">Student ID: {{ profileData.studentId || '—' }}</p>
          </div>
          <span class="role-badge" :class="`role-${profileData.role}`">
            {{ roleLabel }}
          </span>
        </div>
      </div>

      <!-- Stats strip -->
      <div class="profile-stats-strip">
        <div class="stat-item">
          <span class="stat-label">🏆 Points</span>
          <span class="stat-value">{{ profileData.points ?? 0 }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">⭐ Rating</span>
          <span class="stat-value">{{ ratingDisplay }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">✅ Verified</span>
          <span class="stat-value">{{ profileData.isVerified ? 'Yes' : 'No' }}</span>
        </div>
      </div>
    </section>

    <!-- ── FORM PANEL ── -->
    <section class="glass-card profile-panel">
      <div class="profile-panel-header">
        <h3>Profile Information</h3>
        <div class="profile-actions">
          <button @click="toggleEdit" class="btn-chip" type="button">
            {{ isEditing ? 'Cancel' : 'Edit Profile' }}
          </button>
          <template v-if="isEditing">
            <button
              @click="triggerProfilePictureUpload"
              class="btn-chip btn-chip--soft"
              type="button"
              :disabled="uploadingProfilePicture"
            >
              📷 Change Picture
            </button>
            <button
              v-if="avatarSrc"
              @click="removeProfilePicture"
              class="btn-chip btn-chip--danger"
              type="button"
              :disabled="uploadingProfilePicture"
            >
              🗑 Remove
            </button>
          </template>
        </div>
      </div>

      <form @submit.prevent="saveProfile" class="profile-form" novalidate>

        <!-- Full Name -->
        <div class="field-group">
          <label class="field-label" for="fullName">Full Name</label>
          <input
            id="fullName"
            v-model.trim="profileData.fullName"
            :disabled="!isEditing"
            placeholder="Your full name"
            autocomplete="name"
          />
        </div>

        <!-- Email (read-only) -->
        <div class="field-group">
          <label class="field-label" for="email">
            Email <span class="field-hint">read-only</span>
          </label>
          <input id="email" :value="profileData.email" readonly />
        </div>

        <!-- Phone -->
        <div class="field-group">
          <label class="field-label" for="phone">Phone Number</label>
          <input
            id="phone"
            v-model.trim="profileData.phoneNumber"
            :disabled="!isEditing"
            placeholder="+60 12 345 6789"
            autocomplete="tel"
          />
        </div>

        <!-- Major -->
        <div class="field-group">
          <label class="field-label" for="major">Major</label>
          <input
            id="major"
            v-model.trim="profileData.major"
            :disabled="!isEditing"
            placeholder="e.g. Computer Science"
          />
        </div>

        <!-- Year of Study -->
        <div class="field-group">
          <label class="field-label" for="year">Year of Study</label>
          <input
            id="year"
            v-model.number="profileData.yearOfStudy"
            type="number"
            min="1"
            max="7"
            :disabled="!isEditing"
            placeholder="1 – 7"
          />
        </div>

        <!-- Target Subjects (tutee only) -->
        <div class="field-group" v-if="profileData.role === 'tutee'">
          <label class="field-label" for="targetSubjects">
            Target Subjects
            <span class="field-hint">comma-separated</span>
          </label>
          <input
            id="targetSubjects"
            v-model="profileData.targetSubjects"
            :disabled="!isEditing"
            placeholder="e.g. Database, Algorithms"
          />
        </div>

        <!-- Expertise (tutor only) -->
        <div class="field-group" v-if="profileData.role === 'tutor'">
          <label class="field-label" for="expertise">
            Expertise
            <span class="field-hint">comma-separated</span>
          </label>
          <input
            id="expertise"
            v-model="expertiseInput"
            :disabled="!isEditing"
            placeholder="e.g. Java, SQL, Computer Graphics"
          />
        </div>

        <!-- Bio -->
        <div class="field-group field-group--full">
          <label class="field-label" for="bio">Bio</label>
          <textarea
            id="bio"
            v-model.trim="profileData.bio"
            :disabled="!isEditing"
            rows="4"
            placeholder="Tell the community about yourself…"
          ></textarea>
        </div>

        <!-- Save button -->
        <div v-if="isEditing" class="form-actions">
          <button class="btn-primary" type="submit" :disabled="uploadingProfilePicture">
            Save Changes
          </button>
        </div>
      </form>
    </section>

    <!-- ── MESSAGE ── -->
    <transition name="fade">
      <p
        v-if="message"
        class="status-msg"
        :class="message.startsWith('Error') ? 'status-msg--error' : 'status-msg--ok'"
        role="status"
        aria-live="polite"
      >
        {{ message }}
      </p>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api, getToken, getUser, setSession } from '@/api.js'
import { normalizeAssetUrl, normalizeUserProfile } from '@/utils/records.js'

// ── State ──────────────────────────────────────────────────────────────
const initialUser = getUser() || {}
const profileData         = ref(normalizeUserProfile(initialUser))
const originalProfileData = ref({ ...profileData.value })
const isEditing           = ref(false)
const message             = ref('')
const avatarLoadFailed    = ref(false)
const uploadingProfilePicture = ref(false)
const profilePictureInput = ref(null)
const avatarVersion       = ref(Date.now())
const pendingAvatarPreview   = ref('')
const pendingAvatarServerUrl = ref('')

let messageTimer = null

// ── Helpers ────────────────────────────────────────────────────────────
const buildVersionedUrl = (rawUrl, version = Date.now()) => {
  const src = normalizeAssetUrl(rawUrl)
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return src
  return `${src}${src.includes('?') ? '&' : '?'}v=${version}`
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
    const ok = await new Promise(resolve => {
      const img = new Image()
      img.onload  = () => resolve(true)
      img.onerror = () => resolve(false)
      img.src = buildVersionedUrl(src, Date.now())
    })
    if (ok) return true
    await new Promise(r => setTimeout(r, delayMs))
  }
  return false
}

const setMessage = (text) => {
  message.value = text
  clearTimeout(messageTimer)
  // Auto-dismiss success after 4 s
  if (text && !text.startsWith('Error')) {
    messageTimer = setTimeout(() => { message.value = '' }, 4000)
  }
}

// ── Computed ───────────────────────────────────────────────────────────
const avatarSrc = computed(() => {
  if (pendingAvatarPreview.value) return pendingAvatarPreview.value
  if (avatarLoadFailed.value)     return ''
  return buildVersionedUrl(profileData.value.profilePicture, avatarVersion.value)
})

const profileInitials = computed(() => {
  const name = String(profileData.value.fullName || '').trim()
  if (!name) return 'SL'
  return name.split(/\s+/).slice(0, 2).map(p => p[0].toUpperCase()).join('')
})

const roleLabel = computed(() => {
  const r = String(profileData.value.role || '').trim()
  if (!r) return 'Member'
  return r.charAt(0).toUpperCase() + r.slice(1)
})

const ratingDisplay = computed(() => {
  const n = Number(profileData.value.rating)
  return isNaN(n) ? '—' : n.toFixed(2)
})

const expertiseInput = computed({
  get: () => (profileData.value.expertise || []).join(', '),
  set: (val) => {
    profileData.value.expertise = val.split(',').map(s => s.trim()).filter(Boolean)
  }
})

// ── Avatar handlers ────────────────────────────────────────────────────
const handleAvatarRenderError = () => {
  if (pendingAvatarPreview.value) return   // keep local preview while uploading
  avatarLoadFailed.value = true
}

const triggerProfilePictureUpload = () => {
  profilePictureInput.value?.click()
}

const handleProfilePictureSelected = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  // Reset input so same file can be re-picked
  e.target.value = ''

  // Validate type
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
  if (!allowed.includes(file.type)) {
    setMessage('Error: Unsupported image type.')
    return
  }

  // Local preview immediately
  clearPendingAvatarPreview()
  pendingAvatarPreview.value = URL.createObjectURL(file)

  uploadingProfilePicture.value = true
  try {
    const form = new FormData()
    form.append('profilePicture', file)
    const resp = await api('/me/profile/picture', 'POST', form)
    const normalized = normalizeUserProfile(resp.user || profileData.value)
    profileData.value = normalized
    originalProfileData.value = { ...normalized }

    const uploadedUrl = resp.profilePictureUrl || resp.url || normalized.profilePicture || ''
    pendingAvatarServerUrl.value = normalizeAssetUrl(uploadedUrl)
    const ready = await waitForImageAvailability(pendingAvatarServerUrl.value)
    if (ready) {
      clearPendingAvatarPreview()
      avatarVersion.value = Date.now()
    }

    avatarLoadFailed.value = false
    const token = getToken()
    if (token && resp.user) setSession(token, resp.user)
    setMessage('Profile picture updated!')
  } catch (err) {
    clearPendingAvatarPreview()
    setMessage(`Error: ${err.message}`)
  } finally {
    uploadingProfilePicture.value = false
  }
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
    setMessage('Profile picture removed.')
  } catch (err) {
    setMessage(`Error: ${err.message}`)
  } finally {
    uploadingProfilePicture.value = false
  }
}

// ── Profile CRUD ───────────────────────────────────────────────────────
const loadProfile = async () => {
  try {
    const resp = await api('/me')
    const normalized = normalizeUserProfile(resp?.user || {})
    profileData.value = normalized
    originalProfileData.value = { ...normalized }
    avatarVersion.value = Date.now()
    avatarLoadFailed.value = false
  } catch (err) {
    setMessage(`Error: ${err.message}`)
  }
}

const toggleEdit = () => {
  if (isEditing.value) {
    // Discard changes
    profileData.value = { ...originalProfileData.value }
    message.value = ''
  }
  isEditing.value = !isEditing.value
}

const saveProfile = async () => {
  // Guard: blank name
  if (!String(profileData.value.fullName || '').trim()) {
    setMessage('Error: Full name cannot be empty.')
    return
  }

  try {
    const payload = {
      fullName:       String(profileData.value.fullName || '').trim(),
      phoneNumber:    profileData.value.phoneNumber   || null,
      major:          profileData.value.major         || null,
      yearOfStudy:    profileData.value.yearOfStudy   || null,
      targetSubjects: profileData.value.targetSubjects|| null,
      expertise:      Array.isArray(profileData.value.expertise) ? profileData.value.expertise : [],
      bio:            profileData.value.bio            || '',
    }
    const resp = await api('/me/profile', 'PUT', payload)
    const normalized = normalizeUserProfile(resp?.user || profileData.value)
    profileData.value = normalized
    originalProfileData.value = { ...normalized }
    avatarVersion.value = Date.now()
    const token = getToken()
    if (token && resp?.user) setSession(token, resp.user)
    isEditing.value = false
    setMessage('Profile updated!')
  } catch (err) {
    setMessage(`Error: ${err.message}`)
  }
}

onMounted(loadProfile)
</script>

<style scoped>
/* ── Layout ──────────────────────────────────────────────────────────── */
.view {
  padding: 24px;
  max-width: 860px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
}

/* ── Glass Card ──────────────────────────────────────────────────────── */
.glass-card {
  background:
    linear-gradient(160deg, rgba(255,255,255,0.88) 0%, rgba(255,206,227,0.18) 100%);
  border: 1px solid rgba(255, 133, 187, 0.22);
  border-radius: 20px;
  box-shadow:
    0 8px 32px rgba(2, 26, 84, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.70);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 22px;
}

/* ── Hero top ────────────────────────────────────────────────────────── */
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

/* ── Avatar ──────────────────────────────────────────────────────────── */
.profile-pic-wrap {
  position: relative;
  width: 108px;
  height: 108px;
  flex-shrink: 0;
}

.profile-pic-wrap.uploading {
  opacity: 0.6;
}

.profile-pic,
.profile-avatar-fallback {
  width: 108px;
  height: 108px;
  border-radius: 50%;
}

.profile-pic {
  object-fit: cover;
  border: 3px solid #FF85BB;
  background: #fff;
  display: block;
}

.profile-avatar-fallback {
  display: grid;
  place-items: center;
  border: 3px solid #FFCEE3;
  background: linear-gradient(135deg, #FFCEE3 0%, #FF85BB 100%);
  color: #fff;
  font-weight: 800;
  font-size: 30px;
  letter-spacing: 0.03em;
}

.profile-picture-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
}

.upload-spinner {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(2, 26, 84, 0.15);
  border-radius: 50%;
  color: #FF85BB;
}

.upload-spinner svg {
  width: 40px;
  height: 40px;
  animation: spin 0.9s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ── Hero meta ───────────────────────────────────────────────────────── */
.profile-hero-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.profile-hero-meta h2 {
  margin: 0;
  font-size: clamp(22px, 3vw, 32px);
  line-height: 1.1;
  color: #021A54;
  font-weight: 800;
}

.profile-sub {
  margin: 4px 0 0;
  color: #6e6e73;
  font-size: 0.88rem;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 13px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border: 1.5px solid #FFCEE3;
  background: #fff;
  color: #021A54;
  white-space: nowrap;
}

.role-badge.role-tutor {
  background: linear-gradient(135deg, #FFCEE3 0%, #FF85BB 100%);
  border-color: #FF85BB;
  color: #021A54;
}

.role-badge.role-admin {
  background: #021A54;
  border-color: #021A54;
  color: #fff;
}

/* ── Stats strip ─────────────────────────────────────────────────────── */
.profile-stats-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.stat-item {
  background: rgba(245, 245, 245, 0.80);
  border: 1px solid rgba(255, 133, 187, 0.20);
  border-radius: 14px;
  padding: 12px 10px;
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.70rem;
  color: #6e6e73;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  font-weight: 700;
}

.stat-value {
  display: block;
  margin-top: 6px;
  font-size: 1.18rem;
  color: #021A54;
  font-weight: 800;
}

/* ── Panel ───────────────────────────────────────────────────────────── */
.profile-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}

.profile-panel-header h3 {
  margin: 0;
  color: #021A54;
  font-size: 1.05rem;
  font-weight: 700;
}

.profile-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
}

/* ── Chips / buttons ─────────────────────────────────────────────────── */
.btn-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  font-size: 0.80rem;
  font-weight: 700;
  border-radius: 999px;
  border: 1.5px solid #FF85BB;
  background: #fff;
  color: #021A54;
  cursor: pointer;
  transition: background 150ms, transform 150ms, box-shadow 150ms;
  white-space: nowrap;
}

.btn-chip:hover:not(:disabled) {
  background: #FFCEE3;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 133, 187, 0.30);
}

.btn-chip:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-chip--soft {
  border-color: #e0e0e0;
  color: #6e6e73;
}

.btn-chip--soft:hover:not(:disabled) {
  background: #F5F5F5;
  border-color: #FF85BB;
  color: #021A54;
}

.btn-chip--danger {
  border-color: #ffb3c8;
  color: #a11f4a;
}

.btn-chip--danger:hover:not(:disabled) {
  background: #fff0f5;
  border-color: #a11f4a;
}

.btn-primary {
  padding: 10px 24px;
  font-size: 0.88rem;
  font-weight: 700;
  border-radius: 999px;
  border: none;
  background: #FF85BB;
  color: #fff;
  cursor: pointer;
  transition: background 150ms, transform 150ms, box-shadow 150ms;
}

.btn-primary:hover:not(:disabled) {
  background: #ff6da9;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(255, 133, 187, 0.40);
}

.btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ── Form ────────────────────────────────────────────────────────────── */
.profile-form {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-group--full {
  grid-column: 1 / -1;
}

.field-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: #021A54;
  letter-spacing: 0.03em;
}

.field-hint {
  margin-left: 5px;
  font-size: 0.70rem;
  font-weight: 500;
  color: #6e6e73;
  text-transform: none;
  letter-spacing: 0;
}

input,
textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1.5px solid #e0e0e0;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.88rem;
  background: #fff;
  color: #021A54;
  font-family: inherit;
  transition: border-color 150ms, box-shadow 150ms;
}

input:focus,
textarea:focus {
  outline: none;
  border-color: #FF85BB;
  box-shadow: 0 0 0 3px rgba(255, 133, 187, 0.20);
}

input:disabled,
textarea:disabled {
  background: #F5F5F5;
  color: #6e6e73;
  border-color: #e0e0e0;
  cursor: default;
}

input[readonly] {
  background: #F5F5F5;
  color: #6e6e73;
  cursor: default;
}

textarea {
  resize: vertical;
  min-height: 88px;
}

.form-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}

/* ── Status message ──────────────────────────────────────────────────── */
.status-msg {
  margin: 0;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.status-msg--ok {
  background: rgba(2, 26, 84, 0.06);
  color: #021A54;
  border: 1px solid rgba(2, 26, 84, 0.12);
}

.status-msg--error {
  background: rgba(161, 31, 74, 0.06);
  color: #a11f4a;
  border: 1px solid rgba(161, 31, 74, 0.18);
}

/* ── Transition ──────────────────────────────────────────────────────── */
.fade-enter-active,
.fade-leave-active { transition: opacity 300ms; }
.fade-enter-from,
.fade-leave-to     { opacity: 0; }

/* ── Responsive ──────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .view { padding: 14px; }

  .profile-hero-top {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  .profile-hero-meta {
    flex-direction: column;
    align-items: center;
  }

  .profile-stats-strip { grid-template-columns: 1fr; }

  .profile-form { grid-template-columns: 1fr; }

  .field-group--full { grid-column: 1; }

  .profile-actions { justify-content: stretch; }

  .btn-chip,
  .btn-primary { width: 100%; justify-content: center; }

  .form-actions { justify-content: stretch; }

  .form-actions .btn-primary { width: 100%; }
}
</style>