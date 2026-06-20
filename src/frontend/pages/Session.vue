<template>
  <main class="session-page">
    <section class="phone-shell">
      <div class="session-content">

        <!-- ── Header ── -->
        <div class="card page-header-card">
          <div class="header-left">
            <p class="page-kicker">Sessions</p>
            <h2>
              {{ isAdmin ? 'Manage Sessions' : userRole === 'tutor' ? 'My Sessions' : 'Book a Tutor' }}
            </h2>
            <p class="page-subtext">
              {{ userRole === 'tutor' ? 'Set availability and manage bookings.' : 'Schedule your next tutoring session.' }}
            </p>
          </div>
        </div>

        <!-- ── Toast ── -->
        <transition name="toast">
          <div
            v-if="message"
            class="error-banner"
            :class="message.startsWith('Error') ? 'error-banner--error' : 'error-banner--success'"
            role="alert"
            aria-live="assertive"
          >
            {{ message }}
          </div>
        </transition>

        <!-- ── Skeleton ── -->
        <div v-if="isLoading" class="skeleton-list" aria-busy="true" aria-label="Loading sessions">
          <div v-for="n in 3" :key="n" class="skeleton-card"></div>
        </div>

        <template v-else>

          <!-- ── Tutor: Availability Form ── -->
          <template v-if="canManageAvailability">
            <div class="section-header">
              <h3>Set Availability 🗓️</h3>
              <p class="section-sub">Define the time slots tutees can book.</p>
            </div>

            <div class="card">
              <div class="session-form">
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
                <button class="btn-primary" type="button" :disabled="availSubmitting" @click="submitAvailability">
                  {{ availSubmitting ? '⏳ Saving…' : '✅ Save Slot' }}
                </button>
              </div>
            </div>
          </template>

          <!-- ── Tutee: Book Session Form ── -->
          <template v-if="canBookSession">
            <div class="section-header">
              <h3>Book a Session 🎯</h3>
              <p class="section-sub">Use the tutor's matric number from the Tutors page.</p>
            </div>

            <div class="card">
              <div class="session-form">
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
                <button class="btn-primary" type="button" :disabled="bookingSubmitting" @click="submitBooking">
                  {{ bookingSubmitting ? '⏳ Sending…' : '📨 Send Booking' }}
                </button>
              </div>
            </div>
          </template>

          <!-- ── Sessions List ── -->
          <div class="section-header">
            <h3>{{ userRole === 'tutor' ? 'Incoming Requests 📋' : 'My Requests 📋' }}</h3>
            <p class="section-sub">Filter and search your sessions below.</p>
          </div>

          <!-- Controls -->
          <div class="card controls-card">
            <div class="filter-chips" role="group" aria-label="Filter by status">
              <button
                v-for="f in statusFilters"
                :key="f.value"
                class="chip"
                :class="{ active: activeFilter === f.value }"
                type="button"
                @click="activeFilter = f.value"
              >{{ f.label }}</button>
            </div>
            <div class="search-wrap">
              <input
                v-model="searchQuery"
                class="search-input"
                placeholder="Search course, name…"
                aria-label="Search sessions"
              />
            </div>
          </div>

          <!-- Summary -->
          <div v-if="sessionList.length > 0" class="summary-row">
            <span>{{ filteredSessions.length }} shown</span>
            <span>·</span>
            <span>⏳ {{ pendingCount }} pending</span>
            <span>·</span>
            <span>✅ {{ acceptedCount }} accepted</span>
          </div>

          <!-- Empty -->
          <div v-if="filteredSessions.length === 0" class="card empty-state" role="status">
            <p class="empty-icon" aria-hidden="true">📭</p>
            <p class="empty-text">{{ searchQuery || activeFilter !== 'all' ? 'No matches found.' : 'No sessions yet.' }}</p>
          </div>

          <!-- Session Cards -->
          <div v-else class="sessions-grid">
            <button
              v-for="item in filteredSessions"
              :key="item.id"
              class="session-card card"
              type="button"
              @click="openSession(item)"
              :aria-label="`Session with ${item.tutorName || item.tuteeName || 'user'}, status: ${item.status}`"
            >
              <div class="status-stripe" :class="`stripe--${item.status}`"></div>
              <div class="session-body">
                <div class="session-top">
                  <span class="status-pill" :class="`pill--${item.status}`">
                    {{ item.status?.toUpperCase() }}
                  </span>
                  <span v-if="item.courseCode" class="course-tag">{{ item.courseCode }}</span>
                </div>
                <p class="session-who">
                  {{ userRole === 'tutor' ? 'From' : 'With' }}: {{ item.tuteeName || item.tutorName || 'N/A' }}
                </p>
                <p class="session-when">
                  {{ formatDateTimeValue(item.sessionTime, '—', 'en-MY', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}
                </p>
              </div>
            </button>
          </div>

        </template>

        <!-- ── Modal ── -->
        <Teleport to="body">
          <transition name="modal">
            <div
              v-if="selectedSession"
              class="modal-backdrop"
              role="dialog"
              aria-modal="true"
              aria-label="Session details"
              @click.self="closeModal"
              @keydown.escape="closeModal"
            >
              <div class="modal-card card" ref="modalEl" tabindex="-1">
                <!-- Header -->
                <div class="modal-header">
                  <div>
                    <p class="page-kicker">Session Details</p>
                    <h3 class="modal-title">
                      <span class="status-pill" :class="`pill--${selectedSession.status}`">
                        {{ selectedSession.status?.toUpperCase() }}
                      </span>
                    </h3>
                  </div>
                  <button class="btn-close" type="button" @click="closeModal" aria-label="Close">✕</button>
                </div>

                <!-- Details -->
                <div class="detail-grid">
                  <div class="detail-row">
                    <span class="detail-label">Course</span>
                    <span class="detail-val">{{ selectedSession.courseCode || 'N/A' }}</span>
                  </div>
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
                </div>

                <!-- Actions -->
                <div class="modal-actions">
                  <!-- Tutor: Approve / Reject pending -->
                  <template v-if="userRole === 'tutor' && selectedSession.status === 'pending'">
                    <button class="btn-action btn-action--approve" type="button" :disabled="!!actionBusy" @click="approveSession">
                      {{ actionBusy === 'approve' ? '⏳' : '✅ Approve' }}
                    </button>
                    <button class="btn-action btn-action--reject" type="button" :disabled="!!actionBusy" @click="rejectSession">
                      {{ actionBusy === 'reject' ? '⏳' : '❌ Reject' }}
                    </button>
                  </template>

                  <!-- Tutor: Mark complete -->
                  <button
                    v-if="userRole === 'tutor' && selectedSession.status === 'accepted'"
                    class="btn-action btn-action--complete"
                    type="button"
                    :disabled="!!actionBusy"
                    @click="completeSession"
                  >
                    {{ actionBusy === 'complete' ? '⏳ Completing…' : '🏁 Mark Complete' }}
                  </button>

                  <!-- Review form -->
                  <template v-if="showReviewForm">
                    <div class="review-inline">
                      <p class="review-title">Rate this session ⭐</p>
                      <div class="star-row" role="group" aria-label="Star rating">
                        <button
                          v-for="star in 5"
                          :key="star"
                          type="button"
                          class="star-btn"
                          :class="{ active: star <= reviewRating }"
                          @click="reviewRating = star"
                          :aria-label="`Rate ${star} stars`"
                          :aria-pressed="star <= reviewRating"
                        >★</button>
                      </div>
                      <textarea
                        v-model="reviewComment"
                        class="review-textarea"
                        placeholder="Comment (optional)"
                        rows="3"
                      ></textarea>
                      <div class="review-actions">
                        <button class="btn-action btn-action--approve" type="button" :disabled="reviewSubmitting" @click="submitSessionReview">
                          {{ reviewSubmitting ? '⏳ Submitting…' : '📤 Submit Review' }}
                        </button>
                        <button class="btn-ghost" type="button" @click="cancelReview">Cancel</button>
                      </div>
                    </div>
                  </template>

                  <button
                    v-else-if="selectedSession.status === 'completed'"
                    class="btn-action btn-action--review"
                    type="button"
                    @click="goToReview"
                  >
                    ✍️ Leave Review
                  </button>

                  <button class="btn-ghost" type="button" @click="closeModal">Close</button>
                </div>
              </div>
            </div>
          </transition>
        </Teleport>

      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { api, getUser } from '@/api.js'
import { formatDateTimeValue } from '@/utils/records.js'

const user     = getUser()
const route    = useRoute()
const userRole = ref(user?.role || 'tutee')
const isAdmin  = String((user?.role || '').toLowerCase().trim()) === 'admin'
const canManageAvailability = userRole.value === 'tutor' || isAdmin
const canBookSession        = userRole.value === 'tutee' || isAdmin

const availability     = ref({ courseCode: '', dayOfWeek: 'Monday', startTime: '', endTime: '' })
const booking          = ref({ tutorId: '', courseCode: '', sessionTime: '' })
const sessionList      = ref([])
const selectedSession  = ref(null)
const message          = ref('')
const isLoading        = ref(false)
const availSubmitting  = ref(false)
const bookingSubmitting = ref(false)
const actionBusy       = ref(null)

const showReviewForm   = ref(false)
const reviewRating     = ref(0)
const reviewComment    = ref('')
const reviewSubmitting = ref(false)

const searchQuery  = ref('')
const activeFilter = ref('all')
const modalEl      = ref(null)

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const statusFilters = [
  { value: 'all',       label: 'All'         },
  { value: 'pending',   label: '⏳ Pending'   },
  { value: 'accepted',  label: '✅ Accepted'  },
  { value: 'completed', label: '🏁 Completed' },
  { value: 'rejected',  label: '❌ Rejected'  },
]

const filteredSessions = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  return sessionList.value.filter(item => {
    const matchFilter = activeFilter.value === 'all' || (item.status || '').toLowerCase() === activeFilter.value
    if (!matchFilter) return false
    if (!q) return true
    const name   = (item.tutorName || item.tuteeName || '').toLowerCase()
    const course = (item.courseCode || '').toLowerCase()
    return name.includes(q) || course.includes(q)
  })
})

