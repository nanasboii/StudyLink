<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active review-page">

        <!-- ── Header ── -->
        <div class="page-header">
          <div class="page-header-text">
            <p class="page-kicker">⭐ Session Feedback</p>
            <h2>Leave a Review</h2>
            <p class="page-subtext">Rate your completed sessions.</p>
          </div>
          <button @click="loadAll" class="chip" type="button" :disabled="isLoading" aria-label="Refresh">
            <span v-if="isLoading">⏳</span>
            <span v-else>↻</span>
          </button>
        </div>

        <!-- ── Global message ── -->
        <transition name="fade">
          <p
            v-if="message"
            class="feedback-msg"
            :class="isError ? 'msg-error' : 'msg-success'"
            role="alert"
            aria-live="assertive"
          >{{ message }}</p>
        </transition>

        <!-- ── Completed Sessions ── -->
        <div class="glass-card">
          <div class="card-header-row">
            <h3>Completed Sessions</h3>
            <span v-if="completedBookings.length" class="count-badge">{{ completedBookings.length }}</span>
          </div>

          <p v-if="bookingsError" class="inline-error" role="alert">⚠️ {{ bookingsError }}</p>

          <!-- Skeleton -->
          <div v-else-if="isLoadingBookings" class="skeleton-list">
            <div v-for="n in 3" :key="n" class="skeleton-item">
              <div class="skel-avatar"></div>
              <div class="skel-lines">
                <div class="skel skel-title"></div>
                <div class="skel skel-meta"></div>
              </div>
            </div>
          </div>

          <!-- Empty -->
          <div v-else-if="completedBookings.length === 0" class="empty-state">
            <p class="empty-icon">📋</p>
            <p class="empty-title">No completed sessions</p>
            <p class="empty-sub">Finish a session to leave a review.</p>
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
              :aria-pressed="reviewData.bookingId === booking.id"
            >
              <div class="booking-avatar">
                {{ (booking.tutorName || booking.tuteeName || '?')[0].toUpperCase() }}
              </div>
              <div class="booking-info">
                <strong>{{ booking.tutorName || booking.tuteeName || 'Unknown' }}</strong>
                <p class="booking-meta">{{ booking.courseCode || '—' }} · {{ formatSessionTime(booking.sessionTime) }}</p>
              </div>
              <span v-if="reviewData.bookingId === booking.id" class="selected-check">✓</span>
            </button>
          </div>
        </div>

        <!-- ── Write Review ── -->
        <div class="glass-card" :class="{ dimmed: !reviewData.bookingId }">
          <h3>Write Review</h3>

          <!-- No session selected hint -->
          <transition name="fade">
            <div v-if="!reviewData.bookingId" class="hint-banner">
              👆 Select a session above first.
            </div>
          </transition>

          <!-- Rating -->
          <div class="form-group">
            <label class="form-label">Rating</label>
            <div class="star-row" role="group" aria-label="Star rating">
              <button
                v-for="s in 5"
                :key="s"
                class="star-btn"
                :class="{ active: s <= (hoveredStar || reviewData.rating) }"
                @click="reviewData.rating = s"
                @mouseenter="hoveredStar = s"
                @mouseleave="hoveredStar = 0"
                type="button"
                :aria-label="`${s} star${s !== 1 ? 's' : ''}`"
                :disabled="!reviewData.bookingId"
              >★</button>
              <span class="star-label">{{ ratingLabel }}</span>
            </div>
          </div>

          <!-- Comment -->
          <div class="form-group">
            <label class="form-label" for="review-comment">
              Comment <span class="optional">(optional)</span>
            </label>
            <textarea
              id="review-comment"
              v-model="reviewData.comment"
              rows="4"
              maxlength="250"
              placeholder="Share your experience…"
              class="glass-textarea"
              :disabled="!reviewData.bookingId"
              autocomplete="off"
            ></textarea>
            <span class="char-count">{{ reviewData.comment.length }}/250</span>
          </div>

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

        <!-- ── Past Reviews ── -->
        <div class="glass-card">
          <div class="card-header-row">
            <h3>Your Past Reviews</h3>
            <button @click="loadRecentReviews" class="chip chip-sm" type="button" :disabled="isLoadingReviews" aria-label="Reload reviews">
              {{ isLoadingReviews ? '…' : '↻' }}
            </button>
          </div>

          <!-- BUG FIX → show endpoint error with diagnostic hint -->
          <div v-if="reviewsError" class="inline-error-block" role="alert">
            <p>⚠️ {{ reviewsError }}</p>
            <p v-if="reviewsEndpointMissing" class="inline-error-hint">
              — Endpoint <code>/users/me/submitted-reviews</code> not deployed.<br>
              Run <code>node patch.js</code> on server then restart.
            </p>
          </div>

          <!-- Skeleton -->
          <div v-else-if="isLoadingReviews" class="skeleton-list">
            <div v-for="n in 2" :key="n" class="skeleton-item">
              <div class="skel-avatar"></div>
              <div class="skel-lines">
                <div class="skel skel-title"></div>
                <div class="skel skel-meta"></div>
                <div class="skel skel-body"></div>
              </div>
            </div>
          </div>

          <!-- Empty -->
          <div v-else-if="recentReviews.length === 0" class="empty-state">
            <p class="empty-icon">💬</p>
            <p class="empty-title">No reviews yet</p>
            <p class="empty-sub">Your submitted reviews appear here.</p>
          </div>

          <!-- Reviews list -->
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
                  <p class="meta">Booking #{{ rev.booking_id }} · {{ safeDate(rev.created_at) }}</p>
                </div>
                <span class="review-stars" aria-label="Rating: {{ rev.rating }} out of 5">
                  {{ renderStars(rev.rating) }}
                </span>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api.js'

