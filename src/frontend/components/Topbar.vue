<template>
  <header class="topbar">
    <div class="topbar-left">
      <router-link :to="homeRoute" class="brand-link">
        <span class="brand-title">StudyLink</span>
        <span class="brand-role-suffix">{{ brandRoleLabel }}</span>
      </router-link>
    </div>
    <div class="topbar-center">
      <nav class="main-nav" v-if="currentUser">
        <router-link 
          v-for="item in navItems" 
          :key="item.key" 
          :to="item.path"
          class="nav-link"
        >
          {{ item.label }}
        </router-link>
      </nav>
    </div>
    <div class="topbar-actions">
      <button class="icon-btn streak-btn" @click="showStreakModal" title="Login streak">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4" width="18" height="17" rx="3" fill="#b11f4b"/>
          <rect x="3" y="8" width="18" height="3" fill="#ffb7c5"/>
          <rect x="7" y="2" width="2" height="4" rx="1" fill="#8d1630"/>
          <rect x="15" y="2" width="2" height="4" rx="1" fill="#8d1630"/>
          <rect x="6" y="13" width="2.2" height="2.2" rx="0.5" fill="#f5f5f7"/>
          <rect x="10.9" y="13" width="2.2" height="2.2" rx="0.5" fill="#f5f5f7"/>
          <rect x="15.8" y="13" width="2.2" height="2.2" rx="0.5" fill="#f5f5f7"/>
          <rect x="6" y="16.6" width="2.2" height="2.2" rx="0.5" fill="#f5f5f7"/>
          <rect x="10.9" y="16.6" width="7.1" height="2.2" rx="1" fill="#ffdce6"/>
        </svg>
        <span class="streak-btn-badge" v-if="streakCount">{{ streakCount }}</span>
      </button>
      <button class="icon-btn notify-btn" @click="navigateToNotifications" title="Notifications">
        <svg viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
        <span class="notify-badge" v-if="unreadCount" :class="{ unread: unreadCount > 0 }">{{ unreadCount }}</span>
      </button>
      <button class="icon-btn message-btn" @click="navigateToMessages" title="Messages">
        <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
        <span class="notify-badge" v-if="messageUnreadCount" :class="{ unread: messageUnreadCount > 0 }">{{ messageUnreadCount }}</span>
      </button>
      <button class="icon-btn profile-btn" @click="showUserMenu" title="User menu">
        <img
          v-if="topbarProfilePicture"
          class="topbar-profile-image"
          :src="topbarProfilePicture"
          :alt="currentUser?.fullName || 'Profile'"
        />
        <svg v-else viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
      </button>
    </div>
  </header>

  <div v-if="isStreakModalOpen" class="modal-overlay" @click="isStreakModalOpen = false">
    <div class="modal-content streak-modal" @click.stop>
      <div class="modal-header">
        <div>
          <p class="modal-kicker">DAILY CHECK-INS</p>
          <h2>Activity calendar</h2>
          <p class="modal-subtext">You have a {{ streakCount }}-day check-in run.</p>
        </div>
        <button class="close-btn" @click="isStreakModalOpen = false">&times;</button>
      </div>

      <div class="streak-stats-grid">
        <div class="stat-box">
          <span class="stat-label">CURRENT RUN</span>
          <span class="stat-value">
            🔥 {{ streakCount }} day<span v-if="streakCount !== 1">s</span>
          </span>
        </div>
        <div class="stat-box">
          <span class="stat-label">LAST CHECK-IN</span>
          <span class="stat-value">{{ lastCheckInDate }}</span>
        </div>
      </div>

      <div class="calendar-header">
        <button class="calendar-nav" @click="previousMonth">&lt;</button>
        <h3>{{ currentMonth }}</h3>
        <button class="calendar-nav" @click="nextMonth">&gt;</button>
      </div>

      <div class="calendar-weekdays">
        <div class="weekday">S</div>
        <div class="weekday">M</div>
        <div class="weekday">T</div>
        <div class="weekday">W</div>
        <div class="weekday">T</div>
        <div class="weekday">F</div>
        <div class="weekday">S</div>
      </div>

      <div class="calendar-grid">
        <div 
          v-for="(day, index) in calendarDays" 
          :key="index" 
          class="calendar-day" 
          :class="{ 
            'other-month': day.otherMonth, 
            'checked-in': day.checkedIn,
            'today': day.isToday && !day.checkedIn
          }"
        >
          <span v-if="day.date">{{ day.date }}</span>
        </div>
      </div>

      <p class="calendar-footer">
        <template v-if="streakCount === 0">Start your streak — log in daily!</template>
        <template v-else-if="streakCount < 7">{{ streakCount }} day{{ streakCount !== 1 ? 's' : '' }} in — keep it going!</template>
        <template v-else>🔥 {{ streakCount }}-day streak! You're on a roll.</template>
      </p>
    </div>
  </div>

  <div v-if="isUserMenuOpen" class="modal-overlay" @click="isUserMenuOpen = false">
    <div class="user-menu" @click.stop>
      <div class="user-menu-header">
        <div class="user-menu-identity">
          <div class="user-menu-avatar">
            <img v-if="topbarProfilePicture" :src="topbarProfilePicture" :alt="currentUser?.fullName" />
            <span v-else>{{ (currentUser?.fullName || 'U')[0].toUpperCase() }}</span>
          </div>
          <div>
            <h3>{{ currentUser?.fullName }}</h3>
            <p class="user-role">{{ currentUser?.role }}</p>
          </div>
        </div>
      </div>
      <div class="user-menu-divider"></div>
      <router-link to="/profile" class="menu-item" @click="isUserMenuOpen = false">
        Profile
      </router-link>
      <router-link to="/settings" class="menu-item" @click="isUserMenuOpen = false">
        Settings
      </router-link>
      <router-link to="/review" class="menu-item" @click="isUserMenuOpen = false">
        Reviews
      </router-link>
      <router-link to="/quizzes" class="menu-item" @click="isUserMenuOpen = false">
        Quizzes
      </router-link>
      <router-link
        v-if="currentUser && (currentUser.role === 'tutor' || currentUser.role === 'admin')"
        to="/quizzes/create"
        class="menu-item menu-item--create-quiz"
        @click="isUserMenuOpen = false"
      >
        ✏️ Create Quiz
      </router-link>

      <router-link to="/achievements" class="menu-item" @click="isUserMenuOpen = false">
        Achievements
      </router-link>
      <router-link to="/leaderboards" class="menu-item" @click="isUserMenuOpen = false">
        Leaderboard
      </router-link>
      <router-link to="/redeem" class="menu-item" @click="isUserMenuOpen = false">
        Redeem Points
      </router-link>
      <router-link v-if="currentUser?.role === 'tutor' || currentUser?.role === 'admin'" to="/verification" class="menu-item" @click="isUserMenuOpen = false">
        Verification
      </router-link>
      <div class="user-menu-divider"></div>
      <button @click="logout" class="menu-item logout-item">
        Logout
      </button>
    </div>
  </div>
