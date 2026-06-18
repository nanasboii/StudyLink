<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active admin-verif-page">

        <!-- ── Header ── -->
        <div class="page-header">
          <div>
            <p class="page-kicker">Admin · Verification</p>
            <h2>Tutor Verifications</h2>
            <p class="page-subtext">Review and action pending tutor credential submissions.</p>
          </div>
          <button
            class="chip"
            type="button"
            :disabled="isLoading"
            @click="loadApplications"
            aria-label="Refresh list"
          >
            {{ isLoading ? 'Loading…' : 'Refresh' }}
          </button>
        </div>

        <!-- ── Summary bar ── -->
        <div v-if="!isLoading && applications.length" class="summary-bar">
          <div class="summary-stat">
            <span class="summary-value">{{ applications.length }}</span>
            <span class="summary-label">Total</span>
          </div>
          <div class="summary-stat summary-stat--pending">
            <span class="summary-value">{{ filterCounts.PENDING }}</span>
            <span class="summary-label">Pending</span>
          </div>
          <div class="summary-stat summary-stat--approved">
            <span class="summary-value">{{ filterCounts.APPROVED }}</span>
            <span class="summary-label">Approved</span>
          </div>
          <div class="summary-stat summary-stat--rejected">
            <span class="summary-value">{{ filterCounts.REJECTED }}</span>
            <span class="summary-label">Rejected</span>
          </div>
        </div>

        <!-- ── Feedback message (auto-dismiss) ── -->
        <transition name="fade-slide">
          <p
            v-if="message"
            class="feedback-msg"
            :class="message.startsWith('Error') ? 'error' : 'success'"
            role="alert"
            aria-live="polite"
          >
            {{ message }}
          </p>
        </transition>

        <!-- ── Toolbar: search + filter ── -->
        <div class="toolbar-row">
          <div class="search-field">
            <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
            </svg>
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

        <!-- ── Status filter chips ── -->
        <div class="filter-bar" role="group" aria-label="Filter by status">
          <button
            v-for="filter in statusFilters"
            :key="filter.value"
            class="chip filter-chip"
            :class="{ active: activeStatusFilter === filter.value }"
            type="button"
            @click="activeStatusFilter = filter.value"
            :aria-pressed="activeStatusFilter === filter.value"
          >
            {{ filter.label }}
            <span class="filter-count">{{ filterCounts[filter.value] ?? filterCounts.all }}</span>
          </button>
        </div>

        <!-- ── Result count ── -->
        <p
          v-if="searchQuery || activeStatusFilter !== 'all'"
          class="result-count"
          aria-live="polite"
        >
          Showing {{ filteredApplications.length }} of {{ applications.length }}
        </p>

        <!-- ── Skeleton loading ── -->
        <div v-if="isLoading" class="verif-list">
          <div v-for="n in 4" :key="n" class="item verification-item skeleton-card" aria-hidden="true">
            <div class="skeleton-head">
              <div class="skeleton-badge"></div>
              <div class="sk-lines">
                <div class="skeleton-line med"></div>
                <div class="skeleton-line short"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Empty state ── -->
        <div
          v-else-if="filteredApplications.length === 0"
          class="empty-state"
          role="status"
        >
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"/>
            <path d="M16 24h16M24 16v16" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
          </svg>
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
          >Clear filters</button>
        </div>

        <!-- ── Application list ── -->
        <div v-else class="verif-list">
          <article
            v-for="app in filteredApplications"
            :key="app.id"
            class="item verification-item"
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

    <!-- ── Detail modal ── -->
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
          <section class="detail-modal" @click.stop>

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

            <!-- ── Scrollable body ── -->
            <div class="detail-scroll">
              <div class="detail-body">
                <div class="detail-section">
                  <p class="detail-label">Course / subject</p>
                  <p class="detail-value">{{ selectedApplication.courseCode || 'Not specified' }}</p>
                </div>

                <div class="detail-section">
                  <p class="detail-label">Previous review notes</p>
                  <p class="detail-value detail-value--muted">
                    {{ selectedApplication.reviewNotes || 'No review notes on record.' }}
                  </p>
                </div>

                <div class="detail-section detail-section--proof">
                  <p class="detail-label">Proof document</p>
                  <p class="detail-value">
                    {{ selectedApplication.proofUrl
                      ? 'A proof file was submitted. Click below to open it.'
                      : 'No proof file was attached to this submission.' }}
                  </p>
                  <button
                    class="chip proof-btn"
                    type="button"
                    :disabled="!selectedApplication.proofUrl"
                    :class="{ 'chip-disabled': !selectedApplication.proofUrl }"
                    @click="openProof(selectedApplication)"
                    aria-label="Open submitted proof document in a new tab"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke="currentColor" stroke-width="2"/>
                      <polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    View Proof
                  </button>
                </div>
              </div>

              <!-- ── Review panel (only for PENDING) ── -->
              <div v-if="canReview" class="detail-review-panel">
                <div class="review-panel-header">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" fill="none" stroke="currentColor" stroke-width="2"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" fill="none" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  <span>Leave a decision note</span>
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
                    class="chip secondary-action"
                    type="button"
                    :disabled="Boolean(actionState)"
                    @click="requestReupload"
                    title="Ask the tutor to re-submit their proof file"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="1 4 1 10 7 10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.51 15a9 9 0 1 0 .49-4.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>
                    {{ actionState === 'reupload' ? 'Sending…' : 'Request Re-upload' }}
                  </button>
                  <button
                    class="chip danger-action"
                    type="button"
                    :disabled="Boolean(actionState)"
                    @click="submitDecision('rejected')"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/><line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/></svg>
                    {{ actionState === 'reject' ? 'Rejecting…' : 'Reject' }}
                  </button>
                  <button
                    class="chip approve-action"
                    type="button"
                    :disabled="Boolean(actionState)"
                    @click="submitDecision('approved')"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2"/></svg>
                    {{ actionState === 'approve' ? 'Approving…' : 'Approve' }}
                  </button>
                </div>
              </div>

              <!-- ── Read-only notice for non-pending ── -->
              <div v-else class="review-readonly-notice">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2"/></svg>
                This submission has already been actioned and cannot be changed.
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
// BUG FIX 1: canReview must also handle REUPLOAD_REQUESTED so re-submitted
// proofs can be acted on again (original code only allowed PENDING).
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