const pendingCount  = computed(() => sessionList.value.filter(s => s.status === 'pending').length)
const acceptedCount = computed(() => sessionList.value.filter(s => s.status === 'accepted').length)

let msgTimer = null
watch(message, val => {
  if (val) {
    clearTimeout(msgTimer)
    msgTimer = setTimeout(() => { message.value = '' }, 4000)
  }
})

const applyBookingPrefill = () => {
  if (!canBookSession) return
  const localTutorId    = localStorage.getItem('prefillTutorId')
  const tutorIdFromQuery  = typeof route.query.tutorId    === 'string' ? route.query.tutorId    : ''
  const courseFromQuery   = typeof route.query.courseCode === 'string' ? route.query.courseCode : ''
  const timeFromQuery     = typeof route.query.sessionTime === 'string' ? route.query.sessionTime : ''
  if (tutorIdFromQuery)  booking.value.tutorId     = tutorIdFromQuery
  else if (localTutorId) booking.value.tutorId     = localTutorId
  if (courseFromQuery)   booking.value.courseCode  = courseFromQuery
  if (timeFromQuery)     booking.value.sessionTime = timeFromQuery
  if (localTutorId) localStorage.removeItem('prefillTutorId')
}

const loadSessions = async () => {
  isLoading.value = true
  try {
    const resp = await api('/bookings/inbox', 'GET', undefined, { silent: true })
    sessionList.value = (resp?.bookings ?? []).map(item => ({
      id:          item.id,
      status:      item.status      ?? 'pending',
      tutorName:   item.tutor_name  ?? item.tutorName  ?? '',
      tuteeName:   item.tutee_name  ?? item.tuteeName  ?? '',
      sessionTime: item.session_time ?? item.sessionTime ?? '',
      courseCode:  item.course_code  ?? item.courseCode  ?? '',
    }))
  } catch (err) {
    if (err?.status === 404) {
      sessionList.value = []
    } else {
      message.value = `Error: ${err?.message ?? 'Failed to load sessions.'}`
    }
  } finally {
    isLoading.value = false
  }
}