</template>

<script>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api, getUser, clearSession } from '@/api.js'
import { normalizeAssetUrl } from '@/utils/records.js'

export default {
  name: 'Topbar',
  setup() {
    const router = useRouter()
    const currentUserState = ref(getUser())
    const currentUser = computed(() => currentUserState.value)
    const isAdmin = computed(() => currentUser.value?.role === 'admin')
    const homeRoute = computed(() => {
      return currentUser.value?.role === 'admin' ? '/admin/analytics' : '/resources'
    })
    const streakCount = ref(0)
    const unreadCount = ref(0)
    const messageUnreadCount = ref(0)
    const notificationPollTimer = ref(null)
    const isStreakModalOpen = ref(false)
    const isUserMenuOpen = ref(false)
    const quickNavHistory = ref({})
    const lastCheckInDate = ref('Today')
    const loginHistory = ref([])
    const currentDate = ref(new Date())
    const calendarDays = ref([])

    const toDateKey = (dateValue) => {
      const date = dateValue instanceof Date ? dateValue : new Date(dateValue)
      if (Number.isNaN(date.getTime())) return ''

      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    const normalizeDateKey = (value) => {
      if (!value) return ''
      if (value instanceof Date) return toDateKey(value)

      const str = String(value).trim()
      if (!str) return ''
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
      if (/^\d{4}-\d{2}-\d{2}T/.test(str)) return str.slice(0, 10)

      return toDateKey(str)
    }

    const formatDateKey = (dateKey) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return 'Today'
      const [year, month, day] = dateKey.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    const currentMonth = computed(() => {
      return currentDate.value.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    })

    const displayRole = computed(() => {
      const rawRole = currentUser.value?.role
      if (!rawRole) return ''

      return rawRole
        .toString()
        .replace(/[_-]+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase())
    })

    const topbarProfilePicture = computed(() => {
      const user = currentUser.value || {}
      return normalizeAssetUrl(
        user.profilePicture || user.profilePictureUrl || user.profile_picture_url || user.profile_picture || ''
      )
    })

    const brandRoleLabel = computed(() => {
      return displayRole.value ? ` (${displayRole.value})` : ''
    })

    const navItems = computed(() => {
      if (!currentUser.value) return []
      
      const role = currentUser.value.role || 'tutee'
      const baseItems = [
        { key: 'resources', label: 'Resources', path: '/resources' },
        { key: 'my-resources', label: 'My Uploads', path: '/my-resources' },
        { key: 'tutors', label: 'Tutors', path: '/tutors' },
        { key: 'session', label: 'Sessions', path: '/session' },
        { key: 'quizzes', label: 'Quizzes', path: '/quizzes' }
      ]
      
      if (role === 'admin') {
        return [
          { key: 'analytics', label: 'Analytics', path: '/admin/analytics' },
          { key: 'resource-management', label: 'Resource Management', path: '/admin/resources' },
          { key: 'verifications', label: 'Verification Review', path: '/admin/review-verifications' },
          { key: 'reward-rules', label: 'Reward Rules', path: '/admin/reward-rules' },
          { key: 'admin-activity', label: 'Admin Activity', path: '/admin/activity' },
          { key: 'admin-errors', label: 'Server Errors', path: '/admin/errors' },
          { key: 'quizzes', label: 'Quizzes', path: '/quizzes' }
        ]
      }
      
      return baseItems
    })

    const loginDateKeys = computed(() => {
      return new Set(
        (loginHistory.value || [])
          .map((entry) => normalizeDateKey(entry))
          .filter(Boolean)
      )
    })

    const generateCalendar = () => {
      const year = currentDate.value.getFullYear()
      const month = currentDate.value.getMonth()
      const todayKey = toDateKey(new Date())

      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      const startDate = new Date(firstDay)
      startDate.setDate(startDate.getDate() - firstDay.getDay())

      const days = []
      for (let i = 0; i < 42; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        const isCurrentMonth = date.getMonth() === month
        const dateString = String(date.getDate())
        const dateKey = toDateKey(date)

        days.push({
          date: dateString,
          otherMonth: !isCurrentMonth,
          checkedIn: isCurrentMonth && loginDateKeys.value.has(dateKey),
          isToday: isCurrentMonth && dateKey === todayKey,
          dateKey: dateKey
        })
      }
      calendarDays.value = days
    }

    const previousMonth = () => {
      currentDate.value.setMonth(currentDate.value.getMonth() - 1)
      currentDate.value = new Date(currentDate.value)
      generateCalendar()
    }

    const nextMonth = () => {
      currentDate.value.setMonth(currentDate.value.getMonth() + 1)
      currentDate.value = new Date(currentDate.value)
      generateCalendar()
    }

    const goHome = async () => {
      if (router.currentRoute.value.path !== homeRoute.value) {
        await router.push(homeRoute.value)
      }
    }

    const syncCurrentUser = () => {
      currentUserState.value = getUser()
    }

    const toggleRoute = async (targetPath) => {
      const currentPath = router.currentRoute.value.path
      const currentFullPath = router.currentRoute.value.fullPath

      if (currentPath === targetPath) {
        const previousPath = quickNavHistory.value[targetPath]
        if (previousPath && previousPath !== currentFullPath) {
          await router.push(previousPath)
        } else {
          await goHome()
        }

        quickNavHistory.value = {
          ...quickNavHistory.value,
          [targetPath]: null
        }
        return
      }

      quickNavHistory.value = {
        ...quickNavHistory.value,
        [targetPath]: currentFullPath
      }

      await router.push(targetPath)
    }

    const navigateToNotifications = async () => {
      await toggleRoute('/notifications')
    }

    const navigateToMessages = async () => {
      await toggleRoute('/messages')
    }

    const showStreakModal = async () => {
      isStreakModalOpen.value = true
      currentDate.value = new Date()
      generateCalendar()
      await loadLoginHistory()
      generateCalendar()
    }

    const showStreakModalAuto = async () => {
      await showStreakModal()
    }

    const showUserMenu = () => {
      isUserMenuOpen.value = true
    }

    const loadLoginHistory = async () => {
      try {
        const resp = await api('/me/login-history')
        loginHistory.value = resp.loginHistory || resp.historyDates || []
        streakCount.value = resp.count || currentUser.value?.login_streak || 0

        const todayKey = toDateKey(new Date())
        const latestKey = normalizeDateKey(loginHistory.value[0])

        if (loginDateKeys.value.has(todayKey)) {
          lastCheckInDate.value = 'Today'
        } else if (latestKey) {
          lastCheckInDate.value = formatDateKey(latestKey)
        } else {
          lastCheckInDate.value = 'N/A'
        }
      } catch (err) {
        console.debug('Failed to load login history (this is normal if endpoint not yet available):', err.message)
      }
    }

    const loadUnreadNotifications = async () => {
      if (!currentUser.value) {
        unreadCount.value = 0
        return
      }

      try {
        const resp = await api('/notifications?filter=unread')
        const notifications = Array.isArray(resp.notifications) ? resp.notifications : []
        unreadCount.value = notifications.filter((item) => !(item.is_read ?? item.isRead)).length
      } catch (err) {
        console.debug('Failed to load notifications (this is normal if endpoint not yet available):', err.message)
      }
    }

    const loadUnreadMessages = async () => {
      if (!currentUser.value) {
        messageUnreadCount.value = 0
        return
      }

      try {
        const resp = await api('/conversations')
        const conversations = Array.isArray(resp.conversations) ? resp.conversations : []
        messageUnreadCount.value = conversations.reduce((sum, item) => {
          const unread = Number(item?.unread_count || 0)
          return sum + (Number.isFinite(unread) ? unread : 0)
        }, 0)
      } catch (err) {
        console.debug('Failed to load unread messages (this is normal if endpoint not yet available):', err.message)
      }
    }

    const startNotificationPolling = () => {
      if (notificationPollTimer.value) {
        window.clearInterval(notificationPollTimer.value)
      }

      notificationPollTimer.value = window.setInterval(() => {
        loadUnreadNotifications()
        loadUnreadMessages()
      }, 15000)
    }

    const stopNotificationPolling = () => {
      if (!notificationPollTimer.value) {
        return
      }

      window.clearInterval(notificationPollTimer.value)
      notificationPollTimer.value = null
    }

    const refreshNotificationsOnFocus = () => {
      loadUnreadNotifications()
      loadUnreadMessages()
    }

    const logout = () => {
      stopNotificationPolling()
      clearSession()
      sessionStorage.removeItem('hasSeenStreakModal')
      router.push('/login')
    }

    const handleGlobalKeydown = (e) => {
      if (e.key === 'Escape') {
        isStreakModalOpen.value = false
        isUserMenuOpen.value = false
      }
    }

    watch(
      () => router.currentRoute.value.path,
      () => {
        isUserMenuOpen.value = false
        isStreakModalOpen.value = false
      }
    )

    onMounted(async () => {
      window.addEventListener('studylink-session-changed', syncCurrentUser)
      window.addEventListener('studylink-profile-updated', syncCurrentUser)
      window.addEventListener('storage', syncCurrentUser)
      window.addEventListener('studylink-notifications-changed', loadUnreadNotifications)
      window.addEventListener('focus', refreshNotificationsOnFocus)
      window.addEventListener('keydown', handleGlobalKeydown)

      if (currentUser.value) {
        streakCount.value = currentUser.value.login_streak || 0

        if (sessionStorage.getItem('studylinkShowStreakAfterLogin') === '1') {
          sessionStorage.removeItem('studylinkShowStreakAfterLogin')
          await showStreakModal()
        }
      }
    })

    watch(
      currentUser,
      async (user) => {
        if (!user) {
          unreadCount.value = 0
          messageUnreadCount.value = 0
          stopNotificationPolling()
          return
        }

        await loadUnreadNotifications()
        await loadUnreadMessages()
        startNotificationPolling()
      },
      { immediate: true }
    )

    onUnmounted(() => {
      window.removeEventListener('studylink-session-changed', syncCurrentUser)
      window.removeEventListener('studylink-profile-updated', syncCurrentUser)
      window.removeEventListener('storage', syncCurrentUser)
      window.removeEventListener('studylink-notifications-changed', loadUnreadNotifications)
      window.removeEventListener('focus', refreshNotificationsOnFocus)
      window.removeEventListener('keydown', handleGlobalKeydown)
      stopNotificationPolling()
    })

    return {
      currentUser,
      isAdmin,
      homeRoute,
      streakCount,
      unreadCount,
      messageUnreadCount,
      isStreakModalOpen,
      isUserMenuOpen,
      lastCheckInDate,
      calendarDays,
      currentMonth,
      brandRoleLabel,
      topbarProfilePicture,
      navItems,
      navigateToNotifications,
      navigateToMessages,
      showStreakModal,
      showStreakModalAuto,
      showUserMenu,
      logout,
      previousMonth,
      nextMonth
    }
  }
}
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px clamp(10px, 2vw, 24px);
  border-bottom: 1px solid #e0e0e0;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: saturate(180%) blur(20px);
  position: relative;
  z-index: 30;
  width: 100%;
  max-width: 100%;
}

