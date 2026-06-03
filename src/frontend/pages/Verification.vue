<template>
  <div class="view page active verification-page">
    <section class="card submit-card">
      <h2>Upload Documents for Verification</h2>
      <form @submit.prevent="submitVerification" class="stack">
        <label>Course Code
          <input v-model="verification.courseCode" placeholder="TMF3953" />
        </label>
        <p class="meta">Tip: enter any course code you teach (e.g., TMF3953, CS101, MATH2020).</p>
        <label>Verification File
          <input
            ref="verificationFileInput"
            @change="handleFileChange"
            type="file"
            accept=".pdf,.doc,.docx,image/png,image/jpeg"
            required
          />
        </label>
        <p class="meta">Allowed: PDF, DOC, DOCX, PNG, JPEG. Max size: 10MB.</p>
        <button class="primary" type="submit">Submit for Verification</button>
      </form>
      <p v-if="message" class="message">{{ message }}</p>
    </section>

    <section class="card app-section">
      <div class="search-row">
        <h3>My Subject Verifications</h3>
        <button @click="loadApplications" class="chip" type="button">Refresh</button>
      </div>

      <p v-if="applications.length === 0" class="empty-state">
        No verification applications yet.
      </p>

      <div v-else class="verification-grid">
        <article
          v-for="app in applications"
          :key="app.id"
          class="verification-card clickable"
          role="button"
          tabindex="0"
          @click="openDetails(app)"
          @keydown.enter.prevent="openDetails(app)"
        >
          <div class="card-head">
            <h4>{{ app.courseCode }}</h4>
            <span class="status-badge" :class="statusClass(app)">{{ statusLabel(app) }}</span>
          </div>

          <p class="card-meta">Submitted: {{ app.createdAt }}</p>
          <p v-if="app.reviewNotes" class="card-note">Review note: {{ app.reviewNotes }}</p>

          <div class="card-actions">
            <span class="action-hint">Click for more detail</span>
          </div>
        </article>
      </div>
    </section>

    <section class="card app-section">
      <div class="search-row">
        <h3>Recent Verification Updates</h3>
        <button @click="loadApplications" class="chip" type="button">Refresh</button>
      </div>

      <p v-if="verificationNotifications.length === 0" class="empty-state">
        No recent updates.
      </p>

      <div v-else class="notification-list">
        <article v-for="notif in verificationNotifications" :key="notif.id" class="notification-item">
          <p class="notification-title">{{ notif.message }}</p>
          <p class="notification-date">{{ notif.createdAt }}</p>
        </article>
      </div>
    </section>

    <teleport to="body">
      <transition name="fade">
        <div v-if="selectedApplication" class="detail-backdrop" @click="closeDetails">
          <section class="detail-modal" @click.stop>
            <div class="detail-header">
              <div>
                <p class="detail-kicker">Verification detail</p>
                <h3>{{ selectedApplication.courseCode }}</h3>
              </div>
              <button class="close-btn" type="button" @click="closeDetails">&times;</button>
            </div>

            <div class="detail-status-row">
              <span class="status-badge" :class="statusClass(selectedApplication)">
                {{ statusLabel(selectedApplication) }}
              </span>
              <span class="detail-date">Submitted {{ selectedApplication.createdAt }}</span>
            </div>

            <div class="detail-body">
              <div class="detail-section">
                <p class="detail-label">{{ detailNoteLabel(selectedApplication) }}</p>
                <p class="detail-value">
                  {{ selectedApplication.reviewNotes || 'No admin comment was provided yet.' }}
                </p>
              </div>

              <div class="detail-section">
                <p class="detail-label">Proof file</p>
                <p class="detail-value">
                  {{ selectedApplication.proofUrl ? 'You can open the submitted document below.' : 'No proof file was attached.' }}
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
              <input
                ref="reuploadFileInput"
                type="file"
                accept=".pdf,.doc,.docx,image/png,image/jpeg"
                style="display:none"
                @change="handleReuploadFileChange"
              />

              <button
                v-if="isReuploadRequested(selectedApplication)"
                class="chip"
                type="button"
                :disabled="reuploadUploading"
                @click="triggerReupload"
              >
                {{ reuploadUploading ? 'Uploading...' : 'Reupload Proof' }}
              </button>
            </div>
          </section>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api, getUser } from '@/api.js'
