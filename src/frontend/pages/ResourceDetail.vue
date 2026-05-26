<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active">
        
        <div class="resource-detail-header">
          <div>
            <p class="resource-detail-kicker">Learning Resource</p>
            <h2>{{ resource?.title || 'Resource Detail' }}</h2>
          </div>
          <button @click="goBack" class="chip" type="button">Back to Resources</button>
        </div>

        <section v-if="resource" class="card resource-detail-card">
          <div class="resource-detail-cover">
            <span class="resource-type-tag">{{ resourceTypeLabel }}</span>
            <p class="resource-contributor">Uploaded by {{ resource.contributor_name || '-' }}</p>
          </div>

          <div class="resource-detail-main">
            <div class="resource-detail-meta-grid">
              <div class="resource-meta-box">
                <span>Course</span>
                <strong>{{ resource.course_code || 'General' }}</strong>
              </div>
              <div class="resource-meta-box">
                <span>Average Rating</span>
                <strong>{{ Number(resource.avg_rating || 0).toFixed(1) }}</strong>
              </div>
              <div class="resource-meta-box">
                <span>Total Reviews</span>
                <strong>{{ resource.review_count || resource.rating_count || 0 }}</strong>
              </div>
              <div class="resource-meta-box">
                <span>Published</span>
                <strong>{{ formatDateValue(resource.created_at, '-') }}</strong>
              </div>
            </div>

            <p class="resource-source-line">Source: {{ sourceLabel }}</p>

            <div class="resource-action-row">
              <button @click="openResource" class="chip chip-strong" type="button">Open Resource</button>
              <button @click="openDownload" class="chip" type="button">Download</button>
            </div>
          </div>
        </section>

        <section v-else class="card resource-detail-card">
          <p>Loading resource details...</p>
        </section>

        <section class="card resource-rating-card">
          <h3>Rate This Resource</h3>
          <form @submit.prevent="submitReview" class="stack">
            <div class="detail-star-rating-wrap">
              <p class="detail-rating-label">Your rating</p>
              
              <div class="detail-star-rating" role="radiogroup" aria-label="Your rating">
                <button 
                  v-for="star in 5" 
                  :key="star"
                  type="button" 
                  @mouseenter="previewRating = star"
                  @mouseleave="previewRating = 0"
                  @click="selectedRating = star"
                  :class="{
                    'is-active': star <= selectedRating,
                    'is-previewed': previewRating ? star <= previewRating : false
                  }"
                  :aria-label="`Rate ${star} stars`"
                  :aria-pressed="(star <= selectedRating).toString()"
                >★</button>
              </div>
              
              <p class="meta">{{ ratingHint }}</p>
            </div>
            
            <label>Comment (optional)
              <textarea v-model="comment" rows="3" placeholder="Share what was useful about this resource"></textarea>
            </label>
            
            <button class="primary" type="submit">Submit Rating</button>
          </form>
          <p v-if="resourceReviewMessage" class="message">{{ resourceReviewMessage }}</p>
        </section>

        <section class="card resource-comments-card">
          <div class="resource-comments-head">
            <h3>Comments & Ratings</h3>
            <button @click="loadComments" class="chip" type="button">Refresh</button>
          </div>
          
          <div class="resource-comments-list">
            <div v-if="isLoadingComments" class="resource-empty">Loading comments...</div>
            <div v-else-if="reviews.length === 0" class="resource-empty">No comments yet. Be the first to rate this resource.</div>
            
            <article v-else v-for="review in reviews" :key="review.id || review.created_at" class="resource-comment">
              <div class="resource-comment-head">
                <p class="resource-comment-user">{{ review.reviewer_name || 'User' }}</p>
                <p class="resource-comment-date">{{ formatDateValue(review.created_at, '-') }}</p>
              </div>
              <p class="resource-comment-rating">{{ renderStars(review.rating) }} ({{ Number(review.rating || 0).toFixed(1) }})</p>
              <p class="resource-comment-body">{{ review.comment || 'No comment provided.' }}</p>
            </article>
          </div>
        </section>

        <p v-if="resourceDetailMessage" class="message">{{ resourceDetailMessage }}</p>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, requireSession, showToast } from '@/api.js';
import { formatDateValue } from '@/utils/records.js'

const route = useRoute();
const router = useRouter();

// State Variables
const resourceId = computed(() => {
  const raw = route.params.resourceId ?? route.query.id;
  const normalized = String(raw ?? '').trim();
  if (!normalized || normalized === 'undefined' || normalized === 'null') {
    return '';
  }
  return normalized;
});
const resource = ref(null);
const reviews = ref([]);

// Form State
const selectedRating = ref(0);
const previewRating = ref(0);
const comment = ref('');