.topbar-left {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.brand-link {
  font-size: 17px;
  font-weight: 600;
  color: #1d1d1f;
  text-decoration: none;
  letter-spacing: -0.01em;
  display: inline-flex;
  align-items: center;
  gap: 0;
  min-width: 0;
}

.brand-title {
  white-space: nowrap;
}

.brand-role-suffix {
  color: #6e6e73;
  white-space: nowrap;
}

.brand-link:hover {
  color: #b11f4b;
}

.topbar-center {
  flex: 1 1 auto;
  display: flex;
  justify-content: center;
  min-width: 0;
  overflow: hidden;
}

.main-nav {
  display: flex;
  gap: 22px;
  justify-content: center;
  align-items: center;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  white-space: nowrap;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.main-nav::-webkit-scrollbar {
  display: none;
}

.nav-link {
  color: #6e6e73;
  text-decoration: none;
  font-size: 12px;
  font-weight: 400;
  transition: color 120ms ease;
  position: relative;
  letter-spacing: -0.01em;
}

.nav-link:hover {
  color: #FF85BB;
}

.nav-link.router-link-active {
  color: #021A54;
  font-weight: 500;
}

.nav-link.router-link-active::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  right: 0;
  height: 1px;
  background: #FF85BB;
  border-radius: 1px;
}

.topbar-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 6px;
}

