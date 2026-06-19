<template>
  <div class="view page active verification-page">

    <!-- 🛠️ Page Header -->
    <div class="page-header">
      <p class="page-kicker">Tutor Portal</p>
      <h2 class="page-title">Verification 📋</h2>
      <p class="page-sub">Upload proof. Track status. Get verified.</p>
    </div>

    <!-- 🛠️ Status Summary Bar -->
    <div class="summary-bar glass-card" v-if="applications.length > 0">
      <div class="summary-item">
        <span class="summary-num">{{ applications.length }}</span>
        <span class="summary-label">Total</span>
      </div>
      <div class="summary-divider" />
      <div class="summary-item">
        <span class="summary-num pending-num">{{ countByStatus('PENDING') }}</span>
        <span class="summary-label">Pending</span>
      </div>
      <div class="summary-divider" />
      <div class="summary-item">
        <span class="summary-num approved-num">{{ countByStatus('APPROVED') }}</span>
        <span class="summary-label">Approved</span>
      </div>
      <div class="summary-divider" />
      <div class="summary-item">
        <span class="summary-num reupload-num">{{ countByStatus('REUPLOAD_REQUESTED') }}</span>
        <span class="summary-label">Needs Reupload</span>
      </div>
    </div>

    <!-- 🛠️ Success / Error Message -->
    <transition name="slide-fade">
      <div v-if="message" :class="['alert-banner', messageIsError ? 'alert-error' : 'alert-success']">
        <span>{{ message }}</span>
        <button class="alert-dismiss" @click="message = ''" type="button">×</button>
      </div>
    </transition>

    <!-- 🛠️ Submit Form -->
    <section class="glass-card submit-card">
      <div class="card-header-row">
        <h3 class="card-title">🗂️ Submit New Application</h3>
      </div>

      <div class="form-stack">
        <div class="field-group">
          <label class="field-label" for="course-code-input">Course Code</label>
          <input
            id="course-code-input"
            v-model.trim="verification.courseCode"
            class="glass-input"
            placeholder="e.g. TMF3953, CS101"
            autocomplete="off"
            :disabled="isSubmitting"
          />
          <p class="field-hint">Enter any course code you teach.</p>
        </div>

        <div class="field-group">
          <label class="field-label" for="verification-file-input">Proof Document</label>
          <div class="file-drop-zone" :class="{ 'has-file': verificationFile }">
            <input
              id="verification-file-input"
              ref="verificationFileInput"
              class="file-input-hidden"
              type="file"
              accept=".pdf,.doc,.docx,image/png,image/jpeg"
              @change="handleFileChange"
              :disabled="isSubmitting"
            />
            <label for="verification-file-input" class="file-drop-label">
              <span v-if="!verificationFile">📎 Click to choose file</span>
              <span v-else class="file-name-preview">✅ {{ verificationFile.name }}</span>
            </label>
          </div>
          <p class="field-hint">PDF, DOC, DOCX, PNG, JPEG — max 10 MB.</p>
        </div>

        <button
          class="btn-primary"
          type="button"
          :disabled="isSubmitting || !verificationFile"
          @click="submitVerification"
        >
          <span v-if="isSubmitting">⏳ Submitting…</span>
          <span v-else>🚀 Submit for Verification</span>
        </button>
      </div>
    </section>

    <!-- 🛠️ My Applications -->
    <section class="glass-card app-section">
      <div class="card-header-row">
        <h3 class="card-title">📂 My Applications</h3>
        <button
          class="btn-chip"
          type="button"
          :disabled="isLoading"
          @click="loadApplications"
        >
          {{ isLoading ? '⏳' : '🔄 Refresh' }}
        </button>
      </div>

      <!-- Loading skeleton -->
      <div v-if="isLoading" class="skeleton-grid">
        <div v-for="n in 3" :key="n" class="skeleton-card shimmer" />
      </div>

      <!-- Empty state -->
      <div v-else-if="applications.length === 0" class="empty-state">
        <p class="empty-icon">📭</p>
        <p class="empty-title">No applications yet.</p>
        <p class="empty-sub">Submit your first verification above.</p>
      </div>

      <!-- Application cards -->
      <div v-else class="verification-grid">
        <article
          v-for="app in applications"
          :key="app.id"
          class="app-card"
          :class="statusClass(app)"
          role="button"
          tabindex="0"
          @click="openDetails(app)"
          @keydown.enter.prevent="openDetails(app)"
        >
          <div class="app-card-head">
            <h4 class="app-course">{{ app.courseCode || '—' }}</h4>
            <span class="status-badge" :class="statusClass(app)">{{ statusLabel(app) }}</span>
          </div>
          <p class="app-meta">📅 {{ app.createdAt || 'Unknown date' }}</p>
          <p v-if="app.reviewNotes" class="app-note">
            💬 {{ app.reviewNotes }}
          </p>
          <p class="app-hint">Tap to view details →</p>
        </article>
      </div>
    </section>

    <!-- 🛠️ Detail Modal -->
    <teleport to="body">
      <transition name="fade">
        <div
          v-if="selectedApplication"
          class="detail-backdrop"
          role="dialog"
          aria-modal="true"
          :aria-label="`Verification detail for ${selectedApplication.courseCode}`"
          @click="closeDetails"
          @keydown.esc="closeDetails"
        >
          <section class="detail-modal glass-modal" @click.stop>

            <!-- Modal Header -->
            <div class="modal-header">
              <div>
                <p class="modal-kicker">Verification Detail</p>
                <h3 class="modal-title">{{ selectedApplication.courseCode || 'Application' }}</h3>
              </div>
              <button class="btn-close" type="button" @click="closeDetails" aria-label="Close">×</button>
            </div>

            <!-- Status Row -->
            <div class="modal-status-row">
              <span class="status-badge" :class="statusClass(selectedApplication)">
                {{ statusLabel(selectedApplication) }}
              </span>
              <span class="modal-date">📅 {{ selectedApplication.createdAt || 'Unknown date' }}</span>
            </div>

            <!-- Detail Sections -->
            <div class="modal-body">
              <div class="detail-block">
                <p class="detail-label">{{ detailNoteLabel(selectedApplication) }}</p>
                <p class="detail-value">
                  {{ selectedApplication.reviewNotes || 'No admin comment yet.' }}
                </p>
              </div>

              <div class="detail-block">
                <p class="detail-label">Proof File</p>
                <p class="detail-value">
                  {{ selectedApplication.proofUrl ? 'Document submitted. View below.' : 'No file attached.' }}
                </p>
              </div>
            </div>

            <!-- Modal Actions -->
            <div class="modal-actions">
              <!-- View proof -->
              <button
                class="btn-secondary"
                type="button"
                :disabled="!selectedApplication.proofUrl"
                @click="openProof(selectedApplication)"
              >
                🔍 View Proof
              </button>

              <!-- Reupload (hidden file input) -->
              <input
                ref="reuploadFileInput"
                type="file"
                accept=".pdf,.doc,.docx,image/png,image/jpeg"
                style="display:none"
                @change="handleReuploadFileChange"
              />
              <button
                v-if="isReuploadRequested(selectedApplication)"
                class="btn-primary"
                type="button"
                :disabled="reuploadUploading"
                @click="triggerReupload"
              >
                {{ reuploadUploading ? '⏳ Uploading…' : '📤 Reupload Proof' }}
              </button>
            </div>

          </section>
        </div>
      </transition>
    </teleport>

  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { api, getUser } from '@/api.js'
