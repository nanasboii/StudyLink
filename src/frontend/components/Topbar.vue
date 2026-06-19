<template>
  <header class="topbar" role="banner">
    <div class="topbar-left">
      <router-link :to="homeRoute" class="brand-link" aria-label="StudyLink home">
        <span class="brand-title">StudyLink</span>
        <span class="brand-role-suffix">{{ brandRoleLabel }}</span>
      </router-link>
    </div>

    <div class="topbar-center">
      <nav class="main-nav" v-if="currentUser" aria-label="Main navigation">
        <router-link
          v-for="item in navItems"
          :key="item.key"
          :to="item.path"
          class="nav-link"
        >{{ item.label }}</router-link>
      </nav>
    </div>

    <div class="topbar-actions">
      <!-- 🔥 Streak -->
      <button class="icon-btn streak-btn" @click="showStreakModal" :aria-label="`Streak: ${streakCount} days`" title="Login streak">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4" width="18" height="17" rx="3" fill="#FF85BB"/>
          <rect x="3" y="8" width="18" height="3" fill="#FFCEE3"/>
          <rect x="7" y="2" width="2" height="4" rx="1" fill="#021A54"/>
          <rect x="15" y="2" width="2" height="4" rx="1" fill="#021A54"/>
          <rect x="6" y="13" width="2.2" height="2.2" rx="0.5" fill="#fff"/>
          <rect x="10.9" y="13" width="2.2" height="2.2" rx="0.5" fill="#fff"/>
          <rect x="15.8" y="13" width="2.2" height="2.2" rx="0.5" fill="#fff"/>
          <rect x="6" y="16.6" width="2.2" height="2.2" rx="0.5" fill="#fff"/>
          <rect x="10.9" y="16.6" width="7.1" height="2.2" rx="1" fill="#FFCEE3"/>
        </svg>
        <span v-if="streakCount" class="icon-badge streak-badge">{{ streakCount }}</span>
      </button>

      <!-- 🔔 Notifications -->
      <button class="icon-btn notify-btn" @click="navigateToNotifications" aria-label="Notifications" title="Notifications">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6V11c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" fill="currentColor"/>
        </svg>
        <span v-if="unreadCount > 0" class="icon-badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
      </button>

      <!-- 💬 Messages -->
      <button class="icon-btn message-btn" @click="navigateToMessages" aria-label="Messages" title="Messages">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" fill="currentColor"/>
        </svg>
        <span v-if="messageUnreadCount > 0" class="icon-badge">{{ messageUnreadCount > 9 ? '9+' : messageUnreadCount }}</span>
      </button>

      <!-- 👤 Profile -->
      <button class="icon-btn profile-btn" @click="showUserMenu" :aria-label="`Profile menu for ${currentUser?.fullName || 'User'}`" title="Profile">
        <img v-if="topbarProfilePicture" :src="topbarProfilePicture" class="topbar-profile-image" :alt="currentUser?.fullName" @error="topbarProfilePicture = null" />
        <svg v-else viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2c-4.42 0-8 2.46-8 5.5 0 .55.45 1 1 1h14c.55 0 1-.45 1-1 0-3.04-3.58-5.5-8-5.5Z" fill="currentColor"/>
        </svg>
      </button>
    </div>
  </header>

  <!-- ── Streak Modal ── -->
  <Transition name="overlay-fade">
    <div v-if="isStreakModalOpen" class="modal-overlay" @click.self="isStreakModalOpen = false" role="dialog" aria-modal="true" aria-label="Login streak calendar">
      <div class="streak-modal glass-modal">
        <button class="modal-close-btn" @click="isStreakModalOpen = false" aria-label="Close streak modal">×</button>
        <div class="streak-modal-header">
          <span class="streak-flame-big" aria-hidden="true">🔥</span>
          <div>
            <h2 class="streak-title">{{ streakCount }}-Day Streak</h2>
            <p class="streak-sub">Last check-in: {{ lastCheckInDate }}</p>
          </div>
        </div>

        <div class="calendar-nav" aria-label="Month navigation">
          <button @click="prevMonth" aria-label="Previous month">‹</button>
          <span class="calendar-month-label">{{ calendarMonthLabel }}</span>
          <button @click="nextMonth" aria-label="Next month">›</button>
        </div>

        <div class="calendar-grid" role="grid" aria-label="Login history calendar">
          <div v-for="d in weekdays" :key="d" class="weekday" role="columnheader">{{ d }}</div>
          <div v-for="(cell, i) in calendarCells" :key="i" class="calendar-day"
            :class="{
              'day-empty': !cell,
              'day-logged': cell?.logged,
              'day-today': cell?.isToday,
              'day-future': cell?.isFuture
            }"
            :aria-label="cell ? `${cell.day}${cell.logged ? ', logged in' : ''}${cell.isToday ? ', today' : ''}` : ''"
            role="gridcell"
          >
            <span v-if="cell">{{ cell.day }}</span>
          </div>
        </div>

        <p class="streak-footer-msg">
          <template v-if="streakCount === 0">Log in daily to build your streak!</template>
          <template v-else-if="streakCount === 1">1 day in — keep it going!</template>
          <template v-else>🔥 {{ streakCount }}-day streak! Keep rolling.</template>
        </p>
      </div>
    </div>
  </Transition>

  <!-- ── User Menu ── -->
  <Transition name="overlay-fade">
    <div v-if="isUserMenuOpen" class="modal-overlay" @click.self="isUserMenuOpen = false">
      <div class="user-menu glass-modal" role="menu">
        <div class="user-menu-header">
          <div class="user-menu-avatar" aria-hidden="true">
            <img v-if="topbarProfilePicture" :src="topbarProfilePicture" :alt="currentUser?.fullName" @error="topbarProfilePicture = null" />
            <span v-else>{{ (currentUser?.fullName || 'U')[0].toUpperCase() }}</span>
          </div>
          <div>
            <h3 class="user-menu-name">{{ currentUser?.fullName }}</h3>
            <p class="user-role">{{ currentUser?.role }}</p>
          </div>
        </div>
        <div class="user-menu-divider"></div>

        <router-link to="/profile"       class="menu-item" @click="isUserMenuOpen = false" role="menuitem">Profile</router-link>
        <router-link to="/settings"      class="menu-item" @click="isUserMenuOpen = false" role="menuitem">Settings</router-link>
        <router-link to="/review"        class="menu-item" @click="isUserMenuOpen = false" role="menuitem">Reviews</router-link>
        <router-link to="/quizzes"       class="menu-item" @click="isUserMenuOpen = false" role="menuitem">Quizzes</router-link>
        <router-link
          v-if="currentUser?.role === 'tutor' || currentUser?.role === 'admin'"
          to="/quizzes/create"
          class="menu-item menu-item--create"
          @click="isUserMenuOpen = false"
          role="menuitem"
        >✏️ Create Quiz</router-link>
        <router-link to="/achievements"  class="menu-item" @click="isUserMenuOpen = false" role="menuitem">Achievements</router-link>
        <router-link to="/leaderboards"  class="menu-item" @click="isUserMenuOpen = false" role="menuitem">Leaderboard</router-link>
        <router-link to="/redeem"        class="menu-item" @click="isUserMenuOpen = false" role="menuitem">Redeem Points</router-link>
        <router-link
          v-if="currentUser?.role === 'tutor' || currentUser?.role === 'admin'"
          to="/verification"
          class="menu-item"
          @click="isUserMenuOpen = false"
          role="menuitem"
        >Verification</router-link>

        <div class="user-menu-divider"></div>
        <button @click="logout" class="menu-item menu-item--logout" role="menuitem">Logout</button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api, getUser, clearSession } from '@/api.js'