// BUG FIX 2: CSS class for .status-badge was .reupload_requested (underscore)
// but the status value uses underscores AND the class names need to match exactly.
// Centralise into a helper so there's one source of truth.
const statusBadgeClass = (status) => {
  const s = String(status || 'PENDING').toUpperCase()
  if (s === 'REUPLOAD_REQUESTED') return 'reupload-requested' // dash not underscore
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
    // BUG FIX 3: original search joined reviewNotes but reviewNotes can be null/undefined,
    // causing .toLowerCase() to fail. Guard each field explicitly.
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

// BUG FIX 4: auto-dismiss success messages so they don't linger forever.
const setMessage = (text) => {
  message.value = text
  if (messageTimer) clearTimeout(messageTimer)
  // errors stay until the next action; successes auto-dismiss after 4 s
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
  // BUG FIX 5: clear message on reload so stale errors don't persist across refreshes.
  message.value = ''
  if (messageTimer) clearTimeout(messageTimer)

  try {
    const resp = await api('/admin/tutor-verifications')
    // BUG FIX 6: resp could be undefined/null — guard before accessing.
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
  // Focus the close button for keyboard users
  nextTick(() => closeButtonRef.value?.focus())
}

const closeDetails = () => {
  // BUG FIX 7: don't close while an action is in progress — prevents race
  // where the user dismisses before the reload finishes.
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

  // BUG FIX 8: actionState was set to 'approve' / 'reject' but the template
  // compared against 'approve' AND 'reject' inconsistently (reject button
  // checked actionState === 'reject' but state was set to decision directly).
  // Normalise: use lowercase decision string as state value.
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
  padding-bottom: 3rem;
}

/* ── Header ── */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 2rem 2rem 1.25rem;
  flex-wrap: wrap;
}

.page-kicker {
  margin: 0 0 0.25rem;
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--ink-kicker);
}

