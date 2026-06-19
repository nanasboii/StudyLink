<template>
  <main class="view page active admin-errors-page">

    <!-- HEADER -->
    <section class="card header-card">
      <div>
        <p class="page-kicker">Admin Panel</p>
        <h2>Server Error Logs</h2>
        <p class="page-subtext">Runtime errors captured from the API.</p>
      </div>
      <button @click="loadErrors" class="chip chip-strong" type="button" :disabled="isLoading">
        {{ isLoading ? 'Loading…' : 'Refresh 🔄' }}
      </button>
    </section>

    <!-- SUMMARY BAR -->
    <section class="summary-bar card" v-if="!isLoading && errors.length">
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

    <!-- TOOLBAR -->
    <section class="toolbar card">
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search errors by path, message..."
          class="search-input"
          aria-label="Search errors"
        />
        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''" aria-label="Clear search">×</button>
      </div>
      <select v-model="selectedType" class="filter-select" aria-label="Filter by error type">
        <option value="">All Errors</option>
        <option value="5xx">5xx (Server)</option>
        <option value="4xx">4xx (Client)</option>
      </select>
    </section>

    <!-- ERROR BANNER -->
    <div v-if="message" class="message-banner" role="alert" aria-live="assertive">
      ⚠️ {{ message }}
    </div>

    <!-- RESULT COUNT -->
    <p v-if="!isLoading && (searchQuery || selectedType) && errors.length" class="result-count">
      Showing {{ filteredErrors.length }} of {{ errors.length }} errors
    </p>

    <!-- SKELETON -->
    <div v-if="isLoading" class="error-list">
      <div v-for="n in 5" :key="n" class="error-card card skeleton"></div>
    </div>

    <!-- EMPTY STATE -->
    <div v-else-if="filteredErrors.length === 0" class="card empty-state">
      <p class="empty-icon">✅</p>
      <p class="empty-text">{{ errors.length === 0 ? 'No errors found.' : 'No matching errors.' }}</p>
      <button
        v-if="searchQuery || selectedType"
        class="chip chip-strong"
        @click="searchQuery = ''; selectedType = ''"
      >
        Clear filters ❌
      </button>
    </div>

    <!-- ERROR LIST -->
    <div v-else class="error-list">
      <article v-for="err in filteredErrors" :key="err.id" class="error-card card">
        <div class="error-card-head">
          <div class="error-badges">
            <span class="error-badge" :class="err.statusCode >= 500 ? 'badge-danger' : 'badge-warning'">
              {{ err.statusCode }}
            </span>
            <span class="error-method">{{ err.method }}</span>
            <code class="error-path">{{ err.path }}</code>
          </div>
          <time class="error-time">{{ err.timestamp }}</time>
        </div>

        <div class="error-card-body">
          <p class="error-msg-text"><strong>{{ err.message }}</strong></p>
          <div class="error-user" v-if="err.userName">
            👤 <code>{{ err.userName }}</code>
            <span v-if="err.userEmail" class="error-user-email">· {{ err.userEmail }}</span>
          </div>
        </div>

        <details v-if="err.stack" class="error-details">
          <summary>Stack trace ⬇️</summary>
          <pre class="error-details-body">{{ err.stack }}</pre>
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
const errors      = ref([])
const searchQuery = ref('')
const selectedType = ref('')
const message     = ref('')
const isLoading   = ref(false)

// ── Computed ───────────────────────────────────────────────────────────────
const count5xx = computed(() => errors.value.filter(e => e.statusCode >= 500).length)
const count4xx = computed(() => errors.value.filter(e => e.statusCode >= 400 && e.statusCode < 500).length)

const todayCount = computed(() => {
  const today = new Date().toDateString()
  return errors.value.filter(e => {
    if (!e.rawTimestamp) return false
    return new Date(e.rawTimestamp).toDateString() === today
  }).length
})

const filteredErrors = computed(() => {
  let list = errors.value

  // BUG FIX → type filter
  if (selectedType.value === '5xx') list = list.filter(e => e.statusCode >= 500)
  if (selectedType.value === '4xx') list = list.filter(e => e.statusCode >= 400 && e.statusCode < 500)

  // BUG FIX → search against correct fields
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(e =>
      String(e.statusCode ?? '').includes(q) ||
      (e.method   || '').toLowerCase().includes(q) ||
      (e.path     || '').toLowerCase().includes(q) ||
      (e.message  || '').toLowerCase().includes(q) ||
      (e.userName || '').toLowerCase().includes(q)
    )
  }
  return list
})

// ── Load ───────────────────────────────────────────────────────────────────
const loadErrors = async () => {
  isLoading.value = true
  message.value   = ''

  try {
    // BUG FIX 1 → wrong endpoint was '/admin/errors' → correct: '/admin/error-logs'
    const resp = await api('/admin/error-logs')

    // BUG FIX 2 → response key is `logs` not `errors`
    const raw = Array.isArray(resp?.logs) ? resp.logs : []

    // BUG FIX 3 → field mapping: status_code, message, stack, user_name, user_email
    errors.value = raw.map(log => ({
      id:           log.id,
      statusCode:   log.status_code ?? 500,        // was log.status (undefined)
      method:       log.method || 'GET',
      path:         log.path  || '/',
      message:      log.message || 'Unknown error', // field name matches server
      stack:        log.stack   || null,
      userName:     log.user_name  || null,
      userEmail:    log.user_email || null,
      rawTimestamp: log.created_at || '',
      timestamp:    formatDateTimeValue(log.created_at, 'Unknown time')
    }))
  } catch (err) {
    message.value = `Failed to load errors: ${err?.message || 'Request failed'}`
  } finally {
    isLoading.value = false
  }
}

