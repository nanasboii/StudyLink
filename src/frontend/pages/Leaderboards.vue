<template>
  <main class="page-bg leaderboard-page">
    <section class="phone-shell">
      <div class="view page active">
        
        <!-- Hero Section -->
        <section class="card leaderboard-hero glass-panel">
          <p class="leaderboard-kicker">Community standings</p>
          <div class="leaderboard-header">
            <h2>Total Achievement Leaderboard</h2>
            <div class="header-actions">
              <span v-if="lastFetchedAt" class="update-pulse">
                <span class="pulse-dot"></span> Updated {{ lastFetchedAt }}
              </span>
              <button @click="refreshLeaderboard" class="chip action-btn" :disabled="isLoading" type="button">
                {{ isLoading ? 'Refreshing...' : 'Refresh' }}
              </button>
            </div>
          </div>
        </section>

        <!-- Error Banner -->
        <div v-if="errorMessage" class="feedback-msg error-banner">
          {{ errorMessage }}
        </div>

        <!-- Controls: Tabs, Search, Sort -->
        <div class="controls-container">
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

          <div class="filter-group">
            <input 
              v-model="searchQuery" 
              type="text" 
              class="search-input" 
              placeholder="Search by name..." 
            />
            <div class="sort-pill">
              <button :class="{ active: sortBy === 'points' }" @click="sortBy = 'points'">Points</button>
              <button :class="{ active: sortBy === 'rating' }" @click="sortBy = 'rating'">Rating</button>
              <button :class="{ active: sortBy === 'reviews' }" @click="sortBy = 'reviews'">Reviews</button>
            </div>
          </div>
        </div>

        <p class="leaderboard-summary">
          {{ leaderboardRankingLabel }} - {{ filteredLeaderboard.length }} ranked users
        </p>

        <!-- Loading State -->
        <div v-if="isLoading && !filteredLeaderboard.length" class="loading-state">
          <div class="spinner"></div>
          <p>Loading leaderboard...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="filteredLeaderboard.length === 0" class="empty-state glass-panel">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="var(--primary-soft)"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
          <h3>No users found</h3>
          <p>Try adjusting your search or switching tabs.</p>
        </div>

        <!-- Leaderboard List -->
        <div v-else class="leaderboard-list">
          <div 
            v-for="(entry, index) in filteredLeaderboard" 
            :key="entry.id" 
            class="leaderboard-card"
            :class="{ 
              'podium-card': index < 3, 
              'is-self': String(entry.id) === String(userId) 
            }"
          >
            <!-- Highlight Self Badge -->
            <div v-if="String(entry.id) === String(userId)" class="self-badge">YOU</div>

            <div class="rank-badge" :style="{ backgroundColor: getRankColor(index) }">
              <span class="rank-number" :class="{ 'podium-text': index < 3 }">#{{ index + 1 }}</span>
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
                    <strong v-html="highlightSearch(entry.fullName)"></strong>
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
                  <strong>{{ entry.ratingFormatted }}</strong>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Reviews</span>
                  <strong>{{ entry.reviewsReceived }}</strong>
                </div>
              </div>

              <button @click="goToProfile(entry.id)" class="view-profile-btn" type="button">Profile</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Sticky Mini Bar for Current User -->
      <div v-if="currentUserRank" class="sticky-self-bar glass-panel">
        <span>Your Rank: <strong>#{{ currentUserRank }}</strong></span>
        <span>Points: <strong>{{ currentUserPoints }}</strong></span>
        <button @click="scrollToSelf" class="action-btn outline">Find Me</button>
      </div>

    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api.js'
// import { getUser } from '@/auth.js' // Assuming user fetching logic exists

const router = useRouter()

// Refs & State
const activeBoard = ref('overall')
const sortBy = ref('points')
const searchQuery = ref('')
const leaderboardState = ref([])
const avatarLoadErrors = ref({})
const isLoading = ref(false)
const errorMessage = ref('')
const lastFetchedAt = ref(null)
const refreshInterval = ref(null)

// Mocked Auth (Replace with actual getUser import)
const userId = ref(localStorage.getItem('userId') || '123') 

// Formatting and Helpers
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

const highlightSearch = (name) => {
  if (!searchQuery.value) return name;
  const regex = new RegExp(`(${searchQuery.value})`, 'gi');
  return name.replace(regex, '<span class="highlight-pink">$1</span>');
}