// Messages & Loading
const resourceDetailMessage = ref('');
const resourceReviewMessage = ref('');
const isLoadingComments = ref(true);

// Computed Properties for UI
const ratingHint = computed(() => {
  if (!selectedRating.value) return 'Select rating';
  return `${selectedRating.value} star${selectedRating.value === 1 ? '' : 's'} selected`;
});

const resourceTypeLabel = computed(() => {
  const rawType = String(resource.value?.resource_type || '').trim().toLowerCase();
  if (rawType === 'past-year') return 'Past Year Paper';
  if (rawType === 'lecture-note') return 'Lecture Note';
  if (rawType === 'notes') return 'Notes';
  if (rawType === 'slides') return 'Slides';
  if (rawType === 'pdf') return 'PDF';
  if (rawType === 'picture') return 'Picture';
  if (rawType === 'archive') return 'Archive';
  if (rawType === 'audio') return 'Audio';
  if (rawType === 'video') return 'Video';
  if (rawType === 'link' || String(resource.value?.file_url || '').startsWith('http')) return 'Link';
  return resource.value?.resource_type || 'Resource';
});

const sourceLabel = computed(() => {
  if (!resource.value) return '-';
  return String(resource.value.file_url || '').startsWith('http')
    ? `External link: ${resource.value.file_url}`
    : `File: ${resource.value.metadata?.originalName || resource.value.file_url || '-'}`;
});

// Helper Functions
const renderStars = (rating) => {
  const value = Math.max(0, Math.min(5, Number(rating || 0)));
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.5;
  return Array.from({ length: 5 }, (_, i) => {
    if (i < full) return '★';
    if (i === full && hasHalf) return '⯨';
    return '☆';
  }).join('');
};

const canPreviewInBrowser = (rawUrl) => {
  const url = String(rawUrl || '').trim().toLowerCase();
  if (!url) return false;
  if (/^https?:\/\//.test(url)) return true;

  const cleanPath = url.split('?')[0].split('#')[0];
  return [
    '.pdf',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.svg',
    '.txt',
    '.md',
    '.mp4',
    '.webm',
    '.mp3',
    '.wav',
    '.ogg'
  ].some((ext) => cleanPath.endsWith(ext));
};

const openInNewTab = (url) => {
  if (!url) return;
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};

const triggerBrowserDownload = (url) => {
  if (!url) return;
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.rel = 'noopener noreferrer';
  // Let the browser save dialog handle the final filename from response headers.
  anchor.setAttribute('download', '');
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};

// API Actions
const loadResource = async () => {
  if (!resourceId.value) {
    resourceDetailMessage.value = 'Missing resource id.';
    return;
  }

  if (!/^\d+$/.test(resourceId.value)) {
    resourceDetailMessage.value = 'Invalid resource id.';
    return;
  }

  try {
    const data = await api(`/resources/${encodeURIComponent(resourceId.value)}`);
    if (!data.resource) {
      resourceDetailMessage.value = 'Resource not found.';
      return;
    }
    resource.value = data.resource;
    resourceDetailMessage.value = '';
  } catch (error) {
    resourceDetailMessage.value = error.message || 'Unable to load this resource.';
  }
};

const loadComments = async () => {
  if (!resourceId.value) return;

  if (!/^\d+$/.test(resourceId.value)) {
    isLoadingComments.value = false;
    return;
  }
  
  isLoadingComments.value = true;
  try {
    const data = await api(`/resources/${encodeURIComponent(resourceId.value)}/reviews`);
    reviews.value = Array.isArray(data.reviews) ? data.reviews : [];
  } catch (error) {
    reviews.value = [];
    if (error?.message && !String(error.message).toLowerCase().includes('not found')) {
      resourceDetailMessage.value = error.message;
    }
  } finally {
    isLoadingComments.value = false;
  }
};

const submitReview = async () => {
  const rating = Number(selectedRating.value || 0);
  const commentText = String(comment.value || '').trim();

  if (!resourceId.value || !/^\d+$/.test(resourceId.value)) {
    resourceReviewMessage.value = 'Invalid resource id.';
    return;
  }

  if (!rating || rating < 1 || rating > 5) {
    resourceReviewMessage.value = 'Please select a rating between 1 and 5.';
    return;
  }

  try {
    await api(`/resources/${encodeURIComponent(resourceId.value)}/reviews`, 'POST', {
      rating,
      comment: commentText
    });
    
    resourceReviewMessage.value = 'Rating submitted successfully.';
    if(typeof showToast === 'function') showToast('Thanks for your feedback.', true);
    
    // Reset Form
    selectedRating.value = 0;
    previewRating.value = 0;
    comment.value = '';
    
    // Refresh Data
    await Promise.all([loadResource(), loadComments()]);
    
    // Clear message after a bit
    setTimeout(() => { resourceReviewMessage.value = ''; }, 3000);
    
  } catch (error) {
    resourceReviewMessage.value = error.message;
  }
};

const openResource = async () => {
  if (!resource.value) return;

  if (!canPreviewInBrowser(resource.value.file_url)) {
    resourceDetailMessage.value = 'This file type cannot be previewed in browser. Use Download to save it.';
    return;
  }

  if (!resource.value.id) {
    resourceDetailMessage.value = 'Unable to open this resource because no file URL is available.';
    return;
  }

  resourceDetailMessage.value = '';
  openInNewTab(`/api/resources/${resource.value.id}/file`);
};

const openDownload = async () => {
  if (!resource.value) return;
  try {
    triggerBrowserDownload(`/api/resources/${resource.value.id}/file?download=1`);
  } catch (error) {
    resourceDetailMessage.value = `Download failed: ${error.message}`;
  }
};

const goBack = () => {
  router.push('/resources'); // Assuming /resources is your resources list route
};

// Lifecycle
onMounted(() => {
  requireSession();
  if (resourceId.value) {
    Promise.all([loadResource(), loadComments()]);
  } else {
    resourceDetailMessage.value = 'No resource ID provided in the URL.';
  }
});
</script>

<style scoped>
.resource-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 10px;
  margin-bottom: 10px;
}

