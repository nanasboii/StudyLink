<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active">

        <!-- HEADER -->
        <div class="rd-header">
          <div>
            <p class="rd-kicker">📖 Learning Resource</p>
          </div>
          <button @click="goBack" class="chip" type="button">{{ backButtonLabel }}</button>
        </div>

        <!-- GLOBAL MESSAGE -->
        <transition name="fade">
          <p
            v-if="resourceDetailMessage"
            class="rd-message"
            :class="messageIsError ? 'rd-message--error' : 'rd-message--info'"
            role="alert"
            aria-live="polite"
          >
            {{ resourceDetailMessage }}
          </p>
        </transition>

        <!-- SKELETON LOADING -->
        <template v-if="isLoadingResource">
          <div class="glass-card rd-skeleton-card">
            <div class="rd-skeleton-cover">
              <div class="sk-pill"></div>
              <div class="sk-line sk-title"></div>
              <div class="sk-line sk-sub"></div>
            </div>
            <div class="rd-skeleton-body">
              <div class="sk-line sk-med"></div>
              <div class="sk-line sk-short"></div>
              <div class="sk-grid">
                <div class="sk-box"></div>
                <div class="sk-box"></div>
              </div>
            </div>
          </div>
        </template>

        <!-- RESOURCE BODY -->
        <template v-else-if="resource">

          <!-- COVER CARD -->
          <section class="glass-card rd-cover-card">
            <div class="rd-cover-inner">
              <span class="rd-type-badge">{{ resourceTypeLabel }}</span>
              <h2 class="rd-title">{{ resource.title || 'Untitled Resource' }}</h2>
              <p class="rd-uploader">
                <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" fill="currentColor">
                  <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5z"/>
                </svg>
                {{ resource.contributor_name || 'Unknown' }}
              </p>
            </div>

            <!-- STAT ROW -->
            <div class="rd-stat-row">
              <div class="rd-stat-chip">
                <span class="rd-stat-label">Course</span>
                <strong>{{ resource.course_code || 'General' }}</strong>
              </div>
              <div class="rd-stat-chip">
                <span class="rd-stat-label">Uploaded</span>
                <strong>{{ formatDateValue(resource.created_at, '—') }}</strong>
              </div>
              <div class="rd-stat-chip">
                <span class="rd-stat-label">Rating</span>
                <strong>
                  {{ resource.avg_rating ? Number(resource.avg_rating).toFixed(1) : '—' }}
                  <span v-if="resource.avg_rating" style="color:#f0b300">★</span>
                </strong>
              </div>
              <div class="rd-stat-chip">
                <span class="rd-stat-label">Reviews</span>
                <strong>{{ resource.review_count || resource.rating_count || 0 }}</strong>
              </div>
            </div>
          </section>

          <!-- ACTION BAR -->
          <div class="rd-action-bar glass-card">
            <!-- BUG FIX -> missing file guard on open -->
            <button
              @click="openResource"
              :disabled="!canOpenResource"
              class="chip chip-strong"
              type="button"
              :title="!canOpenResource ? (fileMissing ? 'File missing from storage' : 'No file available') : 'Open in new tab'"
            >
              🔗 Open
            </button>

            <button
              v-if="canDownloadResource"
              @click="openDownload"
              :disabled="fileMissing"
              class="chip"
              type="button"
            >
              ⬇ Download
            </button>

            <button
              v-if="resource.file_url && !fileMissing"
              class="chip"
              type="button"
              @click="copyLink"
              aria-label="Copy resource link"
            >
              {{ copySuccess ? '✓ Copied' : '🔗 Copy Link' }}
            </button>

            <!-- BUG FIX -> show missing badge clearly -->
            <span v-if="fileMissing" class="rd-missing-badge">⚠ File Missing</span>
          </div>

          <!-- DESCRIPTION -->
          <div v-if="resource.description" class="glass-card rd-desc-card">
            <p class="rd-desc-label">📋 Description</p>
            <p class="rd-desc-text">{{ resource.description }}</p>
          </div>

          <!-- FILE INFO CHIP -->
          <div v-if="!fileMissing && resource.file_url" class="rd-file-chip glass-card">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
              <polyline points="14,2 14,8 20,8"/>
            </svg>
            <span>{{ resource.metadata?.originalName || resource.metadata?.fileName || resource.file_url.split('/').pop() || 'File' }}</span>
          </div>

          <!-- REVIEW FORM -->
          <section class="glass-card rd-review-card">
            <h3 class="rd-section-title">🌟 Rate This Resource</h3>

            <!-- STAR PICKER -->
            <div class="rd-star-wrap" role="group" aria-label="Star rating">
              <button
                v-for="star in 5"
                :key="star"
                type="button"
                class="rd-star-btn"
                :class="{
                  'rd-star--filled': star <= (previewRating || selectedRating),
                  'rd-star--selected': star <= selectedRating && !previewRating
                }"
                @mouseenter="previewRating = star"
                @mouseleave="previewRating = 0"
                @focus="previewRating = star"
                @blur="previewRating = 0"
                @click="selectedRating = star"
                :aria-label="`${star} star${star === 1 ? '' : 's'}`"
                :aria-pressed="star === selectedRating"
              >
                ★
              </button>
            </div>
            <p class="rd-rating-hint">{{ ratingHint }}</p>

            <!-- COMMENT BOX -->
            <label class="rd-label" for="rd-comment">Comment (optional)</label>
            <textarea
              id="rd-comment"
              v-model="comment"
              class="rd-textarea"
              rows="3"
              maxlength="500"
              placeholder="Would you recommend it?"
            ></textarea>
            <span class="rd-char-count">{{ comment.length }} / 500</span>

            <!-- BUG FIX -> prevent double submit -->
            <button
              class="chip chip-strong rd-submit-btn"
              type="button"
              :disabled="isSubmittingReview || !selectedRating"
              @click="submitReview"
            >
              {{ isSubmittingReview ? 'Submitting…' : 'Submit Rating' }}
            </button>

            <transition name="fade">
              <p v-if="resourceReviewMessage" class="rd-message rd-message--info" role="status" aria-live="polite">
                {{ resourceReviewMessage }}
              </p>
            </transition>
          </section>

          <!-- REVIEWS LIST -->
          <section class="glass-card rd-comments-card">
            <div class="rd-comments-head">
              <h3 class="rd-section-title">
                💬 Reviews
                <span v-if="reviews.length" class="rd-review-count">({{ reviews.length }})</span>
              </h3>
              <button @click="loadComments" class="chip" type="button" :disabled="isLoadingComments">
                {{ isLoadingComments ? '…' : 'Refresh' }}
              </button>
            </div>

            <!-- RATING SUMMARY -->
            <div v-if="resource.review_count || resource.rating_count" class="rd-rating-summary">
              <span class="rd-rating-big">{{ Number(resource.avg_rating || 0).toFixed(1) }}</span>
              <div>
                <!-- BUG FIX -> zero avg shows all empty stars -->
                <span class="rd-stars-display">{{ renderStars(resource.avg_rating) }}</span>
                <p class="rd-rating-sub">
                  {{ resource.review_count || resource.rating_count || 0 }}
                  review{{ (resource.review_count || resource.rating_count) !== 1 ? 's' : '' }}
                </p>
              </div>
            </div>

            <!-- SKELETON COMMENTS -->
            <template v-if="isLoadingComments">
              <div v-for="n in 3" :key="n" class="rd-comment-skeleton">
                <div class="sk-avatar"></div>
                <div class="rd-comment-skeleton-lines">
                  <div class="sk-line sk-short"></div>
                  <div class="sk-line sk-med"></div>
                </div>
              </div>
            </template>

            <!-- EMPTY STATE -->
            <div v-else-if="reviews.length === 0" class="rd-empty">
              <p>No reviews yet.</p>
              <p class="rd-empty-sub">Be first — rate above! 👆</p>
            </div>

            <!-- REVIEW ITEMS -->
            <article
              v-else
              v-for="review in reviews"
              :key="review.id"
              class="rd-comment"
            >
              <div class="rd-comment-head">
                <div class="rd-comment-left">
                  <!-- BUG FIX -> guard null reviewer_name -->
                  <div class="rd-avatar">{{ (review.reviewer_name || 'U')[0].toUpperCase() }}</div>
                  <p class="rd-comment-user">{{ review.reviewer_name || 'User' }}</p>
                </div>
                <p class="rd-comment-date">{{ formatDateValue(review.created_at, '—') }}</p>
              </div>
              <p class="rd-comment-stars">{{ renderStars(review.rating) }}</p>
              <!-- BUG FIX -> guard null comment -->
              <p class="rd-comment-body">{{ review.comment?.trim() || 'No comment provided.' }}</p>
            </article>
          </section>

        </template>

        <!-- ERROR / NOT FOUND STATE -->
        <div v-else-if="!isLoadingResource" class="rd-not-found glass-card">
          <p class="rd-not-found-icon">🔍</p>
          <p class="rd-not-found-title">Resource not found</p>
          <p class="rd-not-found-sub">{{ resourceDetailMessage || 'Check the URL or go back.' }}</p>
          <button class="chip chip-strong" type="button" @click="goBack">{{ backButtonLabel }}</button>
        </div>

      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, requireSession, showToast } from '@/api.js'
