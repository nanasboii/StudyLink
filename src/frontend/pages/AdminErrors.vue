<template>
  <main class="view page active admin-errors-page">

    <!-- ── Header ── -->
    <section class="card page-header-card">
      <div>
        <p class="page-kicker">Admin · System</p>
        <h2>Server Error Logs</h2>
        <p class="page-subtext">Runtime errors captured from the API.</p>
      </div>
      <button @click="loadErrors" class="chip chip-strong" type="button" :disabled="isLoading">
        {{ isLoading ? 'Loading…' : 'Refresh 🔄' }}
      </button>
    </section>

    <!-- ── Summary bar ── -->
    <section v-if="!isLoading && errors.length" class="card summary-bar">
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
    </section>

    <!-- ── Toolbar ── -->
    <section class="card toolbar">
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search by path, message, user…"
          class="search-input"
          aria-label="Search errors"
        />
        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''" type="button" aria-label="Clear search">×</button>
      </div>
      <select v-model="selectedType" class="filter-select" aria-label="Filter by error type">
        <option value="">All Errors</option>
        <option value="5xx">5xx (Server)</option>
        <option value="4xx">4xx (Client)</option>
      </select>
    </section>

    <!-- ── Error message ── -->
    <p v-if="message" class="error-msg" role="alert" aria-live="assertive">{{ message }}</p>

    <!-- ── Skeleton ── -->
    <div v-if="isLoading" class="error-list">
      <div v-for="n in 6" :key="n" class="card skeleton"></div>
    </div>

    <!-- ── Empty ── -->
    <div v-else-if="!filteredErrors.length" class="card empty-state">
      <p class="empty-icon">✅</p>
      <p class="empty-text">No errors found.</p>
      <button v-if="searchQuery || selectedType" class="chip chip-strong" @click="searchQuery = ''; selectedType = ''" type="button">
        Clear filters ❌
      </button>
    </div>

    <!-- ── Error list ── -->
    <div v-else class="error-list">
      <article v-for="err in filteredErrors" :key="err.id" class="card error-card">
        <div class="error-card-head">
          <div class="error-badges">
            <span class="error-badge" :class="err.status >= 500 ? 'badge-danger' : 'badge-warning'">
              {{ err.status }}
            </span>
            <span class="error-method">{{ err.method }}</span>
            <code class="error-path">{{ err.path }}</code>
          </div>
          <time class="error-time">{{ err.timestamp }}</time>
        </div>

        <div class="error-card-body">
          <p class="error-msg-text"><strong>{{ err.error }}</strong></p>
          <div class="error-user" v-if="err.userId">
            User ID: <code class="error-code">{{ err.userId }}</code>
          </div>
        </div>

        <details v-if="err.details" class="error-details">
          <summary>View details ⬇️</summary>
          <pre class="error-details-body">{{ JSON.stringify(err.details, null, 2) }}</pre>
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
const errors       = ref([])
const searchQuery  = ref('')
const selectedType = ref('')
const message      = ref('')
const isLoading    = ref(false)

// ── Computed ───────────────────────────────────────────────────────────────
const count5xx = computed(() => errors.value.filter(e => e.status >= 500).length)
const count4xx = computed(() => errors.value.filter(e => e.status >= 400 && e.status < 500).length)

const todayCount = computed(() => {
  const today = new Date().toDateString()
  return errors.value.filter(e => {
    // BUG FIX -> guard invalid rawTimestamp before calling toDateString
    const d = new Date(e.rawTimestamp)
    return !isNaN(d) && d.toDateString() === today
  }).length
})

const filteredErrors = computed(() => {
  let list = errors.value
  if (selectedType.value === '5xx') list = list.filter(e => e.status >= 500)
  if (selectedType.value === '4xx') list = list.filter(e => e.status >= 400 && e.status < 500)
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return list
  return list.filter(e =>
    String(e.status).includes(q) ||
    (e.method || '').toLowerCase().includes(q) ||
    (e.path || '').toLowerCase().includes(q) ||
    (e.error || '').toLowerCase().includes(q) ||
    String(e.userId ?? '').includes(q)
  )
})

// ── Data load ──────────────────────────────────────────────────────────────
const loadErrors = async () => {
  isLoading.value = true
  message.value = ''
  try {
    const resp = await api('/admin/errors')
    errors.value = (resp?.errors || []).map(err => ({
      id: err.id,
      status: err.status || 500,
      method: err.method || 'GET',
      path: err.path || '/',
      error: err.message || err.error || 'Unknown Error',
      userId: err.user_id ?? err.userId ?? null,
      details: err.details ?? null,
      rawTimestamp: err.created_at || '',
      timestamp: formatDateTimeValue(err.created_at, 'Unknown time'),
    }))
  } catch (err) {
    message.value = `Failed to load errors: ${err?.message ?? 'Unknown error'}`
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
.admin-errors-page {
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
.summary-value { font-size: 1.8rem; font-weight: 800; color: #021A54; }
.summary-label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #FF85BB; }

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

.search-icon  { font-size: 16px; flex-shrink: 0; }

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

/* ── Error banner ── */
.error-msg {
  background: #FFCEE3;
  border: 2px solid #FF85BB;
  color: #021A54;
  padding: 12px 16px;
  border-radius: 8px;
  font-weight: 800;
  margin: 0;
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

/* ── Error list ── */
.error-list { display: flex; flex-direction: column; gap: 12px; }

.error-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 20px;
}

.error-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.error-badges {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.error-badge {
  font-size: 12px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 999px;
  border: 2px solid #021A54;
}

.badge-danger  { background: #FFCEE3; color: #021A54; }
.badge-warning { background: #F5F5F5; color: #021A54; }

.error-method { font-size: 13px; color: #FF85BB; font-weight: 800; }

.error-path {
  background: #F5F5F5;
  padding: 2px 8px;
  border-radius: 6px;
  border: 2px solid #021A54;
  font-family: monospace;
  font-weight: 800;
  color: #021A54;
  font-size: 13px;
}

.error-time { font-size: 12px; font-weight: 800; color: #021A54; white-space: nowrap; }

.error-card-body { display: flex; flex-direction: column; gap: 6px; }

.error-msg-text { margin: 0; font-size: 1rem; color: #021A54; }

.error-user { font-size: 13px; color: rgba(2, 26, 84, 0.8); font-weight: 600; }

.error-code {
  background: #FFCEE3;
  padding: 2px 6px;
  border-radius: 4px;
  border: 2px solid #021A54;
  font-weight: 800;
  color: #021A54;
  font-family: monospace;
}

.error-details {
  margin-top: 4px;
  border-top: 2px dashed #021A54;
  padding-top: 12px;
}

.error-details summary {
  font-size: 13px;
  font-weight: 800;
  color: #FF85BB;
  cursor: pointer;
}

.error-details-body {
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

@media (max-width: 640px) {
  .page-header-card { flex-direction: column; align-items: flex-start; }
  .toolbar { flex-direction: column; }
  .filter-select { width: 100%; }
  .error-card-head { flex-direction: column; align-items: flex-start; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; }
}
</style>