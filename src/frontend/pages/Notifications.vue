<template>
  <main class="page-bg">
    <div class="view">
      <!-- Header -->
      <div class="card page-header">
        <div class="header-left">
          <p class="page-kicker">Inbox</p>
          <h2>
            Notifications
            <span v-if="unreadCount > 0" class="unread-bubble" aria-label="`${unreadCount} unread`">{{ unreadCount }}</span>
          </h2>
          <p class="page-subtext">System alerts and activity updates</p>
        </div>
        <div class="header-right">
          <button
            class="chip-primary"
            @click="loadNotifications(true)"
            :disabled="isRefreshing"
            :aria-busy="isRefreshing"
            type="button"
          >{{ isRefreshing ? '↻ Refreshing…' : '↺ Refresh' }}</button>
          <button
            v-if="unreadCount > 0"
            class="chip-soft"
            @click="markAllRead"
            :disabled="isMarkingAll"
            type="button"
          >{{ isMarkingAll ? 'Marking…' : 'Mark all read' }}</button>
        </div>
      </div>

      <!-- Feedback -->
      <Transition name="fade">
        <p v-if="message" class="feedback-msg" :class="message.startsWith('Error') ? 'error' : 'success'" role="alert">{{ message }}</p>
      </Transition>

      <!-- Summary bar -->
      <div v-if="allNotifications.length > 0" class="card summary-bar">
        <div class="summary-stat">
          <span class="summary-value">{{ allNotifications.length }}</span>
          <span class="summary-label">Total</span>
        </div>
        <div class="summary-stat">
          <span class="summary-value">{{ unreadCount }}</span>
          <span class="summary-label">Unread</span>
        </div>
        <div class="summary-stat">
          <span class="summary-value">{{ allNotifications.length - unreadCount }}</span>
          <span class="summary-label">Read</span>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="card toolbar-card">
        <div class="filter-tabs" role="tablist">
          <button
            v-for="f in filters"
            :key="f.value"
            class="filter-tab"
            :class="{ active: activeFilter === f.value }"
            @click="activeFilter = f.value"
            role="tab"
            :aria-selected="activeFilter === f.value"
            type="button"
          >{{ f.label }}</button>
        </div>
        <div class="search-field">
          <svg class="search-icon" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M13.4 12H12.7l-.3-.3A5.5 5.5 0 1 0 12 13.4l.3.3v.7l4.3 4.3 1.3-1.3-4.5-4.4Zm-5 0A3.8 3.8 0 1 1 12.2 8 3.8 3.8 0 0 1 8.4 12Z" fill="currentColor"/>
          </svg>
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Search notifications…"
            class="search-input"
            aria-label="Search notifications"
          />
        </div>
      </div>

      <!-- Skeleton -->
      <div v-if="isLoading" class="card skeleton-list" aria-label="Loading notifications">
        <div v-for="i in 5" :key="i" class="skeleton-notif">
          <div class="skel-pill"></div>
          <div class="skel-body">
            <div class="skel-line skel-line--wide"></div>
            <div class="skel-line skel-line--short"></div>
          </div>
          <div class="skel-btn"></div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="displayedNotifications.length === 0" class="card empty-state" aria-live="polite">
        <span class="empty-icon" aria-hidden="true">🔔</span>
        <p v-if="searchQuery">No match for "{{ searchQuery }}"</p>
        <p v-else-if="activeFilter === 'unread'">All caught up! No unread notifications.</p>
        <p v-else-if="activeFilter === 'read'">No read notifications.</p>
        <p v-else>Nothing here yet. 🎉</p>
        <button v-if="searchQuery || activeFilter !== 'all'" class="chip-soft" @click="searchQuery = ''; activeFilter = 'all'">
          Clear filters
        </button>
      </div>

      <!-- Notification list -->
      <div v-else class="notifications-list" :class="{ 'is-refreshing': isRefreshing }" aria-live="polite">
        <TransitionGroup name="list">
          <div
            v-for="notif in displayedNotifications"
            :key="notif.id"
            class="card notification-card"
            :class="{ unread: !notif.isRead }"
          >
            <span v-if="!notif.isRead" class="unread-stripe" aria-hidden="true"></span>
            <div class="notif-body">
              <div class="notif-meta-row">
                <span v-if="!notif.isRead" class="badge-unread">New</span>
                <span class="notif-time">{{ relativeTime(notif.createdAt) }}</span>
              </div>
              <p class="notif-message">{{ notif.message }}</p>
            </div>
            <button
              v-if="!notif.isRead"
              @click="markAsRead(notif.id)"
              class="chip-soft mark-btn"
              type="button"
              :disabled="markingIds.has(notif.id)"
              :aria-label="`Mark notification as read`"
            >{{ markingIds.has(notif.id) ? '…' : '✓ Read' }}</button>
          </div>
        </TransitionGroup>
      </div>

      <!-- Load more -->
      <div v-if="canLoadMore && !isLoading" class="load-more-row">
        <button @click="loadMore" class="chip-soft" type="button">
          Load more ({{ remaining }} left)
        </button>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { api } from '@/api.js'
