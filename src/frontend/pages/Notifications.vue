<template>
  <main class="notifications-page">
    <div class="notif-container">

      <!-- Header -->
      <div class="notifications-header">
        <div class="header-left">
          <h2>Notifications</h2>
          <!-- FIX: unread count badge in header -->
          <span v-if="unreadCount > 0" class="header-unread-badge">{{ unreadCount }}</span>
        </div>
        <!-- FIX: disable button while no unread exist -->
        <button
          @click="markAllRead"
          class="chip"
          type="button"
          :disabled="unreadCount === 0"
        >
          Mark all as read
        </button>
      </div>

      <!-- Filters -->
      <div class="notifications-filters">
        <button
          v-for="filter in ['all', 'unread']"
          :key="filter"
          @click="setFilter(filter)"
          class="filter-btn"
          :class="{ active: activeFilter === filter }"
          type="button"
        >
          {{ filter === 'all' ? `All (${allNotifications.length})` : `Unread (${unreadCount})` }}
        </button>
      </div>

      <!-- FIX: skeleton loader while fetching -->
      <div v-if="loading" class="notifications-grid">
        <div v-for="n in 6" :key="n" class="notification-card notif-skeleton">
          <div class="skel skel-badge"></div>
          <div class="skel skel-line skel-msg"></div>
          <div class="skel skel-line skel-time"></div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="filteredNotifications.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.4">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </div>
        <p>{{ activeFilter === 'unread' ? 'No unread notifications.' : "You're all caught up!" }}</p>
        <button v-if="activeFilter === 'unread'" @click="setFilter('all')" class="chip chip-soft" type="button">
          View all
        </button>
      </div>

      <!-- Grid -->
      <div v-else class="notifications-grid">
        <div
          v-for="notif in filteredNotifications"
          :key="notif.id"
          class="notification-card"
          :class="{ unread: !notif.isRead }"
        >
          <!-- FIX: unread pill only when unread -->
          <div v-if="!notif.isRead" class="notification-badge">New</div>

          <div class="notification-content">
            <p class="notification-message">{{ notif.message }}</p>
            <p class="notification-time">{{ relativeTime(notif.createdAt) }}</p>
          </div>

          <button
            v-if="!notif.isRead"
            @click="markAsRead(notif.id)"
            class="card-action"
            type="button"
          >
            Mark as read
          </button>
        </div>
      </div>

      <!-- Load more -->
      <div v-if="canLoadMore" class="load-more-wrap">
        <button @click="loadMore" class="chip chip-soft" type="button">
          Load more ({{ allNotifications.length - visibleCount }} remaining)
        </button>
      </div>

      <!-- FIX: auto-dismiss feedback message -->
      <Transition name="fade-msg">
        <p
          v-if="message"
          class="feedback-msg"
          :class="message.startsWith('Error') ? 'error' : 'success'"
          role="status"
          aria-live="polite"
        >
          {{ message }}
        </p>
      </Transition>

    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api.js'
import { normalizeNotification } from '@/utils/records.js'

const allNotifications = ref([])
const activeFilter     = ref('all')
const visibleCount     = ref(12)
const pageSize         = 12
const message          = ref('')
const loading          = ref(true)

// FIX: auto-dismiss feedback after 3s
let msgTimer = null
const showMessage = (text) => {
  message.value = text
  clearTimeout(msgTimer)
  msgTimer = setTimeout(() => { message.value = '' }, 3000)
}

// — Computed —
const filteredNotifications = computed(() => {
  let result = allNotifications.value
  if (activeFilter.value === 'unread') {
    result = result.filter((n) => !n.isRead)
  }
  // FIX: visibleCount applies AFTER filter, not before
  return result.slice(0, visibleCount.value)
})

// FIX: canLoadMore checks filtered length, not total
const filteredTotal = computed(() => {
  if (activeFilter.value === 'unread') {
    return allNotifications.value.filter((n) => !n.isRead).length
  }
  return allNotifications.value.length
})