import { normalizeTutorVerification } from '@/utils/records.js'

// ─── Auth guard ───────────────────────────────────────────────────────────────
const router = useRouter()
const currentUser = getUser()
const currentUserRole = String(currentUser?.role || '').toLowerCase().trim()
if (!currentUser || (currentUserRole !== 'tutor' && currentUserRole !== 'admin')) {
  router.replace('/resources')
}

// ─── State ────────────────────────────────────────────────────────────────────
const verification      = ref({ courseCode: '' })
const verificationFile  = ref(null)
const verificationFileInput = ref(null)
const applications      = ref([])
const message           = ref('')
const messageIsError    = ref(false)
const isSubmitting      = ref(false)
const isLoading         = ref(false)
const selectedApplication = ref(null)
const reuploadFileInput = ref(null)
const reuploadFile      = ref(null)
const reuploadUploading = ref(false)

// ─── Helpers ──────────────────────────────────────────────────────────────────
const showMessage = (text, isError = false) => {
  message.value      = text
  messageIsError.value = isError
  // auto-dismiss success after 4 s
  if (!isError) setTimeout(() => { if (message.value === text) message.value = '' }, 4000)
}

const countByStatus = (status) =>
  applications.value.filter(a => String(a.status || '').toUpperCase() === status).length

const isReuploadRequested = (app) => {
  if (!app) return false
  const s = String(app.status || '').toUpperCase()
  const hasNote = String(app.reviewNotes || '').trim().length > 0
  return s === 'REUPLOAD_REQUESTED' || (s === 'PENDING' && hasNote)
}