const route = useRoute()

// ─── State ────────────────────────────────────────────────
const completedBookings      = ref([])
const recentReviews          = ref([])
const reviewData             = ref({ bookingId: 0, comment: '', rating: 0 })
const message                = ref('')
const isError                = ref(false)
const isLoading              = ref(false)
const isLoadingBookings      = ref(false)
const isLoadingReviews       = ref(false)
const isSubmitting           = ref(false)
const hoveredStar            = ref(0)
const bookingsError          = ref('')
const reviewsError           = ref('')
// FIX → track if endpoint is simply missing (404) vs real error
const reviewsEndpointMissing = ref(false)
let messageTimer             = null

// ─── Computed ──────────────────────────────────────────────
const canSubmit = computed(() =>
  reviewData.value.bookingId > 0 && reviewData.value.rating >= 1
)

const ratingLabel = computed(() => {
  const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']
  const r = hoveredStar.value || reviewData.value.rating
  return labels[r] || ''
})

// ─── Helpers ───────────────────────────────────────────────
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
  if (!error) messageTimer = setTimeout(() => { message.value = '' }, 4500)
}

// ─── Data Loaders ──────────────────────────────────────────
const loadCompletedBookings = async () => {
  isLoadingBookings.value = true
  bookingsError.value = ''
  try {
    const resp = await api('/bookings/inbox')
    const bookings = Array.isArray(resp?.bookings) ? resp.bookings : []
    completedBookings.value = bookings
      .filter((b) => b?.status === 'completed')
      .map((b) => ({
        id:          b.id,
        tutorName:   b.tutor_name   || b.tutorName   || '',
        tuteeName:   b.tutee_name   || b.tuteeName   || '',
        courseCode:  b.course_code  || b.courseCode  || '',
        sessionTime: b.session_time || b.sessionTime || '',
        status:      b.status,
      }))
  } catch (err) {
    bookingsError.value = err?.message || 'Could not load sessions.'
  } finally {
    isLoadingBookings.value = false
  }
}

const loadRecentReviews = async () => {
  isLoadingReviews.value = true
  reviewsError.value = ''
  reviewsEndpointMissing.value = false
  try {
    const resp = await api('/users/me/submitted-reviews')
    recentReviews.value = Array.isArray(resp?.reviews) ? resp.reviews : []
  } catch (err) {
    const msg = String(err?.message || '')
    // FIX → detect 404 / "not found" → endpoint missing → show patch hint
    const is404 = msg.toLowerCase().includes('not found')
                  || msg.includes('404')
                  || msg.toLowerCase().includes('cannot get')
    reviewsEndpointMissing.value = is404
    reviewsError.value = is404
      ? 'Not found.'
      : (msg || 'Could not load reviews.')
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

// ─── Actions ───────────────────────────────────────────────
const selectBooking = (booking) => {
  reviewData.value.bookingId = booking.id ?? 0
  reviewData.value.rating    = 0
  reviewData.value.comment   = ''
  hoveredStar.value          = 0
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
      rating:  Number(rating),
      comment: String(comment ?? '').trim(),
    })
    showMessage('🎉 Review submitted!', false)
    reviewData.value = { bookingId: 0, comment: '', rating: 0 }
    hoveredStar.value = 0
    await Promise.all([loadCompletedBookings(), loadRecentReviews()])
  } catch (err) {
    showMessage(err?.message || 'Submit failed.', true)
  } finally {
    isSubmitting.value = false
  }
}