.icon-btn {
  border: 1px solid #FFCEE3;
  border-radius: 9999px;
  background: #F5F5F5;
  font-size: 12px;
  padding: 0;
  cursor: pointer;
  transition: transform 120ms ease, background-color 120ms ease, border-color 120ms ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
}

.icon-btn svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
  color: #6e6e73;
}

.icon-btn:hover svg {
  color: #FF85BB;
}

.icon-btn:hover {
  border-color: #ffb5d6;
  background: #ffffff;
}

.icon-btn:active {
  transform: scale(0.95);
}

.streak-btn,
.notify-btn,
.message-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 9999px;
  position: relative;
}

.streak-btn svg,
.notify-btn svg,
.message-btn svg {
  width: 18px;
  height: 18px;
  color: #6e6e73;
}

.topbar-profile-image {
  width: 100%;
  height: 100%;
  border-radius: 9999px;
  object-fit: cover;
  display: block;
}

.profile-btn {
  border: 1px solid #e0e0e0;
  background: #f5f5f7;
  width: 34px;
  height: 34px;
  padding: 0;
  overflow: hidden;
}

.profile-btn:hover {
  background: transparent;
  border-color: transparent;
  transform: scale(1.03);
}

.profile-btn .topbar-profile-image {
  border: 1px solid #e0e0e0;
}

