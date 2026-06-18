<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active">

        <!-- Header -->
        <div class="page-header">
          <div>
            <p class="page-kicker">ADMIN PANEL</p>
            <h2>Activity Logs</h2>
            <p class="page-subtext">All admin actions recorded on StudyLink.</p>
          </div>
          <button @click="loadActivity" class="chip" type="button" :disabled="isLoading">
            {{ isLoading ? 'Loading…' : 'Refresh' }}
          </button>
        </div>

        <!-- Summary bar -->
        <div class="summary-bar" v-if="!isLoading && activityLogs.length">
          <div class="summary-stat">
            <span class="summary-value">{{ activityLogs.length }}</span>
            <span class="summary-label">Total Actions</span>
          </div>
          <div class="summary-stat">
            <span class="summary-value">{{ uniqueAdmins }}</span>
            <span class="summary-label">Admins Active</span>
          </div>
          <div class="summary-stat">
            <span class="summary-value">{{ todayCount }}</span>
            <span class="summary-label">Today</span>
          </div>
        </div>

        <!-- Toolbar -->
        <div class="toolbar">
          <div class="search-wrap">
            <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                    stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
            </svg>
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Filter by action, admin, target type…"
              class="search-input"
              aria-label="Filter activity logs"
            />
            <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''" aria-label="Clear search">
              ×
            </button>
          </div>
          <select v-model="selectedAction" class="filter-select" aria-label="Filter by action type">
            <option value="">All actions</option>
            <option v-for="action in uniqueActions" :key="action" :value="action">
              {{ formatActionLabel(action) }}
            </option>
          </select>
        </div>

        <p v-if="message" class="message" role="alert">{{ message }}</p>

        <!-- Result count -->
        <p v-if="searchQuery || selectedAction" class="result-count">
          Showing {{ filteredActivity.length }} of {{ activityLogs.length }} logs
        </p>

        <!-- Loading skeleton -->
        <div v-if="isLoading" class="log-list">
          <div v-for="n in 6" :key="n" class="log-card skeleton">
            <div class="skeleton-line wide"></div>
            <div class="skeleton-line narrow"></div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="filteredActivity.length === 0" class="empty-state">
          <p style="font-size:2rem; margin:0;">📋</p>
          <p style="font-weight:600; margin:8px 0 4px;">
            {{ searchQuery || selectedAction ? 'No matching logs' : 'No activity yet' }}
          </p>
          <p style="color:var(--ink-soft); font-size:0.9rem; margin:0 0 12px;">
            {{ searchQuery || selectedAction ? 'Try a different search or filter.' : 'Admin actions will appear here.' }}
          </p>
          <button v-if="searchQuery || selectedAction" class="chip" @click="searchQuery = ''; selectedAction = ''">
            Clear filters
          </button>
        </div>

        <!-- Log list -->
        <div v-else class="log-list" role="list">
          <article
            v-for="log in filteredActivity"
            :key="log.id"
            class="log-card"
            role="listitem"
          >
            <div class="log-card-head">
              <div class="log-action-wrap">
                <span class="log-action-badge" :class="actionBadgeClass(log.action)">
                  {{ formatActionLabel(log.action) }}
                </span>
                <span class="log-target-type" v-if="log.targetType">
                  on {{ log.targetType }}
                </span>
              </div>
              <time class="log-time" :datetime="log.rawTimestamp">{{ log.timestamp }}</time>
            </div>

            <div class="log-card-body">
              <div class="log-admin">
                <div class="log-admin-avatar">{{ (log.adminName || 'A')[0].toUpperCase() }}</div>
                <span>{{ log.adminName }}</span>
                <span class="log-admin-email" v-if="log.adminEmail">· {{ log.adminEmail }}</span>
              </div>
              <div class="log-target" v-if="log.targetId">
                Target ID: <code class="log-id">{{ log.targetId }}</code>
              </div>
            </div>

            <details v-if="log.details" class="log-details">
              <summary>View details</summary>
              <pre class="log-details-body">{{ JSON.stringify(log.details, null, 2) }}</pre>
            </details>
          </article>
        </div>

      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api, requireRoleSession } from '@/api.js'
import { formatDateTimeValue } from '@/utils/records.js'

const activityLogs = ref([])
const searchQuery = ref('')
const selectedAction = ref('')
const message = ref('')
const isLoading = ref(false)

// — Computed stats —
const uniqueAdmins = computed(() => new Set(activityLogs.value.map(l => l.adminName)).size)
const todayCount = computed(() => {
  const today = new Date().toDateString()
  return activityLogs.value.filter(l => new Date(l.rawTimestamp).toDateString() === today).length
})
const uniqueActions = computed(() => [...new Set(activityLogs.value.map(l => l.action).filter(Boolean))])

