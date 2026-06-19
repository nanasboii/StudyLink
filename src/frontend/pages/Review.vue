<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active review-page">

        <!-- ── Header ── -->
        <div class="page-header">
          <div class="page-header-text">
            <p class="page-kicker">⭐ SESSION FEEDBACK</p>
            <h2>Leave a Review</h2>
            <p class="page-subtext">Rate your completed sessions.</p>
          </div>
          <button @click="loadAll" class="chip" type="button" :disabled="isLoading" aria-label="Refresh">
            <span v-if="isLoading">⏳</span>
            <span v-else>↻ Refresh</span>
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

        <!-- ── Stats ── -->
        <div class="stats-row">
          <div class="stat-card glass-stat">
            <div class="stat-icon">📅</div>
            <div>
              <p class="stat-label">SESSIONS READY</p>
              <p class="stat-val">{{ completedBookings.length }}</p>
            </div>
          </div>
          <div class="stat-card glass-stat">
            <div class="stat-icon">⭐</div>
            <div>
              <p class="stat-label">REVIEWS GIVEN</p>
              <p class="stat-val">{{ recentReviews.length }}</p>
            </div>
          </div>
          <div class="stat-card glass-stat">
            <div class="stat-icon">🏅</div>
            <div>
              <p class="stat-label">AVG RATING</p>
              <p class="stat-val">{{ avgRating }}</p>
            </div>
          </div>
        </div>

        <!-- ── Completed Sessions ── -->
        <div class="glass-card">
          <div class="card-header-row">
            <div>
              <p class="section-icon">📋</p>
              <h3>Completed Sessions</h3>
              <p class="card-sub">Pick session — write review below.</p>
            </div>
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
            <p class="empty-title">All done!</p>
            <p class="empty-sub">No sessions waiting for review.</p>
          </div>

          <!-- List -->
          <div v-else class="booking-list">
            <!-- FIX → leaving animation so reviewed item slides out smoothly -->
            <transition-group name="booking-leave" tag="div" class="booking-list-inner">
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
            </transition-group>
          </div>
        </div>

        <!-- ── Write Review ── -->
        <div class="glass-card" :class="{ dimmed: !reviewData.bookingId }">
          <h3>✍️ Write Review</h3>

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
            <button
              @click="loadRecentReviews"
              class="chip chip-sm"
              type="button"
              :disabled="isLoadingReviews"
              aria-label="Reload reviews"
            >
              {{ isLoadingReviews ? '⏳' : '↻' }}
            </button>
          </div>

          <p v-if="reviewsEndpointMissing" class="inline-error small" role="alert">
            ⚠️ Reviews endpoint not found. Add <code>GET /users/me/submitted-reviews</code> to the backend.
          </p>
          <p v-else-if="reviewsError" class="inline-error" role="alert">⚠️ {{ reviewsError }}</p>

          <div v-else-if="isLoadingReviews" class="skeleton-list">
            <div v-for="n in 2" :key="n" class="skeleton-item">
              <div class="skel-avatar"></div>
              <div class="skel-lines">
                <div class="skel skel-title"></div>
                <div class="skel skel-body"></div>
              </div>
            </div>
          </div>

          <div v-else-if="recentReviews.length === 0" class="empty-state">
            <p class="empty-icon">💬</p>
            <p class="empty-title">No reviews yet</p>
            <p class="empty-sub">Submit your first review above.</p>
          </div>

          <div v-else class="reviews-list">
            <div v-for="rev in recentReviews" :key="rev.id" class="review-entry glass-review">
              <div class="review-top">
                <div>
                  <strong class="review-name">{{ rev.tutor_name || rev.tutorName || 'Tutor' }}</strong>
                  <p class="review-date">{{ safeDate(rev.created_at || rev.createdAt) }}</p>
                </div>
                <span class="review-stars" :aria-label="`Rating: ${rev.rating} out of 5`">
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
const reviewsEndpointMissing = ref(false)
let messageTimer             = null

// ─── Computed ──────────────────────────────────────────────
const canSubmit = computed(() =>
  reviewData.value.bookingId > 0 && reviewData.value.rating >= 1
)

const ratingLabel = computed(() => {
  const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']
  return labels[hoveredStar.value || reviewData.value.rating] || ''
})

// FIX → avgRating derived from recentReviews — always in sync
const avgRating = computed(() => {
  if (!recentReviews.value.length) return '—'
  const sum = recentReviews.value.reduce((acc, r) => acc + (Number(r.rating) || 0), 0)
  return (sum / recentReviews.value.length).toFixed(1)
})

