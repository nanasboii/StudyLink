<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active admin-review-verification-page">
        <div class="page-header">
          <div>
            <p class="page-kicker">Admin moderation</p>
            <h2>Verification Review</h2>
            <p class="page-subtext">Approve, reject, or request re-uploads for tutor verification submissions.</p>
          </div>
          <button @click="loadApplications" class="chip" type="button" :disabled="isLoading">
            {{ isLoading ? 'Loading...' : 'Refresh' }}
          </button>
        </div>

        <p v-if="message" class="message">{{ message }}</p>

        <div class="search-row">
          <input
            v-model.trim="searchQuery"
            class="search-input"
            type="search"
            placeholder="Search by tutor, subject, or note..."
            aria-label="Search verification queue"
          />
        </div>

        <div class="filter-bar" aria-label="Verification queue filters">
          <button
            v-for="option in statusFilters"
            :key="option.value"
            type="button"
            class="chip filter-chip"
            :class="{ active: activeStatusFilter === option.value }"
            @click="activeStatusFilter = option.value"
          >
            {{ option.label }}
            <span class="filter-count">{{ filterCounts[option.value] ?? 0 }}</span>
          </button>
        </div>

        <div class="list">
          <div v-if="isLoading" class="empty-state">Loading verification requests...</div>
          <div v-else-if="filteredApplications.length === 0" class="empty-state">
            {{ activeStatusFilter === 'all' ? 'No verification requests yet.' : 'No ' + activeStatusFilterLabel.toLowerCase() + ' requests found.' }}
          </div>

          <article
            v-else
            v-for="app in filteredApplications"
            :key="app.id"
            class="item verification-item"
            role="button"
            tabindex="0"
            @click="openDetails(app)"
            @keydown.enter.prevent="openDetails(app)"
          >
            <div class="verification-head">
              <div>
                <p class="verification-kicker">{{ formatStatusLabel(app.status) }}</p>
                <strong>{{ app.userName }}</strong>
                <p class="meta">{{ app.courseCode || 'Unspecified subject' }} - {{ app.createdAt }}</p>
              </div>
              <span class="status-badge" :class="app.status.toLowerCase()">{{ formatStatusLabel(app.status) }}</span>
            </div>

            <p class="verification-note">Click to review proof and admin notes.</p>
          </article>
        </div>
      </div>
    </section>

    <teleport to="body">
      <transition name="fade">
        <div v-if="selectedApplication" class="detail-backdrop" @click="closeDetails">
          <section class="detail-modal" @click.stop>
            <div class="detail-header">
              <div>
                <p class="detail-kicker">Verification detail</p>
                <h3>{{ selectedApplication.userName }}</h3>
              </div>
              <button class="close-btn" type="button" @click="closeDetails">&times;</button>
            </div>

            <div class="detail-status-row">
              <span class="status-badge" :class="selectedApplication.status.toLowerCase()">
                {{ formatStatusLabel(selectedApplication.status) }}
              </span>
              <span class="detail-date">Submitted {{ selectedApplication.createdAt }}</span>
            </div>

            <div class="detail-body">
              <div class="detail-section">
                <p class="detail-label">Course code</p>
                <p class="detail-value">{{ selectedApplication.courseCode || 'N/A' }}</p>
              </div>

              <div class="detail-section">
                <p class="detail-label">Review notes</p>
                <p class="detail-value">
                  {{ selectedApplication.reviewNotes || 'No review notes were provided.' }}
                </p>
              </div>

              <div class="detail-section">
                <p class="detail-label">Proof file</p>
                <p class="detail-value">
                  {{ selectedApplication.proofUrl ? 'Open the submitted proof below.' : 'No proof file attached.' }}
                </p>
              </div>
            </div>

                        <div class="detail-actions">
              <button
                class="primary detail-proof-btn"
                type="button"
                :disabled="!selectedApplication.proofUrl"
                @click="openProof(selectedApplication)"
              >
                View Proof
              </button>
            </div>

            <div v-if="canReview" class="detail-review-panel">
              <div class="detail-section">
                <p class="detail-label">Admin review note</p>
                <textarea
                  v-model="reviewNote"
                  class="review-note-input"
                  rows="4"
                  placeholder="Leave a note for the tutor or explain the decision..."
                ></textarea>
              </div>

              <div class="review-actions">
                <button
                  class="chip secondary-action"
                  type="button"
                  :disabled="Boolean(actionState)"
                  @click="requestReupload"
                >
                  {{ actionState === 'reupload' ? 'Sending...' : 'Request Re-upload' }}
                </button>
                <button
                  class="chip danger-action"
                  type="button"
                  :disabled="Boolean(actionState)"
                  @click="submitDecision('rejected')"
                >
                  {{ actionState === 'reject' ? 'Rejecting...' : 'Reject' }}
                </button>
                <button
                  class="chip approve-action"
                  type="button"
                  :disabled="Boolean(actionState)"
                  @click="submitDecision('approved')"
                >
                  {{ actionState === 'approve' ? 'Approving...' : 'Approve' }}
                </button>
              </div>
            </div>
          </section>
        </div>
      </transition>
    </teleport>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api.js'
