<template>
  <main class="view page active admin-verif-legacy-page">

    <!-- ── Header ── -->
    <div class="page-header">
      <div>
        <p class="page-kicker">Admin · Tutor Quality</p>
        <h2>Tutor Verifications</h2>
        <p class="page-subtext">Review and action credential submissions from tutors.</p>
      </div>
      <button
        class="chip chip-strong"
        type="button"
        :disabled="isLoading"
        @click="loadApplications"
        aria-label="Refresh verification list"
      >
        {{ isLoading ? 'Loading…' : 'Refresh 🔄' }}
      </button>
    </div>

    <!-- ── Summary bar ── -->
    <div v-if="!isLoading && applications.length" class="summary-bar">
      <div class="summary-stat card">
        <span class="summary-value">{{ applications.length }}</span>
        <span class="summary-label">Total</span>
      </div>
      <div class="summary-stat card">
        <span class="summary-value">{{ filterCounts.PENDING }}</span>
        <span class="summary-label">Pending</span>
      </div>
      <div class="summary-stat card">
        <span class="summary-value">{{ filterCounts.REUPLOAD_REQUESTED }}</span>
        <span class="summary-label">Re-upload</span>
      </div>
      <div class="summary-stat card">
        <span class="summary-value">{{ filterCounts.APPROVED }}</span>
        <span class="summary-label">Approved</span>
      </div>
      <div class="summary-stat card">
        <span class="summary-value">{{ filterCounts.REJECTED }}</span>
        <span class="summary-label">Rejected</span>
      </div>
    </div>

    <!-- ── Feedback ── -->
    <Transition name="fade-slide">
      <p
        v-if="message"
        class="feedback-msg"
        :class="message.startsWith('Error') ? 'error' : 'success'"
        role="alert"
        aria-live="polite"
      >{{ message }}</p>
    </Transition>

    <!-- ── Toolbar ── -->
    <div class="toolbar-row">
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search tutor name, course…"
          class="search-input-field"
          aria-label="Search verifications"
        />
        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''" type="button">×</button>
      </div>
    </div>

    <!-- ── Filter bar ── -->
    <div class="filter-bar" role="group" aria-label="Filter by status">
      <button
        v-for="f in statusFilters"
        :key="f.value"
        class="filter-chip"
        :class="{ active: activeFilter === f.value }"
        @click="activeFilter = f.value"
        type="button"
      >
        {{ f.label }}
        <span class="filter-badge">{{ filterCounts[f.value] ?? applications.length }}</span>
      </button>
    </div>

    <!-- ── Result count ── -->
    <p v-if="!isLoading" class="result-count">
      {{ filteredApplications.length }} of {{ applications.length }} showing
    </p>

    <!-- ── Skeleton ── -->
    <div v-if="isLoading" class="verif-list">
      <div v-for="n in 5" :key="n" class="card verif-skeleton" aria-hidden="true"></div>
    </div>

    <!-- ── Empty ── -->
    <div v-else-if="!filteredApplications.length" class="card empty-state">
      <p class="empty-icon">📋</p>
      <p class="empty-title">No submissions found.</p>
      <p class="empty-sub">Try adjusting your filters or search.</p>
      <button v-if="searchQuery || activeFilter !== 'all'" class="chip chip-strong" @click="searchQuery = ''; activeFilter = 'all'" type="button">
        Clear filters ❌
      </button>
    </div>

    <!-- ── Verif list ── -->
    <div v-else class="verif-list">
      <article
        v-for="app in filteredApplications"
        :key="app.id"
        class="card verification-item"
        @click="openModal(app)"
        role="button"
        tabindex="0"
        :aria-label="`Verification for ${app.userName}`"
        @keydown.enter="openModal(app)"
        @keydown.space.prevent="openModal(app)"
      >
        <div class="verification-head">
          <div class="verif-avatar" :class="avatarColor(app.userName)">
            {{ initials(app.userName) }}
          </div>
          <div class="verif-meta">
            <span class="verif-name">{{ app.userName }}</span>
            <p class="verif-course">
              {{ app.courseCode || 'No course code' }}
              <span class="meta-dot" aria-hidden="true">·</span>
              {{ app.createdAt || 'Date unknown' }}
            </p>
          </div>
          <!-- All status badge classes go through statusClass() helper -->
          <span
            class="status-badge"
            :class="statusClass(app.status)"
            :aria-label="'Status: ' + formatStatus(app.status)"
          >{{ formatStatus(app.status) }}</span>
        </div>
        <p class="verification-hint">Tap to review proof and take action →</p>
      </article>
    </div>

    <!-- ── Detail modal ── -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="selected"
          class="detail-backdrop"
          role="dialog"
          aria-modal="true"
          :aria-label="'Verification for ' + selected.userName"
          @click="closeModal"
        >
          <section class="detail-modal card" @click.stop>

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

                <div class="detail-section card">
                  <p class="detail-label">Course / subject</p>
                  <p class="detail-value">{{ selected.courseCode || 'Not specified' }}</p>
                </div>

                <div class="detail-section detail-section--proof card">
                  <p class="detail-label">Proof document</p>
                  <p class="detail-value">
                    {{ selected.proofUrl ? 'A proof file was submitted. Open it below.' : 'No proof file was attached to this submission.' }}
                  </p>
                  <button
                    class="chip proof-btn"
                    :class="selected.proofUrl ? 'chip-strong' : 'chip-soft'"
                    type="button"
                    :disabled="!selected.proofUrl"
                    @click="openProof"
                    aria-label="Open submitted proof document in a new tab"
                  >
                    View Proof 📄
                  </button>
                </div>

                <div class="detail-section card">
                  <p class="detail-label">Previous review notes</p>
                  <p class="detail-value detail-value--muted">
                    {{ selected.reviewNotes || 'No review notes on record.' }}
                  </p>
                </div>

              </div>

              <!-- ── Action panel — PENDING / REUPLOAD_REQUESTED only ── -->
              <div v-if="canAct" class="detail-section review-section card">
                <p class="review-header">📝 Leave a decision note</p>
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
                    class="chip chip-soft secondary-action"
                    type="button"
                    :disabled="Boolean(actionState)"
                    @click="act('reupload_requested')"
                  >
                    {{ actionState === 'reupload_requested' ? 'Sending…' : 'Request Re-upload 🔄' }}
                  </button>
                  <button
                    class="chip chip-danger danger-action"
                    type="button"
                    :disabled="Boolean(actionState)"
                    @click="act('rejected')"
                  >
                    {{ actionState === 'rejected' ? 'Rejecting…' : 'Reject ❌' }}
                  </button>
                  <button
                    class="chip chip-strong approve-action"
                    type="button"
                    :disabled="Boolean(actionState)"
                    @click="act('approved')"
                  >
                    {{ actionState === 'approved' ? 'Approving…' : 'Approve ✅' }}
                  </button>
                </div>
              </div>

              <!-- Read-only notice for already-actioned submissions -->
              <div v-else class="review-readonly card">
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
import { api, requireRoleSession } from '@/api.js'
import { normalizeAdminVerification } from '@/utils/records.js'