// ─── Helpers ───────────────────────────────────────────────
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
    const is404 = msg.toLowerCase().includes('not found') || msg.includes('404') || msg.toLowerCase().includes('cannot get')
    reviewsEndpointMissing.value = is404
    reviewsError.value = is404 ? 'Not found.' : (msg || 'Could not load reviews.')
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
  if (!bookingId || bookingId <= 0) { showMessage('Select a session first.', true); return }
  if (!rating || rating < 1 || rating > 5) { showMessage('Pick a rating 1–5.', true); return }

  isSubmitting.value = true
  try {
    await api(`/bookings/${bookingId}/review`, 'POST', {
      rating:  Number(rating),
      comment: String(comment ?? '').trim(),
    })

    // FIX → optimistic remove: session gone immediately, no flicker
    completedBookings.value = completedBookings.value.filter(b => b.id !== bookingId)

    showMessage('🎉 Review submitted!', false)
    reviewData.value = { bookingId: 0, comment: '', rating: 0 }
    hoveredStar.value = 0

    // reload reviews list only (bookings already patched above)
    await loadRecentReviews()
  } catch (err) {
    showMessage(err?.message || 'Submit failed.', true)
  } finally {
    isSubmitting.value = false
  }
}

// ─── Mount / Unmount ───────────────────────────────────────
onMounted(async () => {
  const paramId = Number(route.params.resourceId ?? 0)
  await loadAll()
  if (paramId > 0) {
    const match = completedBookings.value.find(b => b.id === paramId)
    if (match) selectBooking(match)
  }
})

onUnmounted(() => { if (messageTimer) clearTimeout(messageTimer) })
</script>

<style scoped>
/* ── CSS local vars (mirrors glass-theme + base.css) ── */
.review-page {
  --_primary:      #FF85BB;
  --_primary-soft: #FFCEE3;
  --_ink:          #021A54;
  --_muted:        #6e6e73;
  --_canvas:       #F5F5F5;
  --_border:       rgba(255,133,187,0.25);
  --_glass-bg:     rgba(255,255,255,0.72);
  --_glass-blur:   blur(18px);
  --_radius:       18px;
}

/* ── Layout ── */
.review-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--canvas-parchment, #F5F5F5);
  min-height: 100%;
}

/* ── Header ── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  background: var(--_glass-bg);
  backdrop-filter: var(--_glass-blur);
  -webkit-backdrop-filter: var(--_glass-blur);
  border: 1px solid var(--_border);
  border-radius: var(--_radius);
  padding: 16px 18px;
}
.page-kicker {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--_primary);
  text-transform: uppercase;
  margin: 0 0 4px;
}
.page-header h2 {
  font-size: 1.55rem;
  font-weight: 800;
  color: var(--_ink);
  margin: 0 0 4px;
  line-height: 1.1;
}
.page-subtext { font-size: 0.83rem; color: var(--_primary); margin: 0; }

/* ── Stats row ── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.glass-stat {
  background: var(--_glass-bg);
  backdrop-filter: var(--_glass-blur);
  -webkit-backdrop-filter: var(--_glass-blur);
  border: 1px solid var(--_border);
  border-radius: 14px;
  padding: 12px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.stat-icon {
  font-size: 1.4rem;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--_primary-soft);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.stat-label {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--_muted);
  margin: 0;
}
.stat-val {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--_ink);
  margin: 0;
  line-height: 1.2;
}

/* ── Glass card ── */
.glass-card {
  background: var(--_glass-bg);
  backdrop-filter: var(--_glass-blur);
  -webkit-backdrop-filter: var(--_glass-blur);
  border: 1px solid var(--_border);
  border-radius: var(--_radius);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.glass-card h3 {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--_ink);
  margin: 0;
}
.glass-card.dimmed { opacity: 0.6; pointer-events: none; }

.card-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.card-header-row h3 { margin: 0; }
.card-sub { font-size: 0.78rem; color: var(--_primary); margin: 2px 0 0; }
.section-icon { font-size: 1rem; margin: 0 0 2px; }

