<template>
  <main class="leaderboard-page">
    <section class="phone-shell">
      <div class="lb-content">

        <!-- ── Header ── -->
        <div class="card page-header-card">
          <div class="header-left">
            <p class="page-kicker">Rankings</p>
            <h2>{{ leaderboardRankingLabel }}</h2>
            <p class="page-subtext">Live standings · Updated every 60 seconds.</p>
          </div>
          <div class="header-right">
            <div v-if="lastFetchedAt" class="last-updated" aria-live="polite">
              <span class="pulse-dot" aria-hidden="true"></span>
              Updated {{ lastFetchedAt }}
            </div>
            <button
              class="btn-refresh"
              type="button"
              @click="refreshLeaderboard"
              :disabled="isLoading"
              aria-label="Refresh leaderboard"
            >
              <span class="btn-refresh-icon" aria-hidden="true">🔄</span>
              {{ isLoading ? 'Loading…' : 'Refresh' }}
            </button>
          </div>
        </div>

        <!-- ── Error ── -->
        <div
          v-if="errorMessage"
          class="error-banner"
          role="alert"
          aria-live="assertive"
        >
          ⚠️ {{ errorMessage }}
        </div>

        <!-- ── My Rank Banner ── -->
        <div
          v-if="currentUserRank && !isLoading"
          class="card my-rank-banner"
          aria-label="Your current rank"
        >
          <div class="my-rank-info">
            <span class="my-rank-label">Your Rank</span>
            <span class="my-rank-number">#{{ currentUserRank }}</span>
          </div>
          <div class="my-rank-pts">
            <span class="my-rank-label">Points</span>
            <span class="my-rank-pts-val">{{ currentUserPoints.toLocaleString() }}</span>
          </div>
          <button class="btn-find-me" type="button" @click="scrollToSelf">Find me</button>
        </div>

        <!-- ── Controls ── -->
        <div class="card controls-card">
          <div class="board-tabs" role="tablist" aria-label="Leaderboard filter">
            <button
              v-for="tab in boards"
              :key="tab.key"
              class="board-tab"
              :class="{ active: activeBoard === tab.key }"
              role="tab"
              :aria-selected="activeBoard === tab.key"
              type="button"
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
              <input
                v-model="searchQuery"
                class="search-input"
                placeholder="Search users…"
                aria-label="Search leaderboard"
              />
              <button
                v-if="searchQuery"
                class="search-clear"
                type="button"
                @click="searchQuery = ''"
                aria-label="Clear search"
              >✕</button>
            </div>
          </div>
        </div>

        <!-- ── Skeleton ── -->
        <div
          v-if="isLoading"
          class="card skeleton-list"
          aria-busy="true"
          aria-label="Loading leaderboard"
        >
          <div v-for="i in 8" :key="i" class="skeleton-row">
            <div class="skel skel-rank"></div>
            <div class="skel skel-avatar"></div>
            <div class="skel-info">
              <div class="skel skel-name"></div>
              <div class="skel skel-sub"></div>
            </div>
            <div class="skel skel-pts"></div>
          </div>
        </div>

        <!-- ── List ── -->
        <div
          v-else-if="filteredLeaderboard.length"
          class="card leaderboard-list"
          role="list"
          aria-label="Leaderboard"
        >
          <div
            v-for="(entry, index) in filteredLeaderboard"
            :key="entry.id"
            class="lb-row"
            :class="{ 'is-self': String(entry.id) === String(userId) }"
            role="listitem"
            tabindex="0"
            @click="goToProfile(entry.id)"
            @keydown.enter="goToProfile(entry.id)"
            :aria-label="`Rank ${index + 1}: ${entry.fullName}, ${entry.totalPoints} points`"
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

        <!-- ── Empty ── -->
        <div v-else class="card empty-state" role="status" aria-live="polite">
          <p class="empty-icon" aria-hidden="true">🏆</p>
          <p class="empty-text">{{ searchQuery ? 'No users match your search.' : 'No data yet.' }}</p>
          <button v-if="searchQuery" class="btn-find-me" type="button" @click="searchQuery = ''">Clear search</button>
        </div>

      </div>
    </section>
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