const submitAvailability = async () => {
  if (!availability.value.courseCode || !availability.value.startTime || !availability.value.endTime) {
    message.value = 'Error: All availability fields are required.'
    return
  }
  availSubmitting.value = true
  try {
    await api('/availability', 'POST', availability.value)
    message.value = '✅ Availability saved!'
    availability.value = { courseCode: '', dayOfWeek: 'Monday', startTime: '', endTime: '' }
  } catch (err) {
    message.value = `Error: ${err?.message ?? 'Save failed.'}`
  } finally {
    availSubmitting.value = false
  }
}

const submitBooking = async () => {
  if (!booking.value.tutorId) {
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
    message.value = `Error: ${err?.message ?? 'Booking failed.'}`
  } finally {
    bookingSubmitting.value = false
  }
}

const openSession = async (item) => {
  selectedSession.value = item
  showReviewForm.value  = false
  reviewRating.value    = 0
  reviewComment.value   = ''
  document.body.style.overflow = 'hidden'
  await nextTick()
  modalEl.value?.focus()
}

const closeModal = () => {
  selectedSession.value = null
  showReviewForm.value  = false
  reviewRating.value    = 0
  reviewComment.value   = ''
  document.body.style.overflow = ''
}

const approveSession = async () => {
  if (!selectedSession.value) return
  actionBusy.value = 'approve'
  try {
    await api(`/bookings/${selectedSession.value.id}/decision`, 'POST', { decision: 'accepted' })
    message.value = '✅ Booking approved!'
    closeModal()
    await loadSessions()
  } catch (err) {
    message.value = `Error: ${err?.message ?? 'Failed to approve.'}`
  } finally {
    actionBusy.value = null
  }
}