.page-header h2 {
  font-size: clamp(1.4rem, 2.5vw, 2rem);
  margin: 0 0 0.25rem;
}

.page-subtext {
  font-size: 0.85rem;
  color: var(--ink-soft);
  margin: 0;
}

/* ── Summary bar ── */
.summary-bar {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0 2rem 1.25rem;
}

.summary-stat {
  flex: 1 1 72px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0.65rem 1rem;
  border-radius: 14px;
  background: var(--glass-pink-surface-strong, rgba(255,255,255,0.85));
  border: 1px solid var(--glass-pink-border, rgba(177,31,75,0.12));
}

.summary-stat--pending  { border-left: 3px solid var(--warning, #9a6a00); }
.summary-stat--approved { border-left: 3px solid var(--success, #228652); }
.summary-stat--rejected { border-left: 3px solid var(--danger, #bf2f45); }

.summary-value {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--ink);
  line-height: 1;
}

.summary-label {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink-soft);
}

/* ── Feedback messages ── */
.feedback-msg {
  margin: 0 2rem 1rem;
  padding: 0.7rem 1rem;
  border-radius: 10px;
  font-size: 0.875rem;
}

.feedback-msg.success {
  background: rgba(34,134,82,0.09);
  border: 1px solid rgba(34,134,82,0.22);
  color: var(--success-ink, #1a6b40);
}

.feedback-msg.error {
  background: rgba(191,47,69,0.08);
  border: 1px solid rgba(191,47,69,0.2);
  color: var(--danger-ink, #8f2335);
}

/* ── Toolbar ── */
.toolbar-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 2rem 0.75rem;
  flex-wrap: wrap;
}

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
  width: 15px;
  height: 15px;
  color: var(--ink-soft);
  pointer-events: none;
}

.search-input-field {
  width: 100%;
  padding: 0.6rem 2.5rem 0.6rem 2.4rem;
  border: 1px solid var(--glass-pink-border, rgba(177,31,75,0.14));
  border-radius: 12px;
  background: rgba(255,255,255,0.9);
  font: inherit;
  font-size: 0.9rem;
  color: var(--ink);
  outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.search-input-field:focus {
  border-color: var(--primary, #b11f4b);
  box-shadow: 0 0 0 3px rgba(177,31,75,0.08);
}

.clear-btn {
  position: absolute;
  right: 0.65rem;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  border: none;
  background: rgba(177,31,75,0.1);
  color: var(--primary, #b11f4b);
  border-radius: 50%;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Filter chips ── */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 2rem 1rem;
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
  background: rgba(255,255,255,0.22);
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1;
}

/* ── Result count ── */
.result-count {
  padding: 0 2rem 0.5rem;
  font-size: 0.8rem;
  color: var(--ink-soft);
  margin: 0;
}

/* ── Skeleton loader ── */
.skeleton-card {
  pointer-events: none;
}

.skeleton-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
}

.skeleton-badge {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(90deg, rgba(74,20,41,0.06) 25%, rgba(74,20,41,0.12) 50%, rgba(74,20,41,0.06) 75%);
  background-size: 400% 100%;
  animation: sk-shimmer 1.4s ease infinite;
  flex-shrink: 0;
}

.sk-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton-line {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, rgba(74,20,41,0.06) 25%, rgba(74,20,41,0.12) 50%, rgba(74,20,41,0.06) 75%);
  background-size: 400% 100%;
  animation: sk-shimmer 1.4s ease infinite;
}

.skeleton-line.med   { width: 55%; }
.skeleton-line.short { width: 35%; }

@keyframes sk-shimmer {
  0%   { background-position: 100% 50%; }
  100% { background-position:   0% 50%; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-badge,
  .skeleton-line { animation: none; }
}

/* ── Empty state ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 3rem 2rem;
  text-align: center;
  color: var(--ink-soft);
}

.empty-state svg {
  width: 48px;
  height: 48px;
  color: var(--ink-soft);
  opacity: 0.4;
}

.empty-title {
  margin: 0;
  font-weight: 600;
  font-size: 1rem;
  color: var(--ink);
}

.empty-sub {
  margin: 0;
  font-size: 0.875rem;
  max-width: 280px;
}

/* ── Application list ── */
.verif-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0 2rem;
}

.verification-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  transition: background 120ms ease;
}

.verification-item:hover {
  background: rgba(177,31,75,0.03);
}

.verification-item:focus-visible {
  outline: 2px solid var(--primary, #b11f4b);
  outline-offset: -2px;
}

.verification-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* ── Avatar initials ── */
.verif-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}

.av-rose   { background: rgba(177,31,75,0.12);  color: #8f1a3e; }
.av-violet { background: rgba(107,33,168,0.1);  color: #6b21a8; }
.av-teal   { background: rgba(13,148,136,0.1);  color: #0d9488; }
.av-amber  { background: rgba(180,83,9,0.1);    color: #b45309; }
.av-sky    { background: rgba(2,132,199,0.1);   color: #0284c7; }

.verif-meta {
  flex: 1;
  min-width: 0;
}

.verif-name {
  display: block;
  font-size: 0.95rem;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.verif-course {
  margin: 2px 0 0;
  font-size: 0.82rem;
  color: var(--ink-soft);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-dot {
  margin: 0 3px;
  opacity: 0.5;
}

.verification-hint {
  margin: 0 0 0 52px; /* align under name, past avatar */
  font-size: 0.78rem;
  color: var(--ink-soft);
  opacity: 0.7;
}

/* ── Status badges ── */
.status-badge {
  padding: 0.22rem 0.65rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Default / fallback */
.status-badge {
  background: rgba(177,31,75,0.08);
  color: var(--primary, #b11f4b);
  border: 1px solid rgba(177,31,75,0.14);
}

.status-badge.pending {
  background: var(--warning-bg, #fff3cd);
  color: var(--warning-ink, #856404);
  border-color: var(--warning-border, rgba(154,106,0,0.2));
}

/* BUG FIX: use dash to match statusBadgeClass() output */
.status-badge.reupload-requested {
  background: rgba(177,31,75,0.1);
  color: var(--primary, #b11f4b);
  border-color: rgba(177,31,75,0.2);
}

.status-badge.approved {
  background: var(--success-bg, rgba(34,134,82,0.1));
  color: var(--success-ink, #1a6b40);
  border-color: var(--success-border, rgba(34,134,82,0.24));
}

.status-badge.rejected {
  background: var(--danger-bg, rgba(191,47,69,0.08));
  color: var(--danger-ink, #8f2335);
  border-color: var(--danger-border, rgba(191,47,69,0.28));
}

/* ── Modal backdrop ── */
.detail-backdrop {
  position: fixed;
  inset: 0;
  background: var(--overlay-dark, rgba(22,16,20,0.5));
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding: 18px;
  z-index: 1200;
}

/* ── Modal card ── */
.detail-modal {
  width: min(580px, 100%);
  border-radius: 24px;
  border: 1px solid rgba(177,31,75,0.14);
  background: linear-gradient(180deg, #fff 0%, #fff8fb 100%);
  box-shadow: 0 24px 60px rgba(74,20,41,0.24);
  display: flex;
  flex-direction: column;
  /* BUG FIX: cap modal height so it stays on screen on small viewports */
  max-height: calc(100dvh - 36px);
  overflow: hidden;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 22px 22px 12px;
  flex-shrink: 0;
}

.detail-kicker {
  margin: 0 0 4px;
  font-size: 0.68rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--ink-kicker);
}

.detail-header h3 {
  margin: 0;
  font-size: 1.15rem;
  color: var(--ink);
}

.close-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid rgba(177,31,75,0.16);
  background: #fff;
  color: #65172f;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 120ms ease;
}

.close-btn:hover { background: #fff0f5; }
.close-btn:focus-visible { outline: 2px solid var(--primary, #b11f4b); outline-offset: 2px; }

.detail-status-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 0 22px 14px;
  flex-shrink: 0;
}

.detail-date {
  font-size: 0.85rem;
  color: var(--ink-soft);
}

/* ── Scrollable modal body ── */
.detail-scroll {
  overflow-y: auto;
  padding: 0 22px 22px;
  flex: 1;
  -webkit-overflow-scrolling: touch;
}

.detail-body {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
}

.detail-section {
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(177,31,75,0.1);
  background: rgba(255,255,255,0.95);
}

.detail-section--proof {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-label {
  margin: 0 0 5px;
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--ink-kicker);
}

.detail-value {
  margin: 0;
  color: var(--ink);
  line-height: 1.55;
  font-size: 0.9rem;
}

.detail-value--muted {
  color: var(--ink-soft);
  font-style: italic;
}

/* Proof button */
.proof-btn {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
}

.proof-btn svg {
  width: 14px;
  height: 14px;
}

.chip-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ── Review panel ── */
.detail-review-panel {
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(177,31,75,0.03);
  border: 1px solid rgba(177,31,75,0.1);
}

.review-panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink-kicker);
}

.review-panel-header svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  stroke: var(--ink-kicker);
}

.review-note-input {
  width: 100%;
  resize: vertical;
  min-height: 100px;
  border-radius: 12px;
  border: 1px solid rgba(177,31,75,0.16);
  background: #fff;
  padding: 10px 12px;
  color: var(--ink);
  font: inherit;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
  box-sizing: border-box;
}

.review-note-input:focus {
  border-color: var(--primary, #b11f4b);
  box-shadow: 0 0 0 3px rgba(177,31,75,0.08);
}

.review-note-input:disabled { opacity: 0.6; }

.review-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* Action button variants */
.secondary-action,
.danger-action,
.approve-action {
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.84rem;
}

.secondary-action svg,
.danger-action svg,
.approve-action svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  stroke-width: 2.5;
}

.secondary-action {
  background: linear-gradient(180deg, #fff, #f8f3f0);
  color: #6b4d57;
  border: 1px solid rgba(177,31,75,0.14);
}

.danger-action {
  background: linear-gradient(180deg, #ffe8ea, #ffd6db);
  color: #93243b;
}

.approve-action {
  background: linear-gradient(180deg, #e7f6ed, #d3f1dd);
  color: #1c6b3b;
}

.secondary-action:disabled,
.danger-action:disabled,
.approve-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ── Read-only notice ── */
.review-readonly-notice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(0,0,0,0.03);
  border: 1px solid var(--hairline, #e0e0e0);
  font-size: 0.85rem;
  color: var(--ink-soft);
}

.review-readonly-notice svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  stroke: var(--ink-soft);
}

/* ── Transitions ── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 180ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .page-header,
  .summary-bar,
  .toolbar-row,
  .filter-bar,
  .result-count,
  .verif-list {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .detail-modal {
    border-radius: 18px;
  }

  .detail-header,
  .detail-status-row,
  .detail-scroll {
    padding-left: 16px;
    padding-right: 16px;
  }

  .review-actions {
    flex-direction: column;
  }

  .secondary-action,
  .danger-action,
  .approve-action {
    width: 100%;
    justify-content: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .verification-item,
  .close-btn,
  .search-input-field,
  .review-note-input { transition: none; }
}
</style>