.profile-btn svg {
  width: 100%;
  height: 100%;
  border-radius: 9999px;
  background: #f5f5f7;
  color: #6e6e73;
  border: none;
  padding: 5px;
}

.streak-btn:hover svg,
.notify-btn:hover svg,
.message-btn:hover svg {
  color: #b11f4b;
}

.streak-btn-badge,
.notify-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: #b11f4b;
  color: #fff;
  border: 2px solid #fff;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.notify-badge.unread {
  background: #b11f4b;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.44);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
  backdrop-filter: blur(6px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.modal-content {
  background: white;
  border-radius: 18px;
  border: 1px solid #e0e0e0;
  padding: 24px;
  max-width: 500px;
  width: min(500px, calc(100vw - 40px));
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  margin: 0 auto;
  box-shadow: none;
}

.modal-content.streak-modal {
  max-width: 420px;
  width: min(420px, calc(100vw - 40px));
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.modal-header h2 {
  margin: 0;
  font-size: 32px;
  color: #1d1d1f;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.modal-kicker {
  margin: 0 0 4px 0;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #6e6e73;
  text-transform: uppercase;
}

.modal-subtext {
  margin: 8px 0 0 0;
  font-size: 17px;
  color: #6e6e73;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #6e6e73;
  padding: 0;
  line-height: 1;
  margin-top: -4px;
}

.close-btn:hover {
  color: #1d1d1f;
}

/* Stats Grid */
.streak-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.stat-box {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 11px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  font-weight: 700;
  color: #6e6e73;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 17px;
  font-weight: 600;
  color: #1d1d1f;
}

/* Calendar Header */
.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 0 8px;
}

.calendar-header h3 {
  margin: 0;
  font-size: 17px;
  color: #1d1d1f;
  font-weight: 600;
}

.calendar-nav {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #f5f5f7;
  border: 1px solid #e0e0e0;
  font-size: 14px;
  font-weight: 700;
  color: #1d1d1f;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 150ms ease, border-color 150ms ease;
}

.calendar-nav:hover {
  background: rgba(177, 31, 75, 0.08);
  border-color: #b11f4b;
  color: #b11f4b;
}

/* Calendar Weekdays */
.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0;
  margin-bottom: 8px;
}