import { normalizeNotification } from '@/utils/records.js'

const allNotifications = ref([])
const activeFilter     = ref('all')
const searchQuery      = ref('')
const visibleCount     = ref(12)
const pageSize         = 12
const message          = ref('')
const isLoading        = ref(false)
const isRefreshing     = ref(false)
const isMarkingAll     = ref(false)
const markingIds       = ref(new Set())
let messageTimer       = null

const filters = [
  { value: 'all',    label: 'All'    },
  { value: 'unread', label: 'Unread' },
  { value: 'read',   label: 'Read'   },
]

const unreadCount = computed(() => allNotifications.value.filter(n => !n.isRead).length)

const filteredNotifications = computed(() => {
  let list = allNotifications.value
  if (activeFilter.value === 'unread') list = list.filter(n => !n.isRead)
  if (activeFilter.value === 'read')   list = list.filter(n =>  n.isRead)
  const q = searchQuery.value.trim().toLowerCase()
  if (q) list = list.filter(n => n.message?.toLowerCase().includes(q))
  return list
})

const displayedNotifications = computed(() => filteredNotifications.value.slice(0, visibleCount.value))
const canLoadMore = computed(() => visibleCount.value < filteredNotifications.value.length)
const remaining   = computed(() => filteredNotifications.value.length - visibleCount.value)

watch([activeFilter, searchQuery], () => { visibleCount.value = pageSize })

const setMessage = (text, autoClear = true) => {
  if (messageTimer) clearTimeout(messageTimer)
  message.value = text
  if (autoClear) messageTimer = setTimeout(() => { message.value = '' }, 4000)
}

// FIX: guard invalid dates
const relativeTime = (dateValue) => {
  if (!dateValue) return 'Just now'
  const ts = new Date(dateValue).getTime()
  if (Number.isNaN(ts)) return 'Just now'
  const ms = Math.max(0, Date.now() - ts)
  const secs = Math.max(1, Math.floor(ms / 1000))
  if (secs < 60)   return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60)   return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)    return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)    return `${days}d ago`
  return new Date(dateValue).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })
}

const emitChange = () => window.dispatchEvent(new Event('studylink-notifications-changed'))

const loadNotifications = async (soft = false) => {
  if (soft) isRefreshing.value = true
  else      isLoading.value    = true
  try {
    const resp = await api('/notifications')
    // FIX: safe array guard
    const raw = Array.isArray(resp?.notifications) ? resp.notifications : []
    allNotifications.value = raw.map(normalizeNotification)
  } catch (err) {
    setMessage(`Error: ${err?.message || 'Failed to load.'}`, false)
  } finally {
    isLoading.value    = false
    isRefreshing.value = false
  }
}

const markAllRead = async () => {
  if (isMarkingAll.value) return
  isMarkingAll.value = true
  try {
    await api('/notifications/mark-all-read', 'PATCH')
    allNotifications.value.forEach(n => { n.isRead = true })
    emitChange()
    setMessage('All notifications marked as read.')
  } catch (err) {
    setMessage(`Error: ${err?.message || 'Failed to mark.'}`)
  } finally {
    isMarkingAll.value = false
  }
}

const markAsRead = async (id) => {
  if (markingIds.value.has(id)) return
  // FIX: Set copy to trigger reactivity
  markingIds.value = new Set([...markingIds.value, id])
  try {
    await api(`/notifications/${id}/read`, 'POST')
    const target = allNotifications.value.find(n => n.id === id)
    if (target) target.isRead = true
    emitChange()
  } catch (err) {
    setMessage(`Error: ${err?.message || 'Failed.'}`)
  } finally {
    markingIds.value = new Set([...markingIds.value].filter(x => x !== id))
  }
}

const loadMore = () => { visibleCount.value += pageSize }

onMounted(() => loadNotifications())
</script>

