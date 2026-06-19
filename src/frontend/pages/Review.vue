<template>
  <main class="review-page">
    <div class="phone-shell">
      <div class="review-content">

        <!-- ── Header Card ── -->
        <div class="card page-header-card">
          <div class="header-left">
            <p class="page-kicker">⭐ SESSION FEEDBACK</p>
            <h2>Leave a Review</h2>
            <p class="page-subtext">Rate your completed sessions.</p>
          </div>
          <div class="header-right">
            <button
              class="btn-refresh"
              type="button"
              :disabled="isLoading"
              @click="loadAll"
              aria-label="Refresh all"
            >
              <span class="btn-refresh-icon">{{ isLoading ? '⏳' : '↻' }}</span>
              {{ isLoading ? 'Loading…' : 'Refresh' }}
            </button>
          </div>
        </div>

        <!-- ── Global Message ── -->
        <transition name="fade">
          <div
            v-if="message"
            class="error-banner"
            :class="isError ? 'banner-error' : 'banner-success'"
            role="alert"
            aria-live="assertive"
          >{{ message }}</div>
        </transition>

        <!-- ── Stats Row ── -->
        <div class="stats-grid">
          <div class="card stat-card">
            <div class="stat-icon">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
              </svg>
            </div>
            <div class="stat-body">
              <p class="stat-label">Sessions Ready</p>
              <p class="stat-value">{{ completedBookings.length }}</p>
            </div>
          </div>
          <div class="card stat-card">
            <div class="stat-icon">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
            </div>
            <div class="stat-body">
              <p class="stat-label">Reviews Given</p>
              <p class="stat-value">{{ recentReviews.length }}</p>
            </div>
          </div>
          <div class="card stat-card">
            <div class="stat-icon">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z"/>
              </svg>
            </div>
            <div class="stat-body">
              <p class="stat-label">Avg Rating</p>
              <p class="stat-value">{{ avgRating }}</p>
            </div>
          </div>
        </div>

        <!-- ── Completed Sessions ── -->
        <div class="card section-card">
          <div class="section-header">
            <div>
              <h3>📋 Completed Sessions</h3>
              <p class="section-sub">Pick session → write review below.</p>
            </div>
            <span v-if="completedBookings.length" class="count-badge">{{ completedBookings.length }}</span>
          </div>

          <!-- Error -->
          <div v-if="bookingsError" class="inline-error" role="alert">⚠️ {{ bookingsError }}</div>

          <!-- Skeleton -->
          <div v-else-if="isLoadingBookings" class="skeleton-list">
            <div v-for="n in 3" :key="n" class="skeleton-item">
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
            <p class="empty-text">No completed sessions</p>
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
        <div class="card section-card" :class="{ 'card-dimmed': !reviewData.bookingId }">
          <div class="section-header">
            <div>
              <h3>✍️ Write Review</h3>
              <p class="section-sub">{{ reviewData.bookingId ? 'Session selected → rate below.' : 'Select session above first.' }}</p>
            </div>
          </div>

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
              <span v-if="ratingLabel" class="star-label">{{ ratingLabel }}</span>
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
            <span v-else>Submit Review →</span>
          </button>
        </div>

        <!-- ── Past Reviews ── -->
        <div class="card section-card">
          <div class="section-header">
            <div>
              <h3>💬 Your Past Reviews</h3>
              <p class="section-sub">All reviews you submitted.</p>
            </div>
            <button
              @click="loadRecentReviews"
              class="chip chip-strong"
              type="button"
              :disabled="isLoadingReviews"
              aria-label="Reload reviews"
            >{{ isLoadingReviews ? '⏳' : '↻' }}</button>
          </div>

          <!-- Error -->
          <div v-if="reviewsError" class="inline-error" role="alert">
            <p>⚠️ {{ reviewsError }}</p>
            <p v-if="reviewsEndpointMissing" class="inline-error-hint">
              Endpoint <code>/users/me/submitted-reviews</code> missing.<br>
              Run <code>node patch.js</code> then restart server.
            </p>
          </div>

          <!-- Skeleton -->
          <div v-else-if="isLoadingReviews" class="skeleton-list">
            <div v-for="n in 2" :key="n" class="skeleton-item">
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
            <p class="empty-text">No reviews yet</p>
            <p class="empty-sub">Submitted reviews appear here.</p>
          </div>

          <!-- Reviews -->
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
                  <p class="meta">Booking #{{ rev.booking_id ?? '—' }} · {{ safeDate(rev.created_at) }}</p>
                </div>
                <span
                  class="review-stars"
                  :aria-label="`Rating: ${rev.rating ?? 0} out of 5`"
                >{{ renderStars(rev.rating) }}</span>
              </div>
              <p v-if="rev.comment" class="review-comment">"{{ rev.comment }}"</p>
            </div>
          </div>
        </div>

      </div><!-- /review-content -->
    </div><!-- /phone-shell -->
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
// FIX → distinguish 404 missing endpoint vs real error
const reviewsEndpointMissing = ref(false)
let messageTimer             = null