import { formatDateValue } from '@/utils/records.js'

const route = useRoute()
const router = useRouter()

// ── STATE ───────────────────────────────────────────────
const resource   = ref(null)
const reviews    = ref([])

const selectedRating = ref(0)
const previewRating  = ref(0)
const comment        = ref('')

const resourceDetailMessage = ref('')
const resourceReviewMessage = ref('')
const messageIsError        = ref(false)
const isLoadingResource     = ref(true)
const isLoadingComments     = ref(true)
const isSubmittingReview    = ref(false)
const copySuccess           = ref(false)

// ── COMPUTED ─────────────────────────────────────────────

// BUG FIX -> safe resourceId, handles undefined/null/blank
const resourceId = computed(() => {
  const raw = route.params.resourceId ?? route.query.id
  const v   = String(raw ?? '').trim()
  return (!v || v === 'undefined' || v === 'null') ? '' : v
})

const ratingHint = computed(() => {
  const active = previewRating.value || selectedRating.value
  if (!active) return 'Select a rating'
  return `${active} star${active === 1 ? '' : 's'}`
})

const RESOURCE_TYPE_MAP = {
  'past-year':    'Past Year Paper',
  'lecture-note': 'Lecture Note',
  'notes':        'Notes',
  'slides':       'Slides',
  'pdf':          'PDF',
  'picture':      'Picture',
  'archive':      'Archive',
  'audio':        'Audio',
  'video':        'Video',
  'link':         'External Link',
}