const rejectSession = async () => {
  if (!selectedSession.value) return
  actionBusy.value = 'reject'
  try {
    await api(`/bookings/${selectedSession.value.id}/decision`, 'POST', { decision: 'rejected' })
    message.value = '❌ Booking rejected.'
    closeModal()
    await loadSessions()
  } catch (err) {
    message.value = `Error: ${err?.message ?? 'Failed to reject.'}`
  } finally {
    actionBusy.value = null
  }
}

const completeSession = async () => {
  if (!selectedSession.value) return
  actionBusy.value = 'complete'
  try {
    await api(`/bookings/${selectedSession.value.id}/complete`, 'POST', {})
    message.value = '🏁 Session complete! Leave a review.'
    closeModal()
    await loadSessions()
  } catch (err) {
    message.value = `Error: ${err?.message ?? 'Failed to complete.'}`
  } finally {
    actionBusy.value = null
  }
}

const goToReview    = () => { showReviewForm.value = true }
const cancelReview  = () => { showReviewForm.value = false; reviewRating.value = 0; reviewComment.value = '' }

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
      comment: reviewComment.value?.trim() ?? '',
    })
    message.value = '⭐ Review submitted!'
    cancelReview()
    closeModal()
    await loadSessions()
  } catch (err) {
    message.value = `Error: ${err?.message ?? 'Review failed.'}`
  } finally {
    reviewSubmitting.value = false
  }
}

onMounted(() => {
  applyBookingPrefill()
  loadSessions()
})

onUnmounted(() => { document.body.style.overflow = '' })

watch(() => route.query, () => { applyBookingPrefill() })
</script>

<style scoped>
/* ── Local token overrides ── */
/* Declare on :root so values win over base.css defaults (incl. inside Teleport portals) */
:root {
  --ink: #021A54;
  --ink-muted: rgba(2, 26, 84, 0.65);
  --primary: #FF85BB;
  --primary-soft: #FFCEE3;
  --canvas: #ffffff;
  --canvas-parchment: #F5F5F5;
  --hairline: #e0e0e0;
  --radius-card: 16px;
  --radius-pill: 999px;
}

.session-page {
  --ink: #021A54;
  --ink-muted: rgba(2, 26, 84, 0.65);
  --primary: #FF85BB;
  --primary-soft: #FFCEE3;
  --canvas: #ffffff;
  --canvas-parchment: #F5F5F5;
  --hairline: #e0e0e0;
  --radius-card: 16px;
  --radius-pill: 999px;
}

