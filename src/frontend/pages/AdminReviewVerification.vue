<template>
  <main class="view page active admin-verif-page">
    <section class="phone-shell">
      <div class="admin-verif-content">

        <div class="card page-header">
          <div>
            <p class="page-kicker">Admin · Verification</p>
            <h2>Tutor Verifications</h2>
            <p class="page-subtext">Review and action pending tutor credential submissions.</p>
          </div>
          <button
            class="chip chip-strong"
            type="button"
            :disabled="isLoading"
            @click="loadApplications"
            aria-label="Refresh list"
          >
            {{ isLoading ? 'Loading…' : 'Refresh 🔄' }}
          </button>
        </div>

        <div v-if="!isLoading && applications.length" class="summary-bar">
          <div class="summary-stat card">
            <span class="summary-value">{{ applications.length }}</span>
            <span class="summary-label">Total</span>
          </div>
          <div class="summary-stat card summary-stat--pending">
            <span class="summary-value">{{ filterCounts.PENDING }}</span>
            <span class="summary-label">Pending</span>
          </div>
          <div class="summary-stat card summary-stat--approved">
            <span class="summary-value">{{ filterCounts.APPROVED }}</span>
            <span class="summary-label">Approved</span>
          </div>
          <div class="summary-stat card summary-stat--rejected">
            <span class="summary-value">{{ filterCounts.REJECTED }}</span>
            <span class="summary-label">Rejected</span>
          </div>
        </div>

        <transition name="fade-slide">
          <p
            v-if="message"
            class="card feedback-msg"
            :class="message.startsWith('Error') ? 'error' : 'success'"
            role="alert"
            aria-live="polite"
          >
            {{ message }}
          </p>
        </transition>

        <div class="card toolbar-row">
          <div class="search-field">
            <span class="search-icon">🔍</span>
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Search by name, course code…"
              class="search-input-field"
              aria-label="Search verifications"
            />
            <button
              v-if="searchQuery"
              class="clear-btn"
              type="button"
              @click="searchQuery = ''"
              aria-label="Clear search"
            >×</button>
          </div>
        </div>

        <div class="card filter-bar" role="group" aria-label="Filter by status">
          <button
            v-for="filter in statusFilters"
            :key="filter.value"
            class="chip filter-chip"
            :class="activeStatusFilter === filter.value ? 'chip-strong' : 'chip-soft'"
            type="button"
            @click="activeStatusFilter = filter.value"
            :aria-pressed="activeStatusFilter === filter.value"
          >
            {{ filter.label }}
            <span class="filter-count">{{ filterCounts[filter.value] ?? filterCounts.all }}</span>
          </button>
        </div>

        <p
          v-if="searchQuery || activeStatusFilter !== 'all'"
          class="result-count"
          aria-live="polite"
        >
          Showing {{ filteredApplications.length }} of {{ applications.length }}
        </p>

        <div v-if="isLoading" class="verif-list">
          <div v-for="n in 4" :key="n" class="card verification-item skeleton-card" aria-hidden="true">
            <div class="skeleton-head">
              <div class="skeleton-badge"></div>
              <div class="sk-lines">
                <div class="skeleton-line med"></div>
                <div class="skeleton-line short"></div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-else-if="filteredApplications.length === 0"
          class="card empty-state"
          role="status"
        >
          <p class="empty-icon">📁</p>
          <p class="empty-title">
            {{ searchQuery
              ? 'No results for "' + searchQuery + '"'
              : activeStatusFilter !== 'all'
                ? 'No ' + activeStatusFilterLabel.toLowerCase() + ' submissions'
                : 'No verification submissions yet' }}
          </p>
          <p class="empty-sub">
            {{ searchQuery || activeStatusFilter !== 'all'
              ? 'Try adjusting your search or filter.'
              : 'Tutor applications will appear here once submitted.' }}
          </p>
          <button
            v-if="searchQuery || activeStatusFilter !== 'all'"
            class="chip chip-soft"
            type="button"
            @click="clearFilters"
          >Clear filters ❌</button>
        </div>

        <div v-else class="verif-list">
          <article
            v-for="app in filteredApplications"
            :key="app.id"
            class="card verification-item"
            role="button"
            tabindex="0"
            @click="openDetails(app)"
            @keydown.enter.prevent="openDetails(app)"
            @keydown.space.prevent="openDetails(app)"
            :aria-label="`Review ${app.userName} — ${formatStatusLabel(app.status)}`"
          >
            <div class="verification-head">
              <div class="verif-avatar" :class="avatarColor(app.userName)" aria-hidden="true">
                {{ initials(app.userName) }}
              </div>
              <div class="verif-meta">
                <strong class="verif-name">{{ app.userName }}</strong>
                <p class="meta verif-course">
                  {{ app.courseCode || 'Unspecified subject' }}
                  <span class="meta-dot" aria-hidden="true">·</span>
                  {{ app.createdAt || 'Date unknown' }}
                </p>
              </div>
              <span
                class="status-badge"
                :class="statusBadgeClass(app.status)"
                :aria-label="'Status: ' + formatStatusLabel(app.status)"
              >{{ formatStatusLabel(app.status) }}</span>
            </div>
            <p class="verification-hint">Tap to review proof and take action →</p>
          </article>
        </div>

      </div>
    </section>

    <teleport to="body">
      <transition name="fade">
        <div
          v-if="selectedApplication"
          class="detail-backdrop"
          @click="closeDetails"
          role="dialog"
          aria-modal="true"
          :aria-label="'Verification detail for ' + selectedApplication.userName"
        >
          <section class="card detail-modal" @click.stop>

            <div class="detail-header">
              <div>
                <p class="detail-kicker">Verification detail</p>
                <h3>{{ selectedApplication.userName }}</h3>
              </div>
              <button
                class="close-btn"
                type="button"
                @click="closeDetails"
                aria-label="Close detail panel"
                ref="closeButtonRef"
              >×</button>
            </div>

            <div class="detail-status-row">
              <span class="status-badge" :class="statusBadgeClass(selectedApplication.status)">
                {{ formatStatusLabel(selectedApplication.status) }}
              </span>
              <span class="detail-date">
                Submitted {{ selectedApplication.createdAt || 'unknown date' }}
              </span>
            </div>

            <div class="detail-scroll">
              <div class="detail-body">
                <div class="card detail-section">
                  <p class="detail-label">Course / subject</p>
                  <p class="detail-value">{{ selectedApplication.courseCode || 'Not specified' }}</p>
                </div>

                <div class="card detail-section">
                  <p class="detail-label">Previous review notes</p>
                  <p class="detail-value detail-value--muted">
                    {{ selectedApplication.reviewNotes || 'No review notes on record.' }}
                  </p>
                </div>

                <div class="card detail-section detail-section--proof">
                  <p class="detail-label">Proof document</p>
                  <p class="detail-value">
                    {{ selectedApplication.proofUrl
                      ? 'A proof file was submitted. Click below to open it.'
                      : 'No proof file was attached to this submission.' }}
                  </p>
                  <button
                    class="chip chip-strong proof-btn"
                    type="button"
                    :disabled="!selectedApplication.proofUrl"
                    :class="{ 'chip-disabled': !selectedApplication.proofUrl }"
                    @click="openProof(selectedApplication)"
                    aria-label="Open submitted proof document in a new tab"
                  >
                    View Proof 📄
                  </button>
                </div>
              </div>

              <div v-if="canReview" class="card detail-review-panel">
                <div class="review-panel-header">
                  <span>📝 Leave a decision note</span>
                </div>
                <textarea
                  v-model="reviewNote"
                  class="review-note-input"
                  rows="4"
                  placeholder="Explain your decision or leave a note for the tutor…"
                  aria-label="Admin review note"
                  :disabled="Boolean(actionState)"
                ></textarea>

                <div class="review-actions">
                  <button
                    class="chip chip-soft"
                    type="button"
                    :disabled="Boolean(actionState)"
                    @click="requestReupload"
                    title="Ask the tutor to re-submit their proof file"
                  >
                    {{ actionState === 'reupload' ? 'Sending…' : 'Request Re-upload 🔄' }}
                  </button>
                  <button
                    class="chip chip-danger"
                    type="button"
                    :disabled="Boolean(actionState)"
                    @click="submitDecision('rejected')"
                  >
                    {{ actionState === 'reject' ? 'Rejecting…' : 'Reject ❌' }}
                  </button>
                  <button
                    class="chip chip-strong"
                    type="button"
                    :disabled="Boolean(actionState)"
                    @click="submitDecision('approved')"
                  >
                    {{ actionState === 'approve' ? 'Approving…' : 'Approve ✅' }}
                  </button>
                </div>
              </div>

              <div v-else class="card review-readonly-notice">
                🔒 This submission has already been actioned and cannot be changed.
              </div>
            </div>

          </section>
        </div>
      </transition>
    </teleport>
  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { api } from '@/api.js'