const resourceTypeLabel = computed(() => {
  const t = String(resource.value?.resource_type || '').trim().toLowerCase()
  if (RESOURCE_TYPE_MAP[t]) return RESOURCE_TYPE_MAP[t]
  if (String(resource.value?.file_url || '').startsWith('http')) return 'External Link'
  return resource.value?.resource_type || 'Resource'
})

const fileMissing = computed(() => Boolean(resource.value?.uploaded_file_missing))

const canDownloadResource = computed(() => {
  if (!resource.value || fileMissing.value) return false
  const url = String(resource.value.file_url || '')
  return url.includes('supabase.co/storage/') || url.startsWith('/uploads/resources/')
})

const canOpenResource = computed(() => {
  if (!resource.value || fileMissing.value) return false
  return Boolean(resource.value.file_url)
})

const backPath = computed(() => {
  const from = String(route.query.from || '').trim().toLowerCase()
  if (from === 'admin-resources') return '/admin/resources'
  if (from === 'my-resources')    return '/my-resources'
  if (from === 'resources')       return '/resources'
  try {
    const user = JSON.parse(localStorage.getItem('studylinkUser') || 'null')
    if (user?.role === 'admin') return '/admin/resources'
  } catch { /* ignore */ }
  return '/resources'
})

const backButtonLabel = computed(() => {
  if (backPath.value === '/admin/resources') return '← Admin Resources'
  if (backPath.value === '/my-resources')    return '← My Uploads'
  return '← Resources'
})

