<template>
  <main class="view page active review-page">
    <section class="phone-shell">
      <div class="review-content">

        <!-- ── Header ── -->
        <div class="card page-header-card">
          <div class="header-left">
            <p class="page-kicker">Session Feedback</p>
            <h2>Leave a Review</h2>
            <p class="page-subtext">Rate your completed sessions.</p>
          </div>
          <button
            @click="loadAll"
            class="btn-refresh"
            type="button"
            :disabled="isLoading"
            aria-label="Refresh"
          >
            <span class="btn-refresh-icon" aria-hidden="true">🔄</span>
            {{ isLoading ? 'Loading…' : 'Refresh' }}
          </button>
        </div>

        <!-- ── Error banner ── -->
        <div v-if="message" class="error-banner" :class="isError ? 'error-banner--error' : 'error-banner--success'" role="alert" aria-live="assertive">
          {{ message }}
        </div>

        <!-- ── Stats ── -->
        <div class="stats-grid" role="list" aria-label="Review statistics">
          <template v-if="isLoadingBookings">
            <div v-for="n in 3" :key="n" class="stat-card card skeleton-card" aria-hidden="true"></div>
          </template>
          <template v-else>
            <div class="stat-card card" role="listitem" aria-label="Sessions ready">
              <div class="stat-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H5V9h14v11ZM7 11h2v2H7Zm4 0h2v2h-2Zm4 0h2v2h-2Z"/></svg>
              </div>
              <div class="stat-body">
                <p class="stat-label">Sessions Ready</p>
                <p class="stat-value">{{ completedBookings.length }}</p>
              </div>
            </div>
            <div class="stat-card card" role="listitem" aria-label="Reviews given">
              <div class="stat-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="m12 17.27 4.15 2.51-1.1-4.72 3.67-3.18-4.83-.41L12 6.8l-1.89 4.67-4.83.41 3.67 3.18-1.1 4.72L12 17.27Z"/></svg>
              </div>
              <div class="stat-body">
                <p class="stat-label">Reviews Given</p>
                <p class="stat-value">{{ recentReviews.length }}</p>
              </div>
            </div>
            <div class="stat-card card" role="listitem" aria-label="Average rating">
              <div class="stat-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8Zm.31-8.86-1.1-4.72L9.1 11.94l-3.27.28 2.49 2.15-.74 3.21L10 15.73l2.41 1.45L11.68 14l2.49-2.15-3.27-.28-.59-2.43Z"/></svg>
              </div>
              <div class="stat-body">
                <p class="stat-label">Avg Rating</p>
                <p class="stat-value">{{ avgRating }}</p>
              </div>
            </div>
          </template>
        </div>

        <!-- ── Completed Sessions ── -->
        <div class="section-header">
          <h3>Completed Sessions 📋</h3>
          <p class="section-sub">Pick a session — write your review below.</p>
        </div>

        <div class="card" role="region" aria-label="Completed sessions">
          <p v-if="bookingsError" class="inline-error" role="alert">⚠️ {{ bookingsError }}</p>

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
          <div v-else-if="completedBookings.length === 0" class="empty-state" role="status">
            <p class="empty-icon">📋</p>
            <p class="empty-text">All caught up — no sessions awaiting review.</p>
          </div>

          <!-- List -->
          <transition-group v-else name="booking-leave" tag="div" class="booking-list">
            <button
              v-for="booking in completedBookings"
              :key="booking.id"
              class="booking-item"
              :class="{ selected: reviewData.bookingId === booking.id }"
              @click="selectBooking(booking)"
              type="button"
              :aria-pressed="reviewData.bookingId === booking.id"
            >
              <div class="booking-avatar" aria-hidden="true">
                {{ (booking.tutorName || booking.tuteeName || '?')[0].toUpperCase() }}
              </div>
              <div class="booking-info">
                <strong>{{ booking.tutorName || booking.tuteeName || 'Unknown' }}</strong>
                <p class="booking-meta">{{ booking.courseCode || '—' }} · {{ formatSessionTime(booking.sessionTime) }}</p>
              </div>
              <span v-if="reviewData.bookingId === booking.id" class="selected-check" aria-hidden="true">✓</span>
            </button>
          </transition-group>
        </div>

        <!-- ── Write Review ── -->
        <div class="section-header">
          <h3>Write Review ✍️</h3>
          <p class="section-sub">Share your experience with this session.</p>
        </div>

        <div class="card" :class="{ 'card--dimmed': !reviewData.bookingId }">
          <!-- Hint -->
          <transition name="fade">
            <div v-if="!reviewData.bookingId" class="hint-banner" role="status">
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
              <span v-if="ratingLabel" class="rating-badge">{{ ratingLabel }}</span>
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
              class="review-textarea"
              :disabled="!reviewData.bookingId"
              autocomplete="off"
            ></textarea>
            <span class="char-count">{{ reviewData.comment.length }}/250</span>
          </div>

          <button
            class="btn-submit"
            type="button"
            :disabled="isSubmitting || !canSubmit"
            @click="submitReview"
          >
            <span v-if="isSubmitting">Submitting…</span>
            <span v-else>Submit Review</span>
          </button>
        </div>

        <!-- ── Past Reviews ── -->
        <div class="section-header">
          <h3>Your Past Reviews 💬</h3>
          <p class="section-sub">Reviews you've submitted so far.</p>
        </div>

        <div class="card">
          <div class="card-header-row">
            <span></span>
            <button
              @click="loadRecentReviews"
              class="btn-refresh btn-refresh--sm"
              type="button"
              :disabled="isLoadingReviews"
              aria-label="Reload reviews"
            >
              <span class="btn-refresh-icon">🔄</span>
              {{ isLoadingReviews ? 'Loading…' : 'Reload' }}
            </button>
          </div>

          <p v-if="reviewsEndpointMissing" class="inline-error small" role="alert">
            ⚠️ Endpoint missing. Add <code>GET /users/me/submitted-reviews</code> to backend.
          </p>
          <p v-else-if="reviewsError" class="inline-error" role="alert">⚠️ {{ reviewsError }}</p>

          <div v-else-if="isLoadingReviews" class="skeleton-list">
            <div v-for="n in 2" :key="n" class="skeleton-item">
              <div class="skel skel-avatar"></div>
              <div class="skel-lines">
                <div class="skel skel-title"></div>
                <div class="skel skel-meta"></div>
              </div>
            </div>
          </div>

          <div v-else-if="recentReviews.length === 0" class="empty-state" role="status">
            <p class="empty-icon">💬</p>
            <p class="empty-text">No reviews yet — submit your first one above.</p>
          </div>

          <div v-else class="reviews-list">
            <div v-for="rev in recentReviews" :key="rev.id" class="review-entry">
              <div class="review-top">
                <div class="review-avatar" aria-hidden="true">
                  {{ (rev.tutor_name || rev.tutorName || '?')[0].toUpperCase() }}
                </div>
                <div class="review-meta-block">
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
    // FIX → optimistic remove: reviewed session vanishes immediately
    completedBookings.value = completedBookings.value.filter(b => b.id !== bookingId)
    showMessage('🎉 Review submitted!', false)
    reviewData.value = { bookingId: 0, comment: '', rating: 0 }
    hoveredStar.value = 0
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
/* ── Local token overrides — mirrors AdminAnalytics exactly ── */
.review-page {
  --ink:            #021A54;
  --ink-muted:      rgba(2, 26, 84, 0.65);
  --primary:        #FF85BB;
  --primary-soft:   #FFCEE3;
  --canvas:         #ffffff;
  --canvas-parchment: #F5F5F5;
  --hairline:       #e0e0e0;
  --radius-card:    16px;
  --radius-pill:    999px;
}

