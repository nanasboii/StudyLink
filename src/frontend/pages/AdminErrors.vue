<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active">

        <!-- Header -->
        <div class="page-header">
          <div>
            <p class="page-kicker">ADMIN PANEL</p>
            <h2>Server Error Logs</h2>
            <p class="page-subtext">Runtime errors captured from the StudyLink API.</p>
          </div>
          <button @click="loadErrors" class="chip" type="button" :disabled="isLoading">
            {{ isLoading ? 'Loading…' : 'Refresh' }}
          </button>
        </div>

        <!-- Summary bar -->
        <div class="summary-bar" v-if="!isLoading && errors.length">
          <div class="summary-stat">
            <span class="summary-value">{{ errors.length }}</span>
            <span class="summary-label">Total Errors</span>
          </div>
          <div class="summary-stat">
            <span class="summary-value">{{ count5xx }}</span>
            <span class="summary-label">5xx Server</span>
          </div>
          <div class="summary-stat">
            <span class="summary-value">{{ count4xx }}</span>
            <span class="summary-label">4xx Client</span>
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
              placeholder="Filter by path, method, status, user…"
              class="search-input"
              aria-label="Filter error logs"
            />
            <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''" aria-label="Clear search">×</button>
          </div>
          <select v-model="selectedStatus" class="filter-select" aria-label="Filter by status code">
            <option value="">All statuses</option>
            <option value="5xx">5xx Server errors</option>
            <option value="4xx">4xx Client errors</option>
            <option value="404">404 Not Found</option>
            <option value="401">401 Unauthorised</option>
          </select>
          <select v-model="selectedMethod" class="filter-select" aria-label="Filter by HTTP method">
            <option value="">All methods</option>
            <option v-for="m in uniqueMethods" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>

        <p v-if="message" class="message" role="alert">{{ message }}</p>

        <!-- Result count -->
        <p v-if="searchQuery || selectedStatus || selectedMethod" class="result-count">
          Showing {{ filteredErrors.length }} of {{ errors.length }} errors
        </p>

        <!-- Loading skeleton -->
        <div v-if="isLoading" class="error-list">
          <div v-for="n in 5" :key="n" class="error-card skeleton">
            <div class="skeleton-head">
              <div class="skeleton-badge"></div>
              <div class="skeleton-line med"></div>
            </div>
            <div class="skeleton-line short"></div>
            <div class="skeleton-line long"></div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else-if="filteredErrors.length === 0" class="empty-state">
          <p style="font-size:2rem; margin:0;">✅</p>
          <p style="font-weight:600; margin:8px 0 4px;">
            {{ searchQuery || selectedStatus || selectedMethod ? 'No matching errors' : 'No errors logged' }}
          </p>
          <p style="color:var(--ink-soft); font-size:0.9rem; margin:0 0 12px;">
            {{ searchQuery || selectedStatus || selectedMethod
              ? 'Try a different search or filter.'
              : 'The server is running cleanly.' }}
          </p>
          <button v-if="searchQuery || selectedStatus || selectedMethod"
                  class="chip" @click="clearFilters">Clear filters</button>
        </div>

        <!-- Error list -->
        <div v-else class="error-list" role="list">
          <article
            v-for="err in filteredErrors"
            :key="err.id"
            class="error-card"
            :class="{ 'is-5xx': Number(err.status) >= 500 }"
            role="listitem"
          >
            <div class="error-card-head">
              <div class="error-meta-row">
                <span class="error-status-badge" :class="statusClass(err.status)">
                  {{ err.status }}
                </span>
                <span class="error-method-badge">{{ err.method }}</span>
                <code class="error-path">{{ err.path }}</code>
              </div>
              <time class="error-time" :datetime="err.rawTimestamp">{{ err.timestamp }}</time>
            </div>

            <p class="error-message-text">{{ err.message }}</p>

            <div class="error-user-row" v-if="err.userName || err.userEmail">
              <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" style="flex-shrink:0">
                <path d="M12 2C9.79 2 8 3.79 8 6s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-4.42 0-8 1.79-8 4v2h16v-2c0-2.21-3.58-4-8-4z" fill="currentColor"/>
              </svg>
              <span>{{ err.userName || 'Anonymous' }}</span>
              <span v-if="err.userEmail" class="error-user-email">· {{ err.userEmail }}</span>
            </div>

            <details v-if="err.stack" class="error-stack">
              <summary>Stack trace</summary>
              <pre class="error-stack-body">{{ err.stack }}</pre>
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

