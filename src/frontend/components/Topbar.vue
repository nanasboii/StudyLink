<template>
  <header class="topbar">
    <div class="topbar-left">
      <router-link to="/resources" class="brand-link">StudyLink{{ brandRoleLabel }}</router-link>
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
        <svg viewBox="0 0 24 24"><path d="M12 2c5.33 4.55 8 8.48 8 11.8 0 4.98-3.8 8.2-8 8.2s-8-3.22-8-8.2C4 10.48 6.67 6.55 12 2z" fill="#3f6f57"/></svg>
        <span class="streak-btn-badge" v-if="streakCount">{{ streakCount }}</span>
      </button>
      <button class="icon-btn notify-btn" @click="navigateToNotifications" title="Notifications">
        <svg viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
        <span class="notify-badge" v-if="unreadCount" :class="{ unread: unreadCount > 0 }">{{ unreadCount }}</span>
      </button>
      <button class="icon-btn" @click="showUserMenu" title="User menu">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
      </button>
    </div>
  </header>

  <!-- Streak Modal -->
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
          <span class="stat-value">{{ streakCount }} day<span v-if="streakCount !== 1">s</span></span>
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
        <div v-for="(day, index) in calendarDays" :key="index" class="calendar-day" :class="{ 'other-month': day.otherMonth, 'checked-in': day.checkedIn }">
          <span v-if="day.date">{{ day.date }}</span>
        </div>
      </div>

      <p class="calendar-footer">Check in daily to maintain your run.</p>
    </div>
  </div>

  <!-- User Menu -->
  <div v-if="isUserMenuOpen" class="modal-overlay" @click="isUserMenuOpen = false">
    <div class="user-menu" @click.stop>
      <div class="user-menu-header">
        <h3>{{ currentUser?.fullName }}</h3>
        <p class="user-role">{{ currentUser?.role }}</p>
      </div>
      <div class="user-menu-divider"></div>
      <router-link to="/profile" class="menu-item" @click="isUserMenuOpen = false">
        👤 Profile
      </router-link>
      <router-link to="/settings" class="menu-item" @click="isUserMenuOpen = false">
        ⚙️ Settings
      </router-link>
      <router-link to="/review" class="menu-item" @click="isUserMenuOpen = false">
        📝 Reviews
      </router-link>
      <router-link to="/achievements" class="menu-item" @click="isUserMenuOpen = false">
        🏆 Achievements
      </router-link>
      <router-link to="/verification" class="menu-item" @click="isUserMenuOpen = false">
        ✓ Verification
      </router-link>
      <div class="user-menu-divider"></div>
      <button @click="logout" class="menu-item logout-item">
        🚪 Logout
      </button>
    </div>
  </div>
</template>

<script>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api, getUser, clearSession } from '@/api.js'

