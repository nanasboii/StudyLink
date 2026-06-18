<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active admin-verif-legacy-page">

        <!-- ── Header ── -->
        <div class="page-header">
          <div>
            <p class="page-kicker">Admin · Tutor Quality</p>
            <h2>Tutor Verifications</h2>
            <p class="page-subtext">Review and action credential submissions from tutors.</p>
          </div>
          <button
            class="chip"
            type="button"
            :disabled="isLoading"
            @click="loadApplications"
            aria-label="Refresh verification list"
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

        <!-- ── Feedback message ── -->
        <transition name="fade-slide">
          <p
            v-if="message"
            class="feedback-msg"
            :class="message.startsWith('Error') ? 'error' : 'success'"
            role="alert"
            aria-live="polite"
          >{{ message }}</p>
        </transition>

        <!-- ── Toolbar ── -->
        <div class="toolbar-row">
          <div class="search-field">
            <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
                stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
            </svg>
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Search by name or course…"
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
            v-for="f in statusFilters"
            :key="f.value"
            class="chip filter-chip"
            :class="{ active: activeFilter === f.value }"
            type="button"
            :aria-pressed="activeFilter === f.value"
            @click="activeFilter = f.value"
          >
            {{ f.label }}
            <span class="filter-count">{{ filterCounts[f.value] ?? applications.length }}</span>
          </button>
        </div>

        <!-- ── Result count ── -->
        <p
          v-if="searchQuery || activeFilter !== 'all'"
          class="result-count"
          aria-live="polite"
        >Showing {{ filtered.length }} of {{ applications.length }}</p>

        <!-- ── Skeleton ── -->
        <div v-if="isLoading" class="verif-list">
          <div v-for="n in 4" :key="n" class="item verification-item skeleton-card" aria-hidden="true">
            <div class="sk-head">
              <div class="sk-avatar"></div>
              <div class="sk-lines">
                <div class="sk-line med"></div>
                <div class="sk-line short"></div>
              </div>
              <div class="sk-badge"></div>
            </div>
          </div>
        </div>

        <!-- ── Empty state ── -->
        <div v-else-if="filtered.length === 0" class="empty-state" role="status">
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"/>
            <path d="M24 16v8M24 28v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
          </svg>
          <p class="empty-title">
            {{ searchQuery
                ? `No results for "${searchQuery}"`
                : activeFilter !== 'all'
                  ? `No ${activeFilterLabel.toLowerCase()} submissions`
                  : 'No verification submissions yet' }}
          </p>
          <p class="empty-sub">
            {{ (searchQuery || activeFilter !== 'all')
                ? 'Try adjusting your search or filter.'
                : 'Tutor applications will appear here once submitted.' }}
          </p>
          <button
            v-if="searchQuery || activeFilter !== 'all'"
            class="chip chip-soft"
            type="button"
            @click="clearFilters"
          >Clear filters</button>
        </div>

        <!-- ── Application list ── -->
        <div v-else class="verif-list">
          <article
            v-for="app in filtered"
            :key="app.id"
            class="item verification-item"
            role="button"
            tabindex="0"
            :aria-label="`Review ${app.userName} — ${formatStatus(app.status)}`"
            @click="openModal(app)"
            @keydown.enter.prevent="openModal(app)"
            @keydown.space.prevent="openModal(app)"
          >
            <div class="verif-row">
              <!-- Avatar initials -->
              <div class="verif-avatar" :class="avatarColor(app.userName)" aria-hidden="true">
                {{ initials(app.userName) }}
              </div>

              <div class="verif-meta">
                <strong class="verif-name">{{ app.userName }}</strong>
                <p class="meta verif-course">
                  {{ app.courseCode || 'Unspecified subject' }}
                  <span aria-hidden="true"> · </span>
                  {{ app.createdAt || 'Unknown date' }}
                </p>
              </div>

              <!-- BUG FIX 1: app.status.toLowerCase() crashes when status is null/undefined.
                   All badge class bindings now go through statusClass() helper. -->
              <span
                class="status-badge"
                :class="statusClass(app.status)"
                :aria-label="'Status: ' + formatStatus(app.status)"
              >{{ formatStatus(app.status) }}</span>
            </div>

            <p class="verif-hint">Tap to review proof and take action →</p>
          </article>
        </div>

      </div>
    </section>

    <!-- ── Detail modal ── -->
    <teleport to="body">
      <transition name="fade">
        <div
          v-if="selected"
          class="detail-backdrop"
          role="dialog"
          aria-modal="true"
          :aria-label="'Verification for ' + selected.userName"
          @click="closeModal"
        >
          <section class="detail-modal" @click.stop>

            <div class="detail-header">
              <div>
                <p class="detail-kicker">Verification detail</p>
                <h3>{{ selected.userName }}</h3>
              </div>
              <button
                class="close-btn"
                type="button"
                ref="closeBtnRef"
                aria-label="Close"
                @click="closeModal"
              >×</button>
            </div>

            <div class="detail-status-row">
              <span class="status-badge" :class="statusClass(selected.status)">
                {{ formatStatus(selected.status) }}
              </span>
              <span class="detail-date">Submitted {{ selected.createdAt || 'unknown date' }}</span>
            </div>

            <!-- Scrollable body -->
            <div class="detail-scroll">
              <div class="detail-body">

                <div class="detail-section">
                  <p class="detail-label">Course / subject</p>
                  <p class="detail-value">{{ selected.courseCode || 'Not specified' }}</p>
                </div>

                <!-- BUG FIX 2: original showed raw documentUrl as plain <p class="meta"> text
                     with zero context — confusing, exposes internal path. Now shown as a
                     labelled field with a proper "Open" button, same pattern as AdminReviewVerification. -->
                <div class="detail-section detail-section--proof">
                  <p class="detail-label">Proof document</p>
                  <p class="detail-value">
                    {{ selected.proofUrl
                        ? 'A proof file was submitted. Open it below.'
                        : 'No proof file was attached to this submission.' }}
                  </p>
                  <button
                    class="chip proof-btn"
                    type="button"
                    :disabled="!selected.proofUrl"
                    :class="{ 'chip-disabled': !selected.proofUrl }"
                    @click="openProof"
                    aria-label="Open submitted proof document in a new tab"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                        fill="none" stroke="currentColor" stroke-width="2"/>
                      <polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    View Proof
                  </button>
                </div>

                <div class="detail-section">
                  <p class="detail-label">Previous review notes</p>
                  <p class="detail-value detail-value--muted">
                    {{ selected.reviewNotes || 'No review notes on record.' }}
                  </p>
                </div>

              </div>

              <!-- ── Action panel — PENDING only ── -->
              <!-- BUG FIX 3: original showed Approve / Reject / Re-upload inline on the list
                   card with no note field and no confirmation — easy accidental clicks.
                   Moved into modal with review note textarea. -->
              <div v-if="canAct" class="review-panel">
                <div class="review-panel-header">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                      fill="none" stroke="currentColor" stroke-width="2"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                      fill="none" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  Leave a decision note (optional)
                </div>
                <textarea
                  v-model="reviewNote"
                  class="review-note-input"
                  rows="3"
                  placeholder="Explain your decision or leave a note for the tutor…"
                  aria-label="Admin review note"
                  :disabled="Boolean(actionState)"
                ></textarea>

                <div class="review-actions">
                  <button
                    class="chip secondary-action"
                    type="button"
                    :disabled="Boolean(actionState)"
                    @click="act('reupload')"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <polyline points="1 4 1 10 7 10" fill="none" stroke="currentColor" stroke-width="2"/>
                      <path d="M3.51 15a9 9 0 1 0 .49-4.5" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    {{ actionState === 'reupload' ? 'Sending…' : 'Request Re-upload' }}
                  </button>
                  <button
                    class="chip danger-action"
                    type="button"
                    :disabled="Boolean(actionState)"
                    @click="act('rejected')"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                      <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2"/>
                      <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    {{ actionState === 'rejected' ? 'Rejecting…' : 'Reject' }}
                  </button>
                  <button
                    class="chip approve-action"
                    type="button"
                    :disabled="Boolean(actionState)"
                    @click="act('approved')"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    {{ actionState === 'approved' ? 'Approving…' : 'Approve' }}
                  </button>
                </div>
              </div>

              <!-- Read-only notice for already-actioned submissions -->
              <div v-else class="review-readonly">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                  <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>
                  <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2"/>
                </svg>
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
import { api, requireRoleSession } from '@/api.js'
import { normalizeAdminVerification } from '@/utils/records.js'