import { normalizeTutorVerification } from '@/utils/records.js'

const router = useRouter()
const currentUser = getUser()
const currentUserRole = String(currentUser?.role || '').toLowerCase().trim()
if (!currentUser || (currentUserRole !== 'tutor' && currentUserRole !== 'admin')) {
  router.replace('/resources')
}

const verification = ref({ courseCode: '' })
const verificationFile = ref(null)
const verificationFileInput = ref(null)
const applications = ref([])
const message = ref('')
const selectedApplication = ref(null)
const reuploadFileInput = ref(null)
const reuploadFile = ref(null)
const reuploadUploading = ref(false)

const isReuploadRequested = (application) => {
  if (!application) return false
  const status = String(application.status || '').toUpperCase()
  const hasReviewNote = String(application.reviewNotes || '').trim().length > 0
  return status === 'REUPLOAD_REQUESTED' || (status === 'PENDING' && hasReviewNote)
}

const statusLabel = (application) => {
  if (isReuploadRequested(application)) return 'REUPLOAD REQUESTED'
  return String(application?.status || 'PENDING')
}

const statusClass = (application) => {
  if (isReuploadRequested(application)) return 'reupload-requested'
  return String(application?.status || '').toLowerCase()
}

const detailNoteLabel = (application) => {
  if (isReuploadRequested(application)) return 'Why re-upload is requested'
  if (String(application?.status || '').toUpperCase() === 'REJECTED') return 'Why it was rejected'
  return 'Admin note'
}

const verificationNotifications = computed(() => {
  return applications.value.map((item) => ({
    id: item.id,
    message: `${item.courseCode}: ${statusLabel(item).toLowerCase()}`,
    createdAt: item.createdAt
  }))
})

const loadVerificationData = async () => {
  const resp = await api('/tutor-verifications/me')
  applications.value = (resp.applications || []).map(normalizeTutorVerification)
}

const openProof = (application) => {
  const url = String(application?.proofUrl || '').trim()
  if (!url) {
    message.value = 'No proof file available for this application.'
    return
  }

  window.open(url, '_blank', 'noopener,noreferrer')
}

const openDetails = (application) => {
  selectedApplication.value = application
}

const closeDetails = () => {
  selectedApplication.value = null
}

const handleFileChange = (event) => {
  verificationFile.value = event.target.files[0] || null
}

const submitVerification = async () => {
  if (!verificationFile.value) {
    message.value = 'Please select a file'
    return
  }

  try {
    const uploadData = new FormData()
    uploadData.append('document', verificationFile.value)
    const uploadResult = await api('/uploads/verification', 'POST', uploadData)

    const proofUrl = uploadResult?.fileUrl
    if (!proofUrl) {
      throw new Error('Upload did not return a file URL.')
    }

    await api('/tutor-verifications', 'POST', {
      courseCode: verification.value.courseCode,
      proofUrl
    })

    message.value = 'Verification submitted!'
    verification.value = { courseCode: '' }
    verificationFile.value = null
    if (verificationFileInput.value) {
      verificationFileInput.value.value = ''
    }
    await loadVerificationData()
  } catch (err) {
    message.value = `Error: ${err.message}`
  }
}

const handleReuploadFileChange = (event) => {
  reuploadFile.value = event.target.files[0] || null
  if (reuploadFile.value) {
    // start upload immediately
    submitReupload()
  }
}

const triggerReupload = () => {
  if (reuploadFileInput.value) reuploadFileInput.value.click()
}