export default {
  name: 'Topbar',
  setup() {
    const router = useRouter()
    const currentUser = computed(() => getUser())
    const streakCount = ref(0)
    const unreadCount = ref(0)
    const isStreakModalOpen = ref(false)
    const isUserMenuOpen = ref(false)
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

    const brandRoleLabel = computed(() => {
      return displayRole.value ? ` (${displayRole.value})` : ''
    })

    const navItems = computed(() => {
      if (!currentUser.value) return []
      
      const role = currentUser.value.role || 'tutee'
      const baseItems = [
        { key: 'resources', label: 'Resources', path: '/resources' },
        { key: 'tutors', label: 'Tutors', path: '/tutors' },
        { key: 'leaderboards', label: 'Leaderboard', path: '/leaderboards' },
        { key: 'session', label: 'Sessions', path: '/session' }
      ]
      
      if (role === 'admin') {
        return [
          { key: 'resources', label: 'Resources', path: '/resources' },
          { key: 'leaderboards', label: 'Leaderboard', path: '/leaderboards' }
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
      
      // Get first day of month and last day of month
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      const startDate = new Date(firstDay)
      startDate.setDate(startDate.getDate() - firstDay.getDay())
      
      const days = []
      for (let i = 0; i < 42; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        const isCurrentMonth = date.getMonth() === month
        const dateString = isCurrentMonth ? date.getDate() : null
        const dateKey = toDateKey(date)
        
        days.push({
          date: dateString,
          otherMonth: !isCurrentMonth,
          checkedIn: isCurrentMonth && loginDateKeys.value.has(dateKey)
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

    const navigateToNotifications = () => {
      router.push('/notifications')
    }

    const showStreakModal = async () => {
      isStreakModalOpen.value = true
      currentDate.value = new Date()
      await loadLoginHistory()
      generateCalendar()
    }

    const showStreakModalAuto = async () => {
      // Auto-show on login
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
      try {
        const resp = await api('/notifications?filter=unread')
        unreadCount.value = resp.notifications?.length || 0
      } catch (err) {
        console.debug('Failed to load notifications (this is normal if endpoint not yet available):', err.message)
      }
    }

    const logout = () => {
      clearSession()
      sessionStorage.removeItem('hasSeenStreakModal')
      router.push('/login')
    }

    onMounted(async () => {
      if (currentUser.value) {
        streakCount.value = currentUser.value.login_streak || 0
        await loadUnreadNotifications()
      }
    })

    return {
      currentUser,
      streakCount,
      unreadCount,
      isStreakModalOpen,
      isUserMenuOpen,
      lastCheckInDate,
      calendarDays,
      currentMonth,
      brandRoleLabel,
      navItems,
      navigateToNotifications,
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
  grid-row: 1;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 20px;
  padding: 12px 24px;
  border-bottom: 1px solid #ffd4e0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 250, 252, 0.96));
  backdrop-filter: blur(10px);
  box-shadow: 0 1px 4px rgba(9, 27, 44, 0.06);
  position: relative;
  z-index: 30;
  overflow: visible;
}

.topbar-left {
  justify-self: start;
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-link {
  font-size: 16px;
  font-weight: 700;
  color: #3f2f38;
  text-decoration: none;
  font-family: "Josefin Sans", "Trebuchet MS", sans-serif;
  letter-spacing: 0.5px;
}

.brand-link:hover {
  color: #c41e3a;
}

.topbar-center {
  justify-self: center;
  flex: 1;
  display: flex;
  justify-content: center;
}

.main-nav {
  display: flex;
  gap: 32px;
  align-items: center;
}

.nav-link {
  color: #666;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  transition: color 150ms ease;
  position: relative;
}

.nav-link:hover {
  color: #c41e3a;
}

.nav-link.router-link-active {
  color: #c41e3a;
  font-weight: 600;
}

.nav-link.router-link-active::after {
  content: '';
  position: absolute;
  bottom: -8px;
  left: 0;
  right: 0;
  height: 2px;
  background: #c41e3a;
  border-radius: 1px;
}

.topbar-actions {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-btn {
  border: 1px solid #f0c4d1;
  border-radius: 10px;
  background: white;
  font-size: 13px;
  padding: 8px;
  cursor: pointer;
  transition: all 150ms ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
}

.icon-btn:hover {
  background: #fff4f8;
  border-color: #ffb7c5;
}

.streak-btn,
.notify-btn {
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 10px;
  position: relative;
}

.streak-btn svg,
.notify-btn svg {
  width: 20px;
  height: 20px;
  color: #666;
}

.streak-btn:hover svg,
.notify-btn:hover svg {
  color: #c41e3a;
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
  background: #c41e3a;
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
  background: #c41e3a;
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
  background: rgba(0, 0, 0, 0.4);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 500px;
  width: min(500px, calc(100vw - 40px));
  margin: 0 auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
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
  font-size: 24px;
  color: #3f2f38;
  font-weight: 700;
}

.modal-kicker {
  margin: 0 0 4px 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #999;
  text-transform: uppercase;
}

.modal-subtext {
  margin: 8px 0 0 0;
  font-size: 14px;
  color: #666;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #999;
  padding: 0;
  line-height: 1;
  margin-top: -4px;
}

.close-btn:hover {
  color: #333;
}

/* Stats Grid */
.streak-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 24px;
}

.stat-box {
  background: #f9f9f9;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 11px;
  font-weight: 700;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #3f2f38;
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
  font-size: 16px;
  color: #3f2f38;
  font-weight: 600;
}

.calendar-nav {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
  padding: 4px 8px;
  transition: color 150ms ease;
}

.calendar-nav:hover {
  color: #333;
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
  color: #999;
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
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  background: white;
  font-size: 13px;
  color: #666;
  font-weight: 500;
  cursor: default;
}

.calendar-day.other-month {
  background: #f9f9f9;
  color: #ccc;
  border-color: #efefef;
}

.calendar-day.checked-in {
  background: #d91c3a;
  color: white;
  border-color: #d91c3a;
  font-weight: 600;
}

.calendar-footer {
  text-align: center;
  font-size: 12px;
  color: #999;
  margin: 0;
}

/* User Menu Styles */
.user-menu {
  background: white;
  border-radius: 8px;
  padding: 12px 0;
  min-width: 200px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  position: fixed;
  top: 56px;
  right: 16px;
  z-index: 1000;
  border: 1px solid #f0c4d1;
}

.user-menu-header {
  padding: 12px 16px;
  border-bottom: 1px solid #f5f5f5;
}

.user-menu-header h3 {
  margin: 0;
  font-size: 14px;
  color: #3f2f38;
  font-weight: 600;
}

.user-role {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: #999;
  text-transform: capitalize;
}

.user-menu-divider {
  height: 1px;
  background: #f0c4d1;
  margin: 8px 0;
}

.menu-item {
  display: block;
  padding: 10px 16px;
  color: #3f2f38;
  text-decoration: none;
  font-size: 13px;
  cursor: pointer;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  transition: all 150ms ease;
  font-weight: 500;
}

.menu-item:hover {
  background: #fff4f8;
  color: #c41e3a;
}

.logout-item {
  color: #c41e3a;
  font-weight: 600;
}

.logout-item:hover {
  background: #ffebee;
}
</style>