// Computed Data
const normalizedLeaderboard = computed(() =>
  (leaderboardState.value || []).map((entry) => {
    const ratingNum = Number(entry.rating || 0);
    return {
      id: entry.id,
      fullName: String(entry.fullName || 'Unknown User'),
      role: String(entry.role || 'tutee'),
      profilePictureUrl: entry.profilePictureUrl || entry.profile_picture_url || entry.profilePicture || entry.profile_picture || '',
      totalAchievements: Number(entry.totalAchievements || entry.achievementCount || 0),
      totalPoints: Number(entry.totalPoints || entry.points || 0),
      ratingRaw: ratingNum,
      ratingFormatted: ratingNum.toFixed(2), // FIX: Computed once, prevents template crash
      reviewsReceived: Number(entry.reviewsReceived || entry.reviewCount || 0),
    }
  })
)

const filteredLeaderboard = computed(() => {
  let list = [...normalizedLeaderboard.value]

  // Tab Filtering
  if (activeBoard.value !== 'overall') {
    list = list.filter((e) => String(e.role).toLowerCase() === activeBoard.value)
  }

  // Search Filtering
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(e => e.fullName.toLowerCase().includes(q))
  }

  // Sorting
  list.sort((a, b) => {
    if (sortBy.value === 'points') return b.totalPoints - a.totalPoints
    if (sortBy.value === 'rating') return b.ratingRaw - a.ratingRaw
    if (sortBy.value === 'reviews') return b.reviewsReceived - a.reviewsReceived
    return 0
  })

  return list
})

// Current User Highlights
const currentUserRank = computed(() => {
  const index = filteredLeaderboard.value.findIndex(e => String(e.id) === String(userId.value))
  return index !== -1 ? index + 1 : null
})

const currentUserPoints = computed(() => {
  const user = filteredLeaderboard.value.find(e => String(e.id) === String(userId.value))
  return user ? user.totalPoints : 0
})

const scrollToSelf = () => {
  const selfRow = document.querySelector('.is-self');
  if (selfRow) {
    selfRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

const leaderboardRankingLabel = computed(() => {
  const board = activeBoard.value
  return board === 'tutor' ? 'Top Tutors' : board === 'tutee' ? 'Top Tutees' : 'Overall Standing'
})

// UI & Presentation
const getRankColor = (index) => {
  const podiumColors = ['#FFD700', '#C0C0C0', '#CD7F32'] // Gold, Silver, Bronze
  return index < 3 ? podiumColors[index] : '#6e6e73' // Capped at Top 3
}

const roleLabel = (role) => {
  const v = String(role || 'tutee').toLowerCase()
  return v === 'admin' ? 'ADMIN' : v === 'tutor' ? 'TUTOR' : 'TUTEE'
}

const boardLabel = (board) =>
  board === 'tutor' ? 'Top Tutors' : board === 'tutee' ? 'Top Tutees' : 'Overall'

const goToProfile = (uid) => {
  router.push({
    name: 'PublicProfile',
    params: { userId: uid },
    query: { from: 'leaderboards' }
  })
}

// API Calls
const refreshLeaderboard = async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const resp = await api('/leaderboard')
    leaderboardState.value = resp.leaderboard || []
    avatarLoadErrors.value = {}
    // Set actual fetch time
    lastFetchedAt.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch (err) {
    console.error('Failed to load leaderboard:', err)
    errorMessage.value = 'Failed to load leaderboard. Please try refreshing.'
  } finally {
    isLoading.value = false
  }
}

// Lifecycle
onMounted(() => {
  refreshLeaderboard()
  refreshInterval.value = setInterval(refreshLeaderboard, 60000) // Auto-refresh every 60s
  window.addEventListener('studylink-profile-updated', refreshLeaderboard)
})

onUnmounted(() => {
  if (refreshInterval.value) clearInterval(refreshInterval.value)
  window.removeEventListener('studylink-profile-updated', refreshLeaderboard)
})
</script>

<style scoped>
/* Core Variables injected locally for strict theme adherence */
.leaderboard-page {
  --canvas-parchment: #F5F5F5;
  --surface-dark: #021A54;
  --primary: #FF85BB;
  --primary-soft: #FFCEE3;
  --ink: #021A54;
  
  min-height: 100vh;
  display: block;
  padding: 0;
  background: var(--canvas-parchment);
  color: var(--ink);
}

.phone-shell {
  width: 100%;
  max-width: 100%;
  margin: 0;
  min-height: 100vh;
  display: grid;
  grid-template-rows: 1fr;
  position: relative;
}

.view {
  overflow-y: auto;
  padding: 20px 16px 80px; /* Padding bottom for sticky bar */
}

/* Glass Theme Foundations */
.glass-panel {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(2, 26, 84, 0.1);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.card {
  padding: 20px;
  margin-bottom: 20px;
}

/* Header & Pulse */
.leaderboard-kicker {
  margin: 0 0 8px 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--primary);
  font-weight: 700;
}

.leaderboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.leaderboard-header h2 {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  color: var(--ink);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.update-pulse {
  font-size: 12px;
  color: #6e6e73;
  display: flex;
  align-items: center;
  gap: 6px;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background-color: #81C784;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(129, 199, 132, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(129, 199, 132, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(129, 199, 132, 0); }
}

/* Banner States */
.error-banner {
  background-color: #fee2e2;
  color: #b91c1c;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-weight: 500;
  border: 1px solid #fca5a5;
}

.empty-state, .loading-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--ink);
}

