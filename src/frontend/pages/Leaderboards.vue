<template>
  <main class="leaderboard-page">
    <div class="view">
      <!-- Header -->
      <div class="page-header card">
        <div>
          <p class="page-kicker">Rankings</p>
          <h2>{{ leaderboardRankingLabel }}</h2>
          <p class="page-subtext">Updated live · {{ lastFetchedAt || '—' }}</p>
        </div>
        <div class="header-right">
          <div class="update-pulse" aria-live="polite">
            <span class="pulse-dot" aria-hidden="true"></span>
            <span>Live</span>
          </div>
          <button class="chip-strong" @click="refreshLeaderboard" :aria-busy="isLoading" :disabled="isLoading">
            {{ isLoading ? 'Refreshing…' : '↺ Refresh' }}
          </button>
        </div>
      </div>

      <!-- Error -->
      <p v-if="errorMessage" class="error-msg" role="alert" aria-live="assertive">{{ errorMessage }}</p>

      <!-- My Rank banner -->
      <div v-if="currentUserRank && !isLoading" class="my-rank-banner card" aria-label="Your current rank">
        <div class="my-rank-info">
          <span class="my-rank-label">Your Rank</span>
          <span class="my-rank-number">#{{ currentUserRank }}</span>
        </div>
        <div class="my-rank-pts">
          <span class="my-rank-label">Points</span>
          <span class="my-rank-pts-val">{{ currentUserPoints.toLocaleString() }}</span>
        </div>
        <button class="chip-soft" @click="scrollToSelf">Find me</button>
      </div>

      <!-- Boards + Sort -->
      <div class="card controls-card">
        <div class="board-tabs" role="tablist" aria-label="Leaderboard filter">
          <button
            v-for="tab in boards"
            :key="tab.key"
            class="board-tab"
            :class="{ active: activeBoard === tab.key }"
            role="tab"
            :aria-selected="activeBoard === tab.key"
            @click="activeBoard = tab.key"
          >{{ tab.label }}</button>
        </div>
        <div class="sort-row">
          <label class="sort-label" for="lb-sort">Sort by</label>
          <select id="lb-sort" class="sort-select" v-model="sortBy" aria-label="Sort leaderboard">
            <option value="points">Points</option>
            <option value="rating">Rating</option>
            <option value="reviews">Reviews</option>
          </select>
          <div class="search-wrap">
            <input v-model="searchQuery" class="search-input" placeholder="Search users…" aria-label="Search leaderboard"/>
          </div>
        </div>
      </div>

      <!-- Skeleton loading -->
      <div v-if="isLoading" class="card skeleton-list" aria-busy="true" aria-label="Loading leaderboard">
        <div v-for="i in 8" :key="i" class="skeleton-row">
          <div class="skel-rank"></div>
          <div class="skel-avatar"></div>
          <div class="skel-info">
            <div class="skel-name"></div>
            <div class="skel-sub"></div>
          </div>
          <div class="skel-pts"></div>
        </div>
      </div>

      <!-- List -->
      <div v-else-if="filteredLeaderboard.length" class="card leaderboard-list" role="list" aria-label="Leaderboard">
        <div
          v-for="(entry, index) in filteredLeaderboard"
          :key="entry.id"
          class="lb-row"
          :class="{ 'is-self': String(entry.id) === String(userId) }"
          role="listitem"
          @click="goToProfile(entry.id)"
          :aria-label="`Rank ${index + 1}: ${entry.fullName}, ${entry.totalPoints} points`"
          tabindex="0"
          @keydown.enter="goToProfile(entry.id)"
        >
          <!-- Rank -->
          <div class="lb-rank" :style="{ color: getRankColor(index) }" aria-hidden="true">
            <span v-if="index === 0">🥇</span>
            <span v-else-if="index === 1">🥈</span>
            <span v-else-if="index === 2">🥉</span>
            <span v-else>{{ index + 1 }}</span>
          </div>

          <!-- Avatar -->
          <div class="lb-avatar" aria-hidden="true">
            <img
              v-if="hasProfilePicture(entry)"
              :src="resolveProfilePictureUrl(entry.profilePictureUrl)"
              :alt="entry.fullName"
              @error="handleAvatarError(entry)"
            />
            <span v-else>{{ (entry.fullName || '?')[0].toUpperCase() }}</span>
          </div>

          <!-- Info -->
          <div class="lb-info">
            <p class="lb-name" v-html="highlightSearch(entry.fullName)"></p>
            <p class="lb-meta">
              <span class="role-chip" :class="entry.role">{{ roleLabel(entry.role) }}</span>
              <span>· ⭐ {{ entry.ratingFormatted }}</span>
              <span>· {{ entry.reviewsReceived }} reviews</span>
            </p>
          </div>

          <!-- Points -->
          <div class="lb-points-col">
            <span class="lb-points">{{ entry.totalPoints.toLocaleString() }}</span>
            <span class="lb-pts-label">pts</span>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else class="card empty-state" aria-live="polite">
        <p class="empty-icon" aria-hidden="true">🏆</p>
        <p>{{ searchQuery ? 'No users match your search.' : 'No data yet.' }}</p>
        <button v-if="searchQuery" class="chip-soft" @click="searchQuery = ''">Clear search</button>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { api, getUser } from '@/api.js'