.resource-detail-kicker {
  margin: 0 0 3px;
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 700;
  color: #5b7487;
}

.resource-detail-card,
.resource-rating-card,
.resource-comments-card {
  margin-bottom: 12px;
}

.resource-detail-cover {
  border-radius: 14px;
  padding: 14px;
  background:
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.25), transparent 38%),
    linear-gradient(135deg, #273b4c, #5f788d 58%, #7d93a6);
  color: #fff;
  display: grid;
  gap: 8px;
}

.resource-type-tag {
  display: inline-flex;
  width: fit-content;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.14);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.resource-contributor {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.9;
}

.resource-detail-main {
  margin-top: 12px;
  display: grid;
  gap: 12px;
}

.resource-detail-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(135px, 1fr));
  gap: 8px;
}

.resource-meta-box {
  border: 1px solid #d8e6ef;
  border-radius: 10px;
  background: #fff;
  padding: 8px 10px;
}

.resource-meta-box span {
  display: block;
  color: #5f7586;
  font-size: 0.74rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 700;
}

.resource-meta-box strong {
  display: block;
  margin-top: 3px;
  color: #1f3a50;
  font-size: 1rem;
}

.resource-source-line {
  margin: 0;
  color: #4e6779;
  overflow-wrap: anywhere;
}

.resource-action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-star-rating-wrap {
  display: grid;
  gap: 8px;
}

.detail-rating-label {
  margin: 0;
  color: #1f3a50;
  font-weight: 600;
}

.detail-star-rating {
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
}

.detail-star-rating button {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 2px solid #213645;
  background: #fff;
  color: #bac4cc;
  font-size: 18px;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  transition: transform 120ms ease, background-color 120ms ease, color 120ms ease;
}

.detail-star-rating button:hover,
.detail-star-rating button:focus-visible,
.detail-star-rating button.is-previewed {
  color: #f0b300;
  background: #fff7d7;
}

.detail-star-rating button.is-active {
  color: #f0b300;
  background: #fff1bc;
}

.detail-star-rating button.is-active.is-previewed {
  background: #ffeaa0;
}

.detail-star-rating button:focus-visible,
.detail-star-rating button:hover {
  transform: scale(1.06);
}

.resource-comments-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.resource-comments-list {
  display: grid;
  gap: 8px;
}

.resource-comment {
  border: 1px solid #dbe7f0;
  border-radius: 10px;
  background: #fff;
  padding: 9px 10px;
}

.resource-comment-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 10px;
}

.resource-comment-user {
  margin: 0;
  color: #1f3a50;
  font-weight: 700;
}

.resource-comment-date,
.resource-comment-rating {
  margin: 0;
  color: #607789;
  font-size: 0.86rem;
}

.resource-comment-body {
  margin: 6px 0 0;
  color: #294055;
  font-size: 0.92rem;
}

.resource-empty {
  border: 1px dashed #cddae5;
  border-radius: 10px;
  background: #f8fbfe;
  color: #607789;
  padding: 10px;
}

@media (max-width: 640px) {
  .resource-detail-header {
    align-items: center;
  }

  .resource-action-row .chip {
    width: 100%;
  }
}
</style>