.spinner {
  border: 3px solid var(--primary-soft);
  border-top: 3px solid var(--primary);
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* Controls: Tabs, Search, Sort */
.controls-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.leaderboard-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.tab-btn {
  border: 1px solid #e0e0e0;
  background: white;
  color: var(--ink);
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
  white-space: nowrap;
}

.tab-btn.is-active {
  background: var(--surface-dark);
  color: #ffffff;
  border-color: var(--surface-dark);
}

.filter-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.search-input {
  flex: 1;
  min-width: 200px;
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  background: white;
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-soft);
}

.sort-pill {
  display: flex;
  background: white;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  overflow: hidden;
}

.sort-pill button {
  padding: 8px 12px;
  background: none;
  border: none;
  border-right: 1px solid #e0e0e0;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink);
  cursor: pointer;
}

.sort-pill button:last-child { border: none; }
.sort-pill button.active { background: var(--primary-soft); color: var(--surface-dark); }

.leaderboard-summary {
  margin: 0 0 16px 0;
  font-size: 13px;
  color: #6e6e73;
  font-weight: 500;
}

/* Cards & Lists */
.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.leaderboard-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  display: flex;
  align-items: stretch;
  position: relative;
  transition: all 200ms ease;
  overflow: hidden;
}

/* Highlight Match */
:deep(.highlight-pink) {
  background-color: var(--primary-soft);
  color: var(--surface-dark);
  padding: 0 2px;
  border-radius: 3px;
}

/* Top 3 Podium Styles */
.podium-card {
  border: 2px solid var(--primary-soft);
  background: linear-gradient(to right, #ffffff, rgba(255, 206, 227, 0.15));
  box-shadow: 0 4px 16px rgba(255, 133, 187, 0.15);
  transform: scale(1.01);
}

.podium-text {
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
  font-size: 18px;
}

/* Highlight Self */
.is-self {
  border: 2px solid var(--primary);
  background: rgba(255, 133, 187, 0.05);
}

.self-badge {
  position: absolute;
  top: 0;
  right: 0;
  background: var(--primary);
  color: white;
  font-size: 10px;
  font-weight: 800;
  padding: 4px 12px;
  border-bottom-left-radius: 8px;
  letter-spacing: 1px;
}

.rank-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  padding: 16px;
  color: white;
}

.rank-number { font-weight: 800; font-size: 15px; }

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
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--canvas-parchment);
}

.profile-pic-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--primary-soft);
  color: var(--surface-dark);
}

.profile-pic-fallback svg { width: 22px; height: 22px; fill: currentColor; }

.profile-name {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.profile-name strong {
  color: var(--ink);
  font-size: 15px;
}

.role-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 3px 6px;
  border-radius: 4px;
  align-self: flex-start;
}
.role-badge.role-tutor { background: var(--surface-dark); color: white; }
.role-badge.role-tutee { background: var(--primary-soft); color: var(--surface-dark); }
.role-badge.role-admin { background: #b91c1c; color: white; }

.stats-group {
  display: flex;
  gap: 24px;
  align-items: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 11px;
  color: #6e6e73;
  font-weight: 600;
  margin-bottom: 4px;
  text-transform: uppercase;
}

.stat-item strong {
  font-size: 16px;
  color: var(--surface-dark);
  font-weight: 700;
}

.action-btn {
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 150ms ease;
}
.action-btn:hover { transform: scale(0.95); }
.action-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.action-btn.outline { background: transparent; border: 2px solid var(--primary); color: var(--primary); }

.view-profile-btn {
  border: 1px solid var(--primary-soft);
  background: white;
  color: var(--surface-dark);
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}
.view-profile-btn:hover { background: var(--primary-soft); color: var(--surface-dark); }

/* Sticky Mini Bar */
.sticky-self-bar {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 600px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-color: var(--primary);
  border-width: 2px;
  z-index: 100;
}

.sticky-self-bar span {
  font-size: 14px;
  color: var(--ink);
}

.sticky-self-bar strong {
  color: var(--primary);
  font-size: 16px;
}

@media (max-width: 768px) {
  .leaderboard-content {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  .profile-section { width: 100%; }
  .stats-group {
    width: 100%;
    justify-content: space-between;
    background: #f9f9f9;
    padding: 12px;
    border-radius: 8px;
  }
  .view-profile-btn { width: 100%; }
  .sticky-self-bar { flex-direction: column; gap: 12px; }
}
</style>