/* ── Layout ── */
.review-page {
  background: var(--canvas-parchment);
  min-height: 100vh;
}

.phone-shell {
  width: 100%;
  max-width: 860px;
  margin: 0 auto;
  padding: 24px 20px 48px;
}

.review-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Card base — identical to AdminAnalytics .card ── */
.card {
  background: var(--canvas);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-card);
  padding: 20px;
  box-shadow: 0 2px 12px rgba(2, 26, 84, 0.05);
}

.card--dimmed {
  opacity: 0.55;
  pointer-events: none;
}

/* ── Page Header Card — same gradient as AdminAnalytics ── */
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

/* ── Refresh btn — identical to AdminAnalytics ── */
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
  white-space: nowrap;
}
.btn-refresh:hover:not(:disabled) { opacity: 0.88; }
.btn-refresh:active { transform: scale(0.96); }
.btn-refresh:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-refresh-icon { font-size: 0.95rem; }
.btn-refresh--sm { padding: 6px 12px; font-size: 0.82rem; }

/* ── Error / success banner ── */
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

/* ── Stats Grid — mirrors AdminAnalytics ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  transition: transform 150ms ease, box-shadow 150ms ease;
}
.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(2, 26, 84, 0.1);
}

.skeleton-card {
  height: 88px;
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.5) 0%,
    rgba(255,206,227,0.4) 50%,
    rgba(255,255,255,0.5) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
  pointer-events: none;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-card, .skel { animation: none; }
  .booking-leave-leave-active { transition: none; }
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--primary-soft);
  color: var(--ink);
  border: 1.5px solid var(--ink);
}
.stat-icon svg { width: 24px; height: 24px; fill: var(--ink); }

.stat-body { min-width: 0; }

.stat-label {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--primary);
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-value {
  font-size: 1.9rem;
  font-weight: 800;
  color: var(--ink);
  margin: 0;
  line-height: 1;
  letter-spacing: -0.02em;
}

/* ── Section Headers — mirrors AdminAnalytics ── */
.section-header {
  margin-top: 4px;
  padding-bottom: 2px;
}
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