/* ── Chip ── */
.chip {
  border: 1.5px solid var(--_primary);
  border-radius: 999px;
  background: transparent;
  color: var(--_primary);
  font-size: 0.78rem;
  font-weight: 700;
  padding: 6px 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 120ms, color 120ms;
}
.chip:hover { background: var(--_primary); color: #fff; }
.chip:disabled { opacity: 0.5; cursor: not-allowed; }
.chip-sm { padding: 4px 10px; font-size: 0.72rem; }

/* ── Count badge ── */
.count-badge {
  background: var(--_primary);
  color: #fff;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  flex-shrink: 0;
  align-self: flex-start;
}

/* ── Feedback msg ── */
.feedback-msg {
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 0.84rem;
  font-weight: 600;
  margin: 0;
}
.msg-success { background: rgba(52,199,89,0.12); color: #1a7a35; border: 1px solid rgba(52,199,89,0.3); }
.msg-error   { background: rgba(255,59,48,0.1);  color: #c0392b; border: 1px solid rgba(255,59,48,0.25); }

.inline-error {
  font-size: 0.82rem;
  color: #c0392b;
  background: rgba(255,59,48,0.07);
  border-radius: 8px;
  padding: 8px 12px;
  margin: 0;
}
.inline-error.small { font-size: 0.75rem; }

/* ── Hint banner ── */
.hint-banner {
  background: var(--_primary-soft);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 0.82rem;
  color: var(--_ink);
  font-weight: 600;
}

/* ── Skeleton ── */
.skeleton-list { display: flex; flex-direction: column; gap: 10px; }
.skeleton-item { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
.skel-avatar {
  width: 36px; height: 36px;
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
.skel-title { height: 13px; width: 60%; }
.skel-meta  { height: 11px; width: 40%; }
.skel-body  { height: 11px; width: 80%; }
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
@media (prefers-reduced-motion: reduce) {
  .skel, .skel-avatar { animation: none; }
}

/* ── Empty state ── */
.empty-state {
  text-align: center;
  padding: 24px 16px;
  color: var(--_muted);
}
.empty-icon  { font-size: 2rem; margin: 0 0 8px; }
.empty-title { font-weight: 700; font-size: 0.95rem; color: var(--_ink); margin: 0 0 4px; }
.empty-sub   { font-size: 0.83rem; margin: 0; }

/* ── Booking list ── */
.booking-list { display: flex; flex-direction: column; gap: 0; }
.booking-list-inner { display: flex; flex-direction: column; gap: 8px; }

.booking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1.5px solid transparent;
  background: rgba(245,245,245,0.5);
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background 0.15s, border-color 0.15s;
}
.booking-item:hover {
  background: rgba(255,206,227,0.3);
  border-color: rgba(255,133,187,0.3);
}
.booking-item.selected {
  background: rgba(255,206,227,0.45);
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
  color: var(--_ink);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.booking-meta { font-size: 0.75rem; color: var(--_primary); margin: 2px 0 0; }
.selected-check {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--_primary);
  flex-shrink: 0;
}

/* FIX → slide-out animation when session removed after review */
.booking-leave-leave-active {
  transition: all 0.3s ease;
}
.booking-leave-leave-to {
  opacity: 0;
  transform: translateX(20px) scale(0.96);
  max-height: 0;
  padding: 0;
  margin: 0;
  overflow: hidden;
}
@media (prefers-reduced-motion: reduce) {
  .booking-leave-leave-active { transition: none; }
}

/* ── Form ── */
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-size: 0.82rem; font-weight: 600; color: var(--_ink); }
.optional    { font-weight: 400; color: var(--_muted); font-size: 0.75rem; }

.star-row { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.star-btn {
  background: none;
  border: none;
  font-size: 1.6rem;
  color: #ccc;
  cursor: pointer;
  padding: 2px;
  line-height: 1;
  transition: color 0.12s, transform 0.1s;
}
.star-btn.active { color: #f5a623; }
.star-btn:hover:not(:disabled) { transform: scale(1.15); }
.star-btn:disabled { cursor: not-allowed; }
.star-label { font-size: 0.78rem; font-weight: 600; color: var(--_primary); margin-left: 6px; }

.glass-textarea {
  width: 100%;
  border: 1.5px solid var(--_border);
  border-radius: 12px;
  background: rgba(255,255,255,0.6);
  padding: 10px 12px;
  font-size: 0.88rem;
  color: var(--_ink);
  resize: vertical;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.glass-textarea:focus { border-color: var(--_primary); }
.char-count { font-size: 0.72rem; color: var(--_muted); align-self: flex-end; }

.btn-primary {
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #FF85BB 0%, #ff6da9 100%);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 700;
  padding: 12px 24px;
  cursor: pointer;
  width: 100%;
  transition: opacity 0.15s, transform 0.1s;
}
.btn-primary:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Past Reviews ── */
.reviews-list { display: flex; flex-direction: column; gap: 10px; }
.glass-review {
  background: rgba(255,206,227,0.18);
  border: 1px solid rgba(255,133,187,0.2);
  border-radius: 12px;
  padding: 12px 14px;
}
.review-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 6px;
}
.review-name { font-size: 0.88rem; font-weight: 700; color: var(--_ink); display: block; }
.review-date { font-size: 0.72rem; color: var(--_muted); margin: 2px 0 0; }
.review-stars { font-size: 0.88rem; color: #f5a623; letter-spacing: 1px; flex-shrink: 0; }
.review-comment { font-size: 0.83rem; color: var(--_ink); margin: 0; line-height: 1.5; font-style: italic; }

/* ── Transitions ── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>