/* ── Layout ── */
.session-page {
  background: var(--canvas-parchment);
  min-height: 100vh;
}

.phone-shell {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 20px 48px;
}

.session-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Card Base ── */
.card {
  background: var(--canvas);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-card);
  padding: 20px;
  box-shadow: 0 2px 12px rgba(2, 26, 84, 0.05);
}

/* ── Page Header ── */
.page-header-card {
  background: linear-gradient(135deg, #ffffff 60%, var(--primary-soft) 100%);
  border: 1px solid var(--primary-soft);
}

.page-kicker {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--primary);
  margin: 0 0 6px;
}

.page-header-card h2 {
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 800;
  color: var(--ink);
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}

.page-subtext {
  font-size: 0.9rem;
  color: var(--ink-muted);
  font-weight: 500;
  margin: 0;
}

/* ── Section Headers ── */
.section-header { margin-top: 4px; padding-bottom: 2px; }
.section-header h3 {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--ink);
  margin: 0 0 3px;
  letter-spacing: -0.01em;
}
.section-sub {
  font-size: 0.88rem;
  color: var(--ink-muted);
  font-weight: 500;
  margin: 0;
}

/* ── Error / Toast Banner ── */
.error-banner {
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ink);
}
.error-banner--success {
  background: rgba(255, 133, 187, 0.15);
  border: 1.5px solid var(--primary);
}
.error-banner--error {
  background: rgba(255, 59, 48, 0.08);
  border: 1.5px solid rgba(255, 59, 48, 0.4);
  color: #c0392b;
}

.toast-enter-active, .toast-leave-active { transition: opacity 0.25s, transform 0.25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-8px); }

/* ── Skeleton ── */
.skeleton-list { display: flex; flex-direction: column; gap: 14px; }
.skeleton-card {
  height: 90px;
  border-radius: var(--radius-card);
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.5) 0%,
    rgba(255, 206, 227, 0.4) 50%,
    rgba(255, 255, 255, 0.5) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-card { animation: none; }
}

/* ── Form ── */
.session-form { display: flex; flex-direction: column; gap: 14px; }

.form-group { display: flex; flex-direction: column; gap: 5px; }

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

label {
  font-size: 0.83rem;
  font-weight: 700;
  color: var(--ink);
}

.req { color: var(--primary); }

input,
select,
.review-textarea {
  width: 100%;
  border-radius: 10px;
  border: 1.5px solid var(--hairline);
  background: var(--canvas);
  padding: 10px 12px;
  color: var(--ink);
  font-size: 0.92rem;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

input:focus,
select:focus,
.review-textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(255, 133, 187, 0.18);
}

.review-textarea { resize: vertical; min-height: 72px; }

/* ── Primary Button ── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: var(--primary);
  color: var(--ink);
  border: 1.5px solid var(--ink);
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 0.9rem;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 120ms ease, transform 120ms ease;
  width: 100%;
}
.btn-primary:hover:not(:disabled) { opacity: 0.88; }
.btn-primary:active { transform: scale(0.97); }
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

/* ── Controls ── */
.controls-card { display: flex; flex-direction: column; gap: 12px; }

.filter-chips { display: flex; gap: 8px; flex-wrap: wrap; }

.chip {
  padding: 6px 14px;
  border: 1.5px solid var(--primary-soft);
  border-radius: 10px;
  background: var(--canvas-parchment);
  color: var(--ink);
  font-size: 0.83rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
}
.chip:hover:not(.active) { border-color: var(--primary); }
.chip.active { background: var(--primary); border-color: var(--ink); }

.search-wrap { position: relative; }
.search-input {
  width: 100%;
  border: 1.5px solid var(--hairline);
  border-radius: 10px;
  background: var(--canvas);
  color: var(--ink);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 8px 12px;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
  transition: border-color 120ms ease;
}
.search-input:focus { border-color: var(--primary); }
.search-input::placeholder { color: var(--ink-muted); }

/* ── Summary Row ── */
.summary-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--ink-muted);
  padding: 0 4px;
}