import { normalizeAssetUrl } from '@/utils/records.js'

const router = useRouter()
const currentUserState = ref(getUser())
const currentUser = computed(() => currentUserState.value)

// FIX: safe role check helpers
const isAdmin  = computed(() => currentUser.value?.role === 'admin')
const isTutor  = computed(() => ['tutor', 'admin'].includes(currentUser.value?.role))

const homeRoute = computed(() => isAdmin.value ? '/admin/analytics' : '/resources')

const brandRoleLabel = computed(() => {
  const r = currentUser.value?.role
  if (r === 'admin')  return 'Admin'
  if (r === 'tutor')  return 'Tutor'
  if (r === 'tutee')  return 'Tutee'
  return ''
})

const navItems = computed(() => {
  if (!currentUser.value) return []
  if (isAdmin.value) {
    return [
      { key: 'analytics',  path: '/admin/analytics',            label: 'Analytics' },
      { key: 'resources',  path: '/admin/resources',            label: 'Resources' },
      { key: 'activity',   path: '/admin/activity',             label: 'Activity' },
      { key: 'rewards',    path: '/admin/reward-rules',         label: 'Rewards' },
      { key: 'verify',     path: '/admin/review-verifications', label: 'Verify' },
    ]
  }
  const base = [
    { key: 'resources', path: '/resources',    label: 'Resources' },
    { key: 'tutors',    path: '/tutors',        label: 'Tutors' },
    { key: 'session',   path: '/session',       label: 'Sessions' },
    { key: 'quizzes',   path: '/quizzes',       label: 'Quizzes' },
  ]
  if (isTutor.value) base.push({ key: 'my-resources', path: '/my-resources', label: 'My Resources' })
  return base
})