const errors = ref([])
const searchQuery = ref('')
const selectedStatus = ref('')
const selectedMethod = ref('')
const message = ref('')
const isLoading = ref(false)

// — Computed stats —
const count5xx = computed(() => errors.value.filter(e => Number(e.status) >= 500).length)
const count4xx = computed(() => errors.value.filter(e => Number(e.status) >= 400 && Number(e.status) < 500).length)
const todayCount = computed(() => {
  const today = new Date().toDateString()
  return errors.value.filter(e => new Date(e.rawTimestamp).toDateString() === today).length
})
const uniqueMethods = computed(() => [...new Set(errors.value.map(e => e.method).filter(Boolean))])

// — Status badge class —
const statusClass = (status) => {
  const code = Number(status)
  if (code >= 500) return 'status-5xx'
  if (code === 404) return 'status-404'
  if (code === 401 || code === 403) return 'status-auth'
  if (code >= 400) return 'status-4xx'
  return 'status-other'
}

// — Filter —
const filteredErrors = computed(() => {
  let list = errors.value

  if (selectedStatus.value) {
    list = list.filter(e => {
      const code = Number(e.status)
      if (selectedStatus.value === '5xx') return code >= 500
      if (selectedStatus.value === '4xx') return code >= 400 && code < 500
      return String(e.status) === selectedStatus.value
    })
  }

  if (selectedMethod.value) {
    list = list.filter(e => e.method === selectedMethod.value)
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(e =>
      (e.path || '').toLowerCase().includes(q) ||
      (e.method || '').toLowerCase().includes(q) ||
      String(e.status || '').includes(q) ||
      (e.message || '').toLowerCase().includes(q) ||
      (e.userName || '').toLowerCase().includes(q) ||
      (e.userEmail || '').toLowerCase().includes(q)
    )
  }

  return list
})

const clearFilters = () => {
  searchQuery.value = ''
  selectedStatus.value = ''
  selectedMethod.value = ''
}

const loadErrors = async () => {
  isLoading.value = true
  message.value = ''
  try {
    const resp = await api('/admin/error-logs')
    errors.value = (resp.errors || []).map(err => ({
      id: err.id,
      path: err.path || '',
      method: err.method || '',
      status: err.status_code || 0,
      message: err.message || '',
      stack: err.stack || null,
      userName: err.user_name || null,
      userEmail: err.user_email || null,
      rawTimestamp: err.created_at || '',
      timestamp: formatDateTimeValue(err.created_at, 'Unknown time')
    }))
  } catch (err) {
    message.value = `Failed to load error logs: ${err.message}`
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  requireRoleSession('admin')
  loadErrors()
})
</script>

<style scoped>
.page-bg {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(180deg, var(--canvas), var(--canvas-parchment));
}
.phone-shell { width: min(960px, 100%); margin: 0 auto; padding-inline: 8px; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}
.page-kicker {
  font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
  color: var(--ink-soft); margin: 0 0 4px; text-transform: uppercase;
}
.page-header h2 { margin: 0; font-size: 28px; letter-spacing: -0.02em; }
.page-subtext { margin: 4px 0 0; color: var(--ink-soft); font-size: 0.9rem; }