// ─── Computed ──────────────────────────────────────────────
// FIX → bookingId === 0 is falsy; use explicit > 0
const canSubmit = computed(() =>
  reviewData.value.bookingId > 0 && reviewData.value.rating >= 1
)

const ratingLabel = computed(() => {
  const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']
  const r = hoveredStar.value || reviewData.value.rating
  return labels[r] || ''
})

// FIX → guard against empty array / NaN
const avgRating = computed(() => {
  if (!recentReviews.value.length) return '—'
  const valid = recentReviews.value.filter(r => Number(r.rating) > 0)
  if (!valid.length) return '—'
  const avg = valid.reduce((s, r) => s + Number(r.rating), 0) / valid.length
  return avg.toFixed(1)
})

// ─── Helpers ───────────────────────────────────────────────
const renderStars = (rating) => {
  const n = Math.max(0, Math.min(5, Number(rating) || 0))
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}

// FIX → guard invalid/null dates
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

// FIX → success auto-dismiss ~4.5s; errors persist
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
    // FIX → optional chain + null guard
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
    // FIX → always reset flag even on error
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
    // FIX → detect 404 endpoint-missing vs generic error
    const is404 = msg.toLowerCase().includes('not found')
                  || msg.includes('404')
                  || msg.toLowerCase().includes('cannot get')
    reviewsEndpointMissing.value = is404
    reviewsError.value = is404 ? 'Not found.' : (msg || 'Could not load reviews.')
    recentReviews.value = []
  } finally {
    isLoadingReviews.value = false
  }
}

// FIX → parallel load with Promise.all
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

  // FIX → guard 0 explicitly
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
      // FIX → trim whitespace; guard null
      comment: String(comment ?? '').trim(),
    })
    showMessage('🎉 Review submitted!', false)
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

// ─── Mount / Unmount ───────────────────────────────────────
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
/* ── Local tokens (matches AdminAnalytics pattern) ── */
.review-page {
  --ink:          #021A54;
  --ink-muted:    rgba(2, 26, 84, 0.65);
  --primary:      #FF85BB;
  --primary-soft: #FFCEE3;
  --canvas:       #ffffff;
  --canvas-parchment: #F5F5F5;
  --hairline:     #e0e0e0;
  --radius-card:  16px;
  --radius-pill:  999px;
}

/* ── Layout ── */
.review-page {
  background: var(--canvas-parchment);
  min-height: 100vh;
}

.phone-shell {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 20px 48px;
}

.review-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Card Base (mirrors AdminAnalytics .card) ── */
.card {
  background: var(--canvas);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-card);
  padding: 20px;
  box-shadow: 0 2px 12px rgba(2, 26, 84, 0.05);
}

/* ── Page Header Card ── */
.page-header-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  background: linear-gradient(135deg, #ffffff 60%, var(--primary-soft) 100%);
  border: 1px solid var(--primary-soft);
}

.page-kicker {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--primary);
  margin: 0 0 6px;
}

.page-header-card h2 {
  font-size: clamp(1.4rem, 3vw, 1.9rem);
  font-weight: 800;
  color: var(--ink);
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}

.page-subtext {
  font-size: 0.88rem;
  color: var(--ink-muted);
  font-weight: 500;
  margin: 0;
}

.header-right {
  flex-shrink: 0;
}