const submitReupload = async () => {
  if (!reuploadFile.value || !selectedApplication.value) return
  try {
    reuploadUploading.value = true
    const uploadData = new FormData()
    uploadData.append('document', reuploadFile.value)
    const uploadResult = await api('/uploads/verification', 'POST', uploadData)
    const proofUrl = uploadResult?.fileUrl
    if (!proofUrl) throw new Error('Upload failed to return file URL')

    // Call reupload endpoint for tutor verification
    await api(`/tutor-verifications/${selectedApplication.value.id}/reupload`, 'POST', { proofUrl })

    // refresh data and close modal
    await loadApplications()
    selectedApplication.value = null
  } catch (err) {
    message.value = `Reupload failed: ${err.message}`
  } finally {
    reuploadUploading.value = false
    reuploadFile.value = null
    if (reuploadFileInput.value) reuploadFileInput.value.value = ''
  }
}

const loadApplications = async () => {
  try {
    await loadVerificationData()
  } catch (err) {
    console.error('Failed to load applications:', err)
  }
}

onMounted(() => {
  loadApplications()
})
</script>

<style scoped>
.verification-page {
  display: grid;
  gap: 14px;
}

.submit-card h2 {
  margin: 0 0 12px;
}

.message {
  margin-top: 10px;
  color: #c22e45;
  font-weight: 600;
}

.empty-state {
  margin: 8px 0 0;
  color: #7a6d75;
}

.verification-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 10px;
  margin-top: 8px;
}

.verification-card {
  border: 1px solid #e8d7dd;
  border-radius: 14px;
  padding: 12px;
  background: #fff;
  box-shadow: 0 3px 10px rgba(41, 13, 28, 0.05);
}

.verification-card.clickable {
  cursor: pointer;
  transition: transform 130ms ease, box-shadow 130ms ease;
}

.verification-card.clickable:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(41, 13, 28, 0.1);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.card-head h4 {
  margin: 0;
  color: #3f2b34;
}

.status-badge {
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 999px;
  padding: 3px 9px;
  text-transform: lowercase;
}

.status-badge.pending {
  background: #fff2c5;
  color: #825f00;
}

.status-badge.reupload-requested {
  background: #ffe7cc;
  color: #8c4b00;
}

.status-badge.approved {
  background: #d9f8e4;
  color: #1a7a48;
}

.status-badge.rejected {
  background: #ffe2e8;
  color: #a32b49;
}

.card-meta {
  margin: 8px 0 0;
  color: #766873;
  font-size: 0.9rem;
}

.card-note {
  margin: 6px 0 0;
  color: #5f4c57;
  font-size: 0.88rem;
}

.card-actions {
  margin-top: 10px;
}

.action-hint {
  color: #8a7580;
  font-size: 0.84rem;
  font-weight: 600;
}

.detail-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(32, 10, 20, 0.45);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: 20px;
}

.detail-modal {
  width: min(100%, 560px);
  border-radius: 18px;
  background: linear-gradient(180deg, #fff 0%, #fff8fb 100%);
  border: 1px solid #edd8df;
  box-shadow: 0 20px 60px rgba(37, 12, 25, 0.22);
  padding: 18px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.detail-kicker {
  margin: 0 0 4px;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9b5d78;
}

.detail-header h3 {
  margin: 0;
  color: #3f2b34;
}

.close-btn {
  border: 0;
  background: #f8ebf0;
  color: #7c3654;
  border-radius: 999px;
  width: 36px;
  height: 36px;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}

.detail-status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 12px;
}

.detail-date {
  color: #786972;
  font-size: 0.9rem;
}

.detail-body {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.detail-section {
  background: #fff;
  border: 1px solid #efdde4;
  border-radius: 14px;
  padding: 12px 14px;
}

.detail-label {
  margin: 0 0 6px;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #9b5d78;
}

.detail-value {
  margin: 0;
  color: #4d3a44;
  line-height: 1.55;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.detail-proof-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 160ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.notification-list {
  display: grid;
  gap: 8px;
  margin-top: 8px;
}

.notification-item {
  border: 1px solid #ecdce2;
  border-radius: 12px;
  padding: 10px 12px;
  background: #fff;
}

.notification-title {
  margin: 0;
  color: #42333c;
}

.notification-date {
  margin: 4px 0 0;
  color: #7f7480;
  font-size: 0.86rem;
}
</style>
