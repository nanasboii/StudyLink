<template>
  <main class="page-bg notifications-page">
    <section class="phone-shell">
      <div class="view page active">
        <div class="notifications-header">
          <h2>Notifications</h2>
          <button @click="markAllRead" class="chip" type="button">Mark all as read</button>
        </div>
        
        <div class="notifications-filters">
          <button
            v-for="filter in ['all', 'unread']"
            :key="filter"
            @click="activeFilter = filter"
            class="filter-btn"
            :class="{ active: activeFilter === filter }"
            type="button"
          >
            {{ filter === 'all' ? 'All' : 'Unread' }}
          </button>
        </div>

        <p v-if="allNotifications.length > 0" class="notifications-meta">
          Showing {{ Math.min(visibleCount, filteredNotifications.length) }} of {{ allNotifications.length }} groups ({{ unreadCount }} unread individual notifications)
        </p>

        <div v-if="filteredNotifications.length === 0" class="empty-state">
          <p>No notifications yet. You're all caught up! 🎉</p>
        </div>

        <div v-else class="notifications-grid">
          <div v-for="notif in filteredNotifications" :key="notif.id" class="notification-card" :class="{ unread: !notif.isRead }">
            <div class="notification-badge">{{ notif.isRead ? 'Read' : 'Unread' }}</div>
            <div class="notification-content">
              <p class="notification-message">{{ notif.message }}</p>
              <p class="notification-time">{{ relativeTime(notif.createdAt) }}</p>
            </div>
          </div>
        </div>

        <button v-if="canLoadMore" @click="loadMore" class="chip" type="button" style="margin-top: 1.5rem;">Load more</button>
        <p v-if="message" class="message" :class="message.includes('Error') ? 'error' : 'success'">{{ message }}</p>
      </div>
    </section>
  </main>
</template>

<script>
import { api } from '../utils/api.js'
export default {
  name: 'Notifications',
  data() {
    return {
      allNotifications: [],
      activeFilter: 'all',
      visibleCount: 12,
      pageSize: 12,
      message: '',
    }
  },
  computed: {
    filteredNotifications() {
      let result = this.allNotifications
      if (this.activeFilter === 'unread') {
        result = result.filter((n) => !n.isRead)
      }
      return result.slice(0, this.visibleCount)
    },
    canLoadMore() {
      return this.visibleCount < this.allNotifications.length
    },
    unreadCount() {
      return this.allNotifications.filter((n) => !n.isRead).length
    },
  },
  methods: {
    relativeTime(dateValue) {
      const ms = Date.now() - new Date(dateValue).getTime()
      const seconds = Math.max(1, Math.floor(ms / 1000))
      if (seconds < 60) return `${seconds}s ago`
      const minutes = Math.floor(seconds / 60)
      if (minutes < 60) return `${minutes}m ago`
      const hours = Math.floor(minutes / 60)
      if (hours < 24) return `${hours}h ago`
      const days = Math.floor(hours / 24)
      return `${days}d ago`
    },
    async loadNotifications() {
      try {
        const resp = await api('/notifications')
        this.allNotifications = resp.notifications || []
      } catch (err) {
        this.message = `Error: ${err.message}`
      }
    },
    async markAllRead() {
      try {
        await api('/notifications/mark-all-read', 'PATCH')
        this.allNotifications.forEach((n) => (n.isRead = true))
      } catch (err) {
        this.message = `Error: ${err.message}`
      }
    },
    loadMore() {
      this.visibleCount += this.pageSize
    },
  },
  mounted() {
    const viewEl = document.querySelector('.view')
    const topbar = document.querySelector('.topbar')
    if (viewEl) {
      viewEl.scrollTop = topbar ? topbar.offsetHeight : 80
    }
    this.loadNotifications()
  },
}
</script>

<style scoped>
.page-bg {
  min-height: 100vh;
  display: block;
  padding: 0;
  background: linear-gradient(180deg, #ffffff, #fff5f8 60%, #ffe7ee);
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

.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.notifications-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #3f2f38;
}

.notifications-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.filter-btn {
  border: 1px solid #e0e0e0;
  background: white;
  color: #666;
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
}

.filter-btn:hover {
  border-color: #c41e3a;
  color: #c41e3a;
}

.filter-btn.active {
  background: #c41e3a;
  color: white;
  border-color: #c41e3a;
}

.notifications-meta {
  font-size: 13px;
  color: #999;
  margin-bottom: 16px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
  font-size: 14px;
}

.notifications-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.notification-card {
  background: white;
  border: 1px solid #f0c4d1;
  border-radius: 8px;
  padding: 16px;
  transition: all 150ms ease;
  position: relative;
}

.notification-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-color: #ffb7c5;
}

.notification-card.unread {
  background: #fff4f8;
  border-color: #c41e3a;
}

.notification-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 4px 8px;
  border-radius: 4px;
  margin-bottom: 8px;
  background: #f0c4d1;
  color: #c41e3a;
}

.notification-card.unread .notification-badge {
  background: #c41e3a;
  color: white;
}

.notification-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notification-message {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #3f2f38;
  line-height: 1.5;
}

.notification-time {
  margin: 0;
  font-size: 12px;
  color: #999;
}

.chip {
  border: 1px solid #c41e3a;
  background: #000;
  color: #fff;
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
  display: inline-block;
}

.chip:hover {
  background: #c41e3a;
  border-color: #c41e3a;
}

.message {
  margin-top: 16px;
  padding: 12px;
  border-radius: 6px;
  font-size: 13px;
}

.message.error {
  background: #ffebee;
  color: #c41e3a;
}

.message.success {
  background: #e8f5e9;
  color: #2e7d32;
}
</style>