// ── State ──────────────────────────────────────────────────────────────────
const applications  = ref([])
const isLoading     = ref(true)
const message       = ref('')
const searchQuery   = ref('')
const activeFilter  = ref('all')
const selected      = ref(null)
const reviewNote    = ref('')
const actionState   = ref('')
const closeBtnRef   = ref(null)

let messageTimer = null

// ── Derived ────────────────────────────────────────────────────────────────
// BUG FIX 4: canAct — original only enabled actions for 'PENDING' inline.
// Consistent with AdminReviewVerification: allow REUPLOAD_REQUESTED too.
const canAct = computed(() =>
  ['PENDING', 'REUPLOAD_REQUESTED'].includes(
    String(selected.value?.status || '').toUpperCase()
  )
)

// BUG FIX 1 helper: safe status → CSS class, never calls .toLowerCase() on null
const statusClass = (status) => {
  const s = String(status || 'PENDING').toUpperCase()
  if (s === 'REUPLOAD_REQUESTED') return 'reupload-requested'
  return s.toLowerCase()
}

const formatStatus = (status) => {
  const s = String(status || 'PENDING').toUpperCase()
  if (s === 'REUPLOAD_REQUESTED') return 'Re-upload Requested'
  if (s === 'PENDING')   return 'Pending'
  if (s === 'APPROVED')  return 'Approved'
  if (s === 'REJECTED')  return 'Rejected'
  return s
}