// ── HELPERS ───────────────────────────────────────────────

const renderStars = (rating) => {
  const v    = Math.max(0, Math.min(5, Number(rating || 0)))
  const full = Math.floor(v)
  const half = v - full >= 0.5
  return Array.from({ length: 5 }, (_, i) => {
    if (i < full)          return '★'
    if (i === full && half) return '⯨'
    return '☆'
  }).join('')
}

const setError = (msg) => {
  resourceDetailMessage.value = msg
  messageIsError.value = true
}

const setInfo = (msg, ttl = 0) => {
  resourceDetailMessage.value = msg
  messageIsError.value = false
  if (ttl) setTimeout(() => { resourceDetailMessage.value = '' }, ttl)
}

const getFileUrl = (download = false) =>
  resource.value?.id
    ? `/api/resources/${resource.value.id}/file${download ? '?download=1' : ''}`
    : ''

const buildDownloadFilename = () => {
  const meta = resource.value?.metadata
  if (meta?.originalName) return meta.originalName
  if (meta?.fileName)     return meta.fileName
  const url   = String(resource.value?.file_url || '')
  const match = url.match(/([^/\\?#]+)(?:[?#].*)?$/)
  if (match?.[1] && match[1] !== 'file') return match[1]
  const safe = String(resource.value?.title || 'resource').replace(/[^a-zA-Z0-9._-]+/g, '_')
  const ext  = url.match(/\.([a-zA-Z0-9]+)$/)?.[1]
  return ext ? `${safe}.${ext}` : safe
}

// ── ACTIONS ──────────────────────────────────────────────

const loadResource = async () => {
  if (!resourceId.value) {
    setError('No resource ID in URL.')
    isLoadingResource.value = false
    return
  }
  // BUG FIX -> validate numeric id before hitting API
  if (!/^\d+$/.test(resourceId.value)) {
    setError('Invalid resource ID.')
    isLoadingResource.value = false
    return
  }
  isLoadingResource.value = true
  try {
    const data = await api(`/resources/${encodeURIComponent(resourceId.value)}`)
    // BUG FIX -> null guard on data.resource
    if (!data?.resource) {
      setError('Resource not found.')
      return
    }
    resource.value = data.resource
    document.title = `${data.resource.title || 'Resource'} — StudyLink`
    resourceDetailMessage.value = ''
  } catch (err) {
    setError(err?.message || 'Unable to load this resource.')
  } finally {
    isLoadingResource.value = false
  }
}

const loadComments = async () => {
  if (!resourceId.value || !/^\d+$/.test(resourceId.value)) {
    isLoadingComments.value = false
    return
  }
  isLoadingComments.value = true
  try {
    const data = await api(`/resources/${encodeURIComponent(resourceId.value)}/reviews`)
    // BUG FIX -> safe array guard
    reviews.value = Array.isArray(data?.reviews) ? data.reviews : []
  } catch (err) {
    reviews.value = []
    if (err?.message && !String(err.message).toLowerCase().includes('not found')) {
      if (!resourceDetailMessage.value) setError(err.message)
    }
  } finally {
    isLoadingComments.value = false
  }
}

const submitReview = async () => {
  // BUG FIX -> double submit guard
  if (isSubmittingReview.value) return

  const rating      = Number(selectedRating.value || 0)
  const commentText = String(comment.value || '').trim()

  if (!resourceId.value || !/^\d+$/.test(resourceId.value)) {
    resourceReviewMessage.value = 'Invalid resource ID.'
    return
  }
  if (!rating || rating < 1 || rating > 5) {
    resourceReviewMessage.value = 'Pick a star rating first.'
    return
  }

  isSubmittingReview.value = true
  resourceReviewMessage.value = ''
  try {
    await api(`/resources/${encodeURIComponent(resourceId.value)}/reviews`, 'POST', {
      rating,
      comment: commentText
    })
    resourceReviewMessage.value = '✓ Rating submitted!'
    if (typeof showToast === 'function') showToast('Thanks for your feedback.', true)

    selectedRating.value = 0
    previewRating.value  = 0
    comment.value        = ''

    // BUG FIX -> parallel reload, not sequential
    await Promise.all([loadResource(), loadComments()])

    setTimeout(() => { resourceReviewMessage.value = '' }, 3000)
  } catch (err) {
    resourceReviewMessage.value = err?.message || 'Submission failed.'
  } finally {
    isSubmittingReview.value = false
  }
}

const openResource = () => {
  if (!resource.value) return
  if (fileMissing.value) {
    setError('File missing from storage.')
    return
  }
  if (!resource.value.file_url) {
    setError('No file URL available.')
    return
  }
  resourceDetailMessage.value = ''
  window.open(getFileUrl(), '_blank', 'noopener,noreferrer')
}

const openDownload = () => {
  if (!resource.value || fileMissing.value) {
    setError('File unavailable for download.')
    return
  }
  if (!canDownloadResource.value) {
    setError('Cannot download this resource directly.')
    return
  }
  resourceDetailMessage.value = ''
  const url = String(resource.value.file_url || '')
  const a   = document.createElement('a')
  a.href     = url.includes('supabase.co/storage/') ? url : getFileUrl(true)
  a.download = buildDownloadFilename()
  a.target   = '_blank'
  a.rel      = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

const copyLink = async () => {
  if (!resource.value?.file_url) return
  try {
    await navigator.clipboard.writeText(resource.value.file_url)
    copySuccess.value = true
    setInfo('Link copied!', 2000)
    setTimeout(() => { copySuccess.value = false }, 2000)
  } catch {
    setError('Could not copy link.')
  }
}

const goBack = () => router.replace(backPath.value)

// ── LIFECYCLE ─────────────────────────────────────────────

onMounted(() => {
  requireSession()
  const viewEl = document.querySelector('.view')
  if (viewEl) viewEl.scrollTop = 0

  if (resourceId.value) {
    // BUG FIX -> catch at top level
    Promise.all([loadResource(), loadComments()]).catch(() => {})
  } else {
    setError('No resource ID provided in the URL.')
    isLoadingResource.value  = false
    isLoadingComments.value  = false
  }
})

onUnmounted(() => {
  document.title = 'StudyLink'
})
</script>

<style scoped>
/* ── LAYOUT ─────────────────────────────────────── */
.rd-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.rd-kicker {
  margin: 0;
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--ink-kicker, #FF85BB);
}

/* ── GLASS CARD BASE ─────────────────────────────── */
.glass-card {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(14px) saturate(1.4);
  -webkit-backdrop-filter: blur(14px) saturate(1.4);
  border: 1px solid rgba(255, 133, 187, 0.22);
  border-radius: 16px;
  padding: 14px;
  margin-bottom: 12px;
  box-shadow:
    0 2px 12px rgba(2, 26, 84, 0.06),
    inset 0 1px 0 rgba(255,255,255,0.6);
}

/* ── COVER CARD ──────────────────────────────────── */
.rd-cover-card {
  padding: 0;
  overflow: hidden;
}

.rd-cover-inner {
  background:
    radial-gradient(circle at top right, rgba(255,255,255,0.22), transparent 42%),
    linear-gradient(135deg, #021A54 0%, #1a3a8f 55%, #FF85BB 100%);
  padding: 18px 16px 14px;
  color: #fff;
  display: grid;
  gap: 8px;
}

.rd-type-badge {
  display: inline-flex;
  width: fit-content;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.30);
  background: rgba(255,255,255,0.15);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.rd-title {
  margin: 0;
  font-size: 1.45rem;
  line-height: 1.2;
  font-weight: 700;
}

.rd-uploader {
  margin: 0;
  font-size: 0.87rem;
  opacity: 0.88;
  display: flex;
  align-items: center;
  gap: 5px;
}

/* ── STAT ROW ────────────────────────────────────── */
.rd-stat-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1px;
  background: rgba(255, 133, 187, 0.12);
  border-top: 1px solid rgba(255, 133, 187, 0.18);
}

.rd-stat-chip {
  flex: 1 1 70px;
  padding: 10px 12px;
  background: rgba(255,255,255,0.6);
  backdrop-filter: blur(8px);
}

.rd-stat-chip:not(:last-child) {
  border-right: 1px solid rgba(255, 133, 187, 0.15);
}

.rd-stat-label {
  display: block;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #FF85BB;
  margin-bottom: 2px;
}

.rd-stat-chip strong {
  font-size: 0.9rem;
  font-weight: 700;
  color: #021A54;
}

/* ── ACTION BAR ──────────────────────────────────── */
.rd-action-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.rd-missing-badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 8px;
  background: rgba(255, 59, 48, 0.1);
  color: #c0392b;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid rgba(255, 59, 48, 0.22);
}

/* ── DESCRIPTION ──────────────────────────────────── */
.rd-desc-card {
  background: rgba(255, 206, 227, 0.25);
  border-color: rgba(255, 133, 187, 0.3);
}

.rd-desc-label {
  margin: 0 0 6px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #FF85BB;
}

.rd-desc-text {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.65;
  color: #021A54;
}

/* ── FILE CHIP ──────────────────────────────────── */
.rd-file-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.84rem;
  color: #021A54;
  background: rgba(245, 245, 245, 0.75);
  border-color: rgba(2, 26, 84, 0.1);
}

/* ── REVIEW FORM ──────────────────────────────────── */

.rd-section-title {
  margin: 0 0 12px;
  font-size: 1rem;
  font-weight: 700;
  color: #021A54;
}

.rd-review-count {
  font-size: 0.8rem;
  font-weight: 400;
  color: #6e6e73;
  margin-left: 4px;
}

.rd-star-wrap {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}

.rd-star-btn {
  font-size: 1.7rem;
  background: none;
  border: none;
  cursor: pointer;
  color: #ddd;
  line-height: 1;
  transition: color 0.12s, transform 0.1s;
  padding: 0 2px;
}

.rd-star-btn:hover,
.rd-star-btn:focus {
  outline: none;
}

.rd-star-btn.rd-star--filled {
  color: #f0b300;
  transform: scale(1.12);
}

.rd-star-btn.rd-star--selected {
  color: #e6a800;
}

.rd-rating-hint {
  margin: 0 0 10px;
  font-size: 0.78rem;
  color: #6e6e73;
}

.rd-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: #021A54;
  margin-bottom: 6px;
}

.rd-textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1.5px solid rgba(255, 133, 187, 0.35);
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.9rem;
  background: rgba(255,255,255,0.8);
  color: #021A54;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.15s;
}