// ── State ──────────────────────────────────────────────────────────────────
const applications = ref([])
const isLoading    = ref(true)
const message      = ref('')
const searchQuery  = ref('')
const activeFilter = ref('all')
const selected     = ref(null)
const reviewNote   = ref('')
const actionState  = ref('')
const closeBtnRef  = ref(null)

let messageTimer = null

// ── Computed ───────────────────────────────────────────────────────────────
// BUG FIX -> allow REUPLOAD_REQUESTED too
const canAct = computed(() =>
  ['PENDING', 'REUPLOAD_REQUESTED'].includes(
    String(selected.value?.status || '').toUpperCase()
  )
)

const formatStatus = (status) => {
  const s = String(status || 'PENDING').toUpperCase()
  if (s === 'REUPLOAD_REQUESTED') return 'Re-upload Req.'
  if (s === 'PENDING')   return 'Pending'
  if (s === 'APPROVED')  return 'Approved'
  if (s === 'REJECTED')  return 'Rejected'
  return s
}

// BUG FIX -> consistent statusClass helper (was duplicated inline with inconsistencies)
const statusClass = (status) => {
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
    if (activeFilter.value !== 'all' && status !== activeFilter.value) return false
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

// ── Data load ──────────────────────────────────────────────────────────────
const loadApplications = async () => {
  isLoading.value = true
  message.value = ''
  try {
    const resp = await api('/admin/tutor-verifications')
    // BUG FIX -> handle both .verifications and .applications response shapes
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
  selected.value = app
  reviewNote.value = app?.reviewNotes || ''
  nextTick(() => closeBtnRef.value?.focus())
}

const closeModal = () => {
  if (actionState.value) return
  selected.value = null
  reviewNote.value = ''
}

// ── Proof ──────────────────────────────────────────────────────────────────
const openProof = () => {
  const url = String(selected.value?.proofUrl || '').trim()
  if (url) window.open(url, '_blank', 'noopener,noreferrer')
}

// ── Actions ────────────────────────────────────────────────────────────────
const act = async (decision) => {
  if (!selected.value || actionState.value) return
  actionState.value = decision
  message.value = ''

  try {
    if (decision === 'reupload_requested') {
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
        { decision, reviewNotes: reviewNote.value.trim() }
      )
      setMessage(decision === 'approved' ? '✓ Verification approved.' : 'Verification rejected.')
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

// ── Keyboard / scroll lock ─────────────────────────────────────────────────
const handleKeydown = (e) => {
  if (e.key === 'Escape' && selected.value) closeModal()
}

watch(() => Boolean(selected.value), open => {
  document.body.style.overflow = open ? 'hidden' : ''
})

// ── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(() => {
  // BUG FIX -> was missing requireRoleSession — anyone could reach this page
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
.admin-verif-legacy-page { padding-bottom: 3rem; }

/* ── Glass Card ── */
.card {
  border: 2px solid #021A54;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(2, 26, 84, 0.05);
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
  margin: 0 0 4px;
  font-size: 0.78rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 800;
  color: #FF85BB;
}

.page-header h2 { font-size: clamp(1.6rem, 2.5vw, 2.2rem); margin: 0 0 4px; color: #021A54; }
.page-subtext   { font-size: 0.9rem; color: rgba(2,26,84,0.7); font-weight: 600; margin: 0; }

/* ── Chips ── */
.chip {
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 800;
  padding: 8px 16px;
  border-radius: 8px;
  border: 2px solid #021A54;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 100ms;
}

.chip:active { transform: scale(0.95); }
.chip-strong { background: #FF85BB; color: #021A54; }
.chip-soft   { background: #F5F5F5; color: #021A54; }
.chip-danger { background: #FFCEE3; color: #021A54; }
.chip:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

/* ── Summary bar ── */
.summary-bar {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0 2rem 1.25rem;
}

.summary-stat {
  flex: 1 1 70px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0.7rem 1rem;
}

.summary-value { font-size: 1.6rem; font-weight: 800; color: #021A54; line-height: 1.2; }
.summary-label { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: #FF85BB; }

/* ── Feedback ── */
.feedback-msg {
  margin: 0 2rem 1rem;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 700;
  border: 2px solid;
}

.feedback-msg.success { background: rgba(34,134,82,0.08); border-color: rgba(34,134,82,0.3); color: #1a6b40; }
.feedback-msg.error   { background: #FFCEE3; border-color: #FF85BB; color: #021A54; }

/* ── Toolbar ── */
.toolbar-row {
  display: flex;
  gap: 0.75rem;
  padding: 0 2rem 0.75rem;
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
  min-width: 0;
}

.search-icon { font-size: 16px; flex-shrink: 0; }

.search-input-field {
  border: none;
  background: transparent;
  padding: 10px 8px;
  width: 100%;
  color: #021A54;
  font-weight: 600;
  min-width: 0;
}

.search-input-field:focus { outline: none; }

.clear-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #021A54;
  line-height: 1;
  flex-shrink: 0;
}

/* ── Filter bar ── */
.filter-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 0 2rem 0.75rem;
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

.filter-badge {
  font-size: 0.72rem;
  font-weight: 800;
  background: rgba(2,26,84,0.1);
  border-radius: 999px;
  padding: 1px 6px;
}

/* ── Result count ── */
.result-count {
  padding: 0 2rem 0.5rem;
  font-size: 0.85rem;
  font-weight: 700;
  color: rgba(2,26,84,0.65);
}

/* ── Skeleton ── */
.verif-skeleton {
  height: 85px;
  background: linear-gradient(90deg, rgba(255,255,255,0.4) 25%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.4) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Empty state ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 36px;
  margin: 0 2rem;
  gap: 8px;
}

.empty-icon  { font-size: 2.5rem; margin: 0; }
.empty-title { font-weight: 800; font-size: 1.1rem; color: #021A54; margin: 0; }
.empty-sub   { font-size: 0.9rem; color: rgba(2,26,84,0.7); margin: 0; font-weight: 600; }

/* ── Verif list ── */
.verif-list { display: flex; flex-direction: column; gap: 10px; padding: 0 2rem; }

.verification-item {
  cursor: pointer;
  transition: transform 150ms ease, box-shadow 150ms ease;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.verification-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(2,26,84,0.1);
}

.verification-item:focus-visible {
  outline: 3px solid #FF85BB;
  outline-offset: 2px;
}

.verification-head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.verif-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
  border: 2px solid #021A54;
  flex-shrink: 0;
}

.av-rose   { background: #FFCEE3; color: #021A54; }
.av-violet { background: #e8d5f5; color: #021A54; }
.av-teal   { background: #d1f0ea; color: #021A54; }
.av-amber  { background: #fff3cd; color: #021A54; }
.av-sky    { background: #d4eaf7; color: #021A54; }

.verif-meta { flex: 1; min-width: 0; }
.verif-name { display: block; font-size: 1rem; font-weight: 800; color: #021A54; }
.verif-course { margin: 2px 0 0; font-size: 0.82rem; font-weight: 600; color: rgba(2,26,84,0.7); }
.meta-dot { margin: 0 5px; opacity: 0.5; }

.verification-hint { font-size: 0.8rem; font-weight: 700; color: #FF85BB; margin: 0 0 0 56px; }

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

/* ── Detail modal ── */
.detail-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 26, 84, 0.45);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding: 18px;
  z-index: 1200;
}

.detail-modal {
  width: min(580px, 100%);
  max-height: calc(100dvh - 36px);
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
  padding: 22px 22px 14px;
  flex-shrink: 0;
  border-bottom: 2px solid rgba(2,26,84,0.1);
}

.detail-kicker {
  margin: 0 0 4px;
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 800;
  color: #FF85BB;
}

.detail-header h3 { margin: 0; font-size: 1.15rem; font-weight: 800; color: #021A54; }

.close-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 2px solid #021A54;
  background: #F5F5F5;
  color: #021A54;
  font-size: 1.2rem;
  line-height: 1;
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
  padding: 14px 22px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.detail-date { font-size: 0.88rem; font-weight: 700; color: rgba(2,26,84,0.7); }

.detail-scroll { overflow-y: auto; padding: 0 14px 22px; flex: 1; }

.detail-body { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }

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

/* ── Review section ── */
.review-section { display: flex; flex-direction: column; gap: 12px; }
.review-header  { font-size: 1rem; font-weight: 800; color: #021A54; margin: 0; }

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
  font-size: 0.95rem;
  transition: background 150ms;
}

.review-note-input:focus { background: #fff; }
.review-note-input:disabled { opacity: 0.6; }

.review-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.review-actions .chip { flex: 1 1 auto; }

.review-readonly {
  padding: 14px 16px;
  font-weight: 800;
  color: #021A54;
  text-align: center;
}

/* ── Transitions ── */
.fade-enter-active, .fade-leave-active { transition: opacity 180ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.fade-slide-enter-active, .fade-slide-leave-active { transition: opacity 200ms ease, transform 200ms ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-6px); }

/* ── Responsive ── */
@media (max-width: 640px) {
  .page-header, .summary-bar, .toolbar-row, .filter-bar, .result-count, .verif-list { padding-left: 1rem; padding-right: 1rem; }
  .page-header { flex-direction: column; align-items: flex-start; }
  .summary-stat { flex: 1 1 45%; }
  .review-actions { flex-direction: column; }
  .review-actions .chip { width: 100%; justify-content: center; }
  .empty-state { margin: 0 1rem; }
}

@media (prefers-reduced-motion: reduce) {
  .verification-item { transition: none; }
  .verif-skeleton { animation: none; }
  .review-note-input { transition: none; }
}
</style>