const statusFilters = [
  { value: 'all',                label: 'All' },
  { value: 'PENDING',            label: 'Pending' },
  { value: 'REUPLOAD_REQUESTED', label: 'Re-upload' },
  { value: 'APPROVED',           label: 'Approved' },
  { value: 'REJECTED',           label: 'Rejected' },
]

const activeFilterLabel = computed(() =>
  statusFilters.find(f => f.value === activeFilter.value)?.label || activeFilter.value
)

const filterCounts = computed(() => {
  const counts = { all: applications.value.length, PENDING: 0, REUPLOAD_REQUESTED: 0, APPROVED: 0, REJECTED: 0 }
  applications.value.forEach(app => {
    const k = String(app.status || 'PENDING').toUpperCase()
    if (k in counts) counts[k]++
  })
  return counts
})

const filtered = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  return applications.value.filter(app => {
    const s = String(app.status || 'PENDING').toUpperCase()
    if (activeFilter.value !== 'all' && s !== activeFilter.value) return false
    if (!q) return true
    // BUG FIX 5: each field guarded — no .toLowerCase() on null
    return [app.userName || '', app.courseCode || '', app.reviewNotes || '']
      .join(' ').toLowerCase().includes(q)
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
const avatarColor = (name) => AVATAR_COLORS[(name || '').charCodeAt(0) % AVATAR_COLORS.length]

const setMessage = (text) => {
  message.value = text
  if (messageTimer) clearTimeout(messageTimer)
  // BUG FIX 6: original never dismissed messages — linger forever.
  if (!text.startsWith('Error')) {
    messageTimer = setTimeout(() => { message.value = '' }, 4000)
  }
}

const clearFilters = () => {
  searchQuery.value = ''
  activeFilter.value = 'all'
}

// ── Data ───────────────────────────────────────────────────────────────────
const loadApplications = async () => {
  isLoading.value = true
  message.value = ''
  if (messageTimer) clearTimeout(messageTimer)

  try {
    const resp = await api('/admin/tutor-verifications')
    // BUG FIX 7: resp could be null — guard before destructuring
    const raw = Array.isArray(resp?.verifications)
      ? resp.verifications
      : Array.isArray(resp?.applications)
        ? resp.applications
        : []
    applications.value = raw.map(item => {
      const n = normalizeAdminVerification(item)
      return { ...n, status: String(n.status || 'PENDING').toUpperCase() }
    })
  } catch (err) {
    setMessage(`Error: ${err?.message || 'Failed to load verifications.'}`)
  } finally {
    isLoading.value = false
  }
}

// ── Modal ──────────────────────────────────────────────────────────────────
const openModal = (app) => {
  selected.value  = app
  reviewNote.value = app?.reviewNotes || ''
  nextTick(() => closeBtnRef.value?.focus())
}

const closeModal = () => {
  if (actionState.value) return   // BUG FIX 8: don't close mid-request
  selected.value  = null
  reviewNote.value = ''
}

const handleKeydown = (e) => {
  if (e.key === 'Escape' && selected.value) closeModal()
}

watch(() => Boolean(selected.value), open => {
  document.body.style.overflow = open ? 'hidden' : ''
})

// ── Actions ────────────────────────────────────────────────────────────────
const openProof = () => {
  const url = String(selected.value?.proofUrl || '').trim()
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

// BUG FIX 9: original had three separate functions (decide/requestReupload)
// with no reviewNotes passed. Unified into one `act()` that always sends
// the note, and reuses the same reload + message pattern.
const act = async (action) => {
  if (!selected.value || actionState.value) return
  actionState.value = action
  message.value = ''

  try {
    if (action === 'reupload') {
      await api(
        `/admin/tutor-verifications/${selected.value.id}/request-reupload`,
        'POST',
        { note: reviewNote.value.trim() }
      )
      setMessage('Re-upload request sent to tutor.')
    } else {
      await api(
        `/admin/tutor-verifications/${selected.value.id}/decision`,
        'POST',
        { decision: action, reviewNotes: reviewNote.value.trim() }
      )
      setMessage(action === 'approved' ? '✓ Verification approved.' : 'Verification rejected.')
    }
    selected.value  = null
    reviewNote.value = ''
    await loadApplications()
  } catch (err) {
    setMessage(`Error: ${err?.message || 'Action failed.'}`)
  } finally {
    actionState.value = ''
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(() => {
  // BUG FIX 10: original had no requireRoleSession — any authenticated user
  // who navigated directly to this URL could reach the admin page.
  requireRoleSession('admin')
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
/* ── Page ── */
.admin-verif-legacy-page { padding-bottom: 3rem; }

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

.page-header h2 { font-size: clamp(1.4rem, 2.5vw, 2rem); margin: 0 0 0.25rem; }
.page-subtext    { font-size: 0.85rem; color: var(--ink-soft); margin: 0; }

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

.summary-stat--pending  { border-left: 3px solid var(--warning,  #9a6a00); }
.summary-stat--approved { border-left: 3px solid var(--success,  #228652); }
.summary-stat--rejected { border-left: 3px solid var(--danger,   #bf2f45); }

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

/* ── Feedback ── */
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

/* ── Filter bar ── */
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
}

/* ── Result count ── */
.result-count {
  padding: 0 2rem 0.5rem;
  font-size: 0.8rem;
  color: var(--ink-soft);
  margin: 0;
}

/* ── Skeleton ── */
.skeleton-card { pointer-events: none; }

.sk-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sk-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  background: linear-gradient(90deg,rgba(74,20,41,.06) 25%,rgba(74,20,41,.12) 50%,rgba(74,20,41,.06) 75%);
  background-size: 400% 100%;
  animation: sk-shimmer 1.4s ease infinite;
}

.sk-lines { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.sk-line, .sk-badge {
  border-radius: 6px;
  background: linear-gradient(90deg,rgba(74,20,41,.06) 25%,rgba(74,20,41,.12) 50%,rgba(74,20,41,.06) 75%);
  background-size: 400% 100%;
  animation: sk-shimmer 1.4s ease infinite;
}

.sk-line.med   { height: 13px; width: 55%; }
.sk-line.short { height: 11px; width: 35%; }
.sk-badge      { height: 20px; width: 64px; border-radius: 999px; flex-shrink: 0; }

@keyframes sk-shimmer {
  0%   { background-position: 100% 50%; }
  100% { background-position:   0% 50%; }
}

@media (prefers-reduced-motion: reduce) {
  .sk-avatar, .sk-line, .sk-badge { animation: none; }
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

.empty-state svg { width: 48px; height: 48px; color: var(--ink-soft); opacity: 0.4; }
.empty-title { margin: 0; font-weight: 600; color: var(--ink); }
.empty-sub   { margin: 0; font-size: 0.875rem; max-width: 280px; }

/* ── List ── */
.verif-list {
  display: flex;
  flex-direction: column;
  padding: 0 2rem;
}

.verification-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
  transition: background 120ms ease;
}

.verification-item:hover        { background: rgba(177,31,75,0.025); }
.verification-item:focus-visible { outline: 2px solid var(--primary,#b11f4b); outline-offset: -2px; }

.verif-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Avatar */
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

.verif-meta    { flex: 1; min-width: 0; }
.verif-name    { display: block; font-size: 0.95rem; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.verif-course  { margin: 2px 0 0; font-size: 0.82rem; color: var(--ink-soft); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.verif-hint    { margin: 0 0 0 52px; font-size: 0.78rem; color: var(--ink-soft); opacity: 0.65; }

/* Status badge */
.status-badge {
  padding: 0.22rem 0.65rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
  flex-shrink: 0;
  background: rgba(177,31,75,0.08);
  color: var(--primary, #b11f4b);
  border: 1px solid rgba(177,31,75,0.14);
}

.status-badge.pending           { background: var(--warning-bg,#fff3cd);             color: var(--warning-ink,#856404);   border-color: var(--warning-border,rgba(154,106,0,.2)); }
.status-badge.reupload-requested{ background: rgba(177,31,75,0.1);                   color: var(--primary,#b11f4b);       border-color: rgba(177,31,75,0.2); }
.status-badge.approved          { background: var(--success-bg,rgba(34,134,82,.1));  color: var(--success-ink,#1a6b40);  border-color: var(--success-border,rgba(34,134,82,.24)); }
.status-badge.rejected          { background: var(--danger-bg,rgba(191,47,69,.08));  color: var(--danger-ink,#8f2335);   border-color: var(--danger-border,rgba(191,47,69,.28)); }

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
  width: min(560px, 100%);
  border-radius: 24px;
  border: 1px solid rgba(177,31,75,0.14);
  background: linear-gradient(180deg,#fff 0%,#fff8fb 100%);
  box-shadow: 0 24px 60px rgba(74,20,41,0.24);
  display: flex;
  flex-direction: column;
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

.detail-header h3 { margin: 0; font-size: 1.15rem; color: var(--ink); }

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

.close-btn:hover        { background: #fff0f5; }
.close-btn:focus-visible{ outline: 2px solid var(--primary,#b11f4b); outline-offset: 2px; }

.detail-status-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 0 22px 14px;
  flex-shrink: 0;
}

.detail-date { font-size: 0.85rem; color: var(--ink-soft); }

/* Scrollable body */
.detail-scroll {
  overflow-y: auto;
  padding: 0 22px 22px;
  flex: 1;
  -webkit-overflow-scrolling: touch;
}

.detail-body { display: grid; gap: 10px; margin-bottom: 14px; }

.detail-section {
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(177,31,75,0.1);
  background: rgba(255,255,255,0.95);
}

.detail-section--proof { display: flex; flex-direction: column; gap: 10px; }

.detail-label {
  margin: 0 0 5px;
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--ink-kicker);
}

.detail-value       { margin: 0; color: var(--ink);      font-size: 0.9rem; line-height: 1.55; }
.detail-value--muted{ color: var(--ink-soft); font-style: italic; }

/* Proof button */
.proof-btn {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
}

.proof-btn svg   { width: 13px; height: 13px; }
.chip-disabled   { opacity: 0.45; cursor: not-allowed; }

/* Review panel */
.review-panel {
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

.review-panel-header svg { width: 15px; height: 15px; flex-shrink: 0; stroke: var(--ink-kicker); }

.review-note-input {
  width: 100%;
  resize: vertical;
  min-height: 80px;
  border-radius: 12px;
  border: 1px solid rgba(177,31,75,0.16);
  background: #fff;
  padding: 10px 12px;
  color: var(--ink);
  font: inherit;
  font-size: 0.9rem;
  outline: none;
  box-sizing: border-box;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.review-note-input:focus {
  border-color: var(--primary,#b11f4b);
  box-shadow: 0 0 0 3px rgba(177,31,75,0.08);
}

.review-note-input:disabled { opacity: 0.6; }

.review-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

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
.approve-action svg { width: 13px; height: 13px; flex-shrink: 0; stroke-width: 2.5; }

.secondary-action { background: linear-gradient(180deg,#fff,#f8f3f0); color: #6b4d57; border: 1px solid rgba(177,31,75,0.14); }
.danger-action    { background: linear-gradient(180deg,#ffe8ea,#ffd6db); color: #93243b; }
.approve-action   { background: linear-gradient(180deg,#e7f6ed,#d3f1dd); color: #1c6b3b; }

.secondary-action:disabled,
.danger-action:disabled,
.approve-action:disabled { opacity: 0.6; cursor: not-allowed; }

/* Read-only notice */
.review-readonly {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(0,0,0,0.03);
  border: 1px solid var(--hairline,#e0e0e0);
  font-size: 0.85rem;
  color: var(--ink-soft);
}

.review-readonly svg { width: 16px; height: 16px; flex-shrink: 0; stroke: var(--ink-soft); }

/* ── Transitions ── */
.fade-enter-active, .fade-leave-active { transition: opacity 180ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.fade-slide-enter-active, .fade-slide-leave-active { transition: opacity 200ms ease, transform 200ms ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-6px); }

/* ── Responsive ── */
@media (max-width: 640px) {
  .page-header, .summary-bar, .toolbar-row, .filter-bar, .result-count, .verif-list {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .page-header { flex-direction: column; align-items: flex-start; }
  .detail-modal { border-radius: 18px; }

  .detail-header, .detail-status-row, .detail-scroll {
    padding-left: 16px;
    padding-right: 16px;
  }

  .review-actions { flex-direction: column; }
  .secondary-action, .danger-action, .approve-action { width: 100%; justify-content: center; }
}

@media (prefers-reduced-motion: reduce) {
  .verification-item, .close-btn, .search-input-field, .review-note-input { transition: none; }
}
</style>