const statusLabel = (app) => {
  if (!app) return 'PENDING'
  if (isReuploadRequested(app)) return 'Reupload Requested'
  const s = String(app.status || 'PENDING').toUpperCase()
  const map = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' }
  return map[s] ?? s
}

const statusClass = (app) => {
  if (!app) return 'pending'
  if (isReuploadRequested(app)) return 'reupload-requested'
  return String(app.status || 'pending').toLowerCase()
}

const detailNoteLabel = (app) => {
  if (!app) return 'Admin Note'
  if (isReuploadRequested(app)) return 'Why Reupload Is Needed'
  if (String(app.status || '').toUpperCase() === 'REJECTED') return 'Rejection Reason'
  return 'Admin Note'
}

// ─── API ──────────────────────────────────────────────────────────────────────
const loadVerificationData = async () => {
  const resp = await api('/tutor-verifications/me')
  const raw = Array.isArray(resp?.applications) ? resp.applications : []
  applications.value = raw.map(normalizeTutorVerification)
}

const loadApplications = async () => {
  isLoading.value = true
  try {
    await loadVerificationData()
  } catch (err) {
    showMessage(`Failed to load: ${err.message}`, true)
  } finally {
    isLoading.value = false
  }
}

const handleFileChange = (e) => {
  verificationFile.value = e.target.files?.[0] ?? null
}

const submitVerification = async () => {
  if (!verificationFile.value) {
    showMessage('Please pick a file first.', true)
    return
  }

  // 🛠️ Bug fix: enforce 10 MB limit client-side
  if (verificationFile.value.size > 10 * 1024 * 1024) {
    showMessage('File too large. Max 10 MB.', true)
    return
  }

  isSubmitting.value = true
  message.value = ''
  try {
    const fd = new FormData()
    fd.append('document', verificationFile.value)
    const uploadResult = await api('/uploads/verification', 'POST', fd)

    const proofUrl = uploadResult?.fileUrl
    if (!proofUrl) throw new Error('Upload returned no file URL.')

    await api('/tutor-verifications', 'POST', {
      courseCode: verification.value.courseCode || '',
      proofUrl
    })

    showMessage('✅ Verification submitted!')
    verification.value = { courseCode: '' }
    verificationFile.value = null
    if (verificationFileInput.value) verificationFileInput.value.value = ''
    await loadVerificationData()
  } catch (err) {
    showMessage(`Submission failed: ${err.message}`, true)
  } finally {
    isSubmitting.value = false
  }
}