// — Filtering —
const filteredActivity = computed(() => {
  let logs = activityLogs.value
  if (selectedAction.value) {
    logs = logs.filter(l => l.action === selectedAction.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    logs = logs.filter(l =>
      (l.action || '').toLowerCase().includes(q) ||
      (l.adminName || '').toLowerCase().includes(q) ||
      (l.adminEmail || '').toLowerCase().includes(q) ||
      String(l.targetId || '').includes(q) ||
      (l.targetType || '').toLowerCase().includes(q) ||
      JSON.stringify(l.details || {}).toLowerCase().includes(q)
    )
  }
  return logs
})

// — Helpers —
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

const loadActivity = async () => {
  isLoading.value = true
  message.value = ''
  try {
    const resp = await api('/admin/activity-logs')
    activityLogs.value = (resp.logs || []).map(log => ({
      id: log.id,
      action: log.action || '',
      adminName: log.admin_name || 'Unknown',
      adminEmail: log.admin_email || '',
      targetType: log.target_type || '',
      targetId: log.target_id || '',
      details: log.details || null,
      rawTimestamp: log.created_at || '',
      timestamp: formatDateTimeValue(log.created_at, 'Unknown time')
    }))
  } catch (err) {
    message.value = `Failed to load activity logs: ${err.message}`
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
.page-bg {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(180deg, var(--canvas), var(--canvas-parchment));
}
.phone-shell {
  width: min(960px, 100%);
  margin: 0 auto;
  padding-inline: 8px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}
.page-kicker {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--ink-soft);
  margin: 0 0 4px;
  text-transform: uppercase;
}
.page-header h2 { margin: 0; font-size: 28px; letter-spacing: -0.02em; }
.page-subtext { margin: 4px 0 0; color: var(--ink-soft); font-size: 0.9rem; }

/* Summary bar */
.summary-bar {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  padding: 12px 16px;
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: 12px;
  margin-bottom: 16px;
}
.summary-stat { display: flex; flex-direction: column; gap: 2px; }
.summary-value { font-size: 1.4rem; font-weight: 700; color: var(--ink); line-height: 1; }
.summary-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-soft); }

/* Toolbar */
.toolbar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.search-wrap {
  flex: 1 1 240px;
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 10px;
  width: 16px;
  height: 16px;
  color: var(--ink-soft);
  pointer-events: none;
}
.search-input {
  width: 100%;
  padding: 8px 32px 8px 34px;
  border: 1px solid var(--hairline);
  border-radius: 9999px;
  font-size: 14px;
  background: var(--surface);
  color: var(--ink);
}
.search-input:focus { outline: none; border-color: var(--primary); }
.clear-btn {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  font-size: 18px;
  color: var(--ink-soft);
  cursor: pointer;
  line-height: 1;
  padding: 0;
}
.filter-select {
  padding: 8px 12px;
  border: 1px solid var(--hairline);
  border-radius: 9999px;
  font-size: 14px;
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
}
.result-count { font-size: 13px; color: var(--ink-soft); margin: 0 0 10px; }

/* Log list */
.log-list { display: flex; flex-direction: column; gap: 10px; }

.log-card {
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: 12px;
  padding: 14px 16px;
  transition: border-color 150ms ease;
}
.log-card:hover { border-color: var(--primary); }

.log-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.log-action-wrap { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.log-action-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
}
.badge-danger  { background: var(--danger-bg);  color: var(--danger-ink); }
.badge-success { background: var(--success-bg); color: var(--success-ink); }
.badge-warning { background: var(--warning-bg); color: var(--warning-ink); }
.badge-neutral { background: var(--surface-soft-alt); color: var(--ink-soft); }

.log-target-type { font-size: 13px; color: var(--ink-soft); }
.log-time { font-size: 12px; color: var(--ink-soft); white-space: nowrap; }

.log-card-body { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.log-admin { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--ink); }
.log-admin-avatar {
  width: 24px; height: 24px; border-radius: 50%;
  background: var(--primary-soft-strong); color: #fff;
  font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.log-admin-email { color: var(--ink-soft); font-size: 12px; }
.log-target { font-size: 13px; color: var(--ink-soft); }
.log-id {
  font-family: monospace;
  background: var(--surface-soft-alt);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--ink);
}

/* Details accordion */
.log-details { margin-top: 10px; border-top: 1px solid var(--hairline); padding-top: 8px; }
.log-details summary {
  font-size: 12px; font-weight: 600; color: var(--primary);
  cursor: pointer; user-select: none;
}
.log-details-body {
  font-size: 12px; font-family: monospace;
  background: var(--surface-soft-alt);
  padding: 10px; border-radius: 8px;
  overflow-x: auto; white-space: pre-wrap;
  margin-top: 8px; color: var(--ink-soft);
}

/* Empty state */
.empty-state {
  text-align: center; padding: 2.5rem 1rem;
  border: 1px dashed var(--hairline);
  border-radius: 16px; margin-top: 8px;
}

/* Skeleton */
.skeleton { pointer-events: none; }
.skeleton-line {
  height: 14px; border-radius: 7px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  margin-bottom: 8px;
}
.skeleton-line.wide { width: 60%; }
.skeleton-line.narrow { width: 35%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* Message */
.message {
  padding: 10px 12px; border-radius: 8px;
  background: var(--danger-bg); border: 1px solid var(--danger-border, #ffd6d6);
  color: var(--danger-ink); font-size: 13px; margin-bottom: 12px;
}

@media (max-width: 640px) {
  .page-header { flex-direction: column; }
  .log-card-head { flex-direction: column; align-items: flex-start; }
  .toolbar { flex-direction: column; }
  .filter-select { width: 100%; }
}
</style>