/* ── Empty State ── */
.empty-state {
  text-align: center;
  padding: 36px 20px;
}
.empty-icon { font-size: 2.2rem; margin: 0 0 10px; }
.empty-text { font-size: 1rem; font-weight: 700; color: var(--ink-muted); margin: 0; }

/* ── Session Cards ── */
.sessions-grid { display: flex; flex-direction: column; gap: 10px; }

.session-card {
  width: 100%;
  text-align: left;
  padding: 0;
  overflow: hidden;
  cursor: pointer;
  transition: transform 150ms ease, box-shadow 150ms ease;
}
.session-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(2, 26, 84, 0.1);
}

.status-stripe { height: 4px; }
.stripe--pending   { background: var(--primary); }
.stripe--accepted  { background: var(--ink); }
.stripe--completed { background: var(--primary-soft); border-top: 1px solid var(--primary); }
.stripe--rejected,
.stripe--cancelled { background: #c0325a; }

.session-body { padding: 14px 18px; }

.session-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.status-pill {
  display: inline-block;
  padding: 3px 9px;
  border-radius: var(--radius-pill);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.05em;
}
.pill--pending   { background: rgba(255, 133, 187, 0.18); color: #c0325a; }
.pill--accepted  { background: rgba(2, 26, 84, 0.1);      color: var(--ink); }
.pill--completed { background: rgba(2, 26, 84, 0.07);     color: var(--ink); }
.pill--rejected,
.pill--cancelled { background: rgba(192, 50, 90, 0.12);   color: #7d1030; }

.course-tag {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ink-muted);
  background: rgba(2, 26, 84, 0.06);
  padding: 2px 8px;
  border-radius: 8px;
}

.session-who {
  margin: 0 0 4px;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ink);
}
.session-when {
  margin: 0;
  font-size: 0.82rem;
  color: var(--ink-muted);
}

/* ── Modal ── */
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
  width: 100%;
  max-width: 460px;
  max-height: 90vh;
  overflow-y: auto;
  outline: none;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.modal-title {
  margin: 4px 0 0;
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--ink);
}

.btn-close {
  background: var(--canvas-parchment);
  border: 1.5px solid var(--hairline);
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ink-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 120ms ease;
}
.btn-close:hover { background: var(--primary-soft); color: var(--ink); }

.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--hairline);
}
.detail-row:last-child { border-bottom: none; }

.detail-label {
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink-muted);
  flex-shrink: 0;
}
.detail-val {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--ink);
  text-align: right;
}

/* ── Modal Actions ── */
.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-action {
  width: 100%;
  padding: 11px 16px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 120ms ease, transform 120ms ease;
  border: 1.5px solid var(--ink);
}
.btn-action:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-action:active { transform: scale(0.97); }

.btn-action--approve  { background: var(--primary);       color: var(--ink); }
.btn-action--complete { background: var(--ink);            color: #fff; border-color: var(--ink); }
.btn-action--reject   { background: #c0325a;               color: #fff; border-color: #7d1030; }
.btn-action--review   { background: var(--primary-soft);   color: var(--ink); }

.btn-ghost {
  width: 100%;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  background: var(--canvas-parchment);
  color: var(--ink-muted);
  border: 1.5px solid var(--hairline);
  transition: background 120ms ease;
}
.btn-ghost:hover { background: var(--primary-soft); color: var(--ink); }

/* ── Review inline ── */
.review-inline {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 206, 227, 0.15);
  border: 1.5px solid var(--primary-soft);
  border-radius: 12px;
}

.review-title {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--ink);
  margin: 0;
}

.star-row { display: flex; gap: 6px; }

.star-btn {
  font-size: 1.6rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--hairline);
  transition: color 100ms ease, transform 100ms ease;
  padding: 0;
  line-height: 1;
}
.star-btn:hover,
.star-btn.active { color: var(--primary); transform: scale(1.15); }

.review-actions { display: flex; flex-direction: column; gap: 8px; }

/* ── Modal transitions ── */
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-from,  .modal-leave-to      { opacity: 0; }

/* ── Responsive ── */
@media (max-width: 640px) {
  .phone-shell { padding: 16px 12px 40px; }
  .form-row    { grid-template-columns: 1fr; }
}
</style>