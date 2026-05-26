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
            <div v-for="item in sessionList" :key="item.id" class="session-card">
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
            </div>
          </div>
        </section>

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
import { useRoute } from 'vue-router'
import { api, getUser } from '@/api.js'
import { formatDateTimeValue } from '@/utils/records.js'

const user = getUser()
const route = useRoute()
const userRole = ref(user?.role || 'tutee')
const isAdmin = String(user?.role || '').toLowerCase().trim() === 'admin'
const canManageAvailability = userRole.value === 'tutor' || isAdmin
const canBookSession = userRole.value === 'tutee' || isAdmin
const availability = ref({ courseCode: '', dayOfWeek: 'Monday', startTime: '', endTime: '' })
const booking = ref({ tutorId: '', courseCode: '', sessionTime: '' })
const sessionList = ref([])
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

const loadSessions = async () => {
  try {
    if (userRole.value === 'tutor') {
      const resp = await api('/availability/me')
      sessionList.value = (resp.availability || []).map((item) => ({
        id: item.id,
        status: 'available',
        sessionTime: item.start_time && item.end_time ? `${item.start_time} - ${item.end_time}` : item.start_time || '',
        courseCode: item.course_code || '',
        dayOfWeek: item.day_of_week || '',
      }))
      return
    }
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

@media (max-width: 700px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .btn-primary {
    width: 100%;
  }
}
</style>
