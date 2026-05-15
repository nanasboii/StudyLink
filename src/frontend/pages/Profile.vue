<template>
  <div class="view page active">
    <section class="card profile-hero">
      <div class="profile-hero-top">
        <div class="profile-pic-container">
          <img :src="profileData.profilePicture || '/default-avatar.svg'" alt="Profile Picture" class="profile-pic" />
        </div>
        <div class="profile-hero-meta">
          <div>
            <h2>{{ profileData.fullName }}</h2>
            <p class="profile-sub">Student ID: {{ profileData.studentId }}</p>
          </div>
          <span class="role-badge">{{ profileData.role }}</span>
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

<script>
import { api, getToken, getUser, setSession } from '@/api.js'

export default {
  name: 'Profile',
  data() {
    const user = getUser() || {}
    const normalizedUser = {
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
      profilePicture: user.profilePictureUrl || user.profilePicture || ''
    }

    return {
      isEditing: false,
      profileData: normalizedUser,
      originalProfileData: { ...normalizedUser },
      message: ''
    }
  },
  methods: {
    normalizeUser(user) {
      return {
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
        profilePicture: user.profilePictureUrl || user.profilePicture || ''
      }
    },
    async loadProfile() {
      try {
        const resp = await api('/me')
        const normalized = this.normalizeUser(resp.user || {})
        this.profileData = normalized
        this.originalProfileData = { ...normalized }
      } catch (err) {
        this.message = `Error: ${err.message}`
      }
    },
    toggleEdit() {
      if (this.isEditing) {
        this.profileData = { ...this.originalProfileData }
      }
      this.isEditing = !this.isEditing
    },
    async saveProfile() {
      try {
        const payload = {
          fullName: this.profileData.fullName,
          phoneNumber: this.profileData.phoneNumber,
          major: this.profileData.major,
          bio: this.profileData.bio
        }

        const resp = await api('/me/profile', 'PUT', payload)
        const normalized = this.normalizeUser(resp.user || this.profileData)
        this.profileData = normalized
        this.originalProfileData = { ...normalized }

        const token = getToken()
        if (token && resp.user) {
          setSession(token, resp.user)
        }

        this.message = 'Profile updated!'
        this.isEditing = false
      } catch (err) {
        this.message = `Error: ${err.message}`
      }
    }
  },
  mounted() {
    this.loadProfile()
  }
}
</script>