/* Summary bar */
.summary-bar {
  display: flex; gap: 1.5rem; flex-wrap: wrap;
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
.toolbar { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.search-wrap { flex: 1 1 220px; position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 10px; width: 16px; height: 16px; color: var(--ink-soft); pointer-events: none; }
.search-input {
  width: 100%; padding: 8px 32px 8px 34px;
  border: 1px solid var(--hairline); border-radius: 9999px;
  font-size: 14px; background: var(--surface); color: var(--ink);
}
.search-input:focus { outline: none; border-color: var(--primary); }
.clear-btn { position: absolute; right: 10px; background: none; border: none; font-size: 18px; color: var(--ink-soft); cursor: pointer; padding: 0; }
.filter-select {
  padding: 8px 12px; border: 1px solid var(--hairline);
  border-radius: 9999px; font-size: 14px;
  background: var(--surface); color: var(--ink); cursor: pointer;
}
.result-count { font-size: 13px; color: var(--ink-soft); margin: 0 0 10px; }

/* Error list */
.error-list { display: flex; flex-direction: column; gap: 10px; }

.error-card {
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: 12px;
  padding: 14px 16px;
  transition: border-color 150ms ease;
}
.error-card:hover { border-color: #e0b0b8; }
.error-card.is-5xx { border-left: 3px solid var(--danger-ink); }

.error-card-head {
  display: flex; justify-content: space-between;
  align-items: flex-start; gap: 8px;
  flex-wrap: wrap; margin-bottom: 8px;
}
.error-meta-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

/* Status badges */
.error-status-badge {
  font-size: 11px; font-weight: 700;
  padding: 2px 8px; border-radius: 999px;
}
.status-5xx  { background: var(--danger-bg);  color: var(--danger-ink); }
.status-404  { background: var(--warning-bg); color: var(--warning-ink); }
.status-auth { background: rgba(177, 31, 75, 0.1); color: #8d1630; }
.status-4xx  { background: rgba(245, 190, 60, 0.15); color: #7a5c00; }
.status-other { background: var(--surface-soft-alt); color: var(--ink-soft); }

.error-method-badge {
  font-size: 11px; font-weight: 700;
  padding: 2px 8px; border-radius: 999px;
  background: var(--surface-soft-alt); color: var(--ink-soft);
  font-family: monospace;
}
.error-path {
  font-family: monospace; font-size: 12px;
  color: var(--ink); word-break: break-all;
}
.error-time { font-size: 12px; color: var(--ink-soft); white-space: nowrap; }

.error-message-text {
  font-size: 13px; color: var(--ink);
  margin: 0 0 8px; line-height: 1.4;
}

.error-user-row {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; color: var(--ink-soft); margin-bottom: 6px;
}
.error-user-email { color: var(--ink-soft); }

/* Stack trace */
.error-stack { border-top: 1px solid var(--hairline); padding-top: 8px; margin-top: 6px; }
.error-stack summary {
  font-size: 12px; font-weight: 600; color: var(--danger-ink);
  cursor: pointer; user-select: none;
}
.error-stack-body {
  font-size: 11px; font-family: monospace;
  background: #1a1a1a; color: #f8f8f2;
  padding: 12px; border-radius: 8px;
  overflow-x: auto; white-space: pre-wrap;
  margin-top: 8px; max-height: 260px; overflow-y: auto;
  line-height: 1.5;
}

/* Empty state */
.empty-state {
  text-align: center; padding: 2.5rem 1rem;
  border: 1px dashed var(--hairline);
  border-radius: 16px; margin-top: 8px;
}

/* Message */
.message {
  padding: 10px 12px; border-radius: 8px;
  background: var(--danger-bg); color: var(--danger-ink);
  font-size: 13px; margin-bottom: 12px;
}

/* Skeleton */
.skeleton { pointer-events: none; }
.skeleton-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.skeleton-badge {
  width: 40px; height: 20px; border-radius: 999px;
  background: linear-gradient(90deg, #f0e6ea 25%, #e8d8de 50%, #f0e6ea 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
.skeleton-line {
  height: 12px; border-radius: 6px;
  background: linear-gradient(90deg, #f0e6ea 25%, #e8d8de 50%, #f0e6ea 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  margin-bottom: 6px;
}
.skeleton-line.short { width: 30%; }
.skeleton-line.med   { width: 50%; }
.skeleton-line.long  { width: 80%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

@media (max-width: 640px) {
  .page-header { flex-direction: column; }
  .toolbar { flex-direction: column; }
  .filter-select { width: 100%; }
  .error-card-head { flex-direction: column; }
}
</style>
