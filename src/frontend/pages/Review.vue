<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active review-page">

        <!-- Header -->
        <div class="page-header">
          <div>
            <p class="page-kicker">Session feedback</p>
            <h2>Leave a Review</h2>
            <p class="page-subtext">Rate your completed sessions.</p>
          </div>
          <button @click="loadAll" class="chip" type="button" :disabled="isLoading">
            {{ isLoading ? 'Loading…' : 'Refresh' }}
          </button>
        </div>

        <!-- Feedback message -->
        <p
          v-if="message"
          class="feedback-msg"
          :class="isError ? 'error' : 'success'"
          role="status"
          aria-live="polite"
        >{{ message }}</p>

        <!-- Completed Sessions -->
        <div class="glass-card">
          <div class="card-header-row">
            <h3>Completed Sessions</h3>
            <span v-if="completedBookings.length" class="count-badge">{{ completedBookings.length }}</span>
          </div>

          <!-- Skeleton -->
          <div v-if="isLoadingBookings" class="skeleton-list">
            <div v-for="n in 3" :key="n" class="skeleton-item">
              <div class="skel skel-title"></div>
              <div class="skel skel-meta"></div>
            </div>
          </div>

          <!-- Empty -->
          <div v-else-if="completedBookings.length === 0" class="empty-state">
            <p class="empty-icon">📋</p>
            <p class="empty-title">No completed sessions</p>
            <p class="empty-sub">Finish a session first.</p>
          </div>

          <!-- List -->
          <div v-else class="booking-list">
            <button
              v-for="booking in completedBookings"
              :key="booking.id"
              class="booking-item"
              :class="{ selected: reviewData.bookingId === booking.id }"
              @click="selectBooking(booking)"
              type="button"
            >
              <div class="booking-avatar">
                {{ (booking.tutorName || booking.tuteeName || '?')[0].toUpperCase() }}
              </div>
              <div class="booking-info">
                <strong>{{ booking.tutorName || booking.tuteeName || 'Unknown' }}</strong>
                <p class="meta">{{ booking.courseCode || '—' }} • {{ formatSessionTime(booking.sessionTime) }}</p>
              </div>
              <div v-if="reviewData.bookingId === booking.id" class="selected-tick">✓</div>
            </button>
          </div>
        </div>

        <!-- Review Form -->
        <div class="glass-card" :class="{ dimmed: isSubmitting }">
          <h3>Write Review</h3>

          <!-- No booking selected warning -->
          <p v-if="!reviewData.bookingId" class="form-tip">
            ☝️ Select a session above first.
          </p>

          <div class="review-form">

            <!-- Star Rating -->
            <div class="form-group">
              <label class="form-label">Rating</label>
              <div class="star-row" role="group" aria-label="Select rating">
                <button
                  v-for="n in 5"
                  :key="n"
                  type="button"
                  class="star-btn"
                  :class="{ active: n <= reviewData.rating, hovered: n <= hoveredStar }"
                  @click="reviewData.rating = n"
                  @mouseenter="hoveredStar = n"
                  @mouseleave="hoveredStar = 0"
                  :aria-label="`${n} star${n !== 1 ? 's' : ''}`"
                >★</button>
                <span class="star-label">{{ ratingLabel }}</span>
              </div>
            </div>

            <!-- Comment -->
            <div class="form-group">
              <label class="form-label" for="review-comment">Comment <span class="optional">(optional)</span></label>
              <textarea
                id="review-comment"
                v-model="reviewData.comment"
                rows="4"
                maxlength="250"
                placeholder="Share your experience…"
                class="glass-textarea"
              ></textarea>
              <span class="char-count">{{ reviewData.comment.length }}/250</span>
            </div>

            <!-- Submit -->
            <button
              class="btn-primary"
              type="button"
              :disabled="isSubmitting || !canSubmit"
              @click="submitReview"
            >
              <span v-if="isSubmitting">Submitting…</span>
              <span v-else>Submit Review</span>
            </button>
          </div>
        </div>

        <!-- Recent Reviews -->
        <div class="glass-card">
          <h3>Your Past Reviews</h3>

          <div v-if="isLoadingReviews" class="skeleton-list">
            <div v-for="n in 2" :key="n" class="skeleton-item">
              <div class="skel skel-title"></div>
              <div class="skel skel-meta"></div>
              <div class="skel skel-body"></div>
            </div>
          </div>

          <div v-else-if="recentReviews.length === 0" class="empty-state">
            <p class="empty-icon">💬</p>
            <p class="empty-title">No reviews yet</p>
            <p class="empty-sub">Your submitted reviews appear here.</p>
          </div>

          <div v-else class="reviews-list">
            <div
              v-for="rev in recentReviews"
              :key="rev.id"
              class="review-item"
            >
              <div class="review-item-top">
                <div class="review-avatar">
                  {{ (rev.reviewed_user_name || 'U')[0].toUpperCase() }}
                </div>
                <div class="review-meta-block">
                  <strong>{{ rev.reviewed_user_name || 'User' }}</strong>
                  <p class="meta">Booking #{{ rev.booking_id }} • {{ safeDate(rev.created_at) }}</p>
                </div>
                <span class="review-stars">{{ renderStars(rev.rating) }}</span>
              </div>
              <p v-if="rev.comment" class="review-comment">"{{ rev.comment }}"</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api.js'