.weekday {
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #6e6e73;
  padding: 8px 0;
  text-transform: uppercase;
}

/* Calendar Grid */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 16px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  background: white;
  font-size: 14px;
  color: #6e6e73;
  font-weight: 500;
  cursor: default;
}

.calendar-day.today {
  border: 2px solid #b11f4b;
  color: #b11f4b;
  font-weight: 700;
  background: rgba(177, 31, 75, 0.05);
}

.calendar-day.other-month {
  visibility: hidden;
  border-color: transparent;
  background: transparent;
}

.calendar-day.checked-in {
  background: #b11f4b;
  color: white;
  border-color: #b11f4b;
  font-weight: 600;
  position: relative;
  z-index: 1;
}

.calendar-day.checked-in + .calendar-day.checked-in::before {
  content: '';
  position: absolute;
  left: -4px;
  top: 50%;
  transform: translateY(-50%);
  width: 8px;
  height: 60%;
  background: #b11f4b;
  z-index: -1;
}

.calendar-footer {
  text-align: center;
  font-size: 12px;
  color: #6e6e73;
  margin: 0;
}

/* User Menu Styles */
.user-menu {
  background: white;
  border-radius: 11px;
  padding: 12px 0;
  min-width: 200px;
  box-shadow: none;
  position: fixed;
  top: 56px;
  right: 16px;
  z-index: 1000;
  border: 1px solid #e0e0e0;
  max-height: calc(100vh - 72px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.user-menu-header {
  padding: 12px 16px;
  border-bottom: 1px solid #f5f5f5;
}

.user-menu-identity {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-menu-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #f5f5f7;
  border: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 15px;
  color: #b11f4b;
  overflow: hidden;
  flex-shrink: 0;
}

.user-menu-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-menu-header h3 {
  margin: 0;
  font-size: 17px;
  color: #1d1d1f;
  font-weight: 600;
}

.user-role {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: #6e6e73;
  text-transform: capitalize;
}

.user-menu-divider {
  height: 1px;
  background: #e0e0e0;
  margin: 8px 0;
}

.menu-item {
  display: block;
  padding: 10px 16px;
  color: #1d1d1f;
  text-decoration: none;
  font-size: 14px;
  cursor: pointer;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  transition: all 150ms ease;
  font-weight: 500;
}

.menu-item:hover {
  background: #f5f5f7;
  color: #b11f4b;
}

.menu-item--create-quiz {
  color: #b11f4b;
  font-weight: 600;
  background: rgba(177, 31, 75, 0.04);
}

.menu-item--create-quiz:hover {
  background: rgba(177, 31, 75, 0.1);
}

.logout-item {
  color: #b11f4b;
  font-weight: 600;
}

.logout-item:hover {
  background: #fff1f4;
}

@media (max-width: 1068px) {
  .topbar {
    padding: 10px 16px;
  }

  .main-nav {
    gap: 14px;
  }
}

@media (max-width: 833px) {
  .topbar {
    flex-wrap: wrap;
    gap: 8px;
    padding: 8px 10px;
    align-items: center;
  }

  .brand-link {
    font-size: 14px;
  }

  .topbar-left {
    order: 1;
    flex: 1 1 auto;
    min-width: 0;
  }

  .topbar-actions {
    order: 2;
    margin-left: auto;
    gap: 6px;
  }

  .topbar-center {
    order: 3;
    flex: 1 1 100%;
    width: 100%;
    justify-content: flex-start;
    overflow: hidden;
  }

  .main-nav {
    gap: 10px;
    width: 100%;
    overflow-x: auto;
    justify-content: flex-start;
    padding-bottom: 2px;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .main-nav::-webkit-scrollbar {
    display: none;
  }

  .nav-link {
    font-size: 11px;
    padding: 2px 0;
  }

  .icon-btn,
  .streak-btn,
  .notify-btn,
  .message-btn {
    width: 32px;
    height: 32px;
  }

  .streak-btn svg,
  .notify-btn svg,
  .message-btn svg {
    width: 16px;
    height: 16px;
  }
}

@media (max-width: 640px) {
  .brand-link {
    font-size: 13px;
  }

  .brand-role-suffix {
    display: none;
  }

  .topbar-actions {
    gap: 4px;
    margin-left: 0;
  }

  .icon-btn,
  .streak-btn,
  .notify-btn,
  .message-btn,
  .profile-btn {
    width: 30px;
    height: 30px;
  }

  .notify-badge,
  .streak-btn-badge {
    top: -5px;
    right: -5px;
    min-width: 17px;
    height: 17px;
    font-size: 8px;
  }

  .user-menu {
    left: 12px;
    right: 12px;
    top: 56px;
    width: auto;
    min-width: 0;
    max-height: calc(100vh - 72px);
    overflow-y: auto;
  }

  .modal-content,
  .modal-content.streak-modal {
    width: min(100%, calc(100vw - 24px));
    max-height: calc(100vh - 24px);
    overflow-y: auto;
  }
}

@media (max-height: 620px) {
  .modal-overlay {
    align-items: flex-start;
    padding: 10px;
  }

  .modal-content,
  .modal-content.streak-modal {
    width: min(100%, calc(100vw - 20px));
    max-height: calc(100vh - 20px);
    margin-top: 2px;
  }

  .streak-stats-grid {
    grid-template-columns: 1fr;
    gap: 10px;
    margin-bottom: 14px;
  }

  .modal-header {
    margin-bottom: 14px;
  }

  .modal-header h2 {
    font-size: 28px;
  }

  .modal-subtext {
    font-size: 15px;
  }

  .calendar-header {
    margin-bottom: 10px;
  }

  .weekday {
    padding: 4px 0;
    font-size: 11px;
  }

  .calendar-day {
    font-size: 12px;
  }
}

@media (max-height: 480px) {
  .modal-header h2 {
    font-size: 24px;
  }

  .modal-kicker {
    font-size: 10px;
  }

  .stat-box {
    padding: 10px;
  }

  .calendar-grid {
    gap: 3px;
  }
}
</style>