const router = useRouter()
const userId = computed(() => String(getUser()?.id ?? ''))

const leaderboardState = ref([])
const isLoading        = ref(false)
const errorMessage     = ref('')
const lastFetchedAt    = ref(null)
const activeBoard      = ref('overall')
const sortBy           = ref('points')
const searchQuery      = ref('')
const avatarLoadErrors = ref({})
const refreshInterval  = ref(null)

const boards = [
  { key: 'overall', label: 'Overall' },
  { key: 'tutor',   label: 'Tutors'  },
  { key: 'tutee',   label: 'Tutees'  },
]

// FIX: safe avatar URL resolution
const resolveProfilePictureUrl = (url) => {
  if (!url) return ''
  const s = String(url).trim()
  if (!s) return ''
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('blob:')) return s
  return `/${s.replace(/^\/+/, '')}`
}

const getAvatarKey = (entry) => `${entry.id}_${entry.profilePictureUrl || ''}`

const hasProfilePicture = (entry) => {
  const key = getAvatarKey(entry)
  return !!resolveProfilePictureUrl(entry.profilePictureUrl) && !avatarLoadErrors.value[key]
}

const handleAvatarError = (entry) => {
  const key = getAvatarKey(entry)
  avatarLoadErrors.value = { ...avatarLoadErrors.value, [key]: true }
}