// ── Mount ──────────────────────────────────────────────────────────────────
onMounted(() => {
  requireRoleSession('admin')
  loadErrors()
})
</script>

<style scoped>
/* ── Layout ─────────────────────────────────────────────────────────────── */
.admin-errors-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Glass Card ─────────────────────────────────────────────────────────── */
.card {
  border: 2px solid var(--ink, #021A54);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(2, 26, 84, 0.07);
  padding: 16px;
}

/* ── Header ─────────────────────────────────────────────────────────────── */
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
  color: var(--primary, #FF85BB);
  margin: 0 0 4px;
  text-transform: uppercase;
}

.header-card h2 {
  margin: 0;
  font-size: 28px;
  color: var(--ink, #021A54);
}

.page-subtext {
  margin: 4px 0 0;
  color: rgba(2, 26, 84, 0.7);
  font-size: 0.9rem;
  font-weight: 600;
}

/* ── Chip Button ────────────────────────────────────────────────────────── */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 8px;
  padding: 8px 14px;
  font-weight: 700;
  cursor: pointer;
  border: 2px solid var(--ink, #021A54);
  transition: opacity 0.15s;
}
.chip:disabled { opacity: 0.5; cursor: not-allowed; }
.chip-strong {
  background: var(--primary, #FF85BB);
  color: var(--ink, #021A54);
}
.chip-strong:hover:not(:disabled) { background: #ff6da9; }

/* ── Summary Bar ────────────────────────────────────────────────────────── */
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
  color: var(--ink, #021A54);
}

.summary-label {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--primary, #FF85BB);
}

/* ── Toolbar ────────────────────────────────────────────────────────────── */
.toolbar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.search-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  border: 2px solid var(--ink, #021A54);
  border-radius: 999px;
  padding: 0 14px;
  background: var(--canvas-parchment, #F5F5F5);
  min-width: 200px;
}

.search-icon { font-size: 16px; }

.search-input {
  border: none;
  background: transparent;
  padding: 10px;
  width: 100%;
  color: var(--ink, #021A54);
  font-weight: 600;
  font-size: 0.95rem;
}
.search-input:focus { outline: none; }

.clear-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--ink, #021A54);
  line-height: 1;
  padding: 0 2px;
}

.filter-select {
  border: 2px solid var(--ink, #021A54);
  border-radius: 999px;
  padding: 8px 16px;
  background: var(--canvas-parchment, #F5F5F5);
  color: var(--ink, #021A54);
  font-weight: 700;
  cursor: pointer;
}

/* ── Error banner ───────────────────────────────────────────────────────── */
.message-banner {
  background: var(--primary-soft, #FFCEE3);
  border: 2px solid var(--primary, #FF85BB);
  border-radius: 12px;
  padding: 12px 16px;
  color: var(--ink, #021A54);
  font-weight: 700;
}

/* ── Result count ───────────────────────────────────────────────────────── */
.result-count {
  font-size: 0.85rem;
  color: rgba(2, 26, 84, 0.6);
  font-weight: 600;
  margin: 0;
}

/* ── Empty State ────────────────────────────────────────────────────────── */
.empty-state {
  text-align: center;
  padding: 48px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-icon { font-size: 3rem; margin: 0; }

.empty-text {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--ink, #021A54);
  margin: 0;
}

/* ── Skeleton ───────────────────────────────────────────────────────────── */
.skeleton {
  height: 100px;
  border-radius: 12px;
  background: linear-gradient(
    90deg,
    rgba(2,26,84,0.06) 25%,
    rgba(255,133,187,0.12) 50%,
    rgba(2,26,84,0.06) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border: none;
}

@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; }
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Error List ─────────────────────────────────────────────────────────── */
.error-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.error-card { padding: 16px 20px; }

.error-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
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
  border: 2px solid var(--ink, #021A54);
}

.badge-danger  { background: var(--primary-soft, #FFCEE3); color: var(--ink, #021A54); }
.badge-warning { background: var(--canvas-parchment, #F5F5F5); color: var(--ink, #021A54); }

.error-method {
  font-size: 13px;
  color: var(--primary, #FF85BB);
  font-weight: 800;
}

.error-path {
  background: var(--canvas-parchment, #F5F5F5);
  padding: 2px 8px;
  border-radius: 6px;
  border: 2px solid var(--ink, #021A54);
  font-family: monospace;
  font-weight: 700;
  font-size: 13px;
  color: var(--ink, #021A54);
  word-break: break-all;
}

.error-time {
  font-size: 0.8rem;
  color: rgba(2, 26, 84, 0.55);
  font-weight: 600;
  white-space: nowrap;
}

.error-card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.error-msg-text {
  margin: 0;
  color: var(--ink, #021A54);
  font-size: 0.95rem;
}

.error-user {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: rgba(2, 26, 84, 0.7);
  font-weight: 600;
}

.error-user code {
  font-weight: 700;
  background: var(--canvas-parchment, #F5F5F5);
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid var(--ink, #021A54);
}

.error-user-email {
  color: rgba(2, 26, 84, 0.5);
}

/* ── Details / Stack ────────────────────────────────────────────────────── */
.error-details {
  margin-top: 12px;
  border-top: 1px solid var(--hairline, #e0e0e0);
  padding-top: 10px;
}

.error-details summary {
  cursor: pointer;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--primary, #FF85BB);
  user-select: none;
}

.error-details-body {
  margin-top: 8px;
  background: var(--canvas-parchment, #F5F5F5);
  border: 1px solid var(--hairline, #e0e0e0);
  border-radius: 8px;
  padding: 12px;
  font-size: 0.78rem;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--ink, #021A54);
  max-height: 300px;
  overflow-y: auto;
}
</style>