// ── Profile picture ──
const topbarProfilePicture = ref(null)

const loadProfilePicture = () => {
  const u = currentUser.value
  if (!u) { topbarProfilePicture.value = null; return }
  const url = u.profilePictureUrl || u.profile_picture_url || u.profilePicture || u.profile_picture || ''
  topbarProfilePicture.value = normalizeAssetUrl(url) || null
}

// ── Badges ──
const unreadCount        = ref(0)
const messageUnreadCount = ref(0)
const streakCount        = ref(0)

// ── Modal state ──
const isStreakModalOpen = ref(false)
const isUserMenuOpen    = ref(false)

// FIX: close both menus on route change
router.afterEach(() => {
  isUserMenuOpen.value    = false
  isStreakModalOpen.value = false
})

// ── Streak/Calendar ──
const currentDate       = ref(new Date())
const loginHistory      = ref([])
const lastCheckInDate   = ref('N/A')
const weekdays          = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const toDateKey   = (d) => d.toISOString().slice(0, 10)
const normKey     = (raw) => {
  if (!raw) return null
  const s = String(raw)
  // handles "YYYY-MM-DD" or ISO strings
  return s.length >= 10 ? s.slice(0, 10) : null
}

const loginDateKeys = computed(() => {
  const s = new Set()
  for (const entry of loginHistory.value) {
    const k = normKey(entry)
    if (k) s.add(k)
  }
  return s
})

