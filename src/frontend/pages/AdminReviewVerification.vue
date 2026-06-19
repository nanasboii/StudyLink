<template>
  <main class="view page active admin-verif-page">
    <div class="admin-verif-content">

      <!-- ── Header ── -->
      <section class="card page-header-card">
        <div>
          <p class="page-kicker">Admin · Verifications</p>
          <h2>Review Verifications</h2>
          <p class="page-subtext">Approve or reject tutor proof submissions.</p>
        </div>
        <button @click="loadApplications" class="chip chip-strong" type="button" :disabled="isLoading">
          {{ isLoading ? 'Loading…' : 'Refresh 🔄' }}
        </button>
      </section>

      <!-- ── Summary bar ── -->
      <section v-if="!isLoading && applications.length" class="card summary-bar">
        <div class="summary-stat">
          <span class="summary-value">{{ filterCounts.all }}</span>
          <span class="summary-label">Total</span>
        </div>
        <div class="summary-stat">
          <span class="summary-value">{{ filterCounts.PENDING }}</span>
          <span class="summary-label">Pending</span>
        </div>
        <div class="summary-stat">
          <span class="summary-value">{{ filterCounts.REUPLOAD_REQUESTED }}</span>
          <span class="summary-label">Re-upload</span>
        </div>
        <div class="summary-stat">
          <span class="summary-value">{{ filterCounts.APPROVED }}</span>
          <span class="summary-label">Approved</span>
        </div>
        <div class="summary-stat">
          <span class="summary-value">{{ filterCounts.REJECTED }}</span>
          <span class="summary-label">Rejected</span>
        </div>
      </section>

      <!-- ── Toolbar ── -->
      <section class="card toolbar">
        <div class="search-wrap">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Search tutor name, course, status…"
            class="search-input"
            aria-label="Search verifications"
          />
          <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''" type="button" aria-label="Clear search">×</button>
        </div>
        <div class="filter-chips" role="group" aria-label="Filter by status">
          <button
            v-for="f in statusFilters"
            :key="f.value"
            class="filter-chip"
            :class="{ active: activeStatusFilter === f.value }"
            @click="activeStatusFilter = f.value"
            type="button"
          >
            {{ f.label }}
            <span class="filter-count">{{ filterCounts[f.value] ?? filterCounts.all }}</span>
          </button>
        </div>
      </section>

      <!-- ── Global message ── -->
      <p v-if="message" class="feedback-msg" :class="message.startsWith('Error') ? 'error' : 'success'" role="alert" aria-live="polite">
        {{ message }}
      </p>

      <!-- ── Skeleton ── -->
      <div v-if="isLoading" class="verif-list">
        <div v-for="n in 5" :key="n" class="card skeleton" aria-hidden="true"></div>
      </div>

      <!-- ── Empty ── -->
      <div v-else-if="!filteredApplications.length" class="card empty-state">
        <p class="empty-icon">📋</p>
        <p class="empty-text">No submissions found.</p>
        <button v-if="searchQuery || activeStatusFilter !== 'all'" class="chip chip-strong" @click="clearFilters" type="button">
          Clear filters ❌
        </button>
      </div>

      <!-- ── Application list ── -->
      <div v-else class="verif-list">
        <article
          v-for="app in filteredApplications"
          :key="app.id"
          class="card verif-card"
          @click="openDetails(app)"
          role="button"
          tabindex="0"
          :aria-label="`Verification for ${app.userName}`"
          @keydown.enter="openDetails(app)"
          @keydown.space.prevent="openDetails(app)"
        >
          <div class="verif-card-head">
            <div class="verif-avatar" :class="avatarColor(app.userName)">
              {{ initials(app.userName) }}
            </div>
            <div class="verif-info">
              <p class="verif-name">{{ app.userName }}</p>
              <p class="verif-meta">
                {{ app.courseCode || 'No course code' }}
                <span aria-hidden="true">·</span>
                {{ app.createdAt || 'Date unknown' }}
              </p>
            </div>
            <span class="status-badge" :class="statusBadgeClass(app.status)">
              {{ formatStatusLabel(app.status) }}
            </span>
          </div>
          <p class="verif-hint">Tap to review proof and take action →</p>
        </article>
      </div>

    </div>

    <!-- ── Detail modal ── -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="selectedApplication"
          class="detail-backdrop"
          @click="closeDetails"
          role="dialog"
          aria-modal="true"
          :aria-label="'Verification detail for ' + selectedApplication.userName"
        >
          <section class="detail-modal card" @click.stop>

            <div class="detail-header">
              <div>
                <p class="detail-kicker">Verification detail</p>
                <h3>{{ selectedApplication.userName }}</h3>
              </div>
              <button
                class="close-btn"
                type="button"
                ref="closeButtonRef"
                @click="closeDetails"
                aria-label="Close detail panel"
              >×</button>
            </div>

            <div class="detail-status-row">
              <span class="status-badge" :class="statusBadgeClass(selectedApplication.status)">
                {{ formatStatusLabel(selectedApplication.status) }}
              </span>
              <span class="detail-date">Submitted {{ selectedApplication.createdAt || 'unknown date' }}</span>
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
                    {{ selectedApplication.proofUrl ? 'A proof file was submitted. Click below to open it.' : 'No proof file was attached.' }}
                  </p>
                  <button
                    class="chip chip-strong proof-btn"
                    type="button"
                    :disabled="!selectedApplication.proofUrl"
                    @click="openProof(selectedApplication)"
                    aria-label="Open proof document in new tab"
                  >
                    View Proof 📄
                  </button>
                </div>

              </div>

              <!-- ── Review panel ── -->
              <div v-if="canReview" class="card detail-review-panel">
                <p class="review-panel-header">📝 Leave a decision note</p>
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
      </Transition>
    </Teleport>

  </main>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { api } from '@/api.js'
