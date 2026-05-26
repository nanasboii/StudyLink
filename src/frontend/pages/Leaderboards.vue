<template>
  <main class="page-bg leaderboard-page">
    <section class="phone-shell">
      <div class="view page active">
        <section class="card leaderboard-hero">
          <p class="leaderboard-kicker">Community standings</p>
          <div class="leaderboard-header">
            <h2>Total Achievement Leaderboard</h2>
            <button @click="refreshLeaderboard" class="chip" type="button">Refresh</button>
          </div>
        </section>

        <div class="leaderboard-tabs" role="tablist" aria-label="Leaderboard type">
          <button
            v-for="board in ['overall', 'tutor', 'tutee']"
            :key="board"
            @click="activeBoard = board"
            class="tab-btn"
            :class="{ 'is-active': activeBoard === board }"
            type="button"
            role="tab"
            :aria-selected="activeBoard === board"
          >
            {{ boardLabel(board) }}
          </button>
        </div>

        <p class="leaderboard-summary">{{ leaderboardRankingLabel }} - {{ filteredLeaderboard.length }} ranked users - Updated {{ updateTime }}</p>

        <div class="leaderboard-list">
          <div v-for="(entry, index) in filteredLeaderboard" :key="entry.id" class="leaderboard-card">
            <div class="rank-badge" :style="{ backgroundColor: getRankColor(index) }">
              <span class="rank-number">#{{ index + 1 }}</span>
            </div>
            
            <div class="leaderboard-content">
              <div class="profile-section">
                <img
                  v-if="hasProfilePicture(entry)"
                  :src="resolveProfilePictureUrl(entry.profilePictureUrl)"
                  :alt="`${entry.fullName} profile picture`"
                  class="profile-pic"
                  @error="handleAvatarError(entry)"
                />
                <div v-else class="profile-pic profile-pic-fallback" aria-hidden="true">
                  <svg viewBox="0 0 24 24" role="img">
                    <path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2c-4.42 0-8 2.46-8 5.5 0 .55.45 1 1 1h14c.55 0 1-.45 1-1 0-3.04-3.58-5.5-8-5.5Z" />
                  </svg>
                </div>
                <div class="profile-info">
                  <div class="profile-name">
                    <strong>{{ entry.fullName }}</strong>
                    <span class="role-badge" :class="'role-' + String(entry.role).toLowerCase()">{{ roleLabel(entry.role) }}</span>
                  </div>
                </div>
              </div>

              <div class="stats-group">
                <div class="stat-item">
                  <span class="stat-label">Achievements</span>
                  <strong>{{ entry.totalAchievements }}</strong>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Points</span>
                  <strong>{{ entry.totalPoints }}</strong>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Rating</span>
                  <strong>{{ entry.rating.toFixed(2) }}</strong>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Reviews</span>
                  <strong>{{ entry.reviewsReceived }}</strong>
                </div>
              </div>

              <button @click="goToProfile(entry.id)" class="view-profile-btn" type="button">View Public Profile</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api.js'

const router = useRouter()

const activeBoard = ref('overall')
const leaderboardState = ref([])
const avatarLoadErrors = ref({})

const getAvatarKey = (entry) => String(entry.id || entry.fullName || '')

const resolveProfilePictureUrl = (rawUrl) => {
  const value = String(rawUrl || '').trim()
  if (!value) return ''
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) return value
  return value.startsWith('/') ? value : `/${value.replace(/^\/+/, '')}`
}

const hasProfilePicture = (entry) => {
  const key = getAvatarKey(entry)
  return !!resolveProfilePictureUrl(entry.profilePictureUrl) && !avatarLoadErrors.value[key]
}

const handleAvatarError = (entry) => {
  const key = getAvatarKey(entry)
  avatarLoadErrors.value = {
    ...avatarLoadErrors.value,
    [key]: true
  }
}

const normalizedLeaderboard = computed(() =>
  (leaderboardState.value || []).map((entry) => ({
    id: entry.id,
    fullName: String(entry.fullName || 'Unknown User'),
    role: String(entry.role || 'tutee'),
    profilePictureUrl: entry.profilePictureUrl || entry.profile_picture_url || entry.profilePicture || entry.profile_picture || '',
    totalAchievements: Number(entry.totalAchievements || entry.achievementCount || 0),
    totalPoints: Number(entry.totalPoints || entry.points || 0),
    rating: Number(entry.rating || 0),
    reviewsReceived: Number(entry.reviewsReceived || entry.reviewCount || 0),
  }))
)

const leaderboardRankingLabel = computed(() => {
  const board = activeBoard.value
  return board === 'tutor' ? 'Top Tutors Ranking' : board === 'tutee' ? 'Top Tutees Ranking' : 'Overall Ranking'
})

const updateTime = computed(() =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
)