.rd-textarea:focus {
  outline: none;
  border-color: #FF85BB;
  box-shadow: 0 0 0 3px rgba(255, 133, 187, 0.18);
}

.rd-char-count {
  display: block;
  text-align: right;
  font-size: 0.73rem;
  color: #6e6e73;
  margin-top: 3px;
  margin-bottom: 10px;
}

.rd-submit-btn {
  width: 100%;
}

/* ── COMMENTS ──────────────────────────────────── */
.rd-comments-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.rd-rating-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0 12px;
  border-bottom: 1px solid rgba(255, 133, 187, 0.18);
  margin-bottom: 12px;
}

.rd-rating-big {
  font-size: 2.6rem;
  font-weight: 700;
  color: #021A54;
  line-height: 1;
}

.rd-stars-display {
  font-size: 1.1rem;
  color: #f0b300;
  letter-spacing: 2px;
}

.rd-rating-sub {
  margin: 2px 0 0;
  font-size: 0.78rem;
  color: #6e6e73;
}

.rd-empty {
  text-align: center;
  padding: 20px 0;
  color: #6e6e73;
}

.rd-empty p { margin: 0; }
.rd-empty-sub { font-size: 0.83rem; margin-top: 4px !important; }

.rd-comment {
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 133, 187, 0.12);
}

