<template>
  <main class="view page active admin-activity-page">

    <!-- ── Header ── -->
    <section class="card page-header-card">
      <div>
        <p class="page-kicker">Admin · Audit</p>
        <h2>Activity Logs</h2>
        <p class="page-subtext">All admin actions recorded here.</p>
      </div>
      <button @click="loadActivity" class="chip chip-strong" type="button" :disabled="isLoading">
        {{ isLoading ? 'Loading…' : 'Refresh 🔄' }}
      </button>
    </section>

    <!-- ── Summary bar ── -->
    <section v-if="!isLoading && activityLogs.length" class="card summary-bar">
      <div class="summary-stat">
        <span class="summary-value">{{ activityLogs.length }}</span>
        <span class="summary-label">Total Logs</span>
      </div>
      <div class="summary-stat">
        <span class="summary-value">{{ uniqueAdmins }}</span>
        <span class="summary-label">Admins Active</span>
      </div>
      <div class="summary-stat">
        <span class="summary-value">{{ todayCount }}</span>
        <span class="summary-label">Today</span>
      </div>
    </section>

    <!-- ── Toolbar ── -->
    <section class="card toolbar">
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search by action, admin or target…"
          class="search-input"
          aria-label="Search activity logs"
        />
        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''" type="button" aria-label="Clear search">×</button>
      </div>
      <select v-model="selectedAction" class="filter-select" aria-label="Filter by action">
        <option value="">All Actions</option>
        <option v-for="action in uniqueActions" :key="action" :value="action">
          {{ formatActionLabel(action) }}
        </option>
      </select>
    </section>

    <!-- ── Error ── -->
    <p v-if="message" class="error-msg" role="alert" aria-live="assertive">{{ message }}</p>

    <!-- ── Skeleton ── -->
    <div v-if="isLoading" class="log-list">
      <div v-for="n in 8" :key="n" class="card skeleton"></div>
    </div>

    <!-- ── Empty ── -->
    <div v-else-if="!filteredActivity.length" class="card empty-state">
      <p class="empty-icon">📋</p>
      <p class="empty-text">No activity logs found.</p>
      <button v-if="searchQuery || selectedAction" class="chip chip-strong" @click="searchQuery = ''; selectedAction = ''" type="button">
        Clear filters ❌
      </button>
    </div>

    <!-- ── Log list ── -->
    <div v-else class="log-list">
      <article v-for="log in filteredActivity" :key="log.id" class="card log-card">
        <div class="log-card-head">
          <div class="log-badges">
            <span class="action-badge" :class="actionBadgeClass(log.action)">
              {{ formatActionLabel(log.action) }}
            </span>
            <span class="log-target" v-if="log.targetType">
              on <strong>{{ log.targetType }}</strong>
            </span>
          </div>
          <time class="log-time">{{ log.timestamp }}</time>
        </div>

        <div class="log-card-body">
          <div class="log-admin">
            <div class="log-admin-avatar">{{ (log.adminName || 'A')[0].toUpperCase() }}</div>
            <span class="log-admin-name">{{ log.adminName }}</span>
            <span class="log-admin-email" v-if="log.adminEmail">· {{ log.adminEmail }}</span>
          </div>
          <div class="log-target-id" v-if="log.targetId">
            Target ID: <code class="log-id">{{ log.targetId }}</code>
          </div>
        </div>

        <details v-if="log.details" class="log-details">
          <summary>View details ⬇️</summary>
          <pre class="log-details-body">{{ JSON.stringify(log.details, null, 2) }}</pre>
        </details>
      </article>
    </div>

  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api, requireRoleSession } from '@/api.js'
import { formatDateTimeValue } from '@/utils/records.js'

// ── State ──────────────────────────────────────────────────────────────────
const activityLogs   = ref([])
const searchQuery    = ref('')
const selectedAction = ref('')
const message        = ref('')
const isLoading      = ref(false)

// ── Computed ───────────────────────────────────────────────────────────────
const uniqueAdmins = computed(() => new Set(activityLogs.value.map(l => l.adminName)).size)

const todayCount = computed(() => {
  const today = new Date().toDateString()
  return activityLogs.value.filter(l => {
    // BUG FIX -> guard invalid date before .toDateString()
    const d = new Date(l.rawTimestamp)
    return !isNaN(d) && d.toDateString() === today
  }).length
})

const uniqueActions = computed(() =>
  [...new Set(activityLogs.value.map(l => l.action).filter(Boolean))]
)

const filteredActivity = computed(() => {
  let logs = activityLogs.value
  if (selectedAction.value) logs = logs.filter(l => l.action === selectedAction.value)
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return logs
  return logs.filter(l =>
    (l.action || '').toLowerCase().includes(q) ||
    (l.adminName || '').toLowerCase().includes(q) ||
    (l.adminEmail || '').toLowerCase().includes(q) ||
    String(l.targetId ?? '').includes(q) ||
    (l.targetType || '').toLowerCase().includes(q) ||
    JSON.stringify(l.details ?? {}).toLowerCase().includes(q)
  )
})

