<template>
  <main class="page-bg session-page">
    <section class="phone-shell">
      <div class="view page active">
        <section class="card session-form-card">
          <h2>{{ userRole === 'tutor' ? 'Manage Session' : 'Book a Session' }}</h2>
          
          <!-- Tutor Form: Update Availability -->
          <form v-if="userRole === 'tutor'" @submit.prevent="submitAvailability" class="session-form">
            <div class="form-group">
              <label for="courseCode">Course Code</label>
              <input 
                id="courseCode"
                v-model="availability.courseCode" 
                placeholder="TMF3953"
                required
              />
            </div>

            <div class="form-group">
              <label for="dayOfWeek">Day of Week
                <span class="required">* (required)</span>
              </label>
              <select v-model="availability.dayOfWeek" id="dayOfWeek" required>
                <option v-for="day in days" :key="day" :value="day">{{ day }}</option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="startTime">Start
                  <span class="required">* (required)</span>
                </label>
                <input 
                  id="startTime"
                  v-model="availability.startTime" 
                  type="time" 
                  required 
                />
              </div>
              <div class="form-group">
                <label for="endTime">End
                  <span class="required">* (required)</span>
                </label>
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
          <form v-if="userRole === 'tutee'" @submit.prevent="submitBooking" class="session-form">
            <p class="form-tip">Tip: Use the tutor's matric number from the Tutor page.</p>

            <div class="form-group">
              <label for="tutorId">Tutor Matric Number</label>
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
                placeholder="TMF3953"
              />
            </div>

            <div class="form-group">
              <label for="sessionTime">Session Time
                <span class="required">* (required)</span>
              </label>
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
                  <p v-if="item.sessionTime || item.date">
                    <span class="detail-label">Time:</span>
                    {{ formatSessionTime(item.sessionTime || item.date) }}
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

<script>
import { api } from '../utils/api.js'
import { getUser } from '../utils/auth.js'
export default {
  name: 'Session',
  data() {
    const user = getUser()
    return {
      userRole: user?.role || 'tutee',
      availability: { courseCode: '', dayOfWeek: 'Monday', startTime: '', endTime: '' },
      booking: { tutorId: '', courseCode: '', sessionTime: '' },
      sessionList: [],
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      message: '',
    }
  },
  methods: {
    async submitAvailability() {
      try {
        await api('/availability', 'POST', this.availability)
        this.message = 'Session updated!'
        this.availability = { courseCode: '', dayOfWeek: 'Monday', startTime: '', endTime: '' }
        await this.loadSessions()
      } catch (err) {
        this.message = `Error: ${err.message}`
      }
    },
    async submitBooking() {
      try {
        await api('/bookings', 'POST', this.booking)
        this.message = 'Booking sent!'
        this.booking = { tutorId: '', courseCode: '', sessionTime: '' }
        await this.loadSessions()
      } catch (err) {
        this.message = `Error: ${err.message}`
      }
    },
    async loadSessions() {
      try {
        const resp = await api(this.userRole === 'tutor' ? '/availability' : '/bookings')
        this.sessionList = resp.sessions || resp.bookings || []
      } catch (err) {
        console.error('Failed to load sessions:', err)
      }
    },
  },
  mounted() {
    const viewEl = document.querySelector('.view')
    const topbar = document.querySelector('.topbar')
    if (viewEl) {
      viewEl.scrollTop = topbar ? topbar.offsetHeight : 80
    }
    this.loadSessions()
  },
}
</script>