const calendarMonthLabel = computed(() => {
  return currentDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const calendarCells = computed(() => {
  const d  = currentDate.value
  const y  = d.getFullYear()
  const m  = d.getMonth()
  const today = toDateKey(new Date())
  const firstDay = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({
      day,
      logged: loginDateKeys.value.has(key),
      isToday: key === today,
      isFuture: key > today,
    })
  }
  return cells
})

const prevMonth = () => {
  const d = currentDate.value
  currentDate.value = new Date(d.getFullYear(), d.getMonth() - 1, 1)
}
const nextMonth = () => {
  const d = currentDate.value
  currentDate.value = new Date(d.getFullYear(), d.getMonth() + 1, 1)
}

// ── Quick nav toggle ──
const quickNavHistory = ref({})

const toggleRoute = async (targetPath) => {
  const currentFullPath = router.currentRoute.value.fullPath
  if (currentFullPath === targetPath) {
    const prev = quickNavHistory.value[targetPath]
    if (prev && prev !== targetPath) {
      await router.push(prev)
    } else {
      await router.push(homeRoute.value)
    }
    return
  }
  quickNavHistory.value = { ...quickNavHistory.value, [targetPath]: currentFullPath }
  await router.push(targetPath)
}

const navigateToNotifications = () => toggleRoute('/notifications')
const navigateToMessages      = () => toggleRoute('/messages')
const showUserMenu             = () => { isUserMenuOpen.value = true }

// ── Streak modal ──
const showStreakModal = async () => {
  isStreakModalOpen.value = true
  currentDate.value = new Date()
  await loadLoginHistory()
}

// expose for App.vue
const showStreakModalAuto = () => showStreakModal()
defineExpose({ showStreakModalAuto })

// ── API ──
const loadLoginHistory = async () => {
  try {
    const resp = await api('/me/login-history')
    loginHistory.value = resp?.loginHistory || resp?.historyDates || []
    streakCount.value  = Number(resp?.count ?? currentUser.value?.login_streak ?? 0)
    const todayKey   = toDateKey(new Date())
    const latestKey  = normKey(loginHistory.value[0])
    if (loginDateKeys.value.has(todayKey)) {
      lastCheckInDate.value = 'Today'
    } else if (latestKey) {
      lastCheckInDate.value = latestKey
    } else {
      lastCheckInDate.value = 'N/A'
    }
  } catch { /* endpoint may not exist yet */ }
}

const loadUnreadNotifications = async () => {
  if (!currentUser.value) { unreadCount.value = 0; return }
  try {
    const resp = await api('/notifications?filter=unread')
    const list = Array.isArray(resp?.notifications) ? resp.notifications : []
    unreadCount.value = list.filter(n => !(n.is_read ?? n.isRead)).length
  } catch { unreadCount.value = 0 }
}

const loadUnreadMessages = async () => {
  if (!currentUser.value) { messageUnreadCount.value = 0; return }
  try {
    const resp = await api('/conversations')
    const list = Array.isArray(resp?.conversations) ? resp.conversations : []
    // FIX: safe sum — Number coerce, guard NaN
    messageUnreadCount.value = list.reduce((sum, c) => {
      const n = Number(c?.unread_count ?? 0)
      return sum + (Number.isFinite(n) ? n : 0)
    }, 0)
  } catch { messageUnreadCount.value = 0 }
}

const loadStreakCount = async () => {
  try {
    const resp = await api('/me/login-history')
    streakCount.value = Number(resp?.count ?? 0)
  } catch { /* silent */ }
}

// ── Auth ──
const syncSession = () => { currentUserState.value = getUser(); loadProfilePicture() }

const logout = () => {
  clearSession()
  isUserMenuOpen.value = false
  sessionStorage.removeItem('hasSeenStreakModal')
  router.push('/login')
}

// ── Lifecycle ──
let pollInterval = null

onMounted(() => {
  loadProfilePicture()
  if (currentUser.value) {
    Promise.all([loadUnreadNotifications(), loadUnreadMessages(), loadStreakCount()])
    // poll every 30s
    pollInterval = setInterval(() => {
      loadUnreadNotifications()
      loadUnreadMessages()
    }, 30_000)
  }
  window.addEventListener('studylink-session-changed',   syncSession)
  window.addEventListener('studylink-profile-updated',   loadProfilePicture)
  window.addEventListener('studylink-notifications-read', loadUnreadNotifications)
})

onUnmounted(() => {
  clearInterval(pollInterval)
  window.removeEventListener('studylink-session-changed',   syncSession)
  window.removeEventListener('studylink-profile-updated',   loadProfilePicture)
  window.removeEventListener('studylink-notifications-read', loadUnreadNotifications)
})
</script>

<style scoped>
/* ── Topbar Shell ── */
.topbar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  height: 56px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid #FFCEE3;
  position: sticky;
  top: 0;
  z-index: 100;
}

/* ── Brand ── */
.brand-link {
  display: flex;
  align-items: baseline;
  gap: 6px;
  text-decoration: none;
}
.brand-title {
  font-size: 16px;
  font-weight: 800;
  color: #021A54;
  letter-spacing: -0.03em;
}
.brand-role-suffix {
  font-size: 11px;
  font-weight: 600;
  color: #FF85BB;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* ── Nav ── */
.main-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  overflow-x: auto;
  scrollbar-width: none;
}
.main-nav::-webkit-scrollbar { display: none }

.nav-link {
  font-size: 12px;
  font-weight: 500;
  color: #6e6e73;
  text-decoration: none;
  white-space: nowrap;
  position: relative;
  transition: color 120ms;
}
.nav-link:hover { color: #FF85BB }
.nav-link.router-link-active {
  color: #021A54;
  font-weight: 700;
}
.nav-link.router-link-active::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0; right: 0;
  height: 2px;
  background: #FF85BB;
  border-radius: 1px;
}

