<template>
  <main class="page-bg public-profile-page">
    <div class="view page active">
      <div class="public-profile-header">
        <div>
          <p class="public-profile-kicker">Community profile</p>
          <h2>{{ profile.fullName }}</h2>
        </div>
        <button @click="goBack" class="chip" type="button">Back to Leaderboard</button>
      </div>

      <div v-if="profile.id" class="card public-profile-card">
        <div class="public-profile-top">
          <img :src="profile.profilePictureUrl || '/default-avatar.svg'" alt="Profile picture" class="public-profile-pic" />
          <div>
            <h3>{{ profile.fullName }}</h3>
            <p class="public-profile-role">{{ roleLabel(profile.role) }}</p>
            <p class="public-profile-meta">Target subjects: {{ profile.targetSubjects || 'N/A' }}</p>
          </div>
        </div>

        <div class="public-profile-stats">
          <div class="public-profile-stat">
            <span>Achievements</span>
            <strong>{{ profile.totalAchievements }}</strong>
          </div>
          <div class="public-profile-stat">
            <span>Points</span>
            <strong>{{ profile.totalPoints }}</strong>
          </div>
          <div class="public-profile-stat">
            <span>Rating</span>
            <strong>{{ profile.rating.toFixed(2) }}</strong>
          </div>
          <div class="public-profile-stat">
            <span>Reviews</span>
            <strong>{{ profile.reviewsReceived }}</strong>
          </div>
          <div class="public-profile-stat">
            <span>Verified</span>
            <strong>{{ profile.isVerified ? 'Yes' : 'No' }}</strong>
          </div>
        </div>

        <div class="public-profile-grid">
          <div class="public-profile-row">
            <span>Major</span>
            <strong>{{ profile.major || 'N/A' }}</strong>
          </div>
          <div class="public-profile-row">
            <span>Year of study</span>
            <strong>{{ profile.yearOfStudy || 'N/A' }}</strong>
          </div>
          <div class="public-profile-row">
            <span>Expertise</span>
            <strong>{{ profile.expertiseText }}</strong>
          </div>
        </div>

        <div class="public-profile-bio">
          <p class="public-profile-bio-label">Bio</p>
          <p>{{ profile.bio || 'No bio provided.' }}</p>
        </div>
      </div>

      <p v-if="message" class="message">{{ message }}</p>
    </div>
  </main>
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
  computed: {
    profile() {
      const row = this.profileData || {}
      const expertise = Array.isArray(row.expertise) ? row.expertise : []

      return {
        id: row.id,
        fullName: String(row.fullName || 'Unknown User'),
        role: String(row.role || 'tutee'),
        profilePictureUrl: row.profilePictureUrl || '',
        targetSubjects: row.targetSubjects || '',
        major: row.major || '',
        yearOfStudy: row.yearOfStudy || '',
        totalAchievements: Number(row.totalAchievements || 0),
        totalPoints: Number(row.totalPoints || 0),
        rating: Number(row.rating || 0),
        reviewsReceived: Number(row.reviewsReceived || 0),
        isVerified: Boolean(row.isVerified),
        bio: row.bio || '',
        expertiseText: expertise.length ? expertise.join(', ') : 'N/A',
      }
    },
  },
  methods: {
    roleLabel(role) {
      const value = String(role || 'tutee').toLowerCase()
      return value.charAt(0).toUpperCase() + value.slice(1)
    },
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

<style scoped>
.public-profile-page {
  min-height: 100vh;
}

.view {
  overflow-y: auto;
  padding: 24px 16px;
}

.public-profile-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 14px;
  margin-bottom: 14px;
}

.public-profile-kicker {
  margin: 0 0 6px;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
  color: #5e7082;
}

.public-profile-header h2 {
  margin: 0;
  font-size: clamp(28px, 3vw, 36px);
  color: #2e2330;
}

.chip {
  border: 1px solid #c41e3a;
  background: #111;
  color: #fff;
  border-radius: 999px;
  padding: 9px 16px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 150ms ease;
}

.chip:hover {
  background: #c41e3a;
}

.card {
  background: #fff;
  border: 1px solid #f0c4d1;
  border-radius: 16px;
  padding: 22px;
  box-shadow: 0 8px 24px rgba(68, 17, 36, 0.08);
}

.public-profile-card {
  display: grid;
  gap: 18px;
}

.public-profile-top {
  display: flex;
  gap: 14px;
  align-items: center;
}

.public-profile-pic {
  width: 96px;
  height: 96px;
  border-radius: 14px;
  border: 1px solid #efc9d4;
  object-fit: cover;
  background: #fff6f8;
}

.public-profile-top h3 {
  margin: 0;
  color: #2e2330;
  font-size: clamp(24px, 2vw, 30px);
}

.public-profile-role,
.public-profile-meta {
  margin: 4px 0 0;
  color: #6a5b63;
  font-size: 0.95rem;
}

.public-profile-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
}

.public-profile-stat {
  border: 1px solid #f2d3dc;
  border-radius: 12px;
  background: #fff;
  padding: 10px;
}

.public-profile-stat span {
  display: block;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  color: #85747d;
}

.public-profile-stat strong {
  display: block;
  margin-top: 4px;
  color: #2e2330;
  font-size: 1rem;
}

.public-profile-grid {
  display: grid;
  gap: 10px;
}

.public-profile-row {
  border: 1px solid #f2d3dc;
  border-radius: 12px;
  background: #fff;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.public-profile-row span {
  color: #85747d;
  font-size: 0.86rem;
}

.public-profile-row strong {
  color: #2e2330;
  font-size: 0.92rem;
  text-align: right;
}

.public-profile-bio {
  border: 1px solid #f2d3dc;
  border-radius: 12px;
  background: #fff;
  padding: 12px;
}

.public-profile-bio-label {
  margin: 0 0 6px;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 700;
  color: #85747d;
}

.public-profile-bio p {
  margin: 0;
  color: #3f2f38;
  line-height: 1.45;
}

.message {
  margin-top: 12px;
  color: #b42318;
  font-weight: 600;
}

@media (max-width: 640px) {
  .public-profile-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .chip {
    width: 100%;
  }

  .public-profile-top {
    align-items: flex-start;
  }

  .public-profile-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .public-profile-row strong {
    text-align: left;
  }
}
</style>