import { normalizeAdminVerification } from '@/utils/records.js'

// ── State ──────────────────────────────────────────────────────────────────
const applications       = ref([])
const selectedApplication = ref(null)
const isLoading          = ref(true)
const message            = ref('')
const searchQuery        = ref('')
const reviewNote         = ref('')
const actionState        = ref('')
const activeStatusFilter = ref('all')
const closeButtonRef     = ref(null)

let messageTimer = null

// ── Computed ───────────────────────────────────────────────────────────────
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
    return [app.userName || '', app.courseCode || '', app.reviewNotes || '', app.status || '']
      .join(' ').toLowerCase().includes(search)
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
  // BUG FIX -> success auto-dismisses; errors persist
  if (text && !text.startsWith('Error')) messageTimer = setTimeout(() => { message.value = '' }, 4000)
}

const clearFilters = () => {
  searchQuery.value = ''
  activeStatusFilter.value = 'all'
}

const openProof = (application) => {
  const url = String(application?.proofUrl || '').trim()
  if (url) window.open(url, '_blank', 'noopener,noreferrer')
}

// ── Data load ──────────────────────────────────────────────────────────────
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
      const n = normalizeAdminVerification(item)
      return { ...n, status: String(n.status || 'PENDING').toUpperCase() }
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

// ── Keyboard / scroll lock ─────────────────────────────────────────────────
const handleKeydown = (e) => {
  if (e.key === 'Escape' && selectedApplication.value) closeDetails()
}