const route = useRoute()

// ─── State ───────────────────────────────────────────────
const completedBookings = ref([])
const recentReviews = ref([])
const reviewData = ref({ bookingId: 0, comment: '', rating: 0 })
const message = ref('')
const isError = ref(false)
const isLoading = ref(false)
const isLoadingBookings = ref(false)
const isLoadingReviews = ref(false)
const isSubmitting = ref(false)
const hoveredStar = ref(0)
let messageTimer = null

// ─── Computed ─────────────────────────────────────────────
const canSubmit = computed(() =>
  reviewData.value.bookingId > 0 && reviewData.value.rating >= 1
)

const ratingLabel = computed(() => {
  const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']
  const r = hoveredStar.value || reviewData.value.rating
  return labels[r] || ''
})

// ─── Helpers ──────────────────────────────────────────────
const renderStars = (rating) => {
  const n = Math.max(0, Math.min(5, Number(rating) || 0))
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}

const safeDate = (raw) => {
  if (!raw) return '—'
  const d = new Date(raw)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatSessionTime = (raw) => {
  if (!raw) return '—'
  const d = new Date(raw)
  if (isNaN(d.getTime())) return String(raw)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const showMessage = (text, error = false) => {
  if (messageTimer) clearTimeout(messageTimer)
  message.value = text
  isError.value = error
  messageTimer = setTimeout(() => { message.value = '' }, 4000)
}

// ─── Data Loaders ─────────────────────────────────────────
const loadCompletedBookings = async () => {
  isLoadingBookings.value = true
  try {
    const resp = await api('/bookings/inbox')
    const bookings = Array.isArray(resp?.bookings) ? resp.bookings : []
    completedBookings.value = bookings
      .filter((b) => b?.status === 'completed')
      .map((b) => ({
        id: b.id,
        tutorName: b.tutor_name || b.tutorName || '',
        tuteeName: b.tutee_name || b.tuteeName || '',
        courseCode: b.course_code || b.courseCode || '',
        sessionTime: b.session_time || b.sessionTime || '',
        status: b.status,
      }))
  } catch (err) {
    showMessage(`Failed to load sessions: ${err?.message || 'Unknown error'}`, true)
  } finally {
    isLoadingBookings.value = false
  }
}

const loadRecentReviews = async () => {
  isLoadingReviews.value = true
  try {
    const resp = await api('/users/me/submitted-reviews')
    recentReviews.value = Array.isArray(resp?.reviews) ? resp.reviews : []
  } catch (err) {
    // -> non-critical, silent
    console.warn('Reviews load failed:', err?.message)
    recentReviews.value = []
  } finally {
    isLoadingReviews.value = false
  }
}

const loadAll = async () => {
  isLoading.value = true
  await Promise.all([loadCompletedBookings(), loadRecentReviews()])
  isLoading.value = false
}

// ─── Actions ──────────────────────────────────────────────
const selectBooking = (booking) => {
  reviewData.value.bookingId = booking.id
}

const submitReview = async () => {
  if (isSubmitting.value) return

  const { bookingId, rating, comment } = reviewData.value

  if (!bookingId || bookingId <= 0) {
    showMessage('Select a session first.', true)
    return
  }
  if (!rating || rating < 1 || rating > 5) {
    showMessage('Pick a rating 1–5.', true)
    return
  }

  isSubmitting.value = true
  try {
    await api(`/bookings/${bookingId}/review`, 'POST', {
      rating: Number(rating),
      comment: String(comment || '').trim(),
    })
    showMessage('Review submitted! 🎉', false)
    reviewData.value = { bookingId: 0, comment: '', rating: 0 }
    await Promise.all([loadCompletedBookings(), loadRecentReviews()])
  } catch (err) {
    showMessage(err?.message || 'Submit failed.', true)
  } finally {
    isSubmitting.value = false
  }
}

// ─── Mount ────────────────────────────────────────────────
onMounted(async () => {
  // -> Pre-fill from route param
  const paramId = Number(route.params.resourceId)
  if (paramId > 0) {
    reviewData.value.bookingId = paramId
  }
  await loadAll()
})
</script>

<style scoped>
/* ── Page background ── */
.review-page {
  padding: 20px 16px 40px;
  min-height: 100%;
}

/* ── Header ── */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 18px;
}

.page-kicker {
  margin: 0 0 2px;
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--primary);
}