import { normalizeAdminVerification } from '@/utils/records.js'

// ── State ──────────────────────────────────────────────────────────────────
const applications    = ref([])
const selectedApplication = ref(null)
const isLoading       = ref(true)
const message         = ref('')
const searchQuery     = ref('')
const reviewNote      = ref('')
const actionState     = ref('')
const activeStatusFilter = ref('all')
const closeButtonRef  = ref(null)

let messageTimer = null

// ── Derived ────────────────────────────────────────────────────────────────
const canReview = computed(() =>
  ['PENDING', 'REUPLOAD_REQUESTED'].includes(
    String(selectedApplication.value?.status || '').toUpperCase()
  )
)

const formatStatusLabel = (status) => {
  const s = String(status || 'PENDING').toUpperCase()
  if (s === 'REUPLOAD_REQUESTED') return 'Re-upload Requested'
  if (s === 'PENDING')   return 'Pending'
  if (s === 'APPROVED')  return 'Approved'
  if (s === 'REJECTED')  return 'Rejected'
  return s
}

const statusBadgeClass = (status) => {
  const s = String(status || 'PENDING').toUpperCase()
  if (s === 'REUPLOAD_REQUESTED') return 'reupload-requested'
  return s.toLowerCase()
}

const statusFilters = [
  { value: 'all',                label: 'All' },
  { value: 'PENDING',            label: 'Pending' },
  { value: 'REUPLOAD_REQUESTED', label: 'Re-upload' },
  { value: 'APPROVED',           label: 'Approved' },
  { value: 'REJECTED',           label: 'Rejected' },
]