.rd-comment:last-child { border-bottom: none; }

.rd-comment-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.rd-comment-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rd-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF85BB, #FFCEE3);
  color: #021A54;
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rd-comment-user {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 600;
  color: #021A54;
}

.rd-comment-date {
  margin: 0;
  font-size: 0.75rem;
  color: #6e6e73;
}

.rd-comment-stars {
  margin: 2px 0 4px;
  font-size: 0.95rem;
  color: #f0b300;
  letter-spacing: 1px;
}

.rd-comment-body {
  margin: 0;
  font-size: 0.88rem;
  color: #3a3a3c;
  line-height: 1.55;
}

/* ── MESSAGES ──────────────────────────────────── */
.rd-message {
  margin: 0 0 10px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 0.87rem;
  font-weight: 500;
}

.rd-message--error {
  background: rgba(255, 59, 48, 0.09);
  border: 1px solid rgba(255, 59, 48, 0.25);
  color: #c0392b;
}

.rd-message--info {
  background: rgba(255, 206, 227, 0.35);
  border: 1px solid rgba(255, 133, 187, 0.3);
  color: #021A54;
}

/* ── NOT FOUND ──────────────────────────────────── */
.rd-not-found {
  text-align: center;
  padding: 32px 20px;
}

.rd-not-found-icon {
  font-size: 2.5rem;
  margin: 0 0 8px;
}

