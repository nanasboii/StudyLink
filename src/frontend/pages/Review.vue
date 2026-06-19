<template>
  <main class="review-page">

    <!-- ── HERO ── -->
    <div class="glass-hero">
      <div class="hero-icon">⭐</div>
      <div>
        <p class="hero-kicker">SESSION FEEDBACK</p>
        <h1>Leave a Review</h1>
        <p class="hero-sub">Rate your completed sessions.</p>
      </div>
    </div>

    <!-- ── TOAST ── -->
    <transition name="fade">
      <div
        v-if="message"
        class="toast"
        :class="isError ? 'toast--error' : 'toast--success'"
        role="alert"
        aria-live="polite"
      >
        {{ isError ? '⚠️' : '🎉' }} {{ message }}
      </div>
    </transition>

    <div class="review-layout">

      <!-- ── COMPLETED SESSIONS ── -->
      <div class="glass-card">
        <div class="card-head">
          <h2 class="card-title">Completed Sessions</h2>
          <span v-if="completedBookings.length" class="badge">{{ completedBookings.length }}</span>
        </div>

        <!-- Error -->
        <p v-if="bookingsError" class="inline-error" role="alert">⚠️ {{ bookingsError }}</p>

        <!-- Skeleton -->
        <div v-else-if="isLoadingBookings" class="skel-list">
          <div v-for="n in 3" :key="n" class="skel-row">
            <div class="skel skel-avatar"></div>
            <div class="skel-lines">
              <div class="skel skel-title"></div>
              <div class="skel skel-meta"></div>
            </div>
          </div>
        </div>

        <!-- Empty -->
        <div v-else-if="completedBookings.length === 0" class="empty-state">
          <p class="empty-icon">📋</p>
          <p class="empty-title">No sessions yet</p>
          <p class="empty-sub">Complete a tutoring session first.</p>
        </div>

        <!-- List -->
        <div v-else class="session-list">
          <button
            v-for="b in completedBookings"
            :key="b.id"
            type="button"
            class="session-row"
            :class="{ 'session-row--selected': reviewData.bookingId === b.id }"
            @click="selectBooking(b)"
            :aria-pressed="reviewData.bookingId === b.id"
          >
            <div class="s-avatar">{{ (b.tutorName || b.tuteeName || '?')[0].toUpperCase() }}</div>
            <div class="s-info">
              <strong>{{ b.tutorName || b.tuteeName || 'Unknown' }}</strong>
              <p class="s-meta">{{ b.courseCode || '—' }} · {{ formatSessionTime(b.sessionTime) }}</p>
            </div>
            <span v-if="reviewData.bookingId === b.id" class="s-tick">✓</span>
            <span v-if="b.alreadyReviewed" class="s-reviewed">reviewed</span>
          </button>
        </div>
      </div>

      <!-- ── WRITE REVIEW ── -->
      <div class="glass-card" :class="{ 'card--dimmed': isSubmitting }">
        <h2 class="card-title">Write Review</h2>

        <!-- No session selected -->
        <div v-if="!reviewData.bookingId" class="form-tip">
          ☝️ Select a session above first.
        </div>

        <div class="review-form" :class="{ 'form--disabled': !reviewData.bookingId }">

          <!-- Stars -->
          <div class="form-group">
            <label class="form-label">Rating</label>
            <div class="star-row" role="group" aria-label="Select rating">
              <button
                v-for="n in 5"
                :key="n"
                type="button"
                class="star-btn"
                :class="{ active: n <= (hoveredStar || reviewData.rating) }"
                @click="reviewData.rating = n"
                @mouseenter="hoveredStar = n"
                @mouseleave="hoveredStar = 0"
                :disabled="!reviewData.bookingId"
                :aria-label="`${n} star${n !== 1 ? 's' : ''}`"
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
            ></textarea>
            <span class="char-count">{{ reviewData.comment.length }}/250</span>
          </div>

          <button
            class="btn-primary"
            type="button"
            :disabled="isSubmitting || !canSubmit"
            @click="submitReview"
          >
            <span v-if="isSubmitting" class="dots">Submitting…</span>
            <span v-else>Submit Review</span>
          </button>
        </div>
      </div>

      <!-- ── PAST REVIEWS ── -->
      <div class="glass-card">
        <div class="card-head">
          <h2 class="card-title">Your Past Reviews</h2>
          <button class="refresh-btn" type="button" @click="loadRecentReviews" :disabled="isLoadingReviews">
            {{ isLoadingReviews ? '…' : '↺' }}
          </button>
        </div>

        <!-- Error — likely endpoint missing → clear message -->
        <div v-if="reviewsError" class="reviews-error-block">
          <p class="inline-error" role="alert">⚠️ {{ reviewsError }}</p>
          <p class="error-hint">
            → If this persists: endpoint <code>/users/me/submitted-reviews</code> may not be deployed.
            Run <code>patch.js</code> on server.
          </p>
        </div>

        <!-- Skeleton -->
        <div v-else-if="isLoadingReviews" class="skel-list">
          <div v-for="n in 2" :key="n" class="skel-row">
            <div class="skel skel-avatar"></div>
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

        <!-- List -->
        <div v-else class="reviews-list">
          <div
            v-for="rev in recentReviews"
            :key="rev.id"
            class="review-item"
          >
            <div class="review-top">
              <div class="r-avatar">
                {{ (rev.reviewed_user_name || 'U')[0].toUpperCase() }}
              </div>
              <div class="r-meta">
                <strong>{{ rev.reviewed_user_name || 'User' }}</strong>
                <p class="s-meta">Booking #{{ rev.booking_id ?? '—' }} · {{ safeDate(rev.created_at) }}</p>
              </div>
              <span class="r-stars">{{ renderStars(Number(rev.rating) || 0) }}</span>
            </div>
            <p v-if="rev.comment?.trim()" class="r-comment">"{{ rev.comment }}"</p>
          </div>
        </div>
      </div>

    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api.js'