<style scoped>
.page-bg { min-height: 100vh; background: #F5F5F5 }
.view { padding: 20px 16px 80px; max-width: 768px; margin: 0 auto }

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
  gap: 12px;
}
.header-left { flex: 1; min-width: 0 }
.page-kicker { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #FF85BB; margin: 0 0 4px }
.page-header h2 {
  margin: 0 0 4px;
  font-size: clamp(1.4rem, 3vw, 2rem);
  font-weight: 800;
  color: #021A54;
  display: flex;
  align-items: center;
  gap: 8px;
}
.page-subtext { margin: 0; font-size: 12px; color: #6e6e73; font-weight: 600 }
.header-right { display: flex; gap: 8px; flex-wrap: wrap; align-items: center }

.unread-bubble {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 22px; height: 22px; padding: 0 6px;
  border-radius: 999px; background: #FF85BB; color: #021A54;
  font-size: 11px; font-weight: 800; border: 2px solid #021A54;
}

/* Chips */
.chip-primary {
  padding: 8px 16px; background: #FF85BB; color: #021A54;
  border: 2px solid #021A54; border-radius: 8px;
  font-size: 13px; font-weight: 800; cursor: pointer;
  transition: background 120ms, transform 120ms; white-space: nowrap;
}
.chip-primary:hover:not(:disabled) { background: #ff6da9 }
.chip-primary:active { transform: scale(0.95) }
.chip-primary:disabled { opacity: 0.6; cursor: not-allowed }

.chip-soft {
  padding: 7px 14px; background: #F5F5F5; color: #021A54;
  border: 1.5px solid #FFCEE3; border-radius: 8px;
  font-size: 13px; font-weight: 700; cursor: pointer;
  transition: border-color 120ms, background 120ms; white-space: nowrap;
}
.chip-soft:hover { border-color: #FF85BB; background: #fff }
.chip-soft:disabled { opacity: 0.6; cursor: not-allowed }

/* Feedback */
.feedback-msg {
  padding: 10px 14px; border-radius: 10px;
  font-size: 13px; font-weight: 600; margin-bottom: 12px;
}
.feedback-msg.success { background: rgba(34,134,82,0.08); border: 1.5px solid rgba(34,134,82,0.3); color: #1a6b40 }
.feedback-msg.error   { background: rgba(255,133,187,0.12); border: 1.5px solid #FF85BB; color: #021A54 }

/* Summary bar */
.summary-bar {
  display: flex; gap: 16px; padding: 14px 20px; flex-wrap: wrap;
  background: rgba(255,133,187,0.06); border-color: #FF85BB;
}
.summary-stat { display: flex; flex-direction: column; align-items: center; gap: 2px }
.summary-value { font-size: 22px; font-weight: 800; color: #021A54 }
.summary-label { font-size: 10px; font-weight: 700; color: #FF85BB; text-transform: uppercase; letter-spacing: 0.06em }

/* Toolbar */
.toolbar-card { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 14px 20px }
.filter-tabs { display: flex; gap: 6px; flex-wrap: wrap }
.filter-tab {
  padding: 6px 14px; border: 1.5px solid #FFCEE3; border-radius: 8px;
  background: #F5F5F5; color: #021A54; font-size: 12px; font-weight: 700;
  cursor: pointer; transition: all 120ms;
}
.filter-tab.active { background: #FF85BB; border-color: #021A54; color: #021A54 }
.filter-tab:hover:not(.active) { border-color: #FF85BB }

.search-field {
  flex: 1; min-width: 180px;
  display: flex; align-items: center; gap: 6px;
  border: 1.5px solid #FFCEE3; border-radius: 8px;
  padding: 7px 12px; background: #fff;
}
.search-icon { width: 14px; height: 14px; color: #FF85BB; flex-shrink: 0 }
.search-input { flex: 1; border: none; outline: none; font-size: 13px; color: #021A54; background: transparent; min-width: 0 }
.search-input::placeholder { color: #aaa }

/* Skeleton */
.skeleton-list { display: flex; flex-direction: column; gap: 12px }
.skeleton-notif { display: flex; align-items: center; gap: 10px; animation: shimmer 1.4s infinite }
.skel-pill  { width: 36px; height: 20px; border-radius: 999px; background: #e0e0e0; flex-shrink: 0 }
.skel-body  { flex: 1; display: flex; flex-direction: column; gap: 6px }
.skel-line  { border-radius: 4px; background: #ebebeb; height: 12px }
.skel-line--wide  { width: 75% }
.skel-line--short { width: 45%; height: 10px }
.skel-btn   { width: 60px; height: 28px; border-radius: 8px; background: #e0e0e0 }
@keyframes shimmer { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }

/* Empty */
.empty-state { text-align: center; padding: 40px 20px }
.empty-icon { font-size: 3rem; display: block; margin-bottom: 12px }

/* Notification list */
.notifications-list { display: flex; flex-direction: column; gap: 8px }
.is-refreshing { opacity: 0.7; pointer-events: none }

.notification-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  position: relative;
  overflow: hidden;
  transition: background 120ms;
}
.notification-card.unread {
  background: rgba(255,133,187,0.06);
  border-color: #FF85BB;
}
.unread-stripe {
  position: absolute; left: 0; top: 0; bottom: 0;
  width: 4px; background: #FF85BB; border-radius: 0;
}

.notif-body { flex: 1; min-width: 0 }
.notif-meta-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px }
.badge-unread {
  display: inline-block; padding: 1px 7px; border-radius: 999px;
  background: #FF85BB; color: #021A54; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;
}
.notif-time { font-size: 11px; color: #6e6e73; font-weight: 600 }
.notif-message { margin: 0; font-size: 14px; color: #021A54; line-height: 1.5; font-weight: 500 }

.mark-btn { flex-shrink: 0; padding: 6px 12px; font-size: 12px }

/* Load more */
.load-more-row { display: flex; justify-content: center; margin-top: 8px }

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s }
.fade-enter-from, .fade-leave-to { opacity: 0 }
.list-enter-active { transition: opacity 0.2s, transform 0.2s }
.list-leave-active { transition: opacity 0.15s }
.list-enter-from { opacity: 0; transform: translateY(6px) }
.list-leave-to { opacity: 0 }

@media (prefers-reduced-motion: reduce) {
  .skeleton-notif { animation: none }
  .list-enter-active, .list-leave-active, .fade-enter-active, .fade-leave-active { transition: none }
}
</style>