/* ── Actions ── */
.topbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.icon-btn {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid #FFCEE3;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 120ms, border-color 120ms, transform 120ms;
  overflow: visible;
}
.icon-btn svg {
  width: 18px;
  height: 18px;
  color: #021A54;
}
.icon-btn:hover {
  background: #fff;
  border-color: #FF85BB;
}
.icon-btn:active { transform: scale(0.93) }

.icon-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: #FF85BB;
  color: #021A54;
  border: 2px solid #fff;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.streak-badge { background: #021A54; color: #FF85BB }

.profile-btn {
  border: 2px solid #FFCEE3;
  overflow: hidden;
  background: #F5F5F5;
}
.profile-btn:hover { border-color: #FF85BB }
.topbar-profile-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  border-radius: 50%;
}

/* ── Glass Modal base ── */
.glass-modal {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 2px solid #021A54;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(2, 26, 84, 0.15);
  position: relative;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 26, 84, 0.25);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-close-btn {
  position: absolute;
  top: 12px;
  right: 14px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: #FFCEE3;
  color: #021A54;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  transition: background 120ms;
}
.modal-close-btn:hover { background: #FF85BB; color: #fff }

/* ── Streak Modal ── */
.streak-modal {
  width: min(360px, 100%);
  padding: 24px;
}
.streak-modal-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}
.streak-flame-big { font-size: 36px; line-height: 1 }
.streak-title {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  color: #021A54;
}
.streak-sub {
  margin: 2px 0 0;
  font-size: 12px;
  color: #6e6e73;
}

.calendar-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.calendar-nav button {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid #FFCEE3;
  background: #F5F5F5;
  color: #021A54;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 120ms;
}
.calendar-nav button:hover { background: #FFCEE3 }
.calendar-month-label {
  font-size: 13px;
  font-weight: 700;
  color: #021A54;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 16px;
}
.weekday {
  font-size: 10px;
  font-weight: 700;
  color: #FF85BB;
  text-align: center;
  padding: 4px 0;
  text-transform: uppercase;
}
.calendar-day {
  aspect-ratio: 1;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: #021A54;
  background: transparent;
  transition: background 120ms;
}
.day-empty { background: transparent }
.day-logged {
  background: #FF85BB;
  color: #fff;
}
.day-today {
  background: #FFCEE3;
  color: #021A54;
  font-weight: 800;
  box-shadow: 0 0 0 2px #021A54;
}
.day-future { color: #ccc }

.streak-footer-msg {
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  color: #021A54;
  margin: 0;
}

/* ── User Menu ── */
.user-menu {
  width: min(260px, 100%);
  padding: 16px 0;
}
.user-menu-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px 14px;
}
.user-menu-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #FFCEE3;
  border: 2px solid #021A54;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 16px;
  color: #021A54;
  overflow: hidden;
  flex-shrink: 0;
}
.user-menu-avatar img { width: 100%; height: 100%; object-fit: cover }
.user-menu-name {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #021A54;
}
.user-role {
  margin: 2px 0 0;
  font-size: 11px;
  color: #FF85BB;
  text-transform: capitalize;
  font-weight: 600;
}
.user-menu-divider {
  height: 1px;
  background: #FFCEE3;
  margin: 8px 0;
}
.menu-item {
  display: block;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #021A54;
  text-decoration: none;
  cursor: pointer;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  transition: background 120ms, color 120ms;
}
.menu-item:hover { background: #F5F5F5; color: #FF85BB }
.menu-item--create { color: #FF85BB; font-weight: 700 }
.menu-item--logout { color: #FF85BB; font-weight: 700 }
.menu-item--logout:hover { background: #FFCEE3 }

/* ── Transitions ── */
.overlay-fade-enter-active,
.overlay-fade-leave-active { transition: opacity 0.2s ease }
.overlay-fade-enter-from,
.overlay-fade-leave-to { opacity: 0 }

/* ── Responsive ── */
@media (max-width: 768px) {
  .topbar { padding: 0 10px; gap: 8px }
  .main-nav { gap: 12px }
  .nav-link { font-size: 11px }
}
@media (max-width: 500px) {
  .brand-role-suffix { display: none }
  .topbar-left { flex: 0 0 auto }
}
@media (prefers-reduced-motion: reduce) {
  .icon-btn,
  .overlay-fade-enter-active,
  .overlay-fade-leave-active { transition: none }
}
</style>