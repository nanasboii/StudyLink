<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active">
        
        <div class="resource-detail-header">
          <div>
            <p class="resource-detail-kicker">Learning Resource</p>
          </div>
          <button @click="goBack" class="chip" type="button">{{ backButtonLabel }}</button>
        </div>

        <p v-if="resourceDetailMessage" class="message" role="alert" aria-live="polite">
          {{ resourceDetailMessage }}
        </p>

        <section v-if="resource" class="card resource-detail-card">
          <div class="resource-detail-cover">
            <span class="resource-type-tag">{{ resourceTypeLabel }}</span>
            <h2 class="resource-cover-title">{{ resource.title || 'Resource Detail' }}</h2>
            <p class="resource-contributor">Uploaded by {{ resource.contributor_name || '-' }}</p>
          </div>

          <div class="resource-detail-main">
            <div class="resource-action-bar">
              <button 
                @click="openResource" 
                :disabled="!canOpenResource" 
                class="chip chip-strong" 
                type="button"
                :title="!canOpenResource ? (fileMissing ? 'File is missing from storage' : 'No file available') : 'Open resource in new tab'"
              >
                Open Resource
              </button>
              <button 
                v-if="canDownloadResource" 
                @click="openDownload" 
                :disabled="fileMissing" 
                class="chip" 
                type="button"
              >
                ↓ Download
              </button>
              <button
                v-if="resource.file_url"
                class="chip"
                type="button"
                @click="copyLink"
                aria-label="Copy resource link"
              >
                Copy Link
              </button>
            </div>

            <div class="resource-detail-meta-grid">
              <div class="resource-meta-box">
                <span>Course</span>
                <strong>{{ resource.course_code || 'General' }}</strong>
              </div>
              <div class="resource-meta-box">
                <span>Published</span>
                <strong>{{ formatDateValue(resource.created_at, '-') }}</strong>
              </div>
            </div>

            <div class="resource-file-chip" v-if="!fileMissing && resource.file_url">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" fill="none" stroke="currentColor" stroke-width="2"/>
                <polyline points="14,2 14,8 20,8" fill="none" stroke="currentColor" stroke-width="2"/>
              </svg>
              <span>{{ resource.metadata?.originalName || resource.metadata?.fileName || resource.file_url.split('/').pop() || 'View file' }}</span>
            </div>

            <p v-if="resource.description" class="resource-description">
              {{ resource.description }}
            </p>
            
            <p v-if="fileMissing" class="message message-error" role="alert">
              This resource file is missing from server storage and cannot be opened.
            </p>
          </div>
        </section>

        <section v-else-if="isLoadingResource" class="card resource-detail-card">
          <p>Loading resource details...</p>
        </section>

        <section v-else class="card resource-detail-card">
          <p>Resource could not be loaded.</p>
        </section>

        <template v-if="resource">
          <section class="card resource-rating-card">
            <h3>Leave a Review</h3>
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
              
              <label>Your thoughts (optional)
                <textarea v-model="comment" rows="3" maxlength="500" placeholder="What was helpful? Would you recommend it?"></textarea>
                <span class="meta" style="text-align:right;display:block;">
                  {{ comment.length }}/500
                </span>
              </label>
              
              <button class="primary" type="submit" :disabled="isSubmittingReview">
                {{ isSubmittingReview ? 'Submitting...' : 'Submit Rating' }}
              </button>
            </form>
            <p v-if="resourceReviewMessage" class="message" role="status" aria-live="polite">
              {{ resourceReviewMessage }}
            </p>
          </section>

          <section class="card resource-comments-card">
            <div class="resource-comments-head">
              <h3>
                Comments & Ratings
                <span v-if="reviews.length" style="font-size:0.8rem; font-weight:400; color:var(--ink-soft);">
                  ({{ reviews.length }})
                </span>
              </h3>
              <button @click="loadComments" class="chip" type="button">Refresh</button>
            </div>

            <div class="rating-summary" v-if="resource.review_count || resource.rating_count">
              <span class="rating-big">{{ Number(resource.avg_rating || 0).toFixed(1) }}</span>
              <div>
                <span style="color:#f0b300; font-size:1.1rem;">{{ renderStars(resource.avg_rating) }}</span>
                <p class="meta" style="margin:0;">{{ resource.review_count || resource.rating_count || 0 }} review{{ (resource.review_count || resource.rating_count) !== 1 ? 's' : '' }}</p>
              </div>
            </div>
            
            <div class="resource-comments-list">
              <div v-if="isLoadingComments" class="resource-empty">Loading comments...</div>
              <div v-else-if="reviews.length === 0" class="resource-empty">No comments yet. Be the first to rate this resource.</div>
              
              <article v-else v-for="review in reviews" :key="review.id" class="resource-comment">
                <div class="resource-comment-head">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <div class="reviewer-avatar">{{ (review.reviewer_name || 'U')[0].toUpperCase() }}</div>
                    <p class="resource-comment-user">{{ review.reviewer_name || 'User' }}</p>
                  </div>
                  <p class="resource-comment-date">{{ formatDateValue(review.created_at, '-') }}</p>
                </div>
                <p class="resource-comment-rating" style="color:#f0b300; margin: 4px 0;">
                  {{ renderStars(review.rating) }}
                </p>
                <p class="resource-comment-body">{{ review.comment || 'No comment provided.' }}</p>
              </article>
            </div>
          </section>
        </template>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
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
const isLoadingResource = ref(true);
const isSubmittingReview = ref(false);

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
  if (resource.value.uploaded_file_missing) {
    return 'Uploaded file is missing from server storage.';
  }
  const url = String(resource.value.file_url || '');
  const isSupabaseUpload = url.includes('supabase.co/storage/');
  const isLocalUpload = url.startsWith('/uploads/resources/');
  if (isSupabaseUpload || isLocalUpload) {
    return `File: ${resource.value.metadata?.originalName || resource.value.metadata?.fileName || url.split('/').pop() || '-'}`;
  }
  return url.startsWith('http')
    ? `External link: ${url}`
    : `File: ${resource.value.metadata?.originalName || url || '-'}`;
});

