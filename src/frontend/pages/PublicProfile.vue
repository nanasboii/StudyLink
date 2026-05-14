<template>
  <div class="view page active">
    <div class="public-profile-header">
      <div>
        <p class="public-profile-kicker">Community profile</p>
        <h2>{{ profileData.fullName }}</h2>
      </div>
      <button @click="goBack" class="chip" type="button">Back to Leaderboard</button>
    </div>

    <div v-if="profileData.id" class="card public-profile-card">
      <div class="public-profile-top">
        <img :src="profileData.profilePicture || '/default-avatar.svg'" alt="Profile picture" class="public-profile-pic" />
        <div>
          <h3>{{ profileData.fullName }}</h3>
          <p class="public-profile-role">{{ profileData.role }}</p>
          <p class="public-profile-meta">Matric: {{ profileData.studentId }}</p>
        </div>
      </div>

      <div class="public-profile-stats">
        <div class="public-profile-stat">
          <span>Achievements</span>
          <strong>{{ profileData.achievements }}</strong>
        </div>
        <div class="public-profile-stat">
          <span>Points</span>
          <strong>{{ profileData.points }}</strong>
        </div>
        <div class="public-profile-stat">
          <span>Rating</span>
          <strong>{{ (profileData.rating || 0).toFixed(2) }}</strong>
        </div>
        <div class="public-profile-stat">
          <span>Verified</span>
          <strong>{{ profileData.isVerified ? 'Yes' : 'No' }}</strong>
        </div>
      </div>

      <div class="public-profile-grid">
        <div class="public-profile-row">
          <span>Major</span>
          <strong>{{ profileData.major || '–' }}</strong>
        </div>
        <div class="public-profile-row">
          <span>Expertise</span>
          <strong>{{ profileData.expertise || '–' }}</strong>
        </div>
      </div>

      <div class="public-profile-bio">
        <p class="public-profile-bio-label">Bio</p>
        <p>{{ profileData.bio || 'No bio provided.' }}</p>
      </div>
    </div>

    <p v-if="message" class="message">{{ message }}</p>
  </div>
</template>

<script>
import { api } from '@/api.js'
export default {
  name: 'PublicProfile',
  data() {
    return {
      profileData: {},
      message: '',
    }
  },
  methods: {
    async loadProfile() {
      try {
        const userId = this.$route.params.userId
        const resp = await api(`/users/${userId}/public`)
        this.profileData = resp.user || {}
      } catch (err) {
        this.message = `Error: ${err.message}`
      }
    },
    goBack() {
      this.$router.back()
    },
  },
  mounted() {
    const viewEl = document.querySelector('.view')
    const topbar = document.querySelector('.topbar')
    if (viewEl) {
      viewEl.scrollTop = topbar ? topbar.offsetHeight : 80
    }
    this.loadProfile()
  },
}
</script>
