<template>
  <main class="session-page">
    <div class="view">

      <!-- Header -->
      <div class="page-header">
        <h2>
          {{ isAdmin ? '🛠️ Manage Sessions' : userRole === 'tutor' ? '📅 My Sessions' : '📚 Book a Tutor' }}
        </h2>
        <p class="page-sub">{{ userRole === 'tutor' ? 'Set availability & manage bookings' : 'Schedule your tutoring session' }}</p>
      </div>

      <!-- Toast Message -->
      <transition name="toast">
        <div v-if="message" class="toast" :class="message.startsWith('Error') ? 'toast--error' : 'toast--success'">
          {{ message }}
        </div>
      </transition>

      <!-- Loading skeleton -->
      <div v-if="isLoading" class="skeleton-list">
        <div v-for="n in 3" :key="n" class="skeleton-card"></div>
      </div>

      <template v-else>

        <!-- Tutor: Availability Form -->
        <section v-if="canManageAvailability" class="glass-card">
          <h3>🗓️ Set Availability</h3>
          <form @submit.prevent="submitAvailability" class="session-form">
            <div class="form-group">
              <label for="courseCode">Course Code <span class="req">*</span></label>
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
              <label for="dayOfWeek">Day <span class="req">*</span></label>
              <select v-model="availability.dayOfWeek" id="dayOfWeek" required>
                <option v-for="day in days" :key="day" :value="day">{{ day }}</option>
              </select>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label for="startTime">Start <span class="req">*</span></label>
                <input id="startTime" v-model="availability.startTime" type="time" required />
              </div>
              <div class="form-group">
                <label for="endTime">End <span class="req">*</span></label>
                <input id="endTime" v-model="availability.endTime" type="time" required />
              </div>
            </div>

            <button class="btn btn--primary" type="submit" :disabled="availSubmitting">
              {{ availSubmitting ? '⏳ Saving...' : '✅ Save Slot' }}
            </button>
          </form>
        </section>

        <!-- Tutee: Book Session Form -->
        <section v-if="canBookSession" class="glass-card">
          <h3>🎯 Book a Session</h3>
          <p class="form-tip">💡 Use tutor's matric number from the Tutors page.</p>
          <form @submit.prevent="submitBooking" class="session-form">
            <div class="form-group">
              <label for="tutorId">Tutor Matric <span class="req">*</span></label>
              <input id="tutorId" v-model="booking.tutorId" type="text" placeholder="e.g. 69638" required />
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
              <label for="sessionTime">Date & Time <span class="req">*</span></label>
              <input id="sessionTime" v-model="booking.sessionTime" type="datetime-local" required />
            </div>

            <button class="btn btn--primary" type="submit" :disabled="bookingSubmitting">
              {{ bookingSubmitting ? '⏳ Sending...' : '📨 Send Booking' }}
            </button>
          </form>
        </section>

        <!-- Sessions List -->
        <section class="glass-card">
          <div class="list-header">
            <h3>{{ userRole === 'tutor' ? '📋 Incoming Requests' : '📋 My Requests' }}</h3>
            <!-- -> Search -->
            <input
              v-model="searchQuery"
              class="search-input"
              placeholder="🔍 Search course, name..."
            />
          </div>

          <!-- -> Filter chips -->
          <div class="filter-chips">
            <button
              v-for="f in statusFilters"
              :key="f.value"
              class="chip"
              :class="{ 'chip--active': activeFilter === f.value }"
              @click="activeFilter = f.value"
              type="button"
            >{{ f.label }}</button>
          </div>

          <!-- -> Summary bar -->
          <div v-if="sessionList.length > 0" class="summary-bar">
            <span>📦 {{ filteredSessions.length }} shown</span>
            <span>⏳ {{ pendingCount }} pending</span>
            <span>✅ {{ acceptedCount }} accepted</span>
          </div>

          <div v-if="filteredSessions.length === 0" class="empty-state">
            <p>{{ searchQuery || activeFilter !== 'all' ? '🔍 No matches found.' : '📭 No sessions yet.' }}</p>
          </div>

          <div v-else class="sessions-grid">
            <button
              v-for="item in filteredSessions"
              :key="item.id"
              class="session-card"
              @click="openSession(item)"
              type="button"
            >
              <div class="status-stripe" :class="'stripe--' + (item.status || 'pending').toLowerCase()"></div>
              <div class="session-content">
                <div class="session-top">
                  <span class="status-pill" :class="'pill--' + (item.status || 'pending').toLowerCase()">
                    {{ (item.status || 'PENDING').toUpperCase() }}
                  </span>
                  <span class="course-tag">{{ item.courseCode || '—' }}</span>
                </div>
                <p class="session-who">
                  👤 {{ item.tutorName || item.tuteeName || 'Unknown' }}
                </p>
                <p class="session-when">
                  🕐 {{ formatDateTimeValue(item.sessionTime || item.date, '—', 'en-MY', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
                </p>
              </div>
            </button>
          </div>
        </section>

      </template>

      <!-- Session Detail Modal -->
      <teleport to="body">
        <transition name="fade">
          <div
            v-if="selectedSession"
            class="modal-backdrop"
            @click.self="closeModal"
            @keydown.escape.window="closeModal"
          >
            <div class="modal-card" role="dialog" aria-modal="true" aria-label="Session Details" ref="modalEl">
              <button class="modal-close" @click="closeModal" type="button" aria-label="Close">×</button>

              <div class="modal-header">
                <h3>Session Details</h3>
                <span class="status-pill" :class="'pill--' + (selectedSession.status || 'pending').toLowerCase()">
                  {{ (selectedSession.status || 'PENDING').toUpperCase() }}
                </span>
              </div>

              <div class="modal-body">
                <div class="detail-row">
                  <span class="detail-label">{{ userRole === 'tutor' ? 'From' : 'With' }}</span>
                  <span class="detail-val">{{ selectedSession.tuteeName || selectedSession.tutorName || 'N/A' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Time</span>
                  <span class="detail-val">
                    {{ formatDateTimeValue(selectedSession.sessionTime, '—', 'en-MY', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Course</span>
                  <span class="detail-val">{{ selectedSession.courseCode || 'N/A' }}</span>
                </div>
              </div>

              <!-- Tutor: Approve / Reject pending -->
              <div class="modal-actions">
                <template v-if="userRole === 'tutor' && selectedSession.status === 'pending'">
                  <button @click="approveSession" class="btn btn--approve" type="button" :disabled="actionBusy">
                    {{ actionBusy === 'approve' ? '⏳' : '✅ Approve' }}
                  </button>
                  <button @click="rejectSession" class="btn btn--reject" type="button" :disabled="actionBusy">
                    {{ actionBusy === 'reject' ? '⏳' : '❌ Reject' }}
                  </button>
                </template>

                <!-- Tutor: Mark complete accepted sessions -->
                <button
                  v-if="userRole === 'tutor' && selectedSession.status === 'accepted'"
                  @click="completeSession"
                  class="btn btn--complete"
                  type="button"
                  :disabled="actionBusy"
                >
                  {{ actionBusy === 'complete' ? '⏳ Completing...' : '🏁 Mark Complete' }}
                </button>

                <!-- Review form — tutee or tutor after completed -->
                <template v-if="showReviewForm">
                  <div class="review-inline">
                    <p class="review-title">⭐ Rate this session</p>
                    <div class="star-row">
                      <button
                        v-for="star in 5"
                        :key="star"
                        type="button"
                        class="star-btn"
                        :class="{ 'star-btn--active': star <= reviewRating }"
                        @click="reviewRating = star"
                        :aria-label="'Rate ' + star + ' stars'"
                      >★</button>
                    </div>
                    <textarea
                      v-model="reviewComment"
                      placeholder="Comment (optional)"
                      rows="3"
                      class="review-textarea"
                    ></textarea>
                    <div class="modal-actions" style="margin-top: 10px;">
                      <button @click="submitSessionReview" class="btn btn--approve" type="button" :disabled="reviewSubmitting">
                        {{ reviewSubmitting ? '⏳ Submitting...' : '📤 Submit Review' }}
                      </button>
                      <button @click="cancelReview" class="btn btn--ghost" type="button">Cancel</button>
                    </div>
                  </div>
                </template>

                <button
                  v-else-if="selectedSession.status === 'completed' && !showReviewForm"
                  @click="goToReview"
                  class="btn btn--review"
                  type="button"
                >
                  ✍️ Leave Review
                </button>

                <button @click="closeModal" class="btn btn--ghost" type="button">Close</button>
              </div>
            </div>
          </div>
        </transition>
      </teleport>

    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { api, getUser } from '@/api.js'
import { formatDateTimeValue } from '@/utils/records.js'

// -> State
const user = getUser()
const route = useRoute()
const userRole = ref(user?.role || 'tutee')
const isAdmin = String(user?.role || '').toLowerCase().trim() === 'admin'
const canManageAvailability = userRole.value === 'tutor' || isAdmin
const canBookSession = userRole.value === 'tutee' || isAdmin

const availability = ref({ courseCode: '', dayOfWeek: 'Monday', startTime: '', endTime: '' })
const booking = ref({ tutorId: '', courseCode: '', sessionTime: '' })
const sessionList = ref([])
const selectedSession = ref(null)
const message = ref('')
const isLoading = ref(false)
const availSubmitting = ref(false)
const bookingSubmitting = ref(false)
const actionBusy = ref(null) // 'approve' | 'reject' | 'complete' | null

const showReviewForm = ref(false)
const reviewRating = ref(0)
const reviewComment = ref('')
const reviewSubmitting = ref(false)

const searchQuery = ref('')
const activeFilter = ref('all')
const modalEl = ref(null)

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const statusFilters = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: '⏳ Pending' },
  { value: 'accepted', label: '✅ Accepted' },
  { value: 'completed', label: '🏁 Completed' },
  { value: 'rejected', label: '❌ Rejected' },
]

// -> Computed
const filteredSessions = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  return sessionList.value.filter(item => {
    const matchFilter = activeFilter.value === 'all' || (item.status || '').toLowerCase() === activeFilter.value
    if (!matchFilter) return false
    if (!q) return true
    const name = (item.tutorName || item.tuteeName || '').toLowerCase()
    const course = (item.courseCode || '').toLowerCase()
    return name.includes(q) || course.includes(q)
  })
})

const pendingCount = computed(() => sessionList.value.filter(s => s.status === 'pending').length)
const acceptedCount = computed(() => sessionList.value.filter(s => s.status === 'accepted').length)

// -> Auto-dismiss message
let msgTimer = null
watch(message, val => {
  if (val) {
    clearTimeout(msgTimer)
    msgTimer = setTimeout(() => { message.value = '' }, 4000)
  }
})

// -> Prefill from route/localStorage
const applyBookingPrefill = () => {
  if (!canBookSession) return
  const localTutorId = localStorage.getItem('prefillTutorId')
  const tutorIdFromQuery = typeof route.query.tutorId === 'string' ? route.query.tutorId : ''
  const courseFromQuery = typeof route.query.courseCode === 'string' ? route.query.courseCode : ''
  const timeFromQuery = typeof route.query.sessionTime === 'string' ? route.query.sessionTime : ''

  const tutorPrefill = String(tutorIdFromQuery || localTutorId || '').trim()
  if (tutorPrefill) booking.value.tutorId = tutorPrefill
  if (courseFromQuery) booking.value.courseCode = String(courseFromQuery).toUpperCase()
  if (timeFromQuery) booking.value.sessionTime = timeFromQuery
  if (localTutorId) localStorage.removeItem('prefillTutorId')
}

// -> Load sessions
const loadSessions = async () => {
  isLoading.value = true
  try {
    const resp = await api('/bookings/inbox')
    sessionList.value = (resp?.bookings || []).map(item => ({
      id: item.id,
      status: item.status || 'pending',
      tutorName: item.tutor_name || '',
      tuteeName: item.tutee_name || '',
      sessionTime: item.session_time || '',
      courseCode: item.course_code || '',
      date: item.date || '',
    }))
  } catch (err) {
    message.value = `Error: ${err?.message || 'Failed to load sessions'}`
  } finally {
    isLoading.value = false
  }
}

// -> Submit availability
const submitAvailability = async () => {
  availSubmitting.value = true
  try {
    await api('/availability', 'POST', availability.value)
    message.value = '✅ Availability saved!'
    availability.value = { courseCode: '', dayOfWeek: 'Monday', startTime: '', endTime: '' }
    await loadSessions()
  } catch (err) {
    message.value = `Error: ${err?.message || 'Failed to save'}`
  } finally {
    availSubmitting.value = false
  }
}

// -> Submit booking
const submitBooking = async () => {
  if (!booking.value.tutorId.trim()) {
    message.value = 'Error: Tutor matric required.'
    return
  }
  if (!booking.value.sessionTime) {
    message.value = 'Error: Session time required.'
    return
  }
  bookingSubmitting.value = true
  try {
    await api('/bookings', 'POST', booking.value)
    message.value = '📨 Booking sent!'
    booking.value = { tutorId: '', courseCode: '', sessionTime: '' }
    await loadSessions()
  } catch (err) {
    message.value = `Error: ${err?.message || 'Booking failed'}`
  } finally {
    bookingSubmitting.value = false
  }
}

// -> Open modal + scroll lock + focus
const openSession = async (item) => {
  selectedSession.value = item
  showReviewForm.value = false
  reviewRating.value = 0
  reviewComment.value = ''
  document.body.style.overflow = 'hidden'
  await nextTick()
  modalEl.value?.focus()
}

// -> Close modal
const closeModal = () => {
  selectedSession.value = null
  showReviewForm.value = false
  reviewRating.value = 0
  reviewComment.value = ''
  document.body.style.overflow = ''
}

// -> Approve
const approveSession = async () => {
  if (!selectedSession.value) return
  actionBusy.value = 'approve'
  try {
    await api(`/bookings/${selectedSession.value.id}/decision`, 'POST', { decision: 'accepted' })
    message.value = '✅ Booking approved!'
    closeModal()
    await loadSessions()
  } catch (err) {
    message.value = `Error: ${err?.message || 'Failed to approve'}`
  } finally {
    actionBusy.value = null
  }
}

// -> Reject
const rejectSession = async () => {
  if (!selectedSession.value) return
  actionBusy.value = 'reject'
  try {
    await api(`/bookings/${selectedSession.value.id}/decision`, 'POST', { decision: 'rejected' })
    message.value = '❌ Booking rejected.'
    closeModal()
    await loadSessions()
  } catch (err) {
    message.value = `Error: ${err?.message || 'Failed to reject'}`
  } finally {
    actionBusy.value = null
  }
}

// -> Complete
const completeSession = async () => {
  if (!selectedSession.value) return
  actionBusy.value = 'complete'
  try {
    await api(`/bookings/${selectedSession.value.id}/complete`, 'POST', {})
    message.value = '🏁 Session complete! Leave a review.'
    closeModal()
    await loadSessions()
  } catch (err) {
    message.value = `Error: ${err?.message || 'Failed to complete'}`
  } finally {
    actionBusy.value = null
  }
}

// -> Review
const goToReview = () => { showReviewForm.value = true }

const cancelReview = () => {
  showReviewForm.value = false
  reviewRating.value = 0
  reviewComment.value = ''
}

const submitSessionReview = async () => {
  if (!reviewRating.value || reviewRating.value < 1 || reviewRating.value > 5) {
    message.value = 'Error: Pick a rating 1–5.'
    return
  }
  if (!selectedSession.value) return
  reviewSubmitting.value = true
  try {
    await api(`/bookings/${selectedSession.value.id}/review`, 'POST', {
      rating: reviewRating.value,
      comment: reviewComment.value?.trim() || '',
    })
    message.value = '⭐ Review submitted!'
    cancelReview()
    closeModal()
    await loadSessions()
  } catch (err) {
    message.value = `Error: ${err?.message || 'Review failed'}`
  } finally {
    reviewSubmitting.value = false
  }
}

// -> Cleanup scroll lock on unmount
onUnmounted(() => { document.body.style.overflow = '' })

onMounted(() => {
  applyBookingPrefill()
  loadSessions()
})

watch(() => route.query, () => { applyBookingPrefill() })
</script>

<style scoped>
/* ── Page ─────────────────────────────────── */
.session-page {
  min-height: 100vh;
  background:
    radial-gradient(70rem 28rem at -5% -10%, rgba(255, 133, 187, 0.12), transparent 55%),
    radial-gradient(60rem 22rem at 105% 5%, rgba(2, 26, 84, 0.08), transparent 50%),
    linear-gradient(160deg, #f5f5f5 0%, #ffcee3 55%, #fff 100%);
}

.view {
  max-width: 640px;
  margin: 0 auto;
  padding: 24px 16px 40px;
}

/* ── Header ───────────────────────────────── */
.page-header {
  margin-bottom: 20px;
}

h2 {
  margin: 0 0 4px;
  font-size: clamp(1.3rem, 3vw, 1.7rem);
  font-weight: 800;
  color: #021A54;
  letter-spacing: -0.02em;
}

.page-sub {
  margin: 0;
  font-size: 0.88rem;
  color: #6e6e73;
}

h3 {
  margin: 0 0 14px;
  font-size: 1.05rem;
  font-weight: 700;
  color: #021A54;
}

/* ── Toast ────────────────────────────────── */
.toast {
  border-radius: 12px;
  padding: 11px 14px;
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 16px;
}

.toast--success {
  background: rgba(255, 206, 227, 0.7);
  border: 1px solid rgba(255, 133, 187, 0.5);
  color: #021A54;
}

.toast--error {
  background: rgba(255, 220, 220, 0.8);
  border: 1px solid rgba(200, 50, 80, 0.3);
  color: #7d1030;
}

.toast-enter-active,
.toast-leave-active { transition: opacity 0.25s, transform 0.25s; }
.toast-enter-from,
.toast-leave-to { opacity: 0; transform: translateY(-8px); }

/* ── Skeleton ─────────────────────────────── */
.skeleton-list { display: grid; gap: 14px; }

.skeleton-card {
  height: 90px;
  border-radius: 16px;
  background: linear-gradient(90deg, rgba(255,206,227,0.3) 25%, rgba(255,133,187,0.15) 50%, rgba(255,206,227,0.3) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Glass card ───────────────────────────── */
.glass-card {
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 133, 187, 0.28);
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 8px 32px rgba(2, 26, 84, 0.08), 0 1px 0 rgba(255,255,255,0.8) inset;
  backdrop-filter: blur(16px) saturate(160%);
}

/* ── Forms ────────────────────────────────── */
.session-form { display: grid; gap: 12px; }

.form-tip {
  margin: 0 0 8px;
  padding: 9px 12px;
  border-radius: 10px;
  background: rgba(255, 206, 227, 0.45);
  border: 1px solid rgba(255, 133, 187, 0.3);
  color: #021A54;
  font-size: 0.84rem;
}

.form-group { display: grid; gap: 5px; }

.form-row {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, 1fr);
}

label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.83rem;
  font-weight: 700;
  color: #021A54;
}

.req {
  color: #FF85BB;
  font-size: 0.9rem;
}

input,
select,
.review-textarea {
  width: 100%;
  border-radius: 12px;
  border: 1.5px solid rgba(2, 26, 84, 0.15);
  background: rgba(255, 255, 255, 0.85);
  padding: 10px 13px;
  color: #021A54;
  font-size: 0.92rem;
  outline: none;
  box-sizing: border-box;
  transition: border-color 150ms, box-shadow 150ms, background 150ms;
  font-family: inherit;
}

input:focus,
select:focus,
.review-textarea:focus {
  border-color: #FF85BB;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(255, 133, 187, 0.2);
}

.review-textarea {
  resize: vertical;
  min-height: 72px;
}

/* ── Buttons ──────────────────────────────── */
.btn {
  padding: 11px 16px;
  border: none;
  border-radius: 12px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 140ms ease, box-shadow 140ms ease, opacity 140ms;
  letter-spacing: 0.01em;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
}

.btn--primary {
  background: linear-gradient(135deg, #FF85BB, #ff6da9);
  color: #fff;
  width: 100%;
  margin-top: 4px;
}

.btn--primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255, 133, 187, 0.4);
}

.btn--approve {
  flex: 1;
  background: linear-gradient(135deg, #021A54, #0d3285);
  color: #fff;
}

.btn--approve:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(2, 26, 84, 0.3);
}

.btn--reject {
  flex: 1;
  background: linear-gradient(135deg, #c0325a, #e03d6a);
  color: #fff;
}

.btn--reject:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(192, 50, 90, 0.3);
}

.btn--complete {
  flex: 1;
  background: linear-gradient(135deg, #FF85BB, #ff6da9);
  color: #fff;
}

.btn--complete:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255, 133, 187, 0.4);
}

.btn--review {
  flex: 1;
  background: linear-gradient(135deg, #FFCEE3, #FF85BB);
  color: #021A54;
}

.btn--review:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(255, 133, 187, 0.3);
}

.btn--ghost {
  flex: 1;
  background: rgba(2, 26, 84, 0.06);
  color: #021A54;
  border: 1.5px solid rgba(2, 26, 84, 0.15);
}

.btn--ghost:hover {
  background: rgba(2, 26, 84, 0.1);
}

/* ── List header / search ─────────────────── */
.list-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.list-header h3 { margin: 0; flex: 1; }

.search-input {
  width: auto;
  max-width: 200px;
  padding: 7px 12px;
  font-size: 0.84rem;
  border-radius: 10px;
  border: 1.5px solid rgba(255, 133, 187, 0.4);
  background: rgba(255, 255, 255, 0.8);
  color: #021A54;
  outline: none;
  transition: border-color 150ms, box-shadow 150ms;
}

.search-input:focus {
  border-color: #FF85BB;
  box-shadow: 0 0 0 3px rgba(255, 133, 187, 0.15);
}

/* ── Filter chips ─────────────────────────── */
.filter-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.chip {
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.79rem;
  font-weight: 600;
  cursor: pointer;
  border: 1.5px solid rgba(2, 26, 84, 0.15);
  background: rgba(255, 255, 255, 0.7);
  color: #021A54;
  transition: all 140ms;
}

.chip--active {
  background: #FF85BB;
  border-color: #FF85BB;
  color: #fff;
}

.chip:hover:not(.chip--active) {
  background: #FFCEE3;
  border-color: #FF85BB;
}

/* ── Summary bar ──────────────────────────── */
.summary-bar {
  display: flex;
  gap: 14px;
  font-size: 0.82rem;
  color: #6e6e73;
  font-weight: 600;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: rgba(255, 206, 227, 0.25);
  border-radius: 10px;
  border: 1px solid rgba(255, 133, 187, 0.2);
}

/* ── Empty state ──────────────────────────── */
.empty-state {
  border: 1.5px dashed rgba(255, 133, 187, 0.4);
  border-radius: 14px;
  padding: 20px;
  text-align: center;
  color: #6e6e73;
  background: rgba(255, 255, 255, 0.5);
}

.empty-state p { margin: 0; font-size: 0.9rem; }

/* ── Session cards ────────────────────────── */
.sessions-grid { display: grid; gap: 10px; }

.session-card {
  width: 100%;
  text-align: left;
  background: rgba(255, 255, 255, 0.8);
  border: 1.5px solid rgba(255, 133, 187, 0.2);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(2, 26, 84, 0.06);
  cursor: pointer;
  transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms;
}

.session-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 28px rgba(2, 26, 84, 0.12);
  border-color: rgba(255, 133, 187, 0.5);
}

.status-stripe {
  height: 4px;
}

.stripe--pending  { background: #FF85BB; }
.stripe--accepted { background: #021A54; }
.stripe--completed { background: #FFCEE3; border-top: 1px solid #FF85BB; }
.stripe--rejected,
.stripe--cancelled { background: #c0325a; }

.session-content {
  padding: 12px 14px;
}

.session-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.status-pill {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.05em;
}

.pill--pending  { background: rgba(255, 133, 187, 0.18); color: #c0325a; }
.pill--accepted { background: rgba(2, 26, 84, 0.12); color: #021A54; }
.pill--completed { background: rgba(2, 26, 84, 0.07); color: #021A54; }
.pill--rejected,
.pill--cancelled { background: rgba(192, 50, 90, 0.12); color: #7d1030; }

.course-tag {
  font-size: 0.78rem;
  font-weight: 600;
  color: #6e6e73;
  background: rgba(2, 26, 84, 0.06);
  padding: 2px 8px;
  border-radius: 8px;
}

.session-who {
  margin: 0 0 4px;
  font-size: 0.88rem;
  font-weight: 600;
  color: #021A54;
}

.session-when {
  margin: 0;
  font-size: 0.82rem;
  color: #6e6e73;
}

/* ── Modal ────────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 26, 84, 0.35);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-card {
  background: rgba(255, 255, 255, 0.94);
  border: 1.5px solid rgba(255, 133, 187, 0.3);
  border-radius: 22px;
  box-shadow: 0 24px 64px rgba(2, 26, 84, 0.22);
  padding: 24px 20px 20px;
  max-width: 420px;
  width: 100%;
  position: relative;
  backdrop-filter: blur(20px);
  outline: none;
}

.modal-close {
  position: absolute;
  top: 14px;
  right: 14px;
  background: rgba(2, 26, 84, 0.07);
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  font-size: 18px;
  color: #021A54;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 140ms;
}

.modal-close:hover { background: rgba(255, 133, 187, 0.25); }

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
  gap: 10px;
  padding-right: 32px;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.15rem;
  color: #021A54;
}

.modal-body { margin-bottom: 18px; }

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid rgba(2, 26, 84, 0.06);
  font-size: 0.9rem;
  gap: 12px;
}

.detail-row:last-child { border-bottom: none; }

.detail-label {
  color: #6e6e73;
  font-weight: 600;
  white-space: nowrap;
}

.detail-val {
  color: #021A54;
  font-weight: 700;
  text-align: right;
  flex: 1;
}

.modal-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* ── Review inline ────────────────────────── */
.review-inline {
  width: 100%;
  padding: 14px;
  background: rgba(255, 206, 227, 0.3);
  border-radius: 14px;
  border: 1px solid rgba(255, 133, 187, 0.3);
  margin-top: 4px;
}

.review-title {
  margin: 0 0 10px;
  font-weight: 700;
  color: #021A54;
  font-size: 0.9rem;
}

.star-row {
  display: flex;
  gap: 6px;
  margin-bottom: 10px;
}

.star-btn {
  background: none;
  border: none;
  font-size: 1.9rem;
  color: #ddd;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.12s, transform 0.1s;
}

.star-btn--active { color: #FF85BB; }
.star-btn:hover { color: #FF85BB; transform: scale(1.15); }

/* ── Fade transition ──────────────────────── */
.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

/* ── Responsive ───────────────────────────── */
@media (max-width: 480px) {
  .form-row { grid-template-columns: 1fr; }
  .list-header { flex-direction: column; align-items: flex-start; }
  .search-input { max-width: 100%; width: 100%; }
  .summary-bar { flex-wrap: wrap; gap: 8px; }
}
</style>