const canLoadMore   = computed(() => visibleCount.value < filteredTotal.value)
const unreadCount   = computed(() => allNotifications.value.filter((n) => !n.isRead).length)

// — Helpers —
const relativeTime = (dateValue) => {
  // FIX: handle null/undefined gracefully
  if (!dateValue) return 'Just now'
  const timestamp = new Date(dateValue).getTime()
  if (Number.isNaN(timestamp)) return 'Just now'
  const ms      = Math.max(0, Date.now() - timestamp)
  const seconds = Math.max(1, Math.floor(ms / 1000))
  if (seconds < 60)  return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60)  return `${minutes}m ago`
  const hours   = Math.floor(minutes / 60)
  if (hours < 24)    return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

// FIX: filter change resets visibleCount so pagination is not stale
const setFilter = (filter) => {
  activeFilter.value  = filter
  visibleCount.value  = pageSize
}

// — API —
const loadNotifications = async () => {
  loading.value = true
  try {
    const resp = await api('/notifications')
    allNotifications.value = (resp.notifications || []).map(normalizeNotification)
  } catch (err) {
    showMessage(`Error: ${err?.message || 'Failed to load notifications.'}`)
  } finally {
    loading.value = false
  }
}

const emitNotificationChange = () => {
  window.dispatchEvent(new Event('studylink-notifications-changed'))
}

const markAllRead = async () => {
  // FIX: guard — nothing to do
  if (unreadCount.value === 0) return
  try {
    await api('/notifications/mark-all-read', 'PATCH')
    allNotifications.value.forEach((n) => (n.isRead = true))
    emitNotificationChange()
    showMessage('All notifications marked as read.')
  } catch (err) {
    showMessage(`Error: ${err?.message || 'Failed to mark all as read.'}`)
  }
}

const markAsRead = async (notificationId) => {
  // FIX: optimistic update first, revert on error
  const target = allNotifications.value.find((n) => n.id === notificationId)
  if (!target || target.isRead) return
  target.isRead = true
  emitNotificationChange()
  try {
    await api(`/notifications/${notificationId}/read`, 'POST')
    showMessage('Marked as read.')
  } catch (err) {
    // FIX: revert on failure
    target.isRead = false
    emitNotificationChange()
    showMessage(`Error: ${err?.message || 'Failed to mark as read.'}`)
  }
}

const loadMore = () => {
  visibleCount.value += pageSize
}

onMounted(() => {
  loadNotifications()
})
</script>

<style scoped>
/* ─── Page ───────────────────────────────────────────────── */
.notifications-page {
  min-height: 100vh;
  /* FIX: brand blush gradient bg */
  background: linear-gradient(180deg, #fff0f7 0%, #F5F5F5 100%);
  padding: 0 0 40px;
}

.notif-container {
  max-width: 860px;
  margin: 0 auto;
  padding: 28px 16px 0;
}

/* ─── Header ─────────────────────────────────────────────── */
.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 12px;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.notifications-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  /* FIX: navy ink */
  color: #021A54;
}

/* FIX: pink unread count badge in header */
.header-unread-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 11px;
  background: #FF85BB;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

/* Mark all chip */
.chip {
  border: 1.5px solid #FF85BB;
  background: #FF85BB;
  color: #fff;
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
}
.chip:hover:not(:disabled) {
  background: #e0609a;
  border-color: #e0609a;
}
.chip:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* FIX: soft outline chip for secondary actions */
.chip-soft {
  background: transparent;
  color: #021A54;
  border-color: #FFCEE3;
}
.chip-soft:hover:not(:disabled) {
  background: #FFCEE3;
  border-color: #FF85BB;
  color: #021A54;
}