/* ── Card header row ── */
.card-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 14px;
}

/* ── Inline error ── */
.inline-error {
  font-size: 0.85rem;
  font-weight: 700;
  color: #c0392b;
  background: rgba(255,59,48,0.07);
  border-radius: 8px;
  padding: 8px 12px;
  margin: 0;
}
.inline-error.small { font-size: 0.76rem; }
.inline-error code {
  font-family: monospace;
  background: rgba(0,0,0,0.06);
  padding: 1px 4px;
  border-radius: 4px;
}

/* ── Hint banner ── */
.hint-banner {
  background: var(--primary-soft);
  border: 1px solid rgba(255,133,187,0.3);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--ink);
}

/* ── Skeleton list ── */
.skeleton-list { display: flex; flex-direction: column; gap: 12px; }
.skeleton-item { display: flex; align-items: center; gap: 12px; }
.skel {
  border-radius: 6px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200%;
  animation: shimmer 1.4s infinite linear;
}
.skel-avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; }
.skel-lines  { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.skel-title  { height: 13px; width: 55%; }
.skel-meta   { height: 11px; width: 38%; }

/* ── Empty state ── */
.empty-state {
  text-align: center;
  padding: 36px 20px;
  color: var(--ink-muted);
}
.empty-icon { font-size: 2.2rem; margin: 0 0 10px; }
.empty-text { font-size: 1rem; font-weight: 700; color: var(--ink-muted); margin: 0; }

/* ── Booking list ── */
.booking-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.booking-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1.5px solid var(--hairline);
  background: var(--canvas-parchment);
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: border-color 140ms, background 140ms, box-shadow 140ms;
}
.booking-item:hover {
  border-color: var(--primary);
  background: rgba(255,206,227,0.18);
  box-shadow: 0 2px 10px rgba(255,133,187,0.15);
}
.booking-item.selected {
  border-color: var(--ink);
  background: var(--primary-soft);
  box-shadow: 0 2px 12px rgba(2,26,84,0.08);
}