// ─── Mount ─────────────────────────────────────────────────
onMounted(async () => {
  const paramId = Number(route.params.resourceId ?? 0)
  if (paramId > 0) reviewData.value.bookingId = paramId
  await loadAll()
})

onUnmounted(() => {
  if (messageTimer) clearTimeout(messageTimer)
})
</script>

<style scoped>
/* ── Page ── */
.review-page {
  padding: 20px 16px 48px;
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
  color: var(--primary, #FF85BB);
}

.page-header h2 {
  margin: 0 0 4px;
  font-size: clamp(1.3rem, 2.5vw, 1.65rem);
  color: var(--ink, #021A54);
  font-weight: 700;
}

.page-subtext {
  margin: 0;
  font-size: 0.85rem;
  color: var(--ink-muted, #6e6e73);
}

/* ── Chips ── */
.chip {
  padding: 7px 16px;
  border-radius: 20px;
  border: 1.5px solid rgba(255, 133, 187, 0.4);
  background: transparent;
  color: var(--ink, #021A54);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}
.chip:hover:not(:disabled) { background: rgba(255, 133, 187, 0.1); }
.chip:disabled { opacity: 0.5; cursor: not-allowed; }
.chip-sm { padding: 5px 12px; font-size: 0.8rem; }

/* ── Glass card ── */
.glass-card {
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(255, 133, 187, 0.25);
  border-radius: 20px;
  padding: 18px;
  margin-bottom: 16px;
  box-shadow: 0 8px 28px rgba(2, 26, 84, 0.08);
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
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
  color: var(--ink, #021A54);
}

/* ── Card header row ── */
.card-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.card-header-row h3 { margin: 0; }

.count-badge {
  background: var(--primary-soft, #FFCEE3);
  color: var(--ink, #021A54);
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 20px;
  padding: 2px 9px;
}

/* ── Global feedback message ── */
.feedback-msg {
  padding: 11px 14px;
  border-radius: 12px;
  font-size: 0.88rem;
  font-weight: 600;
  margin-bottom: 14px;
}
.msg-success {
  background: rgba(26, 122, 72, 0.1);
  border: 1px solid rgba(26, 122, 72, 0.25);
  color: #1a7a48;
}
.msg-error {
  background: rgba(200, 40, 60, 0.08);
  border: 1px solid rgba(200, 40, 60, 0.2);
  color: #c22840;
}

/* ── Inline errors ── */
.inline-error {
  color: #c22840;
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0 0 10px;
}

/* FIX → block error with hint for missing endpoint */
.inline-error-block {
  background: rgba(200, 40, 60, 0.06);
  border: 1px solid rgba(200, 40, 60, 0.18);
  border-radius: 12px;
  padding: 12px 14px;
  color: #c22840;
  font-size: 0.84rem;
  font-weight: 600;
  margin-bottom: 10px;
}
.inline-error-block p { margin: 0 0 4px; }
.inline-error-hint {
  font-weight: 500;
  color: var(--ink-muted, #6e6e73);
  font-size: 0.8rem;
  margin-top: 6px !important;
}
.inline-error-hint code {
  background: rgba(2, 26, 84, 0.08);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 0.77rem;
}

/* ── Hint banner ── */
.hint-banner {
  background: rgba(255, 206, 227, 0.35);
  border: 1.5px dashed rgba(255, 133, 187, 0.5);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--ink, #021A54);
  margin-bottom: 14px;
}

/* ── Skeleton ── */
.skeleton-list { display: flex; flex-direction: column; gap: 10px; }
.skeleton-item { display: flex; align-items: center; gap: 12px; }
.skel-avatar {
  width: 38px; height: 38px;
  border-radius: 50%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200%;
  animation: shimmer 1.4s infinite;
  flex-shrink: 0;
}
.skel-lines { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.skel {
  border-radius: 6px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200%;
  animation: shimmer 1.4s infinite;
}
.skel-title  { height: 13px; width: 60%; }
.skel-meta   { height: 11px; width: 40%; }
.skel-body   { height: 11px; width: 80%; }
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Empty state ── */
.empty-state {
  text-align: center;
  padding: 28px 16px;
  color: var(--ink-muted, #6e6e73);
}
.empty-icon  { font-size: 2rem; margin: 0 0 8px; }
.empty-title { font-weight: 700; font-size: 0.95rem; color: var(--ink, #021A54); margin: 0 0 4px; }
.empty-sub   { font-size: 0.83rem; margin: 0; }

/* ── Booking list ── */
.booking-list { display: flex; flex-direction: column; gap: 8px; }

.booking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1.5px solid transparent;
  background: rgba(245, 245, 245, 0.5);
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.15s, border-color 0.15s;
}
.booking-item:hover {
  background: rgba(255, 206, 227, 0.3);
  border-color: rgba(255, 133, 187, 0.3);
}
.booking-item.selected {
  background: rgba(255, 206, 227, 0.45);
  border-color: #FF85BB;
}

.booking-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFCEE3 0%, #FF85BB 100%);
  color: #fff;
  font-weight: 700;
  font-size: 0.88rem;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.booking-info { flex: 1; min-width: 0; }
.booking-info strong {
  display: block;
  font-size: 0.88rem;
  color: var(--ink, #021A54);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.booking-meta {
  margin: 2px 0 0;
  font-size: 0.77rem;
  color: var(--ink-muted, #6e6e73);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selected-check {
  color: #FF85BB;
  font-weight: 700;
  font-size: 1rem;
  flex-shrink: 0;
}

/* ── Rating stars ── */
.form-group { margin-bottom: 14px; }

.form-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink, #021A54);
  margin-bottom: 8px;
}
.optional {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--ink-muted, #6e6e73);
  font-size: 0.78rem;
}

.star-row { display: flex; align-items: center; gap: 4px; }

.star-btn {
  background: none;
  border: none;
  font-size: 1.7rem;
  line-height: 1;
  color: #d0d0d0;
  cursor: pointer;
  padding: 2px;
  transition: color 0.1s, transform 0.1s;
}
.star-btn.active { color: #FF85BB; }
.star-btn:hover:not(:disabled) { transform: scale(1.2); }
.star-btn:disabled { cursor: not-allowed; opacity: 0.5; }

.star-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink-muted, #6e6e73);
  margin-left: 6px;
}

/* ── Textarea ── */
.glass-textarea {
  width: 100%;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1.5px solid rgba(2, 26, 84, 0.12);
  background: rgba(255, 255, 255, 0.85);
  font: inherit;
  font-size: 0.92rem;
  color: var(--ink, #021A54);
  outline: none;
  resize: vertical;
  transition: border-color 0.15s, box-shadow 0.15s;
  box-sizing: border-box;
}
.glass-textarea:focus {
  border-color: #FF85BB;
  box-shadow: 0 0 0 3px rgba(255, 133, 187, 0.18);
}
.glass-textarea:disabled { opacity: 0.5; }

.char-count {
  display: block;
  text-align: right;
  font-size: 0.74rem;
  color: var(--ink-muted, #6e6e73);
  margin-top: 4px;
}

/* ── Submit button ── */
.btn-primary {
  width: 100%;
  padding: 13px;
  border-radius: 14px;
  border: none;
  background: #FF85BB;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
  margin-top: 4px;
}
.btn-primary:hover:not(:disabled) { background: #ff6da9; }
.btn-primary:active:not(:disabled) { transform: scale(0.98); }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

/* ── Past reviews ── */
.reviews-list { display: flex; flex-direction: column; gap: 12px; }

.review-item {
  padding: 14px;
  border-radius: 14px;
  background: rgba(245, 245, 245, 0.6);
  border: 1px solid rgba(2, 26, 84, 0.07);
}
.review-item-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.review-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFCEE3 0%, #FF85BB 100%);
  color: #fff;
  font-weight: 700;
  font-size: 0.9rem;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.review-meta-block { flex: 1; min-width: 0; }
.review-meta-block strong { font-size: 0.88rem; color: var(--ink, #021A54); display: block; }
.meta {
  font-size: 0.76rem;
  color: var(--ink-muted, #6e6e73);
  margin: 2px 0 0;
}
.review-stars {
  font-size: 0.85rem;
  color: #FF85BB;
  letter-spacing: 1px;
  flex-shrink: 0;
}
.review-comment {
  margin: 4px 0 0;
  font-size: 0.83rem;
  color: var(--ink-muted, #6e6e73);
  font-style: italic;
  line-height: 1.5;
  padding-left: 46px;
}

/* ── Transitions ── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .skel, .skel-avatar { animation: none; }
  .star-btn, .btn-primary, .booking-item, .glass-card { transition: none; }
}
</style>