.page-header h2 {
  margin: 0 0 4px;
  font-size: clamp(1.3rem, 2.5vw, 1.65rem);
  color: var(--ink);
  font-weight: 700;
}

.page-subtext {
  margin: 0;
  font-size: 0.85rem;
  color: var(--ink-muted);
}

/* ── Glass card ── */
.glass-card {
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(255, 133, 187, 0.25);
  border-radius: 20px;
  padding: 18px;
  margin-bottom: 16px;
  box-shadow: 0 8px 28px rgba(2, 26, 84, 0.08);
  backdrop-filter: blur(16px) saturate(150%);
  transition: opacity 0.2s;
}

.glass-card.dimmed {
  opacity: 0.6;
  pointer-events: none;
}

.glass-card h3 {
  margin: 0 0 14px;
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink);
}

/* ── Card header row ── */
.card-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.card-header-row h3 {
  margin: 0;
}

.count-badge {
  background: var(--primary-soft);
  color: var(--ink);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  border: 1px solid rgba(255, 133, 187, 0.3);
}

/* ── Feedback message ── */
.feedback-msg {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.88rem;
  font-weight: 500;
  margin: 0 0 14px;
}

.feedback-msg.success {
  background: rgba(255, 206, 227, 0.45);
  color: #8a1a42;
  border: 1px solid rgba(255, 133, 187, 0.35);
}

.feedback-msg.error {
  background: rgba(255, 80, 80, 0.1);
  color: #b91c1c;
  border: 1px solid rgba(255, 80, 80, 0.25);
}

/* ── Booking list ── */
.booking-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.booking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1.5px solid var(--hairline);
  background: var(--surface-soft);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}

.booking-item:hover {
  border-color: var(--primary);
  background: rgba(255, 206, 227, 0.25);
}

.booking-item.selected {
  border-color: var(--primary);
  background: rgba(255, 206, 227, 0.4);
  box-shadow: 0 0 0 3px rgba(255, 133, 187, 0.18);
}

