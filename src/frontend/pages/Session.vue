<template>
  <main class="page-bg session-page">
    <section class="phone-shell">
      <div class="view page active">
        <section class="card session-form-card">
          <h2>{{ isAdmin ? 'Manage and Book Sessions' : (userRole === 'tutor' ? 'Manage Session' : 'Book a Session') }}</h2>
          
          <!-- Tutor Form: Update Availability -->
          <form v-if="canManageAvailability" @submit.prevent="submitAvailability" class="session-form">
            <div class="form-group">
              <label for="courseCode">Course Code</label>
              <input 
                id="courseCode"
                v-model="availability.courseCode" 
                @input="availability.courseCode = availability.courseCode.toUpperCase()"
                placeholder="TMF3953"
                style="text-transform: uppercase;"
                required
              />
            </div>

            <div class="form-group">
              <label for="dayOfWeek">Day of Week <span class="required">*</span></label>
              <select v-model="availability.dayOfWeek" id="dayOfWeek" required>
                <option v-for="day in days" :key="day" :value="day">{{ day }}</option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="startTime">Start <span class="required">*</span></label>
                <input 
                  id="startTime"
                  v-model="availability.startTime" 
                  type="time" 
                  required 
                />
              </div>
              <div class="form-group">
                <label for="endTime">End <span class="required">*</span></label>
                <input 
                  id="endTime"
                  v-model="availability.endTime" 
                  type="time" 
                  required 
                />
              </div>
            </div>

            <button class="btn-primary" type="submit">Update Session</button>
          </form>

          <!-- Tutee Form: Book Session -->
          <form v-if="canBookSession" @submit.prevent="submitBooking" class="session-form">
            <p class="form-tip">Tip: Use the tutor's matric number from the Tutor page.</p>

            <div class="form-group">
              <label for="tutorId">Tutor Matric Number <span class="required">*</span></label>
              <input 
                id="tutorId"
                v-model="booking.tutorId" 
                type="text" 
                required 
              />
            </div>

            <div class="form-group">
              <label for="bookingCourse">Course Code</label>
              <input 
                id="bookingCourse"
                v-model="booking.courseCode" 
                @input="booking.courseCode = booking.courseCode.toUpperCase()"
                placeholder="TMF3953"
                style="text-transform: uppercase;"
              />
            </div>

            <div class="form-group">
              <label for="sessionTime">Session Time <span class="required">*</span></label>
              <input 
                id="sessionTime"
                v-model="booking.sessionTime" 
                type="datetime-local" 
                required 
              />
            </div>

            <button class="btn-primary" type="submit">Send Booking</button>
          </form>
        </section>

        <!-- Sessions List -->
        <section class="card sessions-list-card">
          <h3>{{ userRole === 'tutor' ? 'Upcoming Sessions' : 'My Requests' }}</h3>
          <p class="session-count" v-if="sessionList.length > 0">Showing {{ sessionList.length }} of {{ sessionList.length }} sessions</p>
          
          <div v-if="sessionList.length === 0" class="empty-state">
            <p>No {{ userRole === 'tutor' ? 'upcoming sessions' : 'booking requests' }} yet.</p>
          </div>

          <div v-else class="sessions-grid">
            <button 
              v-for="item in sessionList" 
              :key="item.id" 
              class="session-card"
              @click="selectedSession = item"
              type="button"
            >
              <div class="session-status-bar" :class="'status-' + (item.status || 'pending').toLowerCase()"></div>
              
              <div class="session-content">
                <div class="session-header">
                  <strong class="session-status">{{ (item.status || 'PENDING').toUpperCase() }}</strong>
                </div>

                <div class="session-details">
                  <p v-if="item.tutorName || item.tuteeName">
                    <span class="detail-label">With:</span>
                    {{ item.tutorName || item.tuteeName || 'N/A' }}
                  </p>
                  <p v-if="item.dayOfWeek">
                    <span class="detail-label">Day:</span>
                    {{ item.dayOfWeek }}
                  </p>
                  <p v-if="item.sessionTime || item.date">
                    <span class="detail-label">Time:</span>
                    {{ formatDateTimeValue(item.sessionTime || item.date, 'N/A', 'en-MY', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
                  </p>
                  <p v-if="item.courseCode || item.course">
                    <span class="detail-label">Course:</span>
                    {{ item.courseCode || item.course || 'N/A' }}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </section>

        <!-- Session Detail Modal -->
        <div v-if="selectedSession" class="modal-backdrop" @click.self="selectedSession = null">
          <div class="modal-card">
            <button class="modal-close" @click="selectedSession = null" type="button">×</button>
            
            <div class="modal-header">
              <h3>Session Details</h3>
              <span class="status-badge" :class="'status-' + (selectedSession.status || 'pending').toLowerCase()">
                {{ (selectedSession.status || 'PENDING').toUpperCase() }}
              </span>
            </div>

            <div class="modal-body">
              <div class="detail-row">
                <span class="detail-label">{{ userRole === 'tutor' ? 'From:' : 'With:' }}</span>
                <span class="detail-value">{{ selectedSession.tuteeName || selectedSession.tutorName || 'N/A' }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">
                  {{ formatDateTimeValue(selectedSession.sessionTime, 'N/A', 'en-MY', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
                </span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Course:</span>
                <span class="detail-value">{{ selectedSession.courseCode || 'N/A' }}</span>
              </div>
            </div>

            <div class="modal-actions">
              <button 
                v-if="userRole === 'tutor' && selectedSession.status === 'pending'"
                @click="approveSession"
                class="btn-approve"
                type="button"
              >
                Approve
              </button>
              <button 
                v-if="userRole === 'tutor' && selectedSession.status === 'pending'"
                @click="rejectSession"
                class="btn-reject"
                type="button"
              >
                Reject
              </button>
              <button 
                v-if="userRole === 'tutor' && selectedSession.status === 'accepted'"
                @click="completeSession"
                class="btn-complete"
                type="button"
              >
                Mark Complete
              </button>
              <button 
                v-if="(userRole === 'tutor' || userRole === 'tutee') && (selectedSession.status === 'completed' || selectedSession.status === 'accepted')"
                @click="goToReview"
                class="btn-review"
                type="button"
              >
                Leave Review
              </button>
              <button 
                @click="selectedSession = null"
                class="btn-close"
                type="button"
              >
                Close
              </button>
            </div>
          </div>
        </div>

        <!-- Message Display -->
        <div v-if="message" class="message-box" :class="message.includes('Error') ? 'error' : 'success'">
          {{ message }}
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api, getUser } from '@/api.js'
import { formatDateTimeValue } from '@/utils/records.js'

const user = getUser()
const router = useRouter()
const route = useRoute()
const userRole = ref(user?.role || 'tutee')
const isAdmin = String(user?.role || '').toLowerCase().trim() === 'admin'
const canManageAvailability = userRole.value === 'tutor' || isAdmin
const canBookSession = userRole.value === 'tutee' || isAdmin
const availability = ref({ courseCode: '', dayOfWeek: 'Monday', startTime: '', endTime: '' })
const booking = ref({ tutorId: '', courseCode: '', sessionTime: '' })
const sessionList = ref([])
const selectedSession = ref(null)
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const message = ref('')

const applyBookingPrefill = () => {
  if (!canBookSession) return

  const localTutorId = localStorage.getItem('prefillTutorId')
  const tutorIdFromQuery = typeof route.query.tutorId === 'string' ? route.query.tutorId : ''
  const courseFromQuery = typeof route.query.courseCode === 'string' ? route.query.courseCode : ''
  const timeFromQuery = typeof route.query.sessionTime === 'string' ? route.query.sessionTime : ''

  const tutorPrefill = String(tutorIdFromQuery || localTutorId || '').trim()
  if (tutorPrefill) {
    booking.value.tutorId = tutorPrefill
  }

  if (courseFromQuery) {
    booking.value.courseCode = String(courseFromQuery).toUpperCase()
  }

  if (timeFromQuery) {
    booking.value.sessionTime = timeFromQuery
  }

  if (localTutorId) {
    localStorage.removeItem('prefillTutorId')
  }
}

const submitAvailability = async () => {
  try {
    await api('/availability', 'POST', availability.value)
    message.value = 'Session updated!'
    availability.value = { courseCode: '', dayOfWeek: 'Monday', startTime: '', endTime: '' }
    await loadSessions()
  } catch (err) {
    message.value = `Error: ${err.message}`
  }
}

const submitBooking = async () => {
  try {
    await api('/bookings', 'POST', booking.value)
    message.value = 'Booking sent!'
    booking.value = { tutorId: '', courseCode: '', sessionTime: '' }
    await loadSessions()
  } catch (err) {
    message.value = `Error: ${err.message}`
  }
}

const approveSession = async () => {
  try {
    await api(`/bookings/${selectedSession.value.id}/decision`, 'POST', { decision: 'accepted' })
    message.value = 'Booking approved!'
    selectedSession.value = null
    await loadSessions()
  } catch (err) {
    message.value = `Error: ${err.message}`
  }
}

const rejectSession = async () => {
  try {
    await api(`/bookings/${selectedSession.value.id}/decision`, 'POST', { decision: 'rejected' })
    message.value = 'Booking rejected.'
    selectedSession.value = null
    await loadSessions()
  } catch (err) {
    message.value = `Error: ${err.message}`
  }
}

const completeSession = async () => {
  try {
    await api(`/bookings/${selectedSession.value.id}/complete`, 'POST', {})
    message.value = 'Session marked complete! Please leave a review.'
    selectedSession.value = null
    await loadSessions()
  } catch (err) {
    message.value = `Error: ${err.message}`
  }
}

const goToReview = () => {
  router.push({ name: 'Review', params: { resourceId: selectedSession.value.id } })
}

const loadSessions = async () => {
  try {
    const resp = await api('/bookings/inbox')
    sessionList.value = (resp.bookings || []).map((item) => ({
      id: item.id,
      status: item.status,
      tutorName: item.tutor_name,
      tuteeName: item.tutee_name,
      sessionTime: item.session_time,
      courseCode: item.course_code,
    }))
  } catch (err) {
    console.error('Failed to load sessions:', err)
  }
}

onMounted(() => {
  applyBookingPrefill()
  loadSessions()
})

watch(
  () => route.query,
  () => {
    applyBookingPrefill()
  }
)
</script>

<style scoped>
.session-page {
  min-height: 100vh;
  background:
    radial-gradient(80rem 30rem at -10% -10%, rgba(180, 23, 76, 0.18), transparent 55%),
    radial-gradient(75rem 26rem at 110% 0%, rgba(130, 15, 55, 0.14), transparent 52%),
    linear-gradient(180deg, #fff7fa, #ffe9f0 60%, #ffd6e2);
}

.view {
  padding: 22px 16px 28px;
  overflow-y: auto;
}

.card {
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.9), rgba(255, 248, 251, 0.75));
  border: 1px solid rgba(164, 24, 71, 0.2);
  border-radius: 18px;
  padding: 18px;
  margin-bottom: 16px;
  box-shadow: 0 12px 34px rgba(95, 14, 43, 0.12);
  backdrop-filter: blur(14px) saturate(140%);
}

h2,
h3 {
  margin: 0;
  color: #4d0f2a;
}

h2 {
  font-size: clamp(1.35rem, 2.5vw, 1.7rem);
  margin-bottom: 14px;
}

h3 {
  font-size: 1.12rem;
  margin-bottom: 10px;
}

.session-form {
  display: grid;
  gap: 12px;
}

.form-tip {
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(137, 14, 54, 0.25);
  background: rgba(255, 255, 255, 0.75);
  color: #6c2942;
  font-size: 0.86rem;
}

.form-group {
  display: grid;
  gap: 6px;
}

.form-row {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  width: fit-content;
  font-size: 0.86rem;
  font-weight: 700;
  color: #5b1832;
}

.required {
  display: inline;
  color: #9e0f3f;
  font-size: 0.9rem;
  line-height: 1;
}

input,
select {
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(137, 14, 54, 0.3);
  background: rgba(255, 255, 255, 0.83);
  padding: 10px 12px;
  color: #4f1530;
  font-size: 0.93rem;
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

input:focus,
select:focus {
  border-color: #8e1240;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 0 0 3px rgba(167, 21, 69, 0.2);
}

.btn-primary {
  margin-top: 6px;
  padding: 12px 16px;
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.session-count {
  margin: 0 0 12px;
  color: #7a4a5f;
  font-size: 0.84rem;
}

.empty-state {
  border: 1px dashed rgba(136, 24, 61, 0.32);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  padding: 16px;
  color: #7a4a5f;
}

.empty-state p {
  margin: 0;
}

.sessions-grid {
  display: grid;
  gap: 12px;
}

.session-card {
  border-radius: 14px;
  border: 1px solid rgba(153, 31, 73, 0.22);
  background: rgba(255, 255, 255, 0.78);
  overflow: hidden;
  box-shadow: 0 8px 20px rgba(105, 18, 49, 0.12);
}

.session-status-bar {
  height: 5px;
  background: #9e0f3f;
}

.session-status-bar.status-available {
  background: #b2185b;
}

.session-status-bar.status-accepted {
  background: #8c0f3b;
}

.session-status-bar.status-pending {
  background: #be2d68;
}

.session-status-bar.status-rejected,
.session-status-bar.status-cancelled {
  background: #7e324b;
}

.session-content {
  padding: 12px 14px;
}

.session-header {
  margin-bottom: 8px;
}

.session-status {
  color: #5a1731;
  font-size: 0.82rem;
  letter-spacing: 0.06em;
}

.session-details p {
  margin: 0 0 6px;
  color: #613247;
  font-size: 0.9rem;
}

.session-details p:last-child {
  margin-bottom: 0;
}

.detail-label {
  color: #8f2450;
  font-weight: 700;
  margin-right: 6px;
}

.message-box {
  margin-top: 4px;
  border-radius: 12px;
  padding: 11px 12px;
  font-size: 0.9rem;
  font-weight: 600;
}

.message-box.success {
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(135, 18, 59, 0.28);
  color: #6f1f3e;
}

.message-box.error {
  background: rgba(245, 218, 228, 0.86);
  border: 1px solid rgba(141, 15, 55, 0.36);
  color: #7d173b;
}

.session-card {
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease;
}

.session-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(105, 18, 49, 0.18);
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-card {
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.95), rgba(255, 248, 251, 0.85));
  border: 1px solid rgba(164, 24, 71, 0.25);
  border-radius: 18px;
  box-shadow: 0 20px 50px rgba(95, 14, 43, 0.3);
  padding: 20px;
  max-width: 400px;
  width: 100%;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  font-size: 24px;
  color: #7a1f45;
  cursor: pointer;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  color: #4d0f2a;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
}

.modal-header h3 {
  margin: 0;
  color: #4d0f2a;
  font-size: 1.2rem;
}

.status-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.status-badge.status-pending {
  background: rgba(190, 45, 104, 0.15);
  color: #7a1f45;
}

.status-badge.status-accepted {
  background: rgba(140, 15, 59, 0.15);
  color: #5a1731;
}

.status-badge.status-completed {
  background: rgba(100, 10, 40, 0.15);
  color: #4d0f2a;
}

.modal-body {
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 0.95rem;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-value {
  color: #4d0f2a;
  font-weight: 600;
  text-align: right;
  flex: 1;
  margin-left: 12px;
}

.modal-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-approve,
.btn-reject,
.btn-complete,
.btn-review,
.btn-close {
  flex: 1;
  min-width: 100px;
  padding: 10px 12px;
  border: none;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 160ms ease;
}

.btn-approve {
  background: linear-gradient(135deg, #9e0f3f, #b21d5a);
  color: white;
}

.btn-approve:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(158, 15, 63, 0.3);
}

.btn-reject {
  background: linear-gradient(135deg, #7a1f45, #8e2d57);
  color: white;
}

.btn-reject:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(122, 31, 69, 0.3);
}

.btn-complete {
  background: linear-gradient(135deg, #be2d68, #d63a7a);
  color: white;
}

.btn-complete:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(190, 45, 104, 0.3);
}

.btn-review {
  background: linear-gradient(135deg, #8b5a9e, #a367b5);
  color: white;
}

.btn-review:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(139, 90, 158, 0.3);
}

.btn-close {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(164, 24, 71, 0.2);
  color: #7a1f45;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.9);
}

@media (max-width: 700px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .btn-primary {
    width: 100%;
  }
}
</style>