watch(() => Boolean(selectedApplication.value), open => {
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
.admin-verif-page { max-width: 1024px; margin: 0 auto; padding: 20px; }
.admin-verif-content { display: flex; flex-direction: column; gap: 16px; }

/* ── Glass Card ── */
.card {
  border: 2px solid #021A54;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(2, 26, 84, 0.05);
  padding: 20px;
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
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #FF85BB;
  margin: 0 0 4px;
}

.page-header-card h2 { font-size: clamp(1.6rem, 2.5vw, 2.2rem); margin: 0 0 4px; color: #021A54; }
.page-subtext { font-size: 0.9rem; color: rgba(2,26,84,0.7); font-weight: 600; margin: 0; }

/* ── Chips ── */
.chip {
  font-size: 0.88rem;
  font-weight: 800;
  padding: 8px 16px;
  border-radius: 8px;
  border: 2px solid #021A54;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  transition: transform 100ms;
}

.chip:active { transform: scale(0.95); }
.chip-strong { background: #FF85BB; color: #021A54; }
.chip-soft   { background: #F5F5F5; color: #021A54; }
.chip-danger { background: #FFCEE3; color: #021A54; }
.chip:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

/* ── Summary bar ── */
.summary-bar { display: flex; gap: 20px; flex-wrap: wrap; }
.summary-stat { display: flex; flex-direction: column; }
.summary-value { font-size: 1.8rem; font-weight: 800; color: #021A54; }
.summary-label { font-size: 0.73rem; font-weight: 800; text-transform: uppercase; color: #FF85BB; }

/* ── Toolbar ── */
.toolbar { display: flex; flex-direction: column; gap: 12px; }

.search-wrap {
  display: flex;
  align-items: center;
  border: 2px solid #021A54;
  border-radius: 999px;
  padding: 0 14px;
  background: #F5F5F5;
}

.search-icon  { font-size: 16px; flex-shrink: 0; }

.search-input {
  border: none;
  background: transparent;
  padding: 10px 8px;
  width: 100%;
  color: #021A54;
  font-weight: 600;
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

/* ── Filter chips ── */
.filter-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  font-weight: 800;
  padding: 6px 12px;
  border-radius: 999px;
  border: 2px solid #021A54;
  background: #F5F5F5;
  color: #021A54;
  cursor: pointer;
  transition: transform 100ms;
}

.filter-chip:active { transform: scale(0.95); }
.filter-chip.active { background: #FF85BB; }

.filter-count {
  font-size: 0.72rem;
  font-weight: 800;
  background: rgba(2,26,84,0.1);
  border-radius: 999px;
  padding: 1px 6px;
}

/* ── Feedback ── */
.feedback-msg {
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 700;
  border: 2px solid;
  margin: 0;
}

.feedback-msg.success { background: rgba(34,134,82,0.08); border-color: rgba(34,134,82,0.3); color: #1a6b40; }
.feedback-msg.error   { background: #FFCEE3; border-color: #FF85BB; color: #021A54; }

/* ── Skeleton ── */
.skeleton {
  height: 90px;
  background: linear-gradient(90deg, rgba(255,255,255,0.4) 25%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.4) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Empty state ── */
.empty-state { text-align: center; padding: 36px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.empty-icon  { font-size: 2.5rem; margin: 0; }
.empty-text  { font-weight: 800; color: #021A54; margin: 0; }

/* ── Verif list ── */
.verif-list { display: flex; flex-direction: column; gap: 10px; }

.verif-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  transition: transform 150ms ease, box-shadow 150ms ease;
  padding: 16px 20px;
}

.verif-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(2,26,84,0.1);
}

.verif-card:focus-visible {
  outline: 3px solid #FF85BB;
  outline-offset: 2px;
}

.verif-card-head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.verif-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 2px solid #021A54;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
  flex-shrink: 0;
}

.av-rose   { background: #FFCEE3; color: #021A54; }
.av-violet { background: #e8d5f5; color: #021A54; }
.av-teal   { background: #d1f0ea; color: #021A54; }
.av-amber  { background: #fff3cd; color: #021A54; }
.av-sky    { background: #d4eaf7; color: #021A54; }

.verif-info { flex: 1; min-width: 0; }
.verif-name { font-size: 0.95rem; font-weight: 800; color: #021A54; margin: 0 0 2px; }
.verif-meta { font-size: 0.8rem; color: rgba(2,26,84,0.7); font-weight: 600; margin: 0; }

.verif-hint { font-size: 0.8rem; color: #FF85BB; font-weight: 700; margin: 0; }

/* ── Status badges ── */
.status-badge {
  font-size: 0.72rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 999px;
  border: 2px solid #021A54;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-badge.pending             { background: #fff3cd; color: #021A54; }
.status-badge.reupload-requested  { background: #FFCEE3; color: #021A54; }
.status-badge.approved            { background: #d9f8e4; color: #021A54; }
.status-badge.rejected            { background: #F5F5F5; color: #021A54; }

/* ── Modal ── */
.detail-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2,26,84,0.45);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 1200;
}

.detail-modal {
  width: min(600px, 100%);
  max-height: calc(100dvh - 40px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  padding: 0;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  padding: 22px 24px 14px;
  flex-shrink: 0;
  border-bottom: 2px solid rgba(2,26,84,0.1);
}

.detail-kicker {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #FF85BB;
  margin: 0 0 4px;
}

.detail-header h3 { margin: 0; font-size: 1.2rem; font-weight: 800; color: #021A54; }

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #021A54;
  background: #F5F5F5;
  color: #021A54;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.close-btn:hover { background: #FFCEE3; }

.detail-status-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 24px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.detail-date { font-size: 0.85rem; font-weight: 700; color: rgba(2,26,84,0.7); }

.detail-scroll { overflow-y: auto; padding: 0 16px 24px; flex: 1; }

.detail-body { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }

.detail-section { padding: 14px 16px; }

.detail-section--proof {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}

.detail-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  font-weight: 800;
  color: #FF85BB;
  margin: 0 0 6px;
}

.detail-value { margin: 0; color: #021A54; font-size: 0.95rem; font-weight: 600; }
.detail-value--muted { color: rgba(2,26,84,0.65); font-style: italic; }

/* ── Review panel ── */
.detail-review-panel { display: flex; flex-direction: column; gap: 12px; padding: 16px; }

.review-panel-header { font-size: 1rem; font-weight: 800; color: #021A54; margin: 0; }

.review-note-input {
  width: 100%;
  resize: vertical;
  min-height: 90px;
  border-radius: 12px;
  border: 2px solid #021A54;
  background: #F5F5F5;
  padding: 12px;
  color: #021A54;
  font-weight: 600;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
}

.review-note-input:focus { background: #fff; }

.review-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.review-actions .chip { flex: 1 1 auto; }

.review-readonly-notice {
  font-weight: 800;
  color: #021A54;
  text-align: center;
}

/* ── Transitions ── */
.fade-enter-active, .fade-leave-active { transition: opacity 180ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── Responsive ── */
@media (max-width: 640px) {
  .page-header-card { flex-direction: column; align-items: flex-start; }
  .summary-stat { flex: 1 1 45%; }
  .review-actions { flex-direction: column; }
  .review-actions .chip { width: 100%; justify-content: center; }
}

@media (prefers-reduced-motion: reduce) {
  .verif-card { transition: none; }
  .skeleton { animation: none; }
}
</style>