const normalizedLeaderboard = computed(() =>
  (leaderboardState.value ?? []).map(entry => {
    const ratingNum = Number(entry.rating ?? 0)
    return {
      id:                entry.id,
      fullName:          String(entry.fullName ?? 'Unknown User'),
      role:              String(entry.role ?? 'tutee'),
      profilePictureUrl: entry.profilePictureUrl ?? entry.profile_picture_url ?? '',
      totalAchievements: Number(entry.totalAchievements ?? 0),
      totalPoints:       Number(entry.totalPoints ?? entry.points ?? 0),
      ratingRaw:         ratingNum,
      ratingFormatted:   ratingNum.toFixed(2),
      reviewsReceived:   Number(entry.reviewsReceived ?? entry.reviewCount ?? 0),
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
    if (sortBy.value === 'points')  return b.totalPoints     - a.totalPoints
    if (sortBy.value === 'rating')  return b.ratingRaw       - a.ratingRaw
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
  return index < 3 ? colors[index] : 'var(--ink-muted)'
}

const roleLabel = (role) => {
  const v = String(role ?? 'tutee').toLowerCase()
  return v === 'admin' ? 'ADMIN' : v === 'tutor' ? 'TUTOR' : 'TUTEE'
}

const goToProfile = (uid) => {
  router.push({ name: 'PublicProfile', params: { userId: uid }, query: { from: 'leaderboards' } })
}

const scrollToSelf = () => {
  document.querySelector('.is-self')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const refreshLeaderboard = async () => {
  if (isLoading.value) return
  isLoading.value    = true
  errorMessage.value = ''
  try {
    const resp = await api('/leaderboard')
    leaderboardState.value = Array.isArray(resp?.leaderboard) ? resp.leaderboard : []
    avatarLoadErrors.value = {}
    lastFetchedAt.value = new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })
  } catch (err) {
    errorMessage.value = err?.message ?? 'Failed to load leaderboard. Try refreshing.'
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
/* ── Local token overrides ── */
.leaderboard-page {
  --ink: #021A54;
  --ink-muted: rgba(2, 26, 84, 0.65);
  --primary: #FF85BB;
  --primary-soft: #FFCEE3;
  --canvas: #ffffff;
  --canvas-parchment: #F5F5F5;
  --hairline: #e0e0e0;
  --radius-card: 16px;
  --radius-pill: 999px;
}

/* ── Layout ── */
.leaderboard-page {
  background: var(--canvas-parchment);
  min-height: 100vh;
}

.phone-shell {
  width: 100%;
  max-width: 768px;
  margin: 0 auto;
  padding: 24px 20px 48px;
}

.lb-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Card Base ── */
.card {
  background: var(--canvas);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-card);
  padding: 20px;
  box-shadow: 0 2px 12px rgba(2, 26, 84, 0.05);
}

/* ── Page Header ── */
.page-header-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  background: linear-gradient(135deg, #ffffff 60%, var(--primary-soft) 100%);
  border: 1px solid var(--primary-soft);
}

.page-kicker {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--primary);
  margin: 0 0 6px;
}

.page-header-card h2 {
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 800;
  color: var(--ink);
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}

.page-subtext {
  font-size: 0.9rem;
  color: var(--ink-muted);
  font-weight: 500;
  margin: 0;
}

.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.last-updated {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ink);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #34c759;
  border-radius: 50%;
  flex-shrink: 0;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%   { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(52, 199, 89, 0.7); }
  70%  { transform: scale(1);    box-shadow: 0 0 0 6px rgba(52, 199, 89, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(52, 199, 89, 0);  }
}

/* ── Refresh Button ── */
.btn-refresh {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--primary);
  color: var(--ink);
  border: 1.5px solid var(--ink);
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 120ms ease, transform 120ms ease;
}

.btn-refresh:hover:not(:disabled) { opacity: 0.88; }
.btn-refresh:active { transform: scale(0.96); }
.btn-refresh:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-refresh-icon { font-size: 0.95rem; }

/* ── Error Banner ── */
.error-banner {
  background: rgba(255, 133, 187, 0.15);
  border: 1.5px solid var(--primary);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ink);
}

/* ── My Rank Banner ── */
.my-rank-banner {
  display: flex;
  align-items: center;
  gap: 24px;
  background: rgba(255, 133, 187, 0.07);
  border-color: var(--primary);
  flex-wrap: wrap;
}

.my-rank-label {
  display: block;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--primary);
  margin-bottom: 2px;
}

.my-rank-number {
  font-size: 1.9rem;
  font-weight: 800;
  color: var(--ink);
  line-height: 1;
  letter-spacing: -0.02em;
}

