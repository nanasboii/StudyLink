<template>
  <div class="view page active">
    <section class="card profile-hero">
      <div class="profile-hero-top">
        <div class="profile-pic-container" @mouseenter="isAvatarHovered = true" @mouseleave="isAvatarHovered = false">
          <img
            v-if="avatarSrc"
            :src="avatarSrc"
            alt="Profile picture"
            class="profile-pic"
            @error="avatarLoadFailed = true"
          />
          <div v-else class="profile-avatar-fallback" aria-label="Profile initials">{{ profileInitials }}</div>
          <div class="profile-pic-overlay" :class="{ visible: isAvatarHovered }">
            <button class="overlay-action" type="button" @click="triggerProfilePictureUpload" :disabled="uploadingProfilePicture">
              Edit Profile Picture
            </button>
            <button class="overlay-action secondary" type="button" @click="removeProfilePicture" :disabled="uploadingProfilePicture || !avatarSrc">
              Remove Profile Picture
            </button>
          </div>
          <input
            ref="profilePictureInput"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            class="profile-picture-input"
            @change="handleProfilePictureSelected"
          />
        </div>
        <div class="profile-hero-meta">
          <div>
            <h2>{{ profileData.fullName }}</h2>
            <p class="profile-sub">Student ID: {{ profileData.studentId }}</p>
          </div>
          <span class="role-badge">{{ roleLabel }}</span>
        </div>
      </div>
      <div class="profile-stats-strip">
        <div class="mini-stat-item">
          <span class="mini-stat-label">Learning Points</span>
          <span class="mini-stat-value">{{ profileData.points }}</span>
        </div>
        <div class="mini-stat-item">
          <span class="mini-stat-label">Rating</span>
          <span class="mini-stat-value">{{ (profileData.rating || 0).toFixed(2) }}</span>
        </div>
        <div class="mini-stat-item">
          <span class="mini-stat-label">Verified</span>
          <span class="mini-stat-value">{{ profileData.isVerified ? 'Yes' : 'No' }}</span>
        </div>
      </div>
    </section>

    <section class="card profile-panel">
      <div class="profile-header">
        <h3>Profile Information</h3>
        <button @click="toggleEdit" class="chip" type="button">{{ isEditing ? 'Cancel' : 'Edit Profile' }}</button>
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
          <label class="field-label">Bio</label>
          <textarea v-model="profileData.bio" :disabled="!isEditing" rows="4"></textarea>
        </div>
        <div v-if="isEditing" class="edit-actions">
          <button class="primary" type="submit">Save Changes</button>
        </div>
      </form>
    </section>

    <p v-if="message" class="message">{{ message }}</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api, getToken, getUser, setSession } from '@/api.js'

const normalizeUser = (user) => ({
  fullName:
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    '',
  email: user.email || '',
  phoneNumber: user.phoneNumber || '',
  major: user.major || '',
  bio: user.bio || '',
  studentId: user.studentId || '',
  role: user.role || '',
  points: Number(user.totalPoints ?? user.points ?? 0),
  rating: Number(user.rating || 0),
  isVerified: Boolean(user.isVerified),
  profilePicture: user.profilePictureUrl || user.profilePicture || '',
})

const initialUser = getUser() || {}
const profileData = ref(normalizeUser(initialUser))
const originalProfileData = ref({ ...profileData.value })
const isEditing = ref(false)
const message = ref('')
const avatarLoadFailed = ref(false)
const isAvatarHovered = ref(false)
const uploadingProfilePicture = ref(false)
const profilePictureInput = ref(null)

const avatarSrc = computed(() => {
  if (avatarLoadFailed.value) return ''
  return profileData.value.profilePicture || ''
})

const profileInitials = computed(() => {
  const fullName = String(profileData.value.fullName || '').trim()
  if (!fullName) return 'SL'
  const parts = fullName.split(/\s+/).slice(0, 2)
  return parts.map((part) => part.charAt(0).toUpperCase()).join('')
})

const roleLabel = computed(() => {
  const role = String(profileData.value.role || '').trim()
  if (!role) return 'Member'
  return role.charAt(0).toUpperCase() + role.slice(1)
})

const loadProfile = async () => {
  try {
    const resp = await api('/me')
    const normalized = normalizeUser(resp.user || {})
    profileData.value = normalized
    originalProfileData.value = { ...normalized }
    avatarLoadFailed.value = false
  } catch (err) {
    message.value = `Error: ${err.message}`
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
      fullName: profileData.value.fullName,
      phoneNumber: profileData.value.phoneNumber,
      major: profileData.value.major,
      bio: profileData.value.bio,
    }
    const resp = await api('/me/profile', 'PUT', payload)
    const normalized = normalizeUser(resp.user || profileData.value)
    profileData.value = normalized
    originalProfileData.value = { ...normalized }
    const token = getToken()
    if (token && resp.user) setSession(token, resp.user)
    message.value = 'Profile updated!'
    isEditing.value = false
  } catch (err) {
    message.value = `Error: ${err.message}`
  }
}

const triggerProfilePictureUpload = () => {
  profilePictureInput.value?.click()
}

const uploadProfilePicture = async (file) => {
  const formData = new FormData()
  formData.append('image', file)

  const token = getToken()
  const headers = {}
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch('/api/uploads/profile-picture', {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `HTTP ${response.status}`)
  }

  return response.json()
}