/* ── Refresh Button (matches AdminAnalytics .btn-refresh) ── */
.btn-refresh {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--primary);
  color: var(--ink);
  border: 1.5px solid var(--ink);
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 120ms ease, transform 120ms ease;
}
.btn-refresh:hover:not(:disabled) { opacity: 0.85; }
.btn-refresh:active { transform: scale(0.96); }
.btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-refresh-icon { font-size: 1rem; }

/* ── Message Banners ── */
.error-banner {
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ink);
}
.banner-success {
  background: rgba(255, 133, 187, 0.15);
  border: 1.5px solid var(--primary);
}
.banner-error {
  background: rgba(191, 47, 69, 0.08);
  border: 1.5px solid rgba(191, 47, 69, 0.4);
  color: #8f2335;
}

/* ── Stats Grid (matches AdminAnalytics) ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  transition: transform 150ms ease, box-shadow 150ms ease;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(2, 26, 84, 0.1);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--primary-soft);
  border: 1.5px solid var(--ink);
}
.stat-icon svg {
  width: 22px;
  height: 22px;
  fill: var(--ink);
}

.stat-body { min-width: 0; }

.stat-label {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--primary);
  margin: 0 0 4px;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--ink);
  margin: 0;
  line-height: 1;
  letter-spacing: -0.02em;
}

/* ── Section Card ── */
.section-card { padding: 20px; }
.card-dimmed { opacity: 0.55; pointer-events: none; }

.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.section-header h3 {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--ink);
  margin: 0 0 3px;
}

.section-sub {
  font-size: 0.84rem;
  color: var(--ink-muted);
  font-weight: 500;
  margin: 0;
}

.count-badge {
  background: var(--primary-soft);
  border: 1.5px solid var(--ink);
  color: var(--ink);
  font-size: 0.78rem;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Chip ── */
.chip {
  padding: 7px 14px;
  border-radius: 9px;
  border: 1.5px solid var(--ink);
  background: transparent;
  color: var(--ink);
  font-size: 0.85rem;
  font-weight: 800;
  cursor: pointer;
  transition: transform 100ms, opacity 100ms;
}
.chip:hover:not(:disabled) { opacity: 0.75; }
.chip:active { transform: scale(0.95); }
.chip:disabled { opacity: 0.45; cursor: not-allowed; }
.chip-strong { background: var(--primary); }

/* ── Inline Errors ── */
.inline-error {
  background: rgba(191, 47, 69, 0.07);
  border: 1px solid rgba(191, 47, 69, 0.3);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 0.88rem;
  font-weight: 700;
  color: #8f2335;
  margin-bottom: 12px;
}
.inline-error p { margin: 0 0 4px; }
.inline-error p:last-child { margin: 0; }
.inline-error-hint {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--ink-muted);
}
.inline-error-hint code {
  background: var(--canvas-parchment);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 0.8rem;
}

/* ── Skeleton Shimmer ── */
.skeleton-list { display: flex; flex-direction: column; gap: 10px; }

.skeleton-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.skel {
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.5) 0%,
    rgba(255,206,227,0.4) 50%,
    rgba(255,255,255,0.5) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
  border-radius: 8px;
}

.skel-avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; }
.skel-lines  { flex: 1; display: flex; flex-direction: column; gap: 6px; padding-top: 4px; }
.skel-title  { height: 14px; width: 60%; }
.skel-meta   { height: 11px; width: 40%; }
.skel-body   { height: 11px; width: 80%; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skel { animation: none; }
}

/* ── Empty State ── */
.empty-state {
  text-align: center;
  padding: 32px 20px;
  color: var(--ink-muted);
}
.empty-icon { font-size: 2rem; margin: 0 0 8px; }
.empty-text {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink-muted);
  margin: 0 0 4px;
}
.empty-sub  { font-size: 0.85rem; margin: 0; }

/* ── Booking List ── */
.booking-list { display: flex; flex-direction: column; gap: 8px; }

.booking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1.5px solid var(--hairline);
  background: var(--canvas-parchment);
  cursor: pointer;
  transition: border-color 150ms, background 150ms, transform 100ms;
  font-size: 0.9rem;
}
.booking-item:hover {
  border-color: var(--primary);
  background: rgba(255, 133, 187, 0.06);
}
.booking-item:active { transform: scale(0.99); }
.booking-item.selected {
  border-color: var(--ink);
  background: var(--primary-soft);
}