const highlightSearch = (name) => {
  if (!searchQuery.value) return name
  const regex = new RegExp(`(${searchQuery.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return name.replace(regex, '<mark class="highlight-pink">$1</mark>')
}

// FIX: normalize once — no template crashes from .toFixed on undefined
const normalizedLeaderboard = computed(() =>
  (leaderboardState.value || []).map(entry => {
    const ratingNum = Number(entry.rating || 0)
    return {
      id:               entry.id,
      fullName:         String(entry.fullName || 'Unknown User'),
      role:             String(entry.role || 'tutee'),
      profilePictureUrl: entry.profilePictureUrl || entry.profile_picture_url || '',
      totalAchievements: Number(entry.totalAchievements || 0),
      totalPoints:      Number(entry.totalPoints || entry.points || 0),
      ratingRaw:        ratingNum,
      ratingFormatted:  ratingNum.toFixed(2),
      reviewsReceived:  Number(entry.reviewsReceived || entry.reviewCount || 0),
    }
  })
)

const filteredLeaderboard = computed(() => {
  let list = [...normalizedLeaderboard.value]
  if (activeBoard.value !== 'overall') {
    list = list.filter(e => String(e.role).toLowerCase() === activeBoard.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(e => e.fullName.toLowerCase().includes(q))
  }
  list.sort((a, b) => {
    if (sortBy.value === 'points')  return b.totalPoints    - a.totalPoints
    if (sortBy.value === 'rating')  return b.ratingRaw      - a.ratingRaw
    if (sortBy.value === 'reviews') return b.reviewsReceived - a.reviewsReceived
    return 0
  })
  return list
})

const currentUserRank = computed(() => {
  const idx = filteredLeaderboard.value.findIndex(e => String(e.id) === userId.value)
  return idx !== -1 ? idx + 1 : null
})

const currentUserPoints = computed(() => {
  const u = filteredLeaderboard.value.find(e => String(e.id) === userId.value)
  return u?.totalPoints ?? 0
})

const leaderboardRankingLabel = computed(() => {
  if (activeBoard.value === 'tutor') return 'Top Tutors'
  if (activeBoard.value === 'tutee') return 'Top Tutees'
  return 'Overall Standing'
})

const getRankColor = (index) => {
  const colors = ['#FFD700', '#C0C0C0', '#CD7F32']
  return index < 3 ? colors[index] : '#6e6e73'
}

const roleLabel = (role) => {
  const v = String(role || 'tutee').toLowerCase()
  return v === 'admin' ? 'ADMIN' : v === 'tutor' ? 'TUTOR' : 'TUTEE'
}

const goToProfile = (uid) => {
  router.push({ name: 'PublicProfile', params: { userId: uid }, query: { from: 'leaderboards' } })
}

const scrollToSelf = () => {
  document.querySelector('.is-self')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const refreshLeaderboard = async () => {
  isLoading.value    = true
  errorMessage.value = ''
  try {
    const resp = await api('/leaderboard')
    leaderboardState.value = resp?.leaderboard || []
    avatarLoadErrors.value = {}
    lastFetchedAt.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch (err) {
    errorMessage.value = 'Failed to load leaderboard. Try refreshing.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  refreshLeaderboard()
  refreshInterval.value = setInterval(refreshLeaderboard, 60_000)
  window.addEventListener('studylink-profile-updated', refreshLeaderboard)
})

onUnmounted(() => {
  clearInterval(refreshInterval.value)
  window.removeEventListener('studylink-profile-updated', refreshLeaderboard)
})
</script>

<style scoped>
.leaderboard-page {
  min-height: 100vh;
  background: #F5F5F5;
  color: #021A54;
}
.view { padding: 20px 16px 80px; max-width: 768px; margin: 0 auto }

/* Glass Card */
.card {
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 2px solid #021A54;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
}

/* Header */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}
.page-kicker {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #FF85BB;
  margin: 0 0 4px;
}
.page-header h2 {
  margin: 0 0 4px;
  font-size: clamp(1.4rem, 3vw, 2rem);
  font-weight: 800;
  color: #021A54;
}
.page-subtext { margin: 0; font-size: 12px; color: #6e6e73; font-weight: 600 }
.header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px }
.update-pulse { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6e6e73 }
.pulse-dot {
  width: 8px; height: 8px; background: #34c759; border-radius: 50%;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%  { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(52,199,89,0.7) }
  70% { transform: scale(1);    box-shadow: 0 0 0 6px rgba(52,199,89,0) }
  100%{ transform: scale(0.95); box-shadow: 0 0 0 0 rgba(52,199,89,0)   }
}

.chip-strong {
  background: #FF85BB;
  color: #021A54;
  border: 2px solid #021A54;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: background 120ms, transform 120ms;
}
.chip-strong:hover { background: #ff6da9 }
.chip-strong:active { transform: scale(0.95) }
.chip-strong:disabled { opacity: 0.6; cursor: not-allowed }

.chip-soft {
  background: #F5F5F5;
  color: #021A54;
  border: 1.5px solid #FFCEE3;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms;
}
.chip-soft:hover { background: #FFCEE3 }

/* My rank banner */
.my-rank-banner {
  display: flex;
  align-items: center;
  gap: 20px;
  background: rgba(255,133,187,0.08);
  border-color: #FF85BB;
}
.my-rank-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #FF85BB; display: block }
.my-rank-number { font-size: 28px; font-weight: 800; color: #021A54 }
.my-rank-pts { margin-left: auto }
.my-rank-pts-val { font-size: 20px; font-weight: 800; color: #021A54 }

/* Controls */
.controls-card { display: flex; flex-direction: column; gap: 12px }
.board-tabs { display: flex; gap: 8px; flex-wrap: wrap }
.board-tab {
  padding: 7px 16px;
  border: 1.5px solid #FFCEE3;
  border-radius: 8px;
  background: #F5F5F5;
  color: #021A54;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 120ms;
}
.board-tab.active { background: #FF85BB; border-color: #021A54; color: #021A54 }
.board-tab:hover:not(.active) { border-color: #FF85BB }

.sort-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap }
.sort-label { font-size: 12px; font-weight: 700; color: #6e6e73; white-space: nowrap }
.sort-select {
  border: 1.5px solid #FFCEE3;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 600;
  color: #021A54;
  background: #fff;
  cursor: pointer;
}
.search-wrap { flex: 1; min-width: 160px }
.search-input {
  width: 100%;
  border: 1.5px solid #FFCEE3;
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 13px;
  color: #021A54;
  background: #fff;
  box-sizing: border-box;
  transition: border-color 150ms;
}
.search-input:focus { outline: none; border-color: #FF85BB; box-shadow: 0 0 0 3px rgba(255,133,187,0.15) }

/* Skeleton */
.skeleton-list { display: flex; flex-direction: column; gap: 12px }
.skeleton-row { display: flex; align-items: center; gap: 12px; animation: shimmer 1.4s infinite }
.skel-rank    { width: 30px; height: 20px; border-radius: 4px; background: #e0e0e0 }
.skel-avatar  { width: 40px; height: 40px; border-radius: 50%; background: #e0e0e0; flex-shrink: 0 }
.skel-info    { flex: 1; display: flex; flex-direction: column; gap: 6px }
.skel-name    { height: 14px; border-radius: 4px; background: #e0e0e0; width: 60% }
.skel-sub     { height: 10px; border-radius: 4px; background: #ebebeb; width: 40% }
.skel-pts     { width: 50px; height: 20px; border-radius: 4px; background: #e0e0e0 }
@keyframes shimmer {
  0%  { opacity: 1   }
  50% { opacity: 0.5 }
  100%{ opacity: 1   }
}

/* List rows */
.leaderboard-list { display: flex; flex-direction: column; gap: 2px; padding: 4px }
.lb-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 10px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 120ms;
}
.lb-row:hover { background: #F5F5F5 }
.lb-row.is-self {
  background: rgba(255,133,187,0.12);
  outline: 2px solid #FF85BB;
}

.lb-rank { width: 32px; text-align: center; font-size: 16px; font-weight: 800; flex-shrink: 0 }

.lb-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: #FFCEE3; border: 2px solid #021A54;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 15px; color: #021A54;
  overflow: hidden; flex-shrink: 0;
}
.lb-avatar img { width: 100%; height: 100%; object-fit: cover }

.lb-info { flex: 1; min-width: 0 }
.lb-name { margin: 0 0 4px; font-size: 14px; font-weight: 700; color: #021A54; white-space: nowrap; overflow: hidden; text-overflow: ellipsis }
.lb-meta { margin: 0; font-size: 11px; color: #6e6e73; display: flex; align-items: center; gap: 6px; flex-wrap: wrap }
:deep(.highlight-pink) { background: #FFCEE3; border-radius: 2px; padding: 0 2px }

.role-chip {
  font-size: 9px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: #FFCEE3;
  color: #021A54;
}
.role-chip.tutor { background: #021A54; color: #FFCEE3 }
.role-chip.admin { background: #FF85BB; color: #021A54 }

.lb-points-col { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0 }
.lb-points { font-size: 16px; font-weight: 800; color: #021A54 }
.lb-pts-label { font-size: 10px; color: #FF85BB; font-weight: 700; text-transform: uppercase }

/* Empty */
.empty-state { text-align: center; padding: 40px 20px }
.empty-icon { font-size: 3rem; margin: 0 0 12px }

/* Error */
.error-msg {
  padding: 12px 16px;
  background: rgba(255,133,187,0.12);
  border: 2px solid #FF85BB;
  border-radius: 12px;
  color: #021A54;
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 16px;
}

@media (max-width: 480px) {
  .lb-meta { display: none }
  .my-rank-banner { flex-wrap: wrap }
}
@media (prefers-reduced-motion: reduce) {
  .pulse-dot { animation: none }
  .skeleton-row { animation: none }
}
</style>