const handleProfilePictureSelected = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  uploadingProfilePicture.value = true
  try {
    const uploadResult = await uploadProfilePicture(file)
    const resp = await api('/me/profile', 'PUT', { profilePictureUrl: uploadResult.fileUrl })
    const normalized = normalizeUser(resp.user || profileData.value)
    profileData.value = normalized
    originalProfileData.value = { ...normalized }
    const token = getToken()
    if (token && resp.user) setSession(token, resp.user)
    avatarLoadFailed.value = false
    message.value = 'Profile picture updated!'
  } catch (err) {
    message.value = `Error: ${err.message}`
  } finally {
    uploadingProfilePicture.value = false
  }
}

const removeProfilePicture = async () => {
  uploadingProfilePicture.value = true
  try {
    const resp = await api('/me/profile', 'PUT', { removeProfilePicture: true })
    const normalized = normalizeUser(resp.user || profileData.value)
    profileData.value = normalized
    originalProfileData.value = { ...normalized }
    const token = getToken()
    if (token && resp.user) setSession(token, resp.user)
    avatarLoadFailed.value = false
    message.value = 'Profile picture removed.'
  } catch (err) {
    message.value = `Error: ${err.message}`
  } finally {
    uploadingProfilePicture.value = false
  }
}

onMounted(() => {
  loadProfile()
})
</script>

<style scoped>
.view {
  padding: 22px;
  max-width: 1100px;
  margin: 0 auto;
}

.card {
  border: 1px solid #efd3dc;
  border-radius: 16px;
  background: linear-gradient(180deg, #fffdfd 0%, #fff7fa 100%);
  box-shadow: 0 14px 28px rgba(121, 34, 64, 0.08);
  padding: 20px;
}

.profile-hero {
  display: grid;
  gap: 16px;
  margin-bottom: 14px;
}

.profile-hero-top {
  display: grid;
  grid-template-columns: 104px 1fr;
  gap: 16px;
  align-items: center;
}

.profile-pic-container {
  width: 100px;
  height: 100px;
  position: relative;
  overflow: hidden;
  border-radius: 50%;
  cursor: pointer;
}

.profile-pic,
.profile-avatar-fallback {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.profile-pic {
  object-fit: cover;
  border: 3px solid #f3c4d3;
  background: #fff;
  display: block;
}

.profile-picture-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
}

.profile-pic-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border-radius: 50%;
  background: rgba(55, 16, 34, 0.58);
  opacity: 0;
  transition: opacity 160ms ease;
  pointer-events: none;
}

.profile-pic-overlay.visible {
  opacity: 1;
  pointer-events: auto;
}

.overlay-action {
  border: 1px solid rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.96);
  color: #6e1638;
  border-radius: 999px;
  padding: 7px 10px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  width: 100%;
  transition: transform 150ms ease, background 150ms ease;
}

.overlay-action:hover {
  transform: translateY(-1px);
  background: #fff;
}

.overlay-action.secondary {
  background: rgba(255, 243, 247, 0.98);
}

.profile-avatar-fallback {
  display: grid;
  place-items: center;
  border: 3px solid #f3c4d3;
  background: linear-gradient(135deg, #f48fb1 0%, #d81b60 100%);
  color: #fff;
  font-weight: 700;
  font-size: 28px;
  letter-spacing: 0.03em;
}

.profile-hero-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.profile-hero-meta h2 {
  margin: 0;
  font-size: clamp(26px, 3.2vw, 36px);
  line-height: 1.05;
  color: #3a1d2a;
}

.profile-sub {
  margin: 6px 0 0;
  color: #755160;
  font-size: 0.95rem;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid #f0aec2;
  background: #fff;
  color: #8f1d47;
  font-size: 0.82rem;
  font-weight: 700;
}

.profile-stats-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.mini-stat-item {
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid #f2c8d6;
  border-radius: 12px;
  padding: 12px;
  text-align: center;
}

.mini-stat-label {
  display: block;
  font-size: 0.74rem;
  color: #805362;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
}

.mini-stat-value {
  display: block;
  margin-top: 6px;
  font-size: 1.24rem;
  color: #6e1638;
  font-weight: 800;
}

.profile-panel {
  margin-bottom: 12px;
}

.profile-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  gap: 12px;
}

.profile-header h3 {
  margin: 0;
  color: #4a2735;
}

.profile-form {
  display: grid;
  gap: 10px;
}

.profile-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 13px;
  font-weight: 700;
  color: #5d3b49;
}

.field-hint {
  margin-left: 4px;
  color: #8d7180;
  font-size: 11px;
  font-weight: 500;
}

input,
textarea {
  width: 100%;
  border: 1px solid #efc2d1;
  border-radius: 10px;
  padding: 11px 12px;
  font-size: 14px;
  background: #fff;
  color: #41252f;
  font-family: inherit;
}

input:disabled,
textarea:disabled {
  background: #fff8fb;
  color: #8f7380;
  border-color: #f3d7e0;
}

input:focus,
textarea:focus {
  outline: none;
  border-color: #d81b60;
  box-shadow: 0 0 0 3px rgba(216, 27, 96, 0.12);
}

.edit-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}

.message {
  margin: 8px 2px 0;
  color: #9d254d;
  font-weight: 600;
}

@media (max-width: 860px) {
  .view {
    padding: 14px;
  }

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

  .edit-actions {
    justify-content: stretch;
  }

  .edit-actions .primary {
    width: 100%;
  }
}
</style>