const filteredLeaderboard = computed(() => {
  if (activeBoard.value === 'tutor')
    return normalizedLeaderboard.value.filter((e) => String(e.role).toLowerCase() === 'tutor')
  if (activeBoard.value === 'tutee')
    return normalizedLeaderboard.value.filter((e) => String(e.role).toLowerCase() === 'tutee')
  return normalizedLeaderboard.value
})

const getRankColor = (index) => {
  const colors = ['#FFD700', '#C0C0C0', '#CD7F32', '#9575CD', '#64B5F6', '#81C784']
  return colors[index % colors.length]
}

const roleLabel = (role) => {
  const v = String(role || 'tutee').toLowerCase()
  return v === 'admin' ? 'ADMIN' : v === 'tutor' ? 'TUTOR' : 'TUTEE'
}

const boardLabel = (board) =>
  board === 'tutor' ? 'Top Tutors' : board === 'tutee' ? 'Top Tutees' : 'Overall'

const goToProfile = (userId) => {
  router.push({
    name: 'PublicProfile',
    params: { userId },
    query: { from: 'leaderboards' }
  })
}

const refreshLeaderboard = async () => {
  try {
    const resp = await api('/leaderboard')
    leaderboardState.value = resp.leaderboard || []
    avatarLoadErrors.value = {}
  } catch (err) {
    console.error('Failed to load leaderboard:', err)
  }
}

onMounted(() => {
  refreshLeaderboard()
  window.addEventListener('studylink-profile-updated', refreshLeaderboard)
})

onUnmounted(() => {
  window.removeEventListener('studylink-profile-updated', refreshLeaderboard)
})
</script>

<style scoped>
.page-bg {
  min-height: 100vh;
  display: block;
  padding: 0;
  background: linear-gradient(180deg, #ffffff, #f5f5f7);
}

.phone-shell {
  width: 100%;
  max-width: 100%;
  margin: 0;
  min-height: 100vh;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  display: grid;
  grid-template-rows: 1fr;
  overflow: hidden;
}

.view {
  overflow-y: auto;
  padding: 20px 16px;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.leaderboard-kicker {
  margin: 0 0 8px 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #b11f4b;
  font-weight: 700;
}

.leaderboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.leaderboard-header h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #1d1d1f;
}

.chip {
  font-size: 12px;
  font-weight: 600;
}

.leaderboard-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.tab-btn {
  border: 1px solid #e0e0e0;
  background: white;
  color: #6e6e73;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
}

.tab-btn:hover {
  border-color: #b11f4b;
  color: #b11f4b;
}

.tab-btn.is-active {
  background: #f5c1d1;
  color: #b11f4b;
  border-color: #b11f4b;
}

.leaderboard-summary {
  margin: 0 0 20px 0;
  font-size: 13px;
  color: #6e6e73;
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.leaderboard-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  display: flex;
  gap: 16px;
  align-items: stretch;
  overflow: hidden;
  transition: all 150ms ease;
}

.leaderboard-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-color: #ffb7c5;
}

.rank-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  padding: 16px;
  font-weight: 700;
  color: white;
}

.rank-number {
  font-size: 16px;
  font-weight: 700;
}

.leaderboard-content {
  flex: 1;
  padding: 16px;
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
}

.profile-section {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 180px;
}

.profile-pic {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.profile-pic-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f7;
  color: #b11f4b;
  border: 1px solid #e0e0e0;
}

.profile-pic-fallback svg {
  width: 22px;
  height: 22px;
  fill: currentColor;
}

.profile-info {
  flex: 1;
}

.profile-name {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.profile-name strong {
  color: #1d1d1f;
  font-size: 14px;
}

.role-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 3px 6px;
  border-radius: 3px;
}

.role-badge.role-tutor {
  background: var(--warning-bg);
  color: var(--warning-ink);
}

.role-badge.role-tutee {
  background: var(--primary-soft);
  color: var(--primary);
}

.role-badge.role-admin {
  background: var(--danger-bg);
  color: var(--danger-ink);
}

.stats-group {
  display: flex;
  gap: 24px;
  align-items: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-label {
  font-size: 11px;
  color: #6e6e73;
  font-weight: 500;
  margin-bottom: 4px;
}

.stat-item strong {
  font-size: 16px;
  color: #1d1d1f;
}

.view-profile-btn {
  border: 1px solid #e0e0e0;
  background: white;
  color: #6e6e73;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
  white-space: nowrap;
}

.view-profile-btn:hover {
  border-color: #b11f4b;
  color: #b11f4b;
  background: #f5f5f7;
}

@media (max-width: 768px) {
  .leaderboard-content {
    flex-direction: column;
    gap: 12px;
  }

  .profile-section {
    width: 100%;
  }

  .stats-group {
    width: 100%;
    justify-content: space-around;
  }

  .view-profile-btn {
    width: 100%;
  }
}
</style>