.booking-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--primary);
  border: 1.5px solid var(--ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--ink);
  flex-shrink: 0;
}

.booking-info { flex: 1; min-width: 0; }
.booking-info strong { font-weight: 700; color: var(--ink); font-size: 0.9rem; }
.booking-meta { margin: 2px 0 0; font-size: 0.78rem; color: var(--ink-muted); font-weight: 500; }

.selected-check {
  font-size: 1rem;
  font-weight: 800;
  color: var(--ink);
  background: var(--primary);
  border: 1.5px solid var(--ink);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* ── Review Form ── */
.hint-banner {
  background: rgba(255, 133, 187, 0.12);
  border: 1.5px solid rgba(255, 133, 187, 0.5);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 16px;
}

.form-group { margin-bottom: 16px; }

.form-label {
  display: block;
  font-size: 0.84rem;
  font-weight: 800;
  color: var(--ink);
  margin-bottom: 8px;
  letter-spacing: 0.01em;
}

.optional { font-size: 0.78rem; font-weight: 500; color: var(--ink-muted); }

/* ── Star Row ── */
.star-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.star-btn {
  font-size: 1.7rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--hairline);
  line-height: 1;
  padding: 2px;
  transition: color 100ms, transform 100ms;
}
.star-btn.active      { color: var(--primary); }
.star-btn:hover       { transform: scale(1.15); }
.star-btn:disabled    { cursor: not-allowed; opacity: 0.4; }

.star-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ink);
  margin-left: 4px;
}

/* ── Textarea ── */
.glass-textarea {
  width: 100%;
  border: 1.5px solid var(--hairline);
  border-radius: 10px;
  background: var(--canvas-parchment);
  padding: 10px 12px;
  font-size: 0.9rem;
  color: var(--ink);
  resize: vertical;
  outline: none;
  transition: border-color 150ms;
  font-family: inherit;
  box-sizing: border-box;
}
.glass-textarea:focus { border-color: var(--primary); }
.glass-textarea:disabled { opacity: 0.5; cursor: not-allowed; }

.char-count {
  display: block;
  text-align: right;
  font-size: 0.78rem;
  color: var(--ink-muted);
  margin-top: 4px;
}

/* ── Primary Button ── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--primary);
  color: var(--ink);
  border: 1.5px solid var(--ink);
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 120ms ease, transform 120ms ease;
  width: 100%;
  justify-content: center;
}
.btn-primary:hover:not(:disabled) { opacity: 0.85; }
.btn-primary:active { transform: scale(0.97); }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }

/* ── Reviews List ── */
.reviews-list { display: flex; flex-direction: column; gap: 12px; }

.review-item {
  border: 1px solid var(--hairline);
  border-radius: 12px;
  padding: 14px;
  background: var(--canvas-parchment);
}

.review-item-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.review-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--primary-soft);
  border: 1.5px solid var(--ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--ink);
  flex-shrink: 0;
}

.review-meta-block { flex: 1; min-width: 0; }
.review-meta-block strong { font-weight: 700; color: var(--ink); font-size: 0.9rem; }
.review-meta-block .meta { font-size: 0.78rem; color: var(--ink-muted); margin: 2px 0 0; }

.review-stars {
  font-size: 0.95rem;
  color: var(--primary);
  letter-spacing: 1px;
  flex-shrink: 0;
}

.review-comment {
  font-size: 0.88rem;
  color: var(--ink-muted);
  margin: 0;
  font-style: italic;
  line-height: 1.5;
}

/* ── Fade Transition ── */
.fade-enter-active, .fade-leave-active { transition: opacity 250ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── Mobile ── */
@media (max-width: 640px) {
  .phone-shell { padding: 16px 12px 48px; }
  .stats-grid  { grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .stat-card   { padding: 12px 10px; gap: 8px; }
  .stat-value  { font-size: 1.4rem; }
  .stat-icon   { width: 36px; height: 36px; }
  .stat-icon svg { width: 18px; height: 18px; }
}
</style>