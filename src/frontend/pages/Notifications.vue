<template>
  <main class="page-bg notifications-page">
    <div class="phone-shell">
      <div class="view page active">

        <!-- ── Header ── -->
        <div class="page-header">
          <div class="header-left">
            <p class="page-kicker">Inbox</p>
            <h2>Notifications
              <span v-if="unreadCount > 0" class="unread-bubble">{{ unreadCount }}</span>
            </h2>
            <p class="page-subtext">Stay on top of your activity.</p>
          </div>
          <button
            v-if="unreadCount > 0"
            @click="markAllRead"
            class="chip"
            type="button"
            :disabled="isMarkingAll"
          >
            {{ isMarkingAll ? 'Marking…' : 'Mark all read' }}
          </button>
        </div>

        <!-- ── Feedback ── -->
        <transition name="fade">
          <p
            v-if="message"
            class="feedback-msg"
            :class="message.startsWith('Error') ? 'error' : 'success'"
          >
            {{ message }}
          </p>
        </transition>

        <!-- ── Summary bar ── -->
        <div v-if="allNotifications.length > 0" class="summary-bar">
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

        <!-- ── Toolbar: filter + search ── -->
        <div class="toolbar-row">
          <div class="filter-tabs">
            <button
              v-for="f in filters"
              :key="f.value"
              @click="activeFilter = f.value"
              class="filter-tab"
              :class="{ active: activeFilter === f.value }"
              type="button"
            >
              {{ f.label }}
            </button>
          </div>
          <div class="search-field">
            <svg class="search-icon" viewBox="0 0 20 20">
              <path d="M13.4 12H12.7l-.3-.3A5.5 5.5 0 1 0 12 13.4l.3.3v.7l4.3 4.3 1.3-1.3-4.5-4.4Zm-5 0A3.8 3.8 0 1 1 12.2 8 3.8 3.8 0 0 1 8.4 12Z"/>
            </svg>
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Search notifications…"
              class="search-input"
            />
          </div>
        </div>

        <!-- ── Skeleton loading ── -->
        <div v-if="isLoading" class="notifications-list">
          <div v-for="i in 5" :key="i" class="notification-card skeleton-card">
            <div class="skeleton-line skeleton-pill" />
            <div class="skeleton-line skeleton-title" />
            <div class="skeleton-line skeleton-short" />
          </div>
        </div>

        <!-- ── Empty state ── -->
        <div v-else-if="displayedNotifications.length === 0" class="empty-block">
          <svg viewBox="0 0 24 24"><path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Zm6-6V11a6 6 0 0 0-5-5.9V4a1 1 0 0 0-2 0v1.1A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2Z"/></svg>
          <p v-if="searchQuery">No match for "{{ searchQuery }}"</p>
          <p v-else-if="activeFilter === 'unread'">No unread notifications. 🎉</p>
          <p v-else>Nothing here yet.</p>
        </div>

        <!-- ── Notification list ── -->
        <div v-else class="notifications-list" :class="{ 'is-refreshing': isRefreshing }">
          <transition-group name="list">
            <div
              v-for="notif in displayedNotifications"
              :key="notif.id"
              class="notification-card"
              :class="{ unread: !notif.isRead }"
            >
              <!-- left accent stripe for unread -->
              <span v-if="!notif.isRead" class="unread-stripe" aria-hidden="true" />

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
                class="chip chip-soft mark-btn"
                type="button"
                :disabled="markingIds.has(notif.id)"
                :aria-label="`Mark notification as read`"
              >
                {{ markingIds.has(notif.id) ? '…' : '✓ Read' }}
              </button>
            </div>
          </transition-group>
        </div>

        <!-- ── Load more ── -->
        <div v-if="canLoadMore && !isLoading" class="load-more-row">
          <button @click="loadMore" class="chip chip-soft" type="button">
            Load more ({{ remaining }} left)
          </button>
        </div>

      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { api } from '@/api.js'
import { normalizeNotification } from '@/utils/records.js'

// ── State ──
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

let messageTimer = null

// ── Filters config ──
const filters = [
  { value: 'all',    label: 'All'    },
  { value: 'unread', label: 'Unread' },
  { value: 'read',   label: 'Read'   },
]

// ── Derived ──
const unreadCount = computed(() =>
  allNotifications.value.filter(n => !n.isRead).length
)

/** After filter + search, before pagination */
const filteredNotifications = computed(() => {
  let list = allNotifications.value

  if (activeFilter.value === 'unread') list = list.filter(n => !n.isRead)
  if (activeFilter.value === 'read')   list = list.filter(n =>  n.isRead)

  const q = searchQuery.value.trim().toLowerCase()
  if (q) list = list.filter(n => n.message?.toLowerCase().includes(q))

  return list
})