/* ─── Filters ────────────────────────────────────────────── */
.notifications-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-btn {
  border: 1.5px solid #FFCEE3;
  background: #fff;
  color: #021A54;
  border-radius: 8px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.filter-btn:hover {
  border-color: #FF85BB;
  color: #FF85BB;
}
/* FIX: active uses brand pink */
.filter-btn.active {
  background: #FF85BB;
  color: #fff;
  border-color: #FF85BB;
}

/* ─── Skeleton ───────────────────────────────────────────── */
.skel {
  border-radius: 6px;
  background: linear-gradient(90deg, #fce8f3 25%, #fff0f7 50%, #fce8f3 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { to { background-position: -200% 0; } }
.skel-badge { width: 48px; height: 18px; margin-bottom: 10px; }
.skel-line  { height: 12px; margin-top: 8px; }
.skel-msg   { width: 85%; }
.skel-time  { width: 40%; }
.notif-skeleton { pointer-events: none; min-height: 100px; }

/* ─── Empty state ────────────────────────────────────────── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  /* FIX: blush bg icon circle */
  background: #FFCEE3;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FF85BB;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  color: #6e6e73;
}

/* ─── Grid ───────────────────────────────────────────────── */
.notifications-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}

/* ─── Card — glass panel ─────────────────────────────────── */
.notification-card {
  /* FIX: glass card — white with blush border */
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid #FFCEE3;
  border-radius: 14px;
  padding: 16px;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 2px 12px rgba(255, 133, 187, 0.08);
  transition: box-shadow 0.15s, border-color 0.15s, transform 0.15s;
}

.notification-card:hover {
  box-shadow: 0 6px 20px rgba(255, 133, 187, 0.18);
  border-color: #FF85BB;
  transform: translateY(-1px);
}

/* FIX: unread card uses brand blush tint */
.notification-card.unread {
  background: rgba(255, 206, 227, 0.22);
  border-color: #FF85BB;
  box-shadow: 0 4px 16px rgba(255, 133, 187, 0.14);
}

/* ─── Card internals ─────────────────────────────────────── */
/* FIX: "New" badge uses brand pink */
.notification-badge {
  display: inline-block;
  align-self: flex-start;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 4px;
  margin-bottom: 10px;
  background: #FF85BB;
  color: #fff;
}

.notification-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.notification-message {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  /* FIX: navy text */
  color: #021A54;
  line-height: 1.5;
}

.notification-time {
  margin: 0;
  font-size: 12px;
  color: #9e7080;
}

/* FIX: card action uses brand pink outline → fill on hover */
.card-action {
  margin-top: 12px;
  align-self: flex-start;
  border: 1.5px solid #FF85BB;
  background: transparent;
  color: #FF85BB;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.card-action:hover {
  background: #FF85BB;
  color: #fff;
}

/* ─── Load more ──────────────────────────────────────────── */
.load-more-wrap {
  display: flex;
  justify-content: center;
  margin-top: 8px;
  margin-bottom: 4px;
}

/* ─── Feedback message ───────────────────────────────────── */
.feedback-msg {
  margin-top: 16px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
}

/* FIX: error uses soft red; success uses soft green */
.feedback-msg.error {
  background: #fff0f0;
  border: 1px solid #fca5a5;
  color: #b91c1c;
}
.feedback-msg.success {
  /* FIX: success uses brand blush, not generic green */
  background: rgba(255, 206, 227, 0.4);
  border: 1px solid #FFCEE3;
  color: #021A54;
}

/* ─── Transitions ────────────────────────────────────────── */
.fade-msg-enter-active, .fade-msg-leave-active { transition: opacity 0.25s, transform 0.25s; }
.fade-msg-enter-from, .fade-msg-leave-to       { opacity: 0; transform: translateY(-4px); }

/* ─── Responsive ─────────────────────────────────────────── */
@media (max-width: 640px) {
  .notif-container { padding: 20px 12px 0; }
  .notifications-grid { grid-template-columns: 1fr; }
  .notifications-header { flex-direction: column; align-items: flex-start; gap: 10px; }
  .header-left h2 { font-size: 18px; }
}
</style>