.my-rank-pts { margin-left: auto; }

.my-rank-pts-val {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--ink);
  line-height: 1;
  letter-spacing: -0.02em;
}

.btn-find-me {
  background: var(--canvas-parchment);
  color: var(--ink);
  border: 1.5px solid var(--primary-soft);
  border-radius: 10px;
  padding: 8px 14px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms ease;
  white-space: nowrap;
}
.btn-find-me:hover { background: var(--primary-soft); }

/* ── Controls Card ── */
.controls-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.board-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.board-tab {
  padding: 7px 18px;
  border: 1.5px solid var(--primary-soft);
  border-radius: 10px;
  background: var(--canvas-parchment);
  color: var(--ink);
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
}

.board-tab:hover:not(.active) { border-color: var(--primary); }
.board-tab.active {
  background: var(--primary);
  border-color: var(--ink);
  color: var(--ink);
}

.sort-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.sort-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--ink-muted);
  white-space: nowrap;
}

.sort-select {
  border: 1.5px solid var(--primary-soft);
  border-radius: 8px;
  background: var(--canvas);
  color: var(--ink);
  font-size: 0.85rem;
  font-weight: 700;
  padding: 6px 10px;
  cursor: pointer;
  outline: none;
  transition: border-color 120ms ease;
}
.sort-select:focus { border-color: var(--primary); }

.search-wrap {
  flex: 1;
  min-width: 140px;
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  border: 1.5px solid var(--primary-soft);
  border-radius: 8px;
  background: var(--canvas);
  color: var(--ink);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 6px 32px 6px 10px;
  outline: none;
  transition: border-color 120ms ease;
}
.search-input:focus { border-color: var(--primary); }
.search-input::placeholder { color: var(--ink-muted); }

.search-clear {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  color: var(--ink-muted);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
.search-clear:hover { color: var(--ink); }

/* ── Skeleton List ── */
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.skeleton-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.skel {
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.5) 0%,
    rgba(255, 206, 227, 0.4) 50%,
    rgba(255, 255, 255, 0.5) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
}

.skel-rank   { width: 28px; height: 20px; flex-shrink: 0; }
.skel-avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; }
.skel-info   { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.skel-name   { height: 14px; width: 60%; }
.skel-sub    { height: 12px; width: 40%; }
.skel-pts    { width: 48px; height: 20px; flex-shrink: 0; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skel        { animation: none; }
  .pulse-dot   { animation: none; }
}

/* ── Leaderboard List ── */
.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  overflow: hidden;
}

.lb-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--hairline);
  cursor: pointer;
  transition: background 120ms ease;
}

.lb-row:last-child { border-bottom: none; }
.lb-row:hover { background: rgba(255, 133, 187, 0.05); }
.lb-row:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }

.lb-row.is-self {
  background: rgba(255, 206, 227, 0.25);
}

/* Rank */
.lb-rank {
  font-size: 1rem;
  font-weight: 800;
  width: 28px;
  flex-shrink: 0;
  text-align: center;
}

/* Avatar */
.lb-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary-soft);
  border: 1.5px solid var(--ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.95rem;
  color: var(--ink);
  overflow: hidden;
  flex-shrink: 0;
}

.lb-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Info */
.lb-info { flex: 1; min-width: 0; }

.lb-name {
  margin: 0 0 4px;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lb-meta {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--ink-muted);
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

:deep(.highlight-pink) {
  background: var(--primary-soft);
  border-radius: 2px;
  padding: 0 2px;
}

.role-chip {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--primary-soft);
  color: var(--ink);
}
.role-chip.tutor { background: var(--ink); color: var(--primary-soft); }
.role-chip.admin { background: var(--primary); color: var(--ink); }

/* Points */
.lb-points-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.lb-points {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--ink);
  line-height: 1.1;
}

.lb-pts-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--primary);
}

/* ── Empty State ── */
.empty-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 2.4rem;
  margin: 0 0 12px;
}

.empty-text {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink-muted);
  margin: 0 0 16px;
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .phone-shell { padding: 16px 12px 40px; }

  .page-header-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-right {
    align-items: flex-start;
    width: 100%;
  }

  .btn-refresh {
    width: 100%;
    justify-content: center;
  }

  .lb-meta { display: none; }
  .my-rank-banner { flex-wrap: wrap; }
}
</style>