const fileMissing = computed(() => Boolean(resource.value?.uploaded_file_missing));

const canDownloadResource = computed(() => {
  if (!resource.value) return false;
  if (resource.value.uploaded_file_missing) return false;
  const url = String(resource.value.file_url || '');
  // Allow download for Supabase uploads and local uploads
  return url.includes('supabase.co/storage/') || url.startsWith('/uploads/resources/');
});

const canOpenResource = computed(() => {
  if (!resource.value) return false;
  if (resource.value.uploaded_file_missing) return false;
  return Boolean(resource.value.file_url);
});

const backPath = computed(() => {
  const from = String(route.query.from || '').trim().toLowerCase();
  if (from === 'admin-resources') return '/admin/resources';
  if (from === 'my-resources') return '/my-resources';
  if (from === 'resources') return '/resources';

  try {
    const rawUser = localStorage.getItem('studylinkUser');
    const user = rawUser ? JSON.parse(rawUser) : null;
    if (user?.role === 'admin') return '/admin/resources';
  } catch {}

  return '/resources';
});

const backButtonLabel = computed(() => {
  if (backPath.value === '/admin/resources') return 'Back to Review Resources';
  if (backPath.value === '/my-resources') return 'Back to My Uploads';
  return 'Back to Resources';
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

// API Actions
const loadResource = async () => {
  if (!resourceId.value) {
    resourceDetailMessage.value = 'Missing resource id.';
    isLoadingResource.value = false;
    return;
  }

  if (!/^\d+$/.test(resourceId.value)) {
    resourceDetailMessage.value = 'Invalid resource id.';
    isLoadingResource.value = false;
    return;
  }

  isLoadingResource.value = true;
  try {
    const data = await api(`/resources/${encodeURIComponent(resourceId.value)}`);
    if (!data.resource) {
      resourceDetailMessage.value = 'Resource not found.';
      return;
    }
    resource.value = data.resource;
    
    document.title = `${data.resource.title} — StudyLink`;
    resourceDetailMessage.value = '';
  } catch (error) {
    resourceDetailMessage.value = error.message || 'Unable to load this resource.';
  } finally {
    isLoadingResource.value = false;
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
      if (!resourceDetailMessage.value) {
        resourceDetailMessage.value = error.message;
      }
    }
  } finally {
    isLoadingComments.value = false;
  }
};

const submitReview = async () => {
  if (isSubmittingReview.value) return;
  
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

  isSubmittingReview.value = true;
  try {
    await api(`/resources/${encodeURIComponent(resourceId.value)}/reviews`, 'POST', {
      rating,
      comment: commentText
    });
    
    resourceReviewMessage.value = 'Rating submitted successfully.';
    if(typeof showToast === 'function') showToast('Thanks for your feedback.', true);
    
    selectedRating.value = 0;
    previewRating.value = 0;
    comment.value = '';
    
    await Promise.all([loadResource(), loadComments()]);
    
    setTimeout(() => { resourceReviewMessage.value = ''; }, 3000);
    
  } catch (error) {
    resourceReviewMessage.value = error.message;
  } finally {
    isSubmittingReview.value = false;
  }
};

const getResourceFileUrl = (download = false) => {
  if (!resource.value?.id) return '';
  return `/api/resources/${resource.value.id}/file${download ? '?download=1' : ''}`;
};

const openResource = () => {
  if (!resource.value) return;

  if (resource.value.uploaded_file_missing) {
    resourceDetailMessage.value = 'This uploaded resource file is missing from storage.';
    return;
  }

  if (!resource.value.file_url) {
    resourceDetailMessage.value = 'Unable to open this resource because no file URL is available.';
    return;
  }

  resourceDetailMessage.value = '';
  window.open(getResourceFileUrl(), '_blank', 'noopener,noreferrer');
};

const copyLink = async () => {
  if (!resource.value?.file_url) return;
  try {
    await navigator.clipboard.writeText(resource.value.file_url);
    resourceDetailMessage.value = 'Link copied to clipboard.';
    setTimeout(() => { resourceDetailMessage.value = ''; }, 2000);
  } catch {
    resourceDetailMessage.value = 'Could not copy link automatically.';
  }
};

const getResourceDownloadExtension = (source) => {
  const cleaned = String(source || '').trim().split('?')[0].split('#')[0];
  const match = cleaned.match(/\.([a-zA-Z0-9]+)$/);
  return match ? `.${match[1]}` : '';
};

const getResourceDownloadFilename = () => {
  const originalName = String(resource.value?.metadata?.originalName || '').trim();
  if (originalName) return originalName;

  const metadataFileName = String(resource.value?.metadata?.fileName || '').trim();
  if (metadataFileName) return metadataFileName;

  const fileUrl = String(resource.value?.file_url || '').trim();
  const urlNameMatch = fileUrl.match(/([^\/\\?#]+)(?:[?#].*)?$/);
  if (urlNameMatch && urlNameMatch[1] && urlNameMatch[1] !== 'file') {
    return urlNameMatch[1];
  }

  const title = String(resource.value?.title || 'resource').trim();
  const safeTitle = title.replace(/[^a-zA-Z0-9._-]+/g, '_') || 'resource';
  const extension = getResourceDownloadExtension(fileUrl || metadataFileName);
  return `${safeTitle}${extension}`;
};

const openDownload = () => {
  if (!resource.value) return;
  if (resource.value.uploaded_file_missing) {
    resourceDetailMessage.value = 'This uploaded resource file is missing from storage.';
    return;
  }
  if (!canDownloadResource.value) {
    resourceDetailMessage.value = 'This resource cannot be downloaded directly.';
    return;
  }
  resourceDetailMessage.value = '';
  const url = String(resource.value.file_url || '');
  const anchor = document.createElement('a');
  if (url.includes('supabase.co/storage/')) {
    anchor.href = url;
  } else {
    anchor.href = getResourceFileUrl(true);
  }
  anchor.download = getResourceDownloadFilename();
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};

const goBack = () => {
  router.replace(backPath.value);
};

onMounted(() => {
  requireSession();
  
  const viewEl = document.querySelector('.view');
  if (viewEl) viewEl.scrollTop = 0;

  if (resourceId.value) {
    Promise.all([loadResource(), loadComments()]).catch(() => {});
  } else {
    resourceDetailMessage.value = 'No resource ID provided in the URL.';
    isLoadingResource.value = false;
  }
});

onUnmounted(() => {
  document.title = 'StudyLink';
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
  color: var(--ink-kicker);
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
    linear-gradient(135deg, #7f1d43, #b11f4b 58%, #d35a82);
  color: #fff;
  display: grid;
  gap: 8px;
}

.resource-cover-title {
  margin: 0;
  font-size: 1.5rem;
  line-height: 1.2;
}

.resource-action-bar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 12px 0;
  border-bottom: 1px solid var(--hairline);
  margin-bottom: 12px;
}

.resource-file-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--hairline);
  background: var(--surface-soft-alt);
  color: var(--ink-soft);
  font-size: 0.85rem;
  margin-bottom: 12px;
}

.rating-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
}

.rating-big {
  font-size: 2.4rem;
  font-weight: 700;
  color: var(--ink);
  line-height: 1;
}

.reviewer-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--primary-soft-strong);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
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
  border: 1px solid var(--hairline);
  border-radius: 10px;
  background: var(--surface);
  padding: 8px 10px;
}