import { normalizeAdminVerification } from '@/utils/records.js'

const applications = ref([])
const selectedApplication = ref(null)
const isLoading = ref(true)
const message = ref('')
const searchQuery = ref('')
const reviewNote = ref('')
const actionState = ref('')
const activeStatusFilter = ref('all')
const canReview = computed(() => String(selectedApplication.value?.status || '').toUpperCase() === 'PENDING')
const formatStatusLabel = (status) => {
  const normalized = String(status || 'PENDING').toUpperCase()
  if (normalized === 'REUPLOAD_REQUESTED') return 'Request Reupload'
  if (normalized === 'PENDING') return 'Pending'
  if (normalized === 'APPROVED') return 'Approved'
  if (normalized === 'REJECTED') return 'Rejected'
  return normalized
}

const statusFilters = [
  { value: 'all', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REUPLOAD_REQUESTED', label: 'Request Reupload' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' }
]

const activeStatusFilterLabel = computed(() => {
  const selected = statusFilters.find((option) => option.value === activeStatusFilter.value)
  return selected?.label || activeStatusFilter.value
})

const filterCounts = computed(() => {
  const counts = {
    all: applications.value.length,
    PENDING: 0,
    REUPLOAD_REQUESTED: 0,
    APPROVED: 0,
    REJECTED: 0
  }
  applications.value.forEach((application) => {
    const key = String(application.status || 'PENDING').toUpperCase()
    if (counts[key] !== undefined) {
      counts[key] += 1
    }
  })
  return counts
})

const filteredApplications = computed(() => {
  const search = searchQuery.value.toLowerCase().trim()
  return applications.value.filter((application) => {
    const status = String(application.status || 'PENDING').toUpperCase()
    const statusMatches = activeStatusFilter.value === 'all' || status === activeStatusFilter.value
    if (!statusMatches) return false
    if (!search) return true
    return [application.userName, application.courseCode, application.reviewNotes, application.status]
      .join(' ')
      .toLowerCase()
      .includes(search)
  })
})

const loadApplications = async () => {
  isLoading.value = true
  message.value = ''

  try {
    const resp = await api('/admin/tutor-verifications')
    applications.value = (resp.verifications || resp.applications || []).map((item) => {
      const normalized = normalizeAdminVerification(item)
      return {
        ...normalized,
        status: String(normalized.status || 'PENDING').toUpperCase()
      }
    })
  } catch (err) {
    message.value = `Error: ${err.message}`
  } finally {
    isLoading.value = false
  }
}

const openDetails = (application) => {
  selectedApplication.value = application
  reviewNote.value = application?.reviewNotes || ''
}

const closeDetails = () => {
  selectedApplication.value = null
  reviewNote.value = ''
}

const finishAction = async (successMessage) => {
  message.value = successMessage
  selectedApplication.value = null
  reviewNote.value = ''
  await loadApplications()
}

const submitDecision = async (decision) => {
  if (!selectedApplication.value || actionState.value) return

  actionState.value = decision === 'approved' ? 'approve' : 'reject'
  message.value = ''

  try {
    await api(`/admin/tutor-verifications/${selectedApplication.value.id}/decision`, 'POST', {
      decision,
      reviewNotes: reviewNote.value.trim()
    })
    await finishAction(decision === 'approved' ? 'Verification approved.' : 'Verification rejected.')
  } catch (err) {
    message.value = `Error: ${err.message}`
  } finally {
    actionState.value = ''
  }
}