const openProof = (app) => {
  const url = String(app?.proofUrl || '').trim()
  if (!url) {
    showMessage('No proof file for this application.', true)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

const openDetails = (app) => {
  selectedApplication.value = app
  document.body.style.overflow = 'hidden'
}

const closeDetails = () => {
  selectedApplication.value = null
  document.body.style.overflow = ''
}

const handleReuploadFileChange = (e) => {
  reuploadFile.value = e.target.files?.[0] ?? null
  if (reuploadFile.value) submitReupload()
}

const triggerReupload = () => {
  reuploadFileInput.value?.click()
}

const submitReupload = async () => {
  if (!reuploadFile.value || !selectedApplication.value) return

  // 🛠️ Bug fix: size check on reupload too
  if (reuploadFile.value.size > 10 * 1024 * 1024) {
    showMessage('File too large. Max 10 MB.', true)
    reuploadFile.value = null
    return
  }

  reuploadUploading.value = true
  try {
    const fd = new FormData()
    fd.append('document', reuploadFile.value)
    const uploadResult = await api('/uploads/verification', 'POST', fd)
    const proofUrl = uploadResult?.fileUrl
    if (!proofUrl) throw new Error('Upload returned no file URL.')

    await api(`/tutor-verifications/${selectedApplication.value.id}/reupload`, 'POST', { proofUrl })

    showMessage('✅ Document reuploaded!')
    closeDetails()
    await loadVerificationData()
  } catch (err) {
    showMessage(`Reupload failed: ${err.message}`, true)
  } finally {
    reuploadUploading.value = false
    reuploadFile.value = null
    if (reuploadFileInput.value) reuploadFileInput.value.value = ''
  }
}

// 🛠️ Escape key closes modal
const onKeydown = (e) => {
  if (e.key === 'Escape' && selectedApplication.value) closeDetails()
}

onMounted(() => {
  loadApplications()
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* ── Page Layout ─────────────────────────────────────────────────── */
.verification-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-bottom: 40px;
}

/* ── Page Header ─────────────────────────────────────────────────── */
.page-header {
  padding: 4px 0 6px;
}

.page-kicker {
  margin: 0 0 4px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--primary, #FF85BB);
}

.page-title {
  margin: 0 0 4px;
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--ink, #021A54);
  letter-spacing: -0.01em;
}

.page-sub {
  margin: 0;
  font-size: 0.9rem;
  color: var(--ink-muted, #6e6e73);
}

/* ── Glass Card base ─────────────────────────────────────────────── */
.glass-card {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(14px) saturate(1.6);
  -webkit-backdrop-filter: blur(14px) saturate(1.6);
  border: 1px solid rgba(255, 133, 187, 0.18);
  border-radius: 20px;
  padding: 20px;
  box-shadow:
    0 2px 8px rgba(2, 26, 84, 0.06),
    0 8px 24px rgba(255, 133, 187, 0.08);
}

/* ── Summary Bar ─────────────────────────────────────────────────── */
.summary-bar {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 14px 20px;
}

.summary-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.summary-num {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--ink, #021A54);
  line-height: 1;
}

.summary-num.pending-num  { color: #a06000; }
.summary-num.approved-num { color: #1a7a48; }
.summary-num.reupload-num { color: var(--primary, #FF85BB); }

.summary-label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-muted, #6e6e73);
}

.summary-divider {
  width: 1px;
  height: 36px;
  background: rgba(2, 26, 84, 0.1);
}

/* ── Alert Banner ────────────────────────────────────────────────── */
.alert-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 14px;
  font-size: 0.9rem;
  font-weight: 600;
}

.alert-success {
  background: rgba(26, 122, 72, 0.1);
  border: 1px solid rgba(26, 122, 72, 0.25);
  color: #1a7a48;
}

.alert-error {
  background: rgba(200, 40, 60, 0.08);
  border: 1px solid rgba(200, 40, 60, 0.2);
  color: #c22840;
}

.alert-dismiss {
  background: none;
  border: none;
  font-size: 1.3rem;
  line-height: 1;
  cursor: pointer;
  color: inherit;
  padding: 0;
  opacity: 0.7;
}
.alert-dismiss:hover { opacity: 1; }

/* ── Card Header Row ─────────────────────────────────────────────── */
.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink, #021A54);
}

/* ── Form ────────────────────────────────────────────────────────── */
.form-stack {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink, #021A54);
}

.glass-input {
  width: 100%;
  padding: 11px 14px;
  border-radius: 12px;
  border: 1px solid rgba(2, 26, 84, 0.14);
  background: rgba(255, 255, 255, 0.85);
  font: inherit;
  font-size: 0.95rem;
  color: var(--ink, #021A54);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}

.glass-input:focus {
  border-color: var(--primary, #FF85BB);
  box-shadow: 0 0 0 3px rgba(255, 133, 187, 0.18);
}

.glass-input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.field-hint {
  margin: 0;
  font-size: 0.78rem;
  color: var(--ink-muted, #6e6e73);
}

/* ── File Drop Zone ──────────────────────────────────────────────── */
.file-drop-zone {
  border: 1.5px dashed rgba(255, 133, 187, 0.45);
  border-radius: 12px;
  background: rgba(255, 206, 227, 0.12);
  transition: background 0.15s, border-color 0.15s;
  overflow: hidden;
}

.file-drop-zone.has-file {
  border-color: rgba(26, 122, 72, 0.4);
  background: rgba(26, 122, 72, 0.06);
}

.file-input-hidden {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.file-drop-label {
  display: block;
  padding: 16px;
  cursor: pointer;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--primary, #FF85BB);
  transition: color 0.15s;
}

.file-drop-zone.has-file .file-drop-label {
  color: #1a7a48;
}

.file-name-preview {
  word-break: break-all;
}

/* ── Buttons ─────────────────────────────────────────────────────── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 22px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(135deg, var(--primary, #FF85BB), #ff6da9);
  color: #fff;
  font: inherit;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.12s;
  box-shadow: 0 4px 14px rgba(255, 133, 187, 0.35);
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1.5px solid rgba(2, 26, 84, 0.18);
  background: rgba(255, 255, 255, 0.7);
  color: var(--ink, #021A54);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 206, 227, 0.35);
  border-color: var(--primary, #FF85BB);
}

.btn-secondary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 133, 187, 0.3);
  background: rgba(255, 206, 227, 0.25);
  color: var(--ink, #021A54);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-chip:hover:not(:disabled) {
  background: rgba(255, 206, 227, 0.5);
}

.btn-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Skeleton Shimmer ────────────────────────────────────────────── */
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.skeleton-card {
  height: 100px;
  border-radius: 14px;
  background: linear-gradient(90deg, #f0e6ec 25%, #fce8f1 50%, #f0e6ec 75%);
  background-size: 200% 100%;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.shimmer {
  animation: shimmer 1.4s infinite;
}

/* ── Empty State ─────────────────────────────────────────────────── */
.empty-state {
  padding: 28px 0;
  text-align: center;
}

.empty-icon {
  font-size: 2.5rem;
  margin: 0 0 8px;
}

.empty-title {
  margin: 0 0 4px;
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink, #021A54);
}

.empty-sub {
  margin: 0;
  font-size: 0.85rem;
  color: var(--ink-muted, #6e6e73);
}

/* ── Application Cards ───────────────────────────────────────────── */
.verification-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.app-card {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(255, 133, 187, 0.15);
  background: rgba(255, 255, 255, 0.65);
  cursor: pointer;
  transition: transform 0.13s, box-shadow 0.13s;
  position: relative;
  outline: none;
}

.app-card:hover,
.app-card:focus-visible {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(2, 26, 84, 0.1);
}

.app-card.approved {
  border-left: 3px solid #1a7a48;
}

.app-card.rejected {
  border-left: 3px solid #c22840;
}

.app-card.reupload-requested {
  border-left: 3px solid var(--primary, #FF85BB);
}

.app-card.pending {
  border-left: 3px solid #a06000;
}

.app-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.app-course {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--ink, #021A54);
  word-break: break-word;
}

.app-meta {
  margin: 0 0 4px;
  font-size: 0.8rem;
  color: var(--ink-muted, #6e6e73);
}

.app-note {
  margin: 6px 0 0;
  font-size: 0.82rem;
  color: var(--ink, #021A54);
  background: rgba(255, 206, 227, 0.3);
  border-radius: 8px;
  padding: 6px 8px;
}

.app-hint {
  margin: 8px 0 0;
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--primary, #FF85BB);
}

/* ── Status Badge ────────────────────────────────────────────────── */
.status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-badge.pending {
  background: rgba(255, 214, 100, 0.25);
  color: #a06000;
  border: 1px solid rgba(160, 96, 0, 0.2);
}

.status-badge.approved {
  background: rgba(26, 122, 72, 0.12);
  color: #1a7a48;
  border: 1px solid rgba(26, 122, 72, 0.2);
}

.status-badge.rejected {
  background: rgba(200, 40, 60, 0.1);
  color: #c22840;
  border: 1px solid rgba(200, 40, 60, 0.2);
}

.status-badge.reupload-requested {
  background: rgba(255, 133, 187, 0.18);
  color: #b5005e;
  border: 1px solid rgba(255, 133, 187, 0.35);
}

/* ── Detail Modal ────────────────────────────────────────────────── */
.detail-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(2, 26, 84, 0.4);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding: 20px;
}

.glass-modal {
  width: min(100%, 540px);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(20px) saturate(1.8);
  -webkit-backdrop-filter: blur(20px) saturate(1.8);
  border: 1px solid rgba(255, 133, 187, 0.22);
  box-shadow:
    0 24px 60px rgba(2, 26, 84, 0.18),
    0 4px 16px rgba(255, 133, 187, 0.12);
  padding: 24px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 14px;
}

.modal-kicker {
  margin: 0 0 4px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--primary, #FF85BB);
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--ink, #021A54);
}

.btn-close {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid rgba(2, 26, 84, 0.12);
  background: rgba(245, 245, 245, 0.8);
  color: var(--ink, #021A54);
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.13s;
}

.btn-close:hover {
  background: rgba(255, 206, 227, 0.5);
}

.modal-status-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.modal-date {
  font-size: 0.85rem;
  color: var(--ink-muted, #6e6e73);
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.detail-block {
  padding: 12px 14px;
  background: rgba(245, 245, 245, 0.7);
  border: 1px solid rgba(2, 26, 84, 0.08);
  border-radius: 14px;
}

.detail-label {
  margin: 0 0 6px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--primary, #FF85BB);
}

.detail-value {
  margin: 0;
  font-size: 0.9rem;
  color: var(--ink, #021A54);
  line-height: 1.55;
}

.modal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

/* ── Transitions ─────────────────────────────────────────────────── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-fade-enter-active {
  transition: all 0.2s ease;
}
.slide-fade-leave-active {
  transition: all 0.15s ease;
}
.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>