// ── Helpers ────────────────────────────────────────────────────────────────
const formatActionLabel = (action) => {
  if (!action) return 'Unknown'
  return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const actionBadgeClass = (action) => {
  if (!action) return 'badge-neutral'
  if (action.includes('delete') || action.includes('remove') || action.includes('reject')) return 'badge-danger'
  if (action.includes('create') || action.includes('add') || action.includes('approve')) return 'badge-success'
  if (action.includes('update') || action.includes('edit') || action.includes('reset')) return 'badge-warning'
  return 'badge-neutral'
}

// ── Data load ──────────────────────────────────────────────────────────────
const loadActivity = async () => {
  isLoading.value = true
  message.value = ''
  try {
    const resp = await api('/admin/activity-logs')
    activityLogs.value = (resp?.logs || []).map(log => ({
      id: log.id,
      action: log.action || '',
      adminName: log.admin_name || 'Unknown',
      adminEmail: log.admin_email || '',
      targetType: log.target_type || '',
      targetId: log.target_id || '',
      details: log.details || null,
      rawTimestamp: log.created_at || '',
      timestamp: formatDateTimeValue(log.created_at, 'Unknown time'),
    }))
  } catch (err) {
    message.value = `Failed to load logs: ${err?.message ?? 'Unknown error'}`
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  requireRoleSession('admin')
  loadActivity()
})
</script>

<style scoped>
.admin-activity-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Glass Card ── */
.card {
  border: 2px solid #021A54;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(2, 26, 84, 0.05);
  padding: 16px;
}

/* ── Header ── */
.page-header-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.page-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #FF85BB;
  margin: 0 0 4px;
  text-transform: uppercase;
}

.page-header-card h2 { margin: 0; font-size: 28px; color: #021A54; }
.page-subtext { margin: 4px 0 0; color: rgba(2, 26, 84, 0.7); font-size: 0.9rem; font-weight: 600; }

/* ── Chip ── */
.chip {
  font-size: 0.88rem;
  font-weight: 800;
  padding: 8px 16px;
  border-radius: 8px;
  border: 2px solid #021A54;
  cursor: pointer;
  transition: transform 100ms;
  display: inline-flex;
  align-items: center;
}

.chip:active { transform: scale(0.95); }
.chip-strong { background: #FF85BB; color: #021A54; }

/* ── Summary bar ── */
.summary-bar { display: flex; gap: 24px; flex-wrap: wrap; }

.summary-stat { display: flex; flex-direction: column; }

.summary-value {
  font-size: 1.8rem;
  font-weight: 800;
  color: #021A54;
}

.summary-label {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #FF85BB;
}

/* ── Toolbar ── */
.toolbar { display: flex; gap: 12px; flex-wrap: wrap; }

.search-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  border: 2px solid #021A54;
  border-radius: 999px;
  padding: 0 14px;
  background: #F5F5F5;
  min-width: 0;
}

.search-icon { font-size: 16px; flex-shrink: 0; }

.search-input {
  border: none;
  background: transparent;
  padding: 10px 8px;
  width: 100%;
  color: #021A54;
  font-weight: 600;
  min-width: 0;
}

.search-input:focus { outline: none; }

.clear-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #021A54;
  line-height: 1;
  flex-shrink: 0;
}

.filter-select {
  border: 2px solid #021A54;
  border-radius: 999px;
  padding: 8px 16px;
  background: #F5F5F5;
  color: #021A54;
  font-weight: 700;
}

/* ── Error ── */
.error-msg {
  background: #FFCEE3;
  border: 2px solid #FF85BB;
  color: #021A54;
  padding: 12px 16px;
  border-radius: 8px;
  font-weight: 800;
  margin: 0;
}

/* ── Log list ── */
.log-list { display: flex; flex-direction: column; gap: 12px; }

.log-card { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }

.log-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.log-badges { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

.action-badge {
  font-size: 12px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 999px;
  border: 2px solid #021A54;
}

.badge-danger  { background: #FFCEE3; color: #021A54; }
.badge-success { background: #d9f8e4; color: #021A54; }
.badge-warning { background: #fff3cd; color: #021A54; }
.badge-neutral { background: #F5F5F5; color: #021A54; }

.log-target { font-size: 0.85rem; color: rgba(2, 26, 84, 0.7); font-weight: 600; }
.log-time   { font-size: 12px; color: #021A54; font-weight: 800; white-space: nowrap; }

.log-card-body { display: flex; flex-direction: column; gap: 8px; }

.log-admin {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.log-admin-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #FFCEE3;
  border: 2px solid #021A54;
  color: #021A54;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
  flex-shrink: 0;
}

.log-admin-name  { font-weight: 800; color: #021A54; font-size: 0.95rem; }
.log-admin-email { font-size: 0.82rem; color: rgba(2, 26, 84, 0.7); font-weight: 600; }

.log-target-id { font-size: 13px; color: rgba(2, 26, 84, 0.8); font-weight: 600; }

.log-id {
  background: #FFCEE3;
  padding: 2px 8px;
  border-radius: 4px;
  border: 2px solid #021A54;
  font-weight: 800;
  color: #021A54;
  font-family: monospace;
}

.log-details {
  margin-top: 4px;
  border-top: 2px dashed #021A54;
  padding-top: 12px;
}

.log-details summary {
  font-size: 13px;
  font-weight: 800;
  color: #FF85BB;
  cursor: pointer;
}

.log-details-body {
  background: rgba(255,255,255,0.8);
  border: 2px solid #021A54;
  border-radius: 8px;
  padding: 12px;
  font-family: monospace;
  font-size: 13px;
  color: #021A54;
  overflow-x: auto;
  margin-top: 10px;
}

/* ── Skeleton ── */
.skeleton {
  height: 100px;
  background: linear-gradient(90deg, rgba(255,255,255,0.4) 25%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.4) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Empty ── */
.empty-state { text-align: center; padding: 36px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.empty-icon  { font-size: 2.5rem; margin: 0; }
.empty-text  { font-weight: 800; color: #021A54; margin: 0; }

@media (max-width: 640px) {
  .page-header-card { flex-direction: column; align-items: flex-start; }
  .toolbar { flex-direction: column; }
  .filter-select { width: 100%; }
  .log-card-head { flex-direction: column; align-items: flex-start; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; }
}
</style>