.booking-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--ink);
  border: 1.5px solid var(--ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 800;
  flex-shrink: 0;
}

.booking-info { flex: 1; min-width: 0; }
.booking-info strong {
  display: block;
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.booking-meta {
  font-size: 0.78rem;
  color: var(--ink-muted);
  margin: 3px 0 0;
  font-weight: 500;
}

.selected-check {
  font-size: 1rem;
  font-weight: 800;
  color: var(--ink);
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* FIX → slide-out on review submit */
.booking-leave-leave-active {
  transition: all 0.28s ease;
  overflow: hidden;
}
.booking-leave-leave-to {
  opacity: 0;
  transform: translateX(16px);
  max-height: 0;
  padding: 0;
  margin: 0;
}

/* ── Form ── */
.form-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.form-label {
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--primary);
}
.optional { font-weight: 500; color: var(--ink-muted); text-transform: none; letter-spacing: 0; font-size: 0.75rem; }

.star-row { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.star-btn {
  background: none;
  border: none;
  font-size: 1.75rem;
  color: var(--hairline);
  cursor: pointer;
  padding: 2px;
  line-height: 1;
  transition: color 0.12s, transform 0.1s;
}
.star-btn.active { color: #f5a623; }
.star-btn:hover:not(:disabled) { transform: scale(1.18); }
.star-btn:disabled { cursor: not-allowed; opacity: 0.5; }

.rating-badge {
  font-size: 0.78rem;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  background: var(--primary);
  color: var(--ink);
  border: 1.5px solid var(--ink);
  margin-left: 8px;
}

.review-textarea {
  width: 100%;
  border: 1.5px solid var(--hairline);
  border-radius: 10px;
  background: var(--canvas-parchment);
  padding: 10px 14px;
  font-size: 0.9rem;
  color: var(--ink);
  resize: vertical;
  font-family: inherit;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.review-textarea:focus { border-color: var(--ink); }
.char-count { font-size: 0.72rem; color: var(--ink-muted); font-weight: 700; align-self: flex-end; }

.btn-submit {
  width: 100%;
  background: var(--primary);
  color: var(--ink);
  border: 1.5px solid var(--ink);
  border-radius: 10px;
  padding: 12px 24px;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 120ms, transform 120ms;
}
.btn-submit:hover:not(:disabled) { opacity: 0.88; }
.btn-submit:active { transform: scale(0.98); }
.btn-submit:disabled { opacity: 0.45; cursor: not-allowed; }

/* ── Past Reviews list ── */
.reviews-list { display: flex; flex-direction: column; gap: 12px; }

.review-entry {
  background: var(--canvas-parchment);
  border: 1px solid var(--hairline);
  border-radius: 12px;
  padding: 14px 16px;
}

.review-top {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.review-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--ink);
  border: 1.5px solid var(--ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 800;
  flex-shrink: 0;
}

.review-meta-block { flex: 1; min-width: 0; }
.review-name {
  display: block;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.review-date { font-size: 0.78rem; color: var(--ink-muted); font-weight: 500; margin: 2px 0 0; }

.review-stars {
  font-size: 1rem;
  color: #f5a623;
  letter-spacing: 1px;
  flex-shrink: 0;
}

.review-comment {
  font-size: 0.88rem;
  color: var(--ink);
  margin: 0;
  line-height: 1.55;
  font-style: italic;
  padding-left: 52px;
}

/* ── Transitions ── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── Responsive ── */
@media (max-width: 640px) {
  .phone-shell { padding: 16px 12px 40px; }
  .page-header-card { flex-direction: column; }
  .stats-grid { grid-template-columns: 1fr 1fr; }
  .review-comment { padding-left: 0; }
}
@media (max-width: 400px) {
  .stats-grid { grid-template-columns: 1fr; }
  .stat-value { font-size: 1.5rem; }
}
</style>