const requestReupload = async () => {
  if (!selectedApplication.value || actionState.value) return

  actionState.value = 'reupload'
  message.value = ''

  try {
    await api(`/admin/tutor-verifications/${selectedApplication.value.id}/request-reupload`, 'POST', {
      note: reviewNote.value.trim()
    })
    await finishAction('Re-upload request sent.')
  } catch (err) {
    message.value = `Error: ${err.message}`
  } finally {
    actionState.value = ''
  }
}

const openProof = (application) => {
  const url = String(application?.proofUrl || '').trim()
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

onMounted(() => {
  loadApplications()
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;

.search-row {
  margin: 6px 0 14px;
}

.search-input {
  width: 100%;
  border-radius: 999px;
  border: 1px solid rgba(177, 31, 75, 0.14);
  background: #fff;
  padding: 12px 16px;
  font: inherit;
  color: #1d1d1f;
  outline: none;
  box-shadow: 0 10px 24px rgba(104, 37, 58, 0.06);
}

.search-input:focus {
  border-color: rgba(177, 31, 75, 0.35);
  box-shadow: 0 0 0 3px rgba(177, 31, 75, 0.08);
}
  gap: 16px;
  margin-bottom: 16px;
}

.page-kicker {
  margin: 0 0 6px;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--ink-kicker);
}

.page-subtext {
  margin: 6px 0 0;
  color: var(--ink-soft);
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.filter-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.45rem;
  height: 1.45rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  color: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
}

.filter-chip.active .filter-count {
  background: rgba(255, 255, 255, 0.28);
}

.verification-item {
  gap: 10px;
}

.verification-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.verification-kicker {
  margin: 0 0 4px;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 700;
  color: var(--ink-kicker);
}

.verification-note {
  margin: 0;
  color: var(--ink-soft);
  line-height: 1.5;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  border: 1px solid rgba(177, 31, 75, 0.14);
  background: linear-gradient(180deg, #fff, #f5f5f7);
  color: #65172f;
}

.status-badge.pending {
  background: var(--warning-bg);
  color: var(--warning-ink);
}

.status-badge.reupload_requested {
  background: rgba(177, 31, 75, 0.14);
  color: var(--primary);
}

.status-badge.approved {
  background: var(--success-bg);
  color: var(--success-ink);
}

.status-badge.rejected {
  background: var(--danger-bg);
  color: var(--danger-ink);
}

.detail-backdrop {
  position: fixed;
  inset: 0;
  background: var(--overlay-dark);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding: 18px;
  z-index: 1200;
}

.detail-modal {
  width: min(640px, 100%);
  border-radius: 24px;
  border: 1px solid rgba(177, 31, 75, 0.14);
  background: var(--surface-tint);
  box-shadow: 0 24px 48px rgba(74, 20, 41, 0.22);
  padding: 22px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.detail-kicker {
  margin: 0 0 6px;
  font-size: 0.7rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--ink-kicker);
}

.detail-date {
  color: var(--ink-soft);
  font-size: 0.9rem;
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid rgba(177, 31, 75, 0.14);
  background: #fff;
  color: #65172f;
  font-size: 1.2rem;
  line-height: 1;
}

.close-btn:hover {
  background: #f5f5f7;
}

@media (max-width: 640px) {
  .detail-modal {
    padding: 18px;
  }
}

.detail-status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
}

.detail-body {
  display: grid;
  gap: 12px;
}

.detail-section {
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(177, 31, 75, 0.12);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 246, 249, 0.9));
}

.detail-label {
  margin: 0 0 6px;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--ink-kicker);
}

.detail-value {
  margin: 0;
  color: #1d1d1f;
  line-height: 1.55;
}

.detail-actions {
  margin-top: 18px;
}

.detail-review-panel {
  margin-top: 16px;
  display: grid;
  gap: 12px;
}

.review-note-input {
  width: 100%;
  resize: vertical;
  min-height: 110px;
  border-radius: 14px;
  border: 1px solid rgba(177, 31, 75, 0.16);
  background: #fff;
  padding: 12px 14px;
  color: #1d1d1f;
  font: inherit;
  outline: none;
}

.review-note-input:focus {
  border-color: rgba(177, 31, 75, 0.35);
  box-shadow: 0 0 0 3px rgba(177, 31, 75, 0.08);
}

.review-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.secondary-action,
.danger-action,
.approve-action {
  border: none;
}

.secondary-action {
  background: linear-gradient(180deg, #fff, #f8f3f0);
  color: #6b4d57;
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
  opacity: 0.7;
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .chip {
    width: 100%;
  }
}

</style>