const activeStatusFilterLabel = computed(() =>
  statusFilters.find(f => f.value === activeStatusFilter.value)?.label || activeStatusFilter.value
)

const filterCounts = computed(() => {
  const counts = { all: applications.value.length, PENDING: 0, REUPLOAD_REQUESTED: 0, APPROVED: 0, REJECTED: 0 }
  applications.value.forEach(app => {
    const key = String(app.status || 'PENDING').toUpperCase()
    if (key in counts) counts[key]++
  })
  return counts
})

const filteredApplications = computed(() => {
  const search = searchQuery.value.toLowerCase().trim()
  return applications.value.filter(app => {
    const status = String(app.status || 'PENDING').toUpperCase()
    if (activeStatusFilter.value !== 'all' && status !== activeStatusFilter.value) return false
    if (!search) return true
    return [
      app.userName     || '',
      app.courseCode   || '',
      app.reviewNotes  || '',
      app.status       || '',
    ].join(' ').toLowerCase().includes(search)
  })
})

// ── Helpers ────────────────────────────────────────────────────────────────
const initials = (name) => {
  const parts = String(name || '?').trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = ['av-rose', 'av-violet', 'av-teal', 'av-amber', 'av-sky']
const avatarColor = (name) =>
  AVATAR_COLORS[(name || '').charCodeAt(0) % AVATAR_COLORS.length]

const setMessage = (text) => {
  message.value = text
  if (messageTimer) clearTimeout(messageTimer)
  if (!text.startsWith('Error')) {
    messageTimer = setTimeout(() => { message.value = '' }, 4000)
  }
}

const clearFilters = () => {
  searchQuery.value = ''
  activeStatusFilter.value = 'all'
}

// ── Data loading ───────────────────────────────────────────────────────────
const loadApplications = async () => {
  isLoading.value = true
  message.value = ''
  if (messageTimer) clearTimeout(messageTimer)

  try {
    const resp = await api('/admin/tutor-verifications')
    const raw = Array.isArray(resp?.verifications)
      ? resp.verifications
      : Array.isArray(resp?.applications)
        ? resp.applications
        : []

    applications.value = raw.map(item => {
      const normalized = normalizeAdminVerification(item)
      return { ...normalized, status: String(normalized.status || 'PENDING').toUpperCase() }
    })
  } catch (err) {
    setMessage(`Error: ${err?.message || 'Failed to load verifications.'}`)
  } finally {
    isLoading.value = false
  }
}

// ── Modal open / close ─────────────────────────────────────────────────────
const openDetails = (application) => {
  selectedApplication.value = application
  reviewNote.value = application?.reviewNotes || ''
  nextTick(() => closeButtonRef.value?.focus())
}

const closeDetails = () => {
  if (actionState.value) return
  selectedApplication.value = null
  reviewNote.value = ''
}

// ── Keyboard & scroll lock ─────────────────────────────────────────────────
const handleKeydown = (e) => {
  if (e.key === 'Escape' && selectedApplication.value) closeDetails()
}

watch(() => Boolean(selectedApplication.value), (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

// ── Actions ────────────────────────────────────────────────────────────────
const finishAction = async (successMessage) => {
  setMessage(successMessage)
  selectedApplication.value = null
  reviewNote.value = ''
  await loadApplications()
}

const submitDecision = async (decision) => {
  if (!selectedApplication.value || actionState.value) return

  actionState.value = decision === 'approved' ? 'approve' : 'reject'
  message.value = ''

  try {
    await api(
      `/admin/tutor-verifications/${selectedApplication.value.id}/decision`,
      'POST',
      { decision, reviewNotes: reviewNote.value.trim() }
    )
    await finishAction(decision === 'approved' ? '✓ Verification approved.' : 'Verification rejected.')
  } catch (err) {
    setMessage(`Error: ${err?.message || 'Action failed.'}`)
  } finally {
    actionState.value = ''
  }
}

const requestReupload = async () => {
  if (!selectedApplication.value || actionState.value) return

  actionState.value = 'reupload'
  message.value = ''

  try {
    await api(
      `/admin/tutor-verifications/${selectedApplication.value.id}/request-reupload`,
      'POST',
      { note: reviewNote.value.trim() }
    )
    await finishAction('Re-upload request sent to tutor.')
  } catch (err) {
    setMessage(`Error: ${err?.message || 'Request failed.'}`)
  } finally {
    actionState.value = ''
  }
}

const openProof = (application) => {
  const url = String(application?.proofUrl || '').trim()
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  loadApplications()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
  if (messageTimer) clearTimeout(messageTimer)
})
</script>

<style scoped>
/* ── Page shell ── */
.admin-verif-page {
  max-width: 1024px;
  margin: 0 auto;
  padding: 20px;
}

.admin-verif-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Glass Card 🪟 */
.card {
  border: 2px solid #021A54;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(2, 26, 84, 0.05);
  padding: 20px;
}

/* ── Chips ── */
.chip {
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 800;
  padding: 8px 16px;
  border-radius: 8px;
  border: 2px solid #021A54;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 100ms, box-shadow 150ms;
}
.chip:active { transform: scale(0.96); }

.chip-strong {
  background: #FF85BB;
  color: #021A54;
}
.chip-soft {
  background: #F5F5F5;
  color: #021A54;
}
.chip-danger {
  background: #FFCEE3;
  color: #021A54;
}

/* ── Header ── */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.page-kicker {
  margin: 0 0 4px;
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 800;
  color: #FF85BB;
}

.page-header h2 {
  font-size: clamp(1.6rem, 2.5vw, 2.2rem);
  margin: 0 0 4px;
  color: #021A54;
}

.page-subtext {
  font-size: 0.95rem;
  color: rgba(2, 26, 84, 0.7);
  font-weight: 600;
  margin: 0;
}

/* ── Summary bar ── */
.summary-bar {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.summary-stat {
  flex: 1 1 120px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
}

.summary-stat--pending  { border-left: 6px solid #F5F5F5; }
.summary-stat--approved { border-left: 6px solid #FF85BB; }
.summary-stat--rejected { border-left: 6px solid #FFCEE3; }

.summary-value {
  font-size: 1.6rem;
  font-weight: 800;
  color: #021A54;
  line-height: 1;
}

.summary-label {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #FF85BB;
}

/* ── Feedback messages ── */
.feedback-msg {
  font-size: 0.95rem;
  font-weight: 800;
}
.feedback-msg.success { background: #FF85BB; color: #021A54; }
.feedback-msg.error { background: #FFCEE3; color: #021A54; }

/* ── Toolbar ── */
.toolbar-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  flex-wrap: wrap;
}

.search-field {
  position: relative;
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  border: 2px solid #021A54;
  border-radius: 999px;
  background: #F5F5F5;
  padding: 0 14px;
}

.search-icon { font-size: 1rem; margin-right: 8px; }

.search-input-field {
  border: none;
  background: transparent;
  padding: 10px 0;
  width: 100%;
  color: #021A54;
  font-weight: 600;
  outline: none;
}

.clear-btn {
  background: transparent;
  border: none;
  color: #021A54;
  font-size: 1.2rem;
  font-weight: 800;
  cursor: pointer;
}

/* ── Filter chips ── */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 20px;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
}

.filter-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.4rem;
  height: 1.4rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  background: rgba(255,255,255,0.6);
  color: #021A54;
  border: 1px solid #021A54;
  font-size: 0.7rem;
  font-weight: 800;
}

/* ── Result count ── */
.result-count {
  font-size: 0.9rem;
  font-weight: 800;
  color: #021A54;
  margin: 0;
}

/* ── Empty state ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 32px;
}
.empty-icon { font-size: 2.5rem; margin: 0 0 10px; }
.empty-title { font-weight: 800; font-size: 1.1rem; color: #021A54; margin: 0 0 6px; }
.empty-sub { font-size: 0.9rem; color: rgba(2, 26, 84, 0.7); margin: 0 0 16px; font-weight: 600; }

/* ── Application list ── */
.verif-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.verification-item {
  cursor: pointer;
  transition: transform 150ms ease, box-shadow 150ms ease;
  padding: 16px 20px;
}

.verification-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(2, 26, 84, 0.1);
}

.verification-head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.verif-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 800;
  border: 2px solid #021A54;
}

.av-rose   { background: #FFCEE3; color: #021A54; }
.av-violet { background: #FF85BB; color: #021A54; }
.av-teal   { background: #F5F5F5; color: #021A54; }
.av-amber  { background: #FFCEE3; color: #021A54; }
.av-sky    { background: #FF85BB; color: #021A54; }

.verif-meta {
  flex: 1;
  min-width: 0;
}

.verif-name {
  display: block;
  font-size: 1.05rem;
  font-weight: 800;
  color: #021A54;
}

.verif-course {
  margin: 4px 0 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(2, 26, 84, 0.7);
}

.meta-dot { margin: 0 6px; opacity: 0.5; }

.verification-hint {
  margin: 8px 0 0 58px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #FF85BB;
}

/* ── Status badges ── */
.status-badge {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  border: 2px solid #021A54;
  white-space: nowrap;
}

.status-badge.pending { background: #F5F5F5; color: #021A54; }
.status-badge.reupload-requested { background: #F5F5F5; color: #021A54; }
.status-badge.approved { background: #FF85BB; color: #021A54; }
.status-badge.rejected { background: #FFCEE3; color: #021A54; }

/* ── Skeleton loader ── */
.skeleton-card { pointer-events: none; }
.skeleton-head { display: flex; align-items: center; gap: 12px; padding: 4px 0; }
.skeleton-badge {
  width: 44px; height: 44px; border-radius: 50%;
  background: linear-gradient(90deg, rgba(255,255,255,0.4) 25%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.4) 75%);
  background-size: 200% 100%; animation: sk-shimmer 1.4s infinite;
}
.sk-lines { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.skeleton-line {
  height: 14px; border-radius: 6px;
  background: linear-gradient(90deg, rgba(255,255,255,0.4) 25%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.4) 75%);
  background-size: 200% 100%; animation: sk-shimmer 1.4s infinite;
}
.skeleton-line.med   { width: 55%; }
.skeleton-line.short { width: 35%; }
@keyframes sk-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ── Modal backdrop ── */
.detail-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 26, 84, 0.3);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 1200;
}

/* ── Modal card ── */
.detail-modal {
  width: min(580px, 100%);
  max-height: calc(100dvh - 36px);
  overflow: hidden;
  padding: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 24px 24px 12px;
}

.detail-kicker {
  margin: 0 0 4px;
  font-size: 0.8rem;
  text-transform: uppercase;
  font-weight: 800;
  color: #FF85BB;
}

.detail-header h3 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 800;
  color: #021A54;
}

.close-btn {
  background: #F5F5F5 !important;
  border: 2px solid #021A54 !important;
  border-radius: 8px;
  font-size: 1.4rem;
  font-weight: 800;
  cursor: pointer;
  color: #021A54;
  padding: 4px 10px;
}

.detail-status-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 0 24px 16px;
}

.detail-date {
  font-size: 0.9rem;
  font-weight: 700;
  color: rgba(2, 26, 84, 0.7);
}

/* ── Scrollable modal body ── */
.detail-scroll {
  overflow-y: auto;
  padding: 0 24px 24px;
}

.detail-body {
  display: grid;
  gap: 12px;
  margin-bottom: 20px;
}

.detail-section {
  padding: 16px;
  border-radius: 12px;
}

.detail-section--proof {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
}

.detail-label {
  margin: 0 0 6px;
  font-size: 0.8rem;
  text-transform: uppercase;
  font-weight: 800;
  color: #FF85BB;
}

.detail-value {
  margin: 0;
  color: #021A54;
  font-size: 1rem;
  font-weight: 600;
}

.detail-value--muted {
  color: rgba(2, 26, 84, 0.7);
  font-style: italic;
}

/* ── Review panel ── */
.detail-review-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.review-panel-header {
  font-size: 1rem;
  font-weight: 800;
  color: #021A54;
}

.review-note-input {
  width: 100%;
  resize: vertical;
  min-height: 100px;
  border-radius: 12px;
  border: 2px solid #021A54;
  background: #F5F5F5;
  padding: 12px;
  color: #021A54;
  font-weight: 600;
  outline: none;
  box-sizing: border-box;
}

.review-note-input:focus {
  background: #FFFFFF;
}

.review-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
}

.review-actions .chip {
  flex: 1 1 auto;
}

.review-readonly-notice {
  font-weight: 800;
  color: #021A54;
  text-align: center;
}

/* ── Transitions ── */
.fade-enter-active, .fade-leave-active { transition: opacity 180ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.fade-slide-enter-active, .fade-slide-leave-active { transition: opacity 200ms ease, transform 200ms ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-10px); }

/* ── Responsive ── */
@media (max-width: 640px) {
  .page-header { flex-direction: column; }
  .summary-stat { flex: 1 1 45%; }
  
  .review-actions { flex-direction: column; }
  .review-actions .chip { width: 100%; justify-content: center; }
}
</style>