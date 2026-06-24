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
          <span class="stat-label">🏆 POINTS</span>
          <span class="stat-value">{{ profileData.points ?? 0 }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">⭐ RATING</span>
          <span class="stat-value">{{ ratingDisplay }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">✅ VERIFIED</span>
          <span class="stat-value" :class="profileData.isVerified ? 'val-yes' : 'val-no'">
            {{ profileData.isVerified ? 'Yes' : 'No' }}
          </span>
        </div>
      </div>
    </section>

    <!-- ── SKELETON (initial load) ── -->
    <section v-if="isLoading" class="glass-card profile-panel">
      <div class="skel-header">
        <div class="skel skel-title"></div>
        <div class="skel skel-btn"></div>
      </div>
      <div class="skel-grid">
        <div v-for="n in 6" :key="n" class="skel-field">
          <div class="skel skel-label"></div>
          <div class="skel skel-input"></div>
        </div>
      </div>
    </section>

    <!-- ── FORM PANEL ── -->
    <section v-else class="glass-card profile-panel">
      <div class="profile-panel-header">
        <h3>Profile Information</h3>
        <div class="profile-actions">
          <!-- FIX → disable during save -->
          <button @click="toggleEdit" class="btn-chip" type="button" :disabled="isSaving">
            {{ isEditing ? 'Cancel' : 'Edit Profile' }}
          </button>
          <template v-if="isEditing">
            <button
              @click="triggerProfilePictureUpload"
              class="btn-chip btn-chip--soft"
              type="button"
              :disabled="uploadingProfilePicture || isSaving"
            >
              📷 Change Picture
            </button>
            <button
              v-if="avatarSrc"
              @click="removeProfilePicture"
              class="btn-chip btn-chip--danger"
              type="button"
              :disabled="uploadingProfilePicture || isSaving"
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
            :disabled="!isEditing || isSaving"
            placeholder="Your full name"
            autocomplete="name"
            class="glass-input"
          />
        </div>

        <!-- Email (read-only) -->
        <div class="field-group">
          <label class="field-label" for="email">
            Email <span class="field-hint">read-only</span>
          </label>
          <input id="email" :value="profileData.email" readonly class="glass-input glass-input--readonly" />
        </div>

        <!-- Phone -->
        <div class="field-group">
          <label class="field-label" for="phone">Phone Number</label>
          <input
            id="phone"
            v-model.trim="profileData.phoneNumber"
            :disabled="!isEditing || isSaving"
            placeholder="+60 12 345 6789"
            autocomplete="tel"
            class="glass-input"
          />
        </div>

        <!-- Major -->
        <div class="field-group">
          <label class="field-label" for="major">Major</label>
          <input
            id="major"
            v-model.trim="profileData.major"
            :disabled="!isEditing || isSaving"
            placeholder="e.g. Computer Science"
            class="glass-input"
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
            :disabled="!isEditing || isSaving"
            placeholder="1 – 7"
            class="glass-input"
          />
        </div>

        <!-- Target Subjects (tutee only) -->
        <div class="field-group" v-if="profileData.role === 'tutee'">
          <label class="field-label" for="targetSubjects">
            Target Subjects <span class="field-hint">comma-separated</span>
          </label>
          <input
            id="targetSubjects"
            v-model="profileData.targetSubjects"
            :disabled="!isEditing || isSaving"
            placeholder="e.g. Database, Algorithms"
            class="glass-input"
          />
        </div>

        <!-- Expertise (tutor only) -->
        <div class="field-group" v-if="profileData.role === 'tutor'">
          <label class="field-label" for="expertise">
            Expertise <span class="field-hint">comma-separated</span>
          </label>
          <input
            id="expertise"
            v-model="expertiseInput"
            :disabled="!isEditing || isSaving"
            placeholder="e.g. Java, SQL, Computer Graphics"
            class="glass-input"
          />
        </div>

        <!-- Bio -->
        <div class="field-group field-group--full">
          <label class="field-label" for="bio">Bio</label>
          <textarea
            id="bio"
            v-model.trim="profileData.bio"
            :disabled="!isEditing || isSaving"
            rows="4"
            placeholder="Tell the community about yourself…"
            class="glass-textarea"
          ></textarea>
        </div>

        <!-- FIX → isSaving guard on button + spinner text -->
        <div v-if="isEditing" class="form-actions">
          <button
            class="btn-primary"
            type="submit"
            :disabled="uploadingProfilePicture || isSaving"
          >
            <span v-if="isSaving" class="saving-dots">Saving…</span>
            <span v-else>Save Changes</span>
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
const profileData             = ref(normalizeUserProfile(initialUser))
const originalProfileData     = ref({ ...profileData.value })
const isEditing               = ref(false)
// FIX → added isSaving; was missing entirely
const isSaving                = ref(false)
const isLoading               = ref(true)
const message                 = ref('')
const avatarLoadFailed        = ref(false)
const uploadingProfilePicture = ref(false)
const profilePictureInput     = ref(null)
const avatarVersion           = ref(Date.now())
const pendingAvatarPreview    = ref('')
const pendingAvatarServerUrl  = ref('')

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
  if (pendingAvatarPreview.value) return
  avatarLoadFailed.value = true
}

const triggerProfilePictureUpload = () => {
  profilePictureInput.value?.click()
}

const handleProfilePictureSelected = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  e.target.value = ''

  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
  if (!allowed.includes(file.type)) {
    setMessage('Error: Unsupported image type.')
    return
  }

  clearPendingAvatarPreview()
  pendingAvatarPreview.value = URL.createObjectURL(file)

  uploadingProfilePicture.value = true
  try {
    const form = new FormData()
    form.append('image', file)
    const resp = await api('/uploads/profile-picture', 'POST', form)

    const uploadedUrl = normalizeAssetUrl(resp.fileUrl || '')
    if (!uploadedUrl) throw new Error('No file URL returned from server.')

    pendingAvatarServerUrl.value = uploadedUrl
    const ready = await waitForImageAvailability(uploadedUrl)
    if (ready) {
      // Patch profileData with the new picture URL BEFORE clearing the preview
      profileData.value.profilePicture = uploadedUrl
      originalProfileData.value.profilePicture = uploadedUrl
      clearPendingAvatarPreview()
      avatarVersion.value = Date.now()
    }

    avatarLoadFailed.value = false
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
  isLoading.value = true
  try {
    const resp = await api('/me')
    const normalized = normalizeUserProfile(resp?.user || {})
    profileData.value = normalized
    originalProfileData.value = { ...normalized }
    avatarVersion.value = Date.now()
    avatarLoadFailed.value = false
  } catch (err) {
    setMessage(`Error: ${err.message}`)
  } finally {
    isLoading.value = false
  }
}

const toggleEdit = () => {
  if (isSaving.value) return
  if (isEditing.value) {
    profileData.value = { ...originalProfileData.value }
    message.value = ''
  }
  isEditing.value = !isEditing.value
}

// FIX → isSaving guard prevents double-submit; reset on error path
const saveProfile = async () => {
  if (isSaving.value) return

  if (!String(profileData.value.fullName || '').trim()) {
    setMessage('Error: Full name cannot be empty.')
    return
  }

  isSaving.value = true
  try {
    const payload = {
      fullName:       String(profileData.value.fullName || '').trim(),
      phoneNumber:    profileData.value.phoneNumber    || null,
      major:          profileData.value.major          || null,
      yearOfStudy:    profileData.value.yearOfStudy    || null,
      targetSubjects: profileData.value.targetSubjects || null,
      expertise:      Array.isArray(profileData.value.expertise) ? profileData.value.expertise : [],
      bio:            profileData.value.bio             || '',
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
    // FIX → isSaving resets on error so user can retry
    setMessage(`Error: ${err.message}`)
  } finally {
    isSaving.value = false
  }
}

onMounted(loadProfile)
</script>

<style scoped>
/* ── Layout ── */
.view {
  padding: 24px;
  max-width: 860px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
}

/* ── Glass Card ── */
.glass-card {
  background: linear-gradient(160deg, rgba(255,255,255,0.88) 0%, rgba(255,206,227,0.18) 100%);
  border: 1px solid rgba(255, 133, 187, 0.22);
  border-radius: 20px;
  box-shadow:
    0 8px 32px rgba(2, 26, 84, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.70);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  padding: 22px;
}

/* ── Hero top ── */
.profile-hero { display: grid; gap: 18px; }

.profile-hero-top {
  display: grid;
  grid-template-columns: 108px 1fr;
  gap: 18px;
  align-items: center;
}

/* ── Avatar ── */
.profile-pic-wrap {
  position: relative;
  width: 108px;
  height: 108px;
  flex-shrink: 0;
}

.profile-pic-wrap.uploading { opacity: 0.6; }

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

/* ── Hero meta ── */
.profile-hero-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.profile-hero-meta h2 {
  margin: 0 0 4px;
  font-size: clamp(1.3rem, 3vw, 1.7rem);
  font-weight: 800;
  color: var(--ink, #021A54);
}

.profile-sub {
  margin: 2px 0 0;
  font-size: 0.85rem;
  color: var(--ink-muted, #6e6e73);
}

/* ── Role badge ── */
.role-badge {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.role-tutor  { background: #FF85BB; color: #fff; }
.role-tutee  { background: var(--primary-soft, #FFCEE3); color: var(--ink, #021A54); border: 1px solid rgba(255,133,187,0.3); }
.role-admin  { background: var(--ink, #021A54); color: #fff; }

/* ── Stats strip ── */
.profile-stats-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 133, 187, 0.18);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  background: rgba(255,255,255,0.6);
  border: 1px solid rgba(255,133,187,0.15);
  border-radius: 14px;
}

.stat-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-muted, #6e6e73);
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--ink, #021A54);
}

.val-yes { color: #1a7a48; }
.val-no  { color: var(--ink-muted, #6e6e73); }

/* ── Panel header ── */
.profile-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.profile-panel-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink, #021A54);
}

.profile-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* ── Chip buttons ── */
.btn-chip {
  padding: 6px 16px;
  border-radius: 20px;
  border: 1.5px solid rgba(255, 133, 187, 0.5);
  background: transparent;
  color: var(--ink, #021A54);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}

.btn-chip:hover:not(:disabled) {
  background: rgba(255, 133, 187, 0.1);
}

.btn-chip:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-chip--soft {
  background: rgba(255, 206, 227, 0.35);
  border-color: rgba(255, 133, 187, 0.3);
}

.btn-chip--danger {
  border-color: rgba(191, 47, 69, 0.4);
  color: #c22840;
}

.btn-chip--danger:hover:not(:disabled) {
  background: rgba(191, 47, 69, 0.08);
}

/* ── Form ── */
.profile-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-group--full {
  grid-column: 1 / -1;
}

.field-label {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--ink, #021A54);
}

.field-hint {
  font-weight: 400;
  font-size: 0.72rem;
  color: var(--ink-muted, #6e6e73);
  margin-left: 4px;
}

/* ── Inputs ── */
.glass-input {
  width: 100%;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1.5px solid rgba(2, 26, 84, 0.12);
  background: rgba(255, 255, 255, 0.85);
  font: inherit;
  font-size: 0.92rem;
  color: var(--ink, #021A54);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}

.glass-input:focus {
  border-color: #FF85BB;
  box-shadow: 0 0 0 3px rgba(255, 133, 187, 0.18);
}

.glass-input:disabled {
  background: rgba(245, 245, 245, 0.7);
  color: var(--ink-muted, #6e6e73);
  cursor: default;
}

.glass-input--readonly {
  background: rgba(245, 245, 245, 0.6);
  color: var(--ink-muted, #6e6e73);
  cursor: default;
}

.glass-textarea {
  width: 100%;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1.5px solid rgba(2, 26, 84, 0.12);
  background: rgba(255, 255, 255, 0.85);
  font: inherit;
  font-size: 0.92rem;
  color: var(--ink, #021A54);
  outline: none;
  resize: vertical;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}

.glass-textarea:focus {
  border-color: #FF85BB;
  box-shadow: 0 0 0 3px rgba(255, 133, 187, 0.18);
}

.glass-textarea:disabled {
  background: rgba(245, 245, 245, 0.7);
  color: var(--ink-muted, #6e6e73);
  cursor: default;
}

/* ── Form actions ── */
.form-actions {
  grid-column: 1 / -1;
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}

.btn-primary {
  padding: 11px 28px;
  border-radius: 24px;
  border: none;
  background: #FF85BB;
  color: #fff;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  min-width: 130px;
}

.btn-primary:hover:not(:disabled) { background: #ff6da9; }
.btn-primary:active:not(:disabled) { transform: scale(0.97); }
.btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* FIX → saving dots animation -->
.saving-dots::after {
  content: '';
  animation: dots 1.2s steps(3, end) infinite;
}

@keyframes dots {
  0%   { content: ''; }
  33%  { content: '.'; }
  66%  { content: '..'; }
  100% { content: '...'; }
}

/* ── Skeleton shimmer ── */
.skel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.skel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.skel-field { display: flex; flex-direction: column; gap: 6px; }

.skel {
  border-radius: 8px;
  background: linear-gradient(90deg, #f0eef5 25%, #e8e6f0 50%, #f0eef5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skel-title  { height: 18px; width: 160px; }
.skel-btn    { height: 32px; width: 90px; border-radius: 20px; }
.skel-label  { height: 12px; width: 80px; }
.skel-input  { height: 40px; border-radius: 12px; }

/* ── Status message ── */
.status-msg {
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 0.88rem;
  font-weight: 500;
  margin: 0;
}

.status-msg--ok {
  background: rgba(26, 122, 72, 0.08);
  border: 1px solid rgba(26, 122, 72, 0.2);
  color: #1a7a48;
}

.status-msg--error {
  background: rgba(191, 47, 69, 0.08);
  border: 1px solid rgba(191, 47, 69, 0.22);
  color: #c22840;
}

/* ── Fade transition ── */
.fade-enter-active,
.fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from,
.fade-leave-to     { opacity: 0; }

/* ── Responsive ── */
@media (max-width: 600px) {
  .view { padding: 16px; }
  .profile-hero-top { grid-template-columns: 80px 1fr; }
  .profile-pic,
  .profile-avatar-fallback,
  .profile-pic-wrap { width: 80px; height: 80px; }
  .profile-avatar-fallback { font-size: 22px; }
  .profile-form { grid-template-columns: 1fr; }
  .profile-stats-strip { grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .stat-value { font-size: 1rem; }
  .skel-grid { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .skel,
  .upload-spinner svg,
  .saving-dots::after { animation: none; }
}
</style>