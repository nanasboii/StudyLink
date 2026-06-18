<template>
  <main class="view page active admin-activity-page">
    
    <section class="card header-card">
      <div>
        <p class="page-kicker">Admin Panel</p>
        <h2>Activity Logs</h2>
        <p class="page-subtext">All admin actions recorded.</p>
      </div>
      <button @click="loadActivity" class="chip chip-strong" type="button" :disabled="isLoading">
        {{ isLoading ? 'Loading…' : 'Refresh 🔄' }}
      </button>
    </section>

    <section class="summary-bar card" v-if="!isLoading && activityLogs.length">
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
    </section>

    <section class="toolbar card">
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search logs..."
          class="search-input"
        />
        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">×</button>
      </div>
      <select v-model="selectedAction" class="filter-select">
        <option value="">All actions</option>
        <option v-for="action in uniqueActions" :key="action" :value="action">
          {{ formatActionLabel(action) }}
        </option>
      </select>
    </section>

    <p v-if="message" class="message message-error" role="alert">{{ message }}</p>

    <p v-if="searchQuery || selectedAction" class="result-count">
      Showing {{ filteredActivity.length }} of {{ activityLogs.length }} logs
    </p>

    <div v-if="isLoading" class="log-list">
      <div v-for="n in 6" :key="n" class="log-card card skeleton"></div>
    </div>

    <div v-else-if="filteredActivity.length === 0" class="card empty-state">
      <p class="empty-icon">📋</p>
      <p class="empty-text">No matching logs.</p>
      <button v-if="searchQuery || selectedAction" class="chip chip-strong" @click="searchQuery = ''; selectedAction = ''">
        Clear filters ❌
      </button>
    </div>

    <div v-else class="log-list">
      <article v-for="log in filteredActivity" :key="log.id" class="log-card card">
        <div class="log-card-head">
          <div class="log-action-wrap">
            <span class="log-action-badge" :class="actionBadgeClass(log.action)">
              {{ formatActionLabel(log.action) }}
            </span>
            <span class="log-target-type" v-if="log.targetType">
              on {{ log.targetType }}
            </span>
          </div>
          <time class="log-time">{{ log.timestamp }}</time>
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

const activityLogs = ref([])
const searchQuery = ref('')
const selectedAction = ref('')
const message = ref('')
const isLoading = ref(false)

const uniqueAdmins = computed(() => new Set(activityLogs.value.map(l => l.adminName)).size)
const todayCount = computed(() => {
  const today = new Date().toDateString()
  return activityLogs.value.filter(l => new Date(l.rawTimestamp).toDateString() === today).length
})
const uniqueActions = computed(() => [...new Set(activityLogs.value.map(l => l.action).filter(Boolean))])

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
    message.value = `Failed load logs: ${err.message}`
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

/* Glass Card 🪟 */
.card {
  border: 2px solid #021A54;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(2, 26, 84, 0.05);
  padding: 16px;
}

/* Header */
.header-card {
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

.header-card h2 {
  margin: 0;
  font-size: 28px;
  color: #021A54;
}

.page-subtext {
  margin: 4px 0 0;
  color: rgba(2, 26, 84, 0.7);
  font-size: 0.9rem;
  font-weight: 600;
}

.chip-strong {
  background: #FF85BB;
  color: #021A54;
  border: 2px solid #021A54;
  border-radius: 8px;
  padding: 8px 14px;
  font-weight: bold;
  cursor: pointer;
}

/* Summary Bar */
.summary-bar {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.summary-stat {
  display: flex;
  flex-direction: column;
}

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

/* Toolbar */
.toolbar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.search-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  border: 2px solid #021A54;
  border-radius: 999px;
  padding: 0 14px;
  background: #F5F5F5;
  position: relative;
}

.search-icon {
  font-size: 16px;
}

.search-input {
  border: none;
  background: transparent;
  padding: 10px;
  width: 100%;
  color: #021A54;
  font-weight: 600;
}

.search-input:focus {
  outline: none;
}

.clear-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #021A54;
}

.filter-select {
  border: 2px solid #021A54;
  border-radius: 999px;
  padding: 8px 16px;
  background: #F5F5F5;
  color: #021A54;
  font-weight: 700;
}

.result-count {
  font-size: 14px;
  color: #021A54;
  font-weight: 700;
  margin: 0;
}

/* Log List */
.log-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.log-card {
  padding: 16px 20px;
}

.log-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}

.log-action-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.log-action-badge {
  font-size: 12px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 999px;
  border: 2px solid #021A54;
}

.badge-danger { background: #FFCEE3; color: #021A54; }
.badge-success { background: #FF85BB; color: #021A54; }
.badge-warning { background: #F5F5F5; color: #021A54; }
.badge-neutral { background: transparent; color: #021A54; }

.log-target-type {
  font-size: 13px;
  color: #021A54;
  font-weight: 700;
}

.log-time {
  font-size: 12px;
  color: #021A54;
  font-weight: 800;
}

.log-card-body {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.log-admin {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  color: #021A54;
}

.log-admin-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #FF85BB;
  color: #021A54;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #021A54;
}

.log-admin-email {
  color: rgba(2, 26, 84, 0.8);
  font-size: 12px;
}

.log-target {
  font-size: 13px;
  color: #021A54;
  font-weight: 600;
}

.log-id {
  background: #FFCEE3;
  padding: 2px 8px;
  border-radius: 6px;
  border: 2px solid #021A54;
  font-family: monospace;
  font-weight: 800;
}

/* Details Accordion */
.log-details {
  margin-top: 14px;
  border-top: 2px dashed #021A54;
  padding-top: 12px;
}

.log-details summary {
  font-size: 13px;
  font-weight: 800;
  color: #FF85BB;
  cursor: pointer;
  outline: none;
}

.log-details-body {
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid #021A54;
  border-radius: 8px;
  padding: 12px;
  font-family: monospace;
  font-size: 13px;
  color: #021A54;
  font-weight: 600;
  overflow-x: auto;
  margin-top: 10px;
}

/* Skeleton */
.skeleton {
  height: 100px;
  background: linear-gradient(90deg, rgba(255,255,255,0.4) 25%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.4) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Empty / Error */
.empty-state {
  text-align: center;
  padding: 36px;
}
.empty-icon { font-size: 2.5rem; margin: 0 0 10px; }
.empty-text { font-weight: 800; color: #021A54; margin: 0 0 14px; }

.message-error {
  background: #FFCEE3;
  border: 2px solid #FF85BB;
  color: #021A54;
  padding: 12px 16px;
  border-radius: 8px;
  font-weight: 800;
}

@media (max-width: 640px) {
  .header-card { flex-direction: column; align-items: flex-start; }
  .log-card-head { flex-direction: column; align-items: flex-start; }
  .toolbar { flex-direction: column; }
  .filter-select { width: 100%; }
}
</style>