.booking-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), #ff6da9);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.booking-info {
  flex: 1;
  min-width: 0;
}

.booking-info strong {
  display: block;
  color: var(--ink);
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.booking-info .meta {
  margin: 2px 0 0;
  font-size: 0.78rem;
  color: var(--ink-muted);
}

.selected-tick {
  color: var(--primary);
  font-weight: 700;
  font-size: 1rem;
  flex-shrink: 0;
}

/* ── Form ── */
.review-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--ink);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.optional {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--ink-muted);
}

.form-tip {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 206, 227, 0.3);
  border: 1px dashed rgba(255, 133, 187, 0.45);
  color: var(--ink-muted);
  font-size: 0.85rem;
}

/* ── Stars ── */
.star-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.star-btn {
  font-size: 1.7rem;
  background: none;
  border: none;
  cursor: pointer;
  color: #d1d5db;
  line-height: 1;
  padding: 2px;
  transition: color 0.1s, transform 0.1s;
}

.star-btn:hover,
.star-btn.hovered {
  color: #f0b300;
  transform: scale(1.15);
}

.star-btn.active {
  color: #f0b300;
}

.star-label {
  font-size: 0.82rem;
  color: var(--ink-muted);
  margin-left: 6px;
  font-weight: 500;
  min-width: 56px;
}

/* ── Textarea ── */
.glass-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1.5px solid var(--hairline);
  background: rgba(255, 255, 255, 0.9);
  color: var(--ink);
  font-size: 0.9rem;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.glass-textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(255, 133, 187, 0.2);
}

.char-count {
  text-align: right;
  font-size: 0.75rem;
  color: var(--ink-muted);
}

/* ── Primary button ── */
.btn-primary {
  width: 100%;
  padding: 13px 20px;
  background: linear-gradient(135deg, var(--primary), #ff6da9);
  color: #fff;
  border: none;
  border-radius: 14px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.12s;
  box-shadow: 0 4px 14px rgba(255, 133, 187, 0.4);
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ── Recent reviews list ── */
.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.review-item {
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--surface-soft);
  border: 1px solid var(--hairline);
}

.review-item-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.review-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-soft), var(--primary));
  color: var(--ink);
  font-size: 0.78rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.review-meta-block {
  flex: 1;
  min-width: 0;
}

.review-meta-block strong {
  display: block;
  font-size: 0.88rem;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.review-meta-block .meta {
  margin: 1px 0 0;
  font-size: 0.75rem;
  color: var(--ink-muted);
}

.review-stars {
  color: #f0b300;
  font-size: 0.9rem;
  flex-shrink: 0;
  letter-spacing: 1px;
}

.review-comment {
  margin: 0;
  font-size: 0.88rem;
  color: var(--ink-muted);
  font-style: italic;
  line-height: 1.45;
}

/* ── Empty state ── */
.empty-state {
  text-align: center;
  padding: 20px 12px;
}

.empty-icon {
  font-size: 2rem;
  margin: 0 0 6px;
}

.empty-title {
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 4px;
  font-size: 0.95rem;
}

.empty-sub {
  color: var(--ink-muted);
  font-size: 0.82rem;
  margin: 0;
}

/* ── Skeleton shimmer ── */
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skeleton-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.5);
}

.skel {
  border-radius: 8px;
  background: linear-gradient(90deg, #f0e8ef 25%, #f9f0f5 50%, #f0e8ef 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.skel-title  { height: 14px; width: 60%; }
.skel-meta   { height: 11px; width: 40%; }
.skel-body   { height: 11px; width: 80%; margin-top: 4px; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Chip ── */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 20px;
  border: 1.5px solid rgba(255, 133, 187, 0.45);
  background: rgba(255, 206, 227, 0.3);
  color: var(--ink);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
}

.chip:hover:not(:disabled) {
  background: rgba(255, 206, 227, 0.55);
  border-color: var(--primary);
}

.chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>