.resource-meta-box span {
  display: block;
  color: var(--ink-kicker);
  font-size: 0.74rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 700;
}

.resource-meta-box strong {
  display: block;
  margin-top: 3px;
  color: var(--ink);
  font-size: 1rem;
}

.resource-description {
  margin: 0;
  color: var(--ink-soft);
  font-size: 0.92rem;
  line-height: 1.6;
  padding: 10px 12px;
  background: var(--surface-soft-alt);
  border-radius: 8px;
  border-left: 3px solid var(--primary-soft-strong);
}

.detail-star-rating-wrap {
  display: grid;
  gap: 8px;
}

.detail-rating-label {
  margin: 0;
  color: var(--ink);
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
  border: 2px solid var(--primary-soft-strong);
  background: var(--surface);
  color: #d3a8b6;
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
  border: 1px solid var(--hairline);
  border-radius: 10px;
  background: var(--surface);
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
  color: var(--ink);
  font-weight: 700;
}

.resource-comment-date {
  margin: 0;
  color: var(--ink-soft);
  font-size: 0.86rem;
}

.resource-comment-body {
  margin: 6px 0 0;
  color: var(--ink);
  font-size: 0.92rem;
}

.resource-empty {
  border: 1px dashed var(--hairline);
  border-radius: 10px;
  background: var(--surface-soft-alt);
  color: var(--ink-soft);
  padding: 10px;
}

@media (max-width: 640px) {
  .resource-detail-header {
    align-items: center;
  }

  .resource-action-bar .chip {
    width: 100%;
  }
}
</style>