const route = useRoute()

// ─── State ────────────────────────────────────────────────
const completedBookings = ref([])
const recentReviews     = ref([])
const reviewData        = ref({ bookingId: 0, comment: '', rating: 0 })
const message           = ref('')
const isError           = ref(false)
const isLoading         = ref(false)
const isLoadingBookings = ref(false)
const isLoadingReviews  = ref(false)
const isSubmitting      = ref(false)
const hoveredStar       = ref(0)
const bookingsError     = ref('')
const reviewsError      = ref('')
let   toastTimer        = null

// ─── Computed ─────────────────────────────────────────────
// FIX → guard bookingId zero (falsy)
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
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatSessionTime = (raw) => {
  if (!raw) return '—'
  const d = new Date(raw)
  return isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const showMessage = (text, error = false) => {
  if (toastTimer) clearTimeout(toastTimer)
  message.value = text
  isError.value = error
  // FIX → success auto-dismiss; error persists
  if (!error) toastTimer = setTimeout(() => { message.value = '' }, 4500)
}

// ─── Data loaders ─────────────────────────────────────────
const loadCompletedBookings = async () => {
  isLoadingBookings.value = true
  bookingsError.value = ''
  try {
    const resp = await api('/bookings/inbox')
    const all = Array.isArray(resp?.bookings) ? resp.bookings : []
    // FIX → only completed; normalize field names from snake_case
    completedBookings.value = all
      .filter(b => b?.status === 'completed')
      .map(b => ({
        id:          b.id,
        tutorName:   b.tutor_name  || b.tutorName  || '',
        tuteeName:   b.tutee_name  || b.tuteeName  || '',
        courseCode:  b.course_code || b.courseCode  || '',
        sessionTime: b.session_time || b.sessionTime || '',
        status:      b.status,
        // FIX → track already-reviewed (optional info)
        alreadyReviewed: b.already_reviewed ?? false,
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
  try {
    const resp = await api('/users/me/submitted-reviews')
    // FIX → guard against both {reviews:[]} and [] shapes
    if (Array.isArray(resp)) {
      recentReviews.value = resp
    } else if (Array.isArray(resp?.reviews)) {
      recentReviews.value = resp.reviews
    } else {
      recentReviews.value = []
    }
  } catch (err) {
    // FIX → "Not found" was from 404 on endpoint not existing
    // Show helpful message, don't crash
    const status = err?.status ?? err?.statusCode ?? 0
    if (status === 404) {
      reviewsError.value = 'Endpoint not found (404). Deploy patch.js on server.'
    } else {
      reviewsError.value = err?.message || 'Could not load reviews.'
    }
    recentReviews.value = []
  } finally {
    isLoadingReviews.value = false
  }
}

const loadAll = async () => {
  isLoading.value = true
  // FIX → parallel load
  await Promise.all([loadCompletedBookings(), loadRecentReviews()])
  isLoading.value = false
}

// ─── Actions ──────────────────────────────────────────────
const selectBooking = (booking) => {
  reviewData.value.bookingId = booking.id
  // FIX → clear old form when switching
  reviewData.value.rating  = 0
  reviewData.value.comment = ''
  hoveredStar.value = 0
}

const submitReview = async () => {
  if (isSubmitting.value) return

  const { bookingId, rating, comment } = reviewData.value

  // FIX → guard zero bookingId
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
      comment: String(comment || '').trim(),
    })
    showMessage('Review submitted! 🎉', false)
    // FIX → full reset
    reviewData.value = { bookingId: 0, comment: '', rating: 0 }
    hoveredStar.value = 0
    await Promise.all([loadCompletedBookings(), loadRecentReviews()])
  } catch (err) {
    showMessage(err?.message || 'Submit failed.', true)
  } finally {
    // FIX → always reset submitting flag
    isSubmitting.value = false
  }
}

// ─── Lifecycle ────────────────────────────────────────────
onMounted(loadAll)
onUnmounted(() => { if (toastTimer) clearTimeout(toastTimer) })
</script>

<style scoped>
/* ── Page ─────────────────────────────────────────────── */
.review-page {
  padding: 20px 16px 40px;
  max-width: 760px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: fadeIn 220ms ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Hero ─────────────────────────────────────────────── */
.glass-hero {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 22px 24px;
  border-radius: 18px;
  background: linear-gradient(135deg, #021A54 0%, #1a3a8a 100%);
  color: #fff;
  box-shadow: 0 8px 28px rgba(2,26,84,0.25);
}

.hero-icon { font-size: 2rem; line-height: 1; }

.hero-kicker {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #FFCEE3;
  margin: 0 0 4px;
}

.glass-hero h1 {
  margin: 0 0 2px;
  font-size: 1.35rem;
  font-weight: 800;
  color: #fff;
}

.hero-sub {
  margin: 0;
  font-size: 0.82rem;
  color: rgba(255,206,227,0.85);
}

/* ── Toast ────────────────────────────────────────────── */
.toast {
  padding: 11px 16px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.9rem;
}

.toast--success {
  background: rgba(34,134,82,0.1);
  border: 1px solid rgba(34,134,82,0.28);
  color: #1a6b40;
}

.toast--error {
  background: rgba(191,47,69,0.08);
  border: 1px solid rgba(191,47,69,0.28);
  color: #8f2335;
}

/* ── Layout ───────────────────────────────────────────── */
.review-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Glass Card ───────────────────────────────────────── */
.glass-card {
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255,133,187,0.22);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(2,26,84,0.07);
  padding: 20px;
}

.card--dimmed { opacity: 0.6; pointer-events: none; }

.card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.card-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: #021A54;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 99px;
  background: #FF85BB;
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
}

.refresh-btn {
  margin-left: auto;
  background: none;
  border: 1px solid rgba(2,26,84,0.12);
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 1rem;
  color: #021A54;
  cursor: pointer;
  transition: background 120ms;
}

.refresh-btn:hover:not(:disabled) { background: #f5f5f5; }
.refresh-btn:disabled { opacity: 0.4; }

/* ── Errors ───────────────────────────────────────────── */
.inline-error {
  margin: 0;
  font-size: 0.88rem;
  color: #8f2335;
  font-weight: 600;
}

.reviews-error-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(191,47,69,0.06);
  border: 1px solid rgba(191,47,69,0.18);
}

.error-hint {
  margin: 0;
  font-size: 0.78rem;
  color: #6e6e73;
}

.error-hint code {
  background: rgba(2,26,84,0.07);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.76rem;
  color: #021A54;
}

/* ── Skeleton ─────────────────────────────────────────── */
.skel-list { display: flex; flex-direction: column; gap: 12px; }

.skel-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.skel {
  border-radius: 8px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skel-avatar { width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0; }
.skel-lines  { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.skel-title  { height: 14px; width: 55%; }
.skel-meta   { height: 11px; width: 40%; }
.skel-body   { height: 11px; width: 75%; }

/* ── Empty State ──────────────────────────────────────── */
.empty-state {
  text-align: center;
  padding: 28px 16px;
}

.empty-icon  { font-size: 2rem; margin: 0 0 8px; }
.empty-title { margin: 0 0 4px; font-weight: 700; color: #021A54; font-size: 0.95rem; }
.empty-sub   { margin: 0; font-size: 0.82rem; color: #6e6e73; }

/* ── Session List ─────────────────────────────────────── */
.session-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.session-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  background: #fff;
  border: 1.5px solid rgba(2,26,84,0.1);
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  text-align: left;
  transition: border-color 140ms, background 140ms, box-shadow 140ms;
}

.session-row:hover {
  border-color: #FF85BB;
  background: rgba(255,206,227,0.12);
}

.session-row--selected {
  border-color: #FF85BB;
  background: rgba(255,206,227,0.22);
  box-shadow: 0 0 0 3px rgba(255,133,187,0.14);
}

.s-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF85BB, #FFCEE3);
  color: #021A54;
  font-weight: 800;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.s-info { flex: 1; min-width: 0; }
.s-info strong { display: block; font-size: 0.9rem; color: #021A54; font-weight: 700; }
.s-meta { margin: 2px 0 0; font-size: 0.78rem; color: #6e6e73; }

.s-tick {
  color: #FF85BB;
  font-size: 1.1rem;
  font-weight: 800;
  flex-shrink: 0;
}

.s-reviewed {
  font-size: 0.7rem;
  font-weight: 700;
  color: #6e6e73;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 2px 7px;
  flex-shrink: 0;
}

/* ── Review Form ──────────────────────────────────────── */
.form-tip {
  margin: 0 0 16px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(255,206,227,0.3);
  border: 1.5px dashed #FF85BB;
  font-size: 0.88rem;
  color: #021A54;
  font-weight: 600;
}

.review-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form--disabled { opacity: 0.45; pointer-events: none; }

.form-group { display: flex; flex-direction: column; gap: 6px; }

.form-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #021A54;
}

.optional { font-size: 0.72rem; font-weight: 500; color: #6e6e73; text-transform: none; }

/* Stars */
.star-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.star-btn {
  background: none;
  border: none;
  font-size: 1.6rem;
  color: #e0e0e0;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 120ms, transform 100ms;
}

.star-btn.active { color: #FF85BB; }
.star-btn:hover:not(:disabled) { color: #ff6da9; transform: scale(1.15); }
.star-btn:disabled { cursor: not-allowed; }

.star-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #6e6e73;
  margin-left: 4px;
}

/* Textarea */
.glass-textarea {
  width: 100%;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1.5px solid rgba(2,26,84,0.12);
  background: rgba(255,255,255,0.9);
  font: inherit;
  font-size: 0.9rem;
  color: #021A54;
  outline: none;
  resize: vertical;
  transition: border-color 140ms, box-shadow 140ms;
  box-sizing: border-box;
}

.glass-textarea:focus {
  border-color: #FF85BB;
  box-shadow: 0 0 0 3px rgba(255,133,187,0.18);
}

.glass-textarea:disabled { background: rgba(245,245,245,0.7); color: #6e6e73; }

.char-count {
  font-size: 0.74rem;
  color: #6e6e73;
  text-align: right;
}

/* Submit button */
.btn-primary {
  width: 100%;
  padding: 13px;
  border-radius: 24px;
  border: none;
  background: #FF85BB;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 140ms, transform 100ms, opacity 140ms;
}

.btn-primary:hover:not(:disabled) { background: #ff6da9; }
.btn-primary:active:not(:disabled) { transform: scale(0.97); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* Dots animation */
.dots::after {
  content: '';
  animation: dots 1.2s steps(3,end) infinite;
}
@keyframes dots {
  0%   { content: ''; }
  33%  { content: '.'; }
  66%  { content: '..'; }
  100% { content: '...'; }
}

/* ── Past Reviews ─────────────────────────────────────── */
.reviews-list { display: flex; flex-direction: column; gap: 12px; }

.review-item {
  padding: 14px;
  border-radius: 12px;
  background: rgba(245,245,245,0.7);
  border: 1px solid rgba(2,26,84,0.07);
}

.review-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.r-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFCEE3, #FF85BB);
  color: #021A54;
  font-weight: 800;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.r-meta { flex: 1; min-width: 0; }
.r-meta strong { display: block; font-size: 0.88rem; color: #021A54; font-weight: 700; }

.r-stars {
  font-size: 0.9rem;
  color: #FF85BB;
  letter-spacing: 1px;
  flex-shrink: 0;
}

.r-comment {
  margin: 0;
  font-size: 0.85rem;
  color: #6e6e73;
  font-style: italic;
  line-height: 1.5;
}

/* ── Transitions ──────────────────────────────────────── */
.fade-enter-active, .fade-leave-active { transition: opacity 200ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── Reduced motion ───────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .skel { animation: none; }
  .review-page { animation: none; }
  .star-btn { transition: none; }
  .dots::after { animation: none; content: '…'; }
}

/* ── Mobile ───────────────────────────────────────────── */
@media (max-width: 640px) {
  .review-page { padding: 14px 12px 32px; }
  .glass-hero { padding: 16px; }
  .glass-hero h1 { font-size: 1.15rem; }
  .glass-card { padding: 16px; }
}
</style>