.rd-not-found-title {
  margin: 0 0 6px;
  font-size: 1.1rem;
  font-weight: 700;
  color: #021A54;
}

.rd-not-found-sub {
  margin: 0 0 16px;
  font-size: 0.87rem;
  color: #6e6e73;
}

/* ── SKELETONS ──────────────────────────────────── */
.rd-skeleton-card { }

.rd-skeleton-cover {
  background: linear-gradient(135deg, rgba(2,26,84,0.08), rgba(255,133,187,0.12));
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  display: grid;
  gap: 8px;
}

.rd-skeleton-body { display: grid; gap: 8px; }

.sk-line {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, rgba(2,26,84,0.07) 25%, rgba(255,133,187,0.12) 50%, rgba(2,26,84,0.07) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.sk-pill {
  height: 20px;
  width: 80px;
  border-radius: 999px;
  background: rgba(255,133,187,0.18);
  animation: shimmer 1.4s infinite;
}

.sk-title  { height: 20px; width: 75%; }
.sk-sub    { height: 13px; width: 45%; }
.sk-med    { width: 65%; }
.sk-short  { width: 40%; }

.sk-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.sk-box {
  height: 52px;
  border-radius: 10px;
  background: rgba(2,26,84,0.06);
  animation: shimmer 1.4s infinite;
}

.sk-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255,133,187,0.2);
  flex-shrink: 0;
  animation: shimmer 1.4s infinite;
}

.rd-comment-skeleton {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255,133,187,0.1);
}

.rd-comment-skeleton-lines {
  flex: 1;
  display: grid;
  gap: 6px;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── TRANSITIONS ─────────────────────────────────── */
.fade-enter-active,
.fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from,
.fade-leave-to     { opacity: 0; }
</style>