const displayedNotifications = computed(() =>
  filteredNotifications.value.slice(0, visibleCount.value)
)

const canLoadMore = computed(() =>
  visibleCount.value < filteredNotifications.value.length
)

const remaining = computed(() =>
  filteredNotifications.value.length - visibleCount.value
)

// ── Reset pagination on filter/search change ──
watch([activeFilter, searchQuery], () => { visibleCount.value = pageSize })

// ── Helpers ──
const setMessage = (text, autoClear = true) => {
  if (messageTimer) clearTimeout(messageTimer)
  message.value = text
  if (autoClear) messageTimer = setTimeout(() => { message.value = '' }, 4000)
}

const relativeTime = (dateValue) => {
  const ts = new Date(dateValue).getTime()
  if (Number.isNaN(ts)) return 'Just now'
  const ms      = Math.max(0, Date.now() - ts)
  const secs    = Math.max(1, Math.floor(ms / 1000))
  if (secs < 60)       return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60)       return `${mins}m ago`
  const hrs  = Math.floor(mins / 60)
  if (hrs  < 24)       return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)        return `${days}d ago`
  // BUG FIX -> show real date beyond 7 days
  return new Date(dateValue).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })
}

const emitChange = () =>
  window.dispatchEvent(new Event('studylink-notifications-changed'))

// ── API actions ──
const loadNotifications = async (soft = false) => {
  if (soft) { isRefreshing.value = true }
  else      { isLoading.value    = true }
  try {
    const resp = await api('/notifications')
    // BUG FIX -> safe array guard
    const raw = Array.isArray(resp?.notifications) ? resp.notifications : []
    allNotifications.value = raw.map(normalizeNotification)
  } catch (err) {
    setMessage(`Error: ${err.message}`, false)
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
    allNotifications.value.forEach(n => (n.isRead = true))
    emitChange()
    setMessage('All notifications marked as read.')
  } catch (err) {
    setMessage(`Error: ${err.message}`)
  } finally {
    isMarkingAll.value = false
  }
}

const markAsRead = async (id) => {
  if (markingIds.value.has(id)) return
  // BUG FIX -> use Set copy to trigger reactivity
  markingIds.value = new Set([...markingIds.value, id])
  try {
    await api(`/notifications/${id}/read`, 'POST')
    const target = allNotifications.value.find(n => n.id === id)
    if (target) target.isRead = true
    emitChange()
    // BUG FIX -> silent mark (no toast spam on each item)
  } catch (err) {
    setMessage(`Error: ${err.message}`)
  } finally {
    markingIds.value = new Set([...markingIds.value].filter(x => x !== id))
  }
}

const loadMore = () => { visibleCount.value += pageSize }

onMounted(() => loadNotifications())
</script>

<style scoped>
/* ── Page shell ── */
.notifications-page {
  padding-bottom: 3rem;
}

/* ── Header ── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 2rem 2rem 1.25rem;
  flex-wrap: wrap;
}

.header-left { flex: 1; min-width: 0; }

.page-kicker {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  margin: 0 0 0.25rem;
}

.page-header h2 {
  font-size: clamp(1.4rem, 2.5vw, 2rem);
  margin: 0 0 0.25rem;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.page-subtext {
  font-size: 0.85rem;
  color: var(--glass-pink-muted);
  margin: 0;
}

/* ── Unread bubble on title ── */
.unread-bubble {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--primary, #FF85BB);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1;
}

/* ── Feedback ── */
.feedback-msg {
  margin: 0 2rem 1rem;
  padding: 0.7rem 1rem;
  border-radius: 10px;
  font-size: 0.875rem;
}

/* ── Summary bar ── */
.summary-bar {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0 2rem 1.25rem;
}

.summary-stat {
  flex: 1 1 0;
  min-width: 80px;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.75rem 1rem;
  border-radius: 14px;
  background: var(--glass-pink-surface-strong);
  border: 1px solid var(--glass-pink-border);
}

.summary-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.1;
}

.summary-label {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--glass-pink-muted);
}

/* ── Toolbar ── */
.toolbar-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 2rem 1.25rem;
  flex-wrap: wrap;
}

.filter-tabs {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.filter-tab {
  border: 1px solid var(--glass-pink-border);
  background: rgba(255, 255, 255, 0.7);
  color: var(--glass-pink-muted);
  border-radius: 999px;
  padding: 0.45rem 1rem;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.filter-tab:hover {
  border-color: var(--primary, #FF85BB);
  color: var(--ink);
}

.filter-tab.active {
  background: var(--primary, #FF85BB);
  border-color: var(--primary, #FF85BB);
  color: #fff;
}

/* ── Search ── */
.search-field {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.search-icon {
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  fill: var(--glass-pink-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.55rem 1rem 0.55rem 2.4rem;
  border: 1px solid var(--glass-pink-border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  color: var(--ink);
  outline: none;
  transition: border-color 150ms ease;
}

.search-input:focus {
  border-color: var(--accent);
}

/* ── Notification list ── */
.notifications-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0 2rem;
  transition: opacity 150ms ease;
}

.notifications-list.is-refreshing {
  opacity: 0.55;
  pointer-events: none;
}

/* ── Notification card ── */
.notification-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.25rem 1.1rem 1.5rem;
  border-radius: 16px;
  background: var(--glass-pink-surface-strong);
  border: 1px solid var(--glass-pink-border);
  box-shadow: 0 2px 10px rgba(74, 20, 41, 0.05);
  transition: box-shadow 150ms ease, transform 150ms ease;
  overflow: hidden;
  flex-wrap: wrap;
}

.notification-card:hover {
  box-shadow: 0 6px 20px rgba(74, 20, 41, 0.1);
  transform: translateY(-1px);
}

.notification-card.unread {
  background: linear-gradient(
    135deg,
    rgba(255, 206, 227, 0.35) 0%,
    rgba(255, 133, 187, 0.1) 100%
  );
  border-color: rgba(255, 133, 187, 0.4);
}

/* left stripe accent for unread */
.unread-stripe {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  border-radius: 16px 0 0 16px;
  background: var(--primary, #FF85BB);
}

/* ── Card body ── */
.notif-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.notif-meta-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.badge-unread {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--primary, #FF85BB);
  color: #fff;
}

.notif-time {
  font-size: 0.75rem;
  color: var(--glass-pink-muted);
}

.notif-message {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--ink);
  line-height: 1.5;
  overflow-wrap: anywhere;
}

/* ── Mark read button ── */
.mark-btn {
  flex-shrink: 0;
  font-size: 0.78rem !important;
  padding: 0.35rem 0.85rem !important;
  min-height: unset !important;
  align-self: flex-start;
}

/* ── chip-soft override ── */
.chip-soft {
  background: rgba(255, 255, 255, 0.7) !important;
  color: var(--ink) !important;
  border: 1px solid var(--glass-pink-border) !important;
}

.chip-soft:hover {
  border-color: var(--primary, #FF85BB) !important;
  color: var(--ink) !important;
}

/* ── Empty state ── */
.empty-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3.5rem 2rem;
  color: var(--glass-pink-muted);
  text-align: center;
}

.empty-block svg {
  width: 48px;
  height: 48px;
  fill: var(--glass-pink-muted);
  opacity: 0.45;
}

.empty-block p {
  margin: 0;
  font-size: 0.9rem;
}

/* ── Load more ── */
.load-more-row {
  display: flex;
  justify-content: center;
  padding: 1.5rem 2rem 0;
}

/* ── Skeleton ── */
.skeleton-card {
  pointer-events: none;
  opacity: 0.7;
}

.skeleton-line {
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    rgba(74, 20, 41, 0.06) 25%,
    rgba(74, 20, 41, 0.12) 37%,
    rgba(74, 20, 41, 0.06) 63%
  );
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}

.skeleton-pill  { width: 60px;  height: 14px; margin-bottom: 0.6rem; }
.skeleton-title { width: 80%;   height: 16px; margin-bottom: 0.5rem; }
.skeleton-short { width: 45%;   height: 12px; }

@keyframes shimmer {
  0%   { background-position: 100% 50%; }
  100% { background-position:   0% 50%; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-line { animation: none; }
}

/* ── Transitions ── */
.fade-enter-active,
.fade-leave-active { transition: opacity 250ms ease; }
.fade-enter-from,
.fade-leave-to     { opacity: 0; }

.list-enter-active,
.list-leave-active { transition: all 250ms ease; }
.list-enter-from   { opacity: 0; transform: translateY(-6px); }
.list-leave-to     { opacity: 0; transform: translateY(6px); }

/* ── Responsive ── */
@media (max-width: 600px) {
  .page-header,
  .summary-bar,
  .toolbar-row,
  .notifications-list,
  .load-more-row {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .feedback-msg {
    margin-left: 1rem;
    margin-right: 1rem;
  }

  .toolbar-row {
    flex-direction: column;
    align-items: stretch;
  }

  .search-field { min-width: unset; }

  .notification-card {
    flex-direction: column;
  }

  .mark-btn {
    align-self: flex-end;
  }
}
</style>
