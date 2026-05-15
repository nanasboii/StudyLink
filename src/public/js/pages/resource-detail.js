import { api, requireSession, setMessage, showToast } from '../api.js';
import { mountNav } from '../nav.js';
import { PAGES } from '../routes.js';

requireSession();
mountNav('resources');

const state = {
  resourceId: '',
  resource: null,
  reviews: []
};

const resourceDetailCard = document.getElementById('resourceDetailCard');
const commentsList = document.getElementById('resourceCommentsList');
const reviewForm = document.getElementById('resourceReviewForm');
const ratingInput = document.getElementById('resourceRatingInput');
const commentInput = document.getElementById('resourceCommentInput');
const detailRatingHint = document.getElementById('detailRatingHint');
let selectedRating = 0;

function resourceTypeLabel(resource) {
  const rawType = String(resource?.resource_type || '').trim().toLowerCase();
  if (rawType === 'past-year') return 'Past Year Paper';
  if (rawType === 'lecture-note') return 'Lecture Note';
  if (rawType === 'notes') return 'Notes';
  if (rawType === 'slides') return 'Slides';
  if (rawType === 'pdf') return 'PDF';
  if (rawType === 'picture') return 'Picture';
  if (rawType === 'archive') return 'Archive';
  if (rawType === 'audio') return 'Audio';
  if (rawType === 'video') return 'Video';
  if (rawType === 'link' || String(resource?.file_url || '').startsWith('http')) return 'Link';
  return resource?.resource_type || 'Resource';
}

function renderStars(rating) {
  const value = Math.max(0, Math.min(5, Number(rating || 0)));
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.5;
  return Array.from({ length: 5 }, (_, i) => {
    if (i < full) return '★';
    if (i === full && hasHalf) return '⯨';
    return '☆';
  }).join('');
}

function updateDetailRatingState(previewRating = 0) {
  const buttons = Array.from(ratingInput.querySelectorAll('[data-rating]'));
  const activeRating = previewRating || selectedRating;

  buttons.forEach((button) => {
    const value = Number(button.dataset.rating);
    const isActive = value <= activeRating;
    button.classList.toggle('is-active', value <= selectedRating);
    button.classList.toggle('is-previewed', previewRating ? isActive : false);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });

  if (detailRatingHint) {
    if (!selectedRating) {
      detailRatingHint.textContent = 'Select rating';
    } else {
      detailRatingHint.textContent = `${selectedRating} star${selectedRating === 1 ? '' : 's'} selected`;
    }
  }
}

function setupDetailRatingPicker() {
  const buttons = Array.from(ratingInput.querySelectorAll('[data-rating]'));
  let previewRating = 0;

  buttons.forEach((button) => {
    const value = Number(button.dataset.rating);

    button.addEventListener('mouseenter', () => {
      previewRating = value;
      updateDetailRatingState(previewRating);
    });

    button.addEventListener('focus', () => {
      previewRating = value;
      updateDetailRatingState(previewRating);
    });

    button.addEventListener('click', () => {
      selectedRating = value;
      previewRating = 0;
      updateDetailRatingState(0);
    });
  });

  ratingInput.addEventListener('mouseleave', () => {
    previewRating = 0;
    updateDetailRatingState(0);
  });

  ratingInput.addEventListener('focusout', (event) => {
    if (!ratingInput.contains(event.relatedTarget)) {
      previewRating = 0;
      updateDetailRatingState(0);
    }
  });

  updateDetailRatingState(0);
}

function toDateText(dateValue) {
  if (!dateValue) {
    return '-';
  }
  const value = new Date(dateValue);
  if (Number.isNaN(value.getTime())) {
    return '-';
  }
  return value.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function canPreviewInBrowser(rawUrl) {
  const url = String(rawUrl || '').trim().toLowerCase();
  if (!url) {
    return false;
  }

  if (/^https?:\/\//.test(url)) {
    return true;
  }

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
}

function readResourceId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || '';
}

async function loadResourceFromListFallback() {
  const data = await api('/resources');
  const all = Array.isArray(data.resources) ? data.resources : [];
  const match = all.find((entry) => String(entry.id) === String(state.resourceId));
  if (!match) {
    return null;
  }

  return {
    ...match,
    review_count: Number(match.rating_count || 0)
  };
}

function openInNewTab(url) {
  if (!url) {
    return;
  }
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function triggerBrowserDownload(url) {
  if (!url) {
    return;
  }

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.rel = 'noopener noreferrer';
  anchor.setAttribute('download', '');
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

async function openDownload() {
  if (!state.resource) {
    return;
  }

  try {
    triggerBrowserDownload(`/api/resources/${state.resource.id}/file?download=1`);
  } catch (error) {
    setMessage('resourceDetailMessage', `Download failed: ${error.message}`);
  }
}

async function openResource() {
  if (!state.resource) {
    return;
  }
  if (!canPreviewInBrowser(state.resource.file_url)) {
    setMessage('resourceDetailMessage', 'This file type cannot be previewed in browser. Use Download to save it.');
    return;
  }
  if (!state.resource.id) {
    setMessage('resourceDetailMessage', 'Unable to open this resource because no file URL is available.');
    return;
  }
  setMessage('resourceDetailMessage', '', true);
  openInNewTab(`/api/resources/${state.resource.id}/file`);
}

function renderResourceCard() {
  const resource = state.resource;
  if (!resource) {
    return;
  }

  document.getElementById('resourceTitle').textContent = resource.title || 'Resource Detail';
  document.getElementById('resourceTypeTag').textContent = resourceTypeLabel(resource);
  document.getElementById('resourceContributor').textContent = `Uploaded by ${resource.contributor_name || '-'}`;
  document.getElementById('resourceCourse').textContent = resource.course_code || 'General';
  document.getElementById('resourceRating').textContent = Number(resource.avg_rating || 0).toFixed(1);
  document.getElementById('resourceReviewCount').textContent = String(resource.review_count || resource.rating_count || 0);
  document.getElementById('resourceCreatedAt').textContent = toDateText(resource.created_at);

  const sourceLabel = String(resource.file_url || '').startsWith('http')
    ? `External link: ${resource.file_url}`
    : `File: ${resource.metadata?.originalName || resource.file_url || '-'}`;
  document.getElementById('resourceSource').textContent = sourceLabel;

  resourceDetailCard.classList.remove('hidden');
}

function renderComments() {
  commentsList.innerHTML = '';
  if (!state.reviews.length) {
    commentsList.innerHTML = '<div class="resource-empty">No comments yet. Be the first to rate this resource.</div>';
    return;
  }

  state.reviews.forEach((review) => {
    const entry = document.createElement('article');
    entry.className = 'resource-comment';
    const commentText = String(review.comment || '').trim();
    entry.innerHTML = `
      <div class="resource-comment-head">
        <p class="resource-comment-user">${review.reviewer_name || 'User'}</p>
        <p class="resource-comment-date">${toDateText(review.created_at)}</p>
      </div>
      <p class="resource-comment-rating">${renderStars(review.rating)} (${Number(review.rating || 0).toFixed(1)})</p>
      <p class="resource-comment-body">${commentText || 'No comment provided.'}</p>
    `;
    commentsList.appendChild(entry);
  });
}

async function loadResource() {
  if (!state.resourceId) {
    setMessage('resourceDetailMessage', 'Missing resource id.');
    return;
  }

  try {
    const data = await api(`/resources/${encodeURIComponent(state.resourceId)}`);
    if (!data.resource) {
      setMessage('resourceDetailMessage', 'Resource not found.');
      return;
    }
    state.resource = data.resource;
    renderResourceCard();
    setMessage('resourceDetailMessage', '', true);
  } catch (error) {
    try {
      const fallbackResource = await loadResourceFromListFallback();
      if (!fallbackResource) {
        setMessage('resourceDetailMessage', error.message || 'Unable to load this resource.');
        return;
      }

      state.resource = fallbackResource;
      renderResourceCard();
      setMessage('resourceDetailMessage', 'Loaded from fallback source. Some stats may update shortly.', true);
    } catch (fallbackError) {
      setMessage('resourceDetailMessage', fallbackError.message || error.message || 'Unable to load this resource.');
    }
  }
}

async function loadComments() {
  if (!state.resourceId) {
    return;
  }

  commentsList.innerHTML = '<div class="resource-empty">Loading comments...</div>';
  try {
    const data = await api(`/resources/${encodeURIComponent(state.resourceId)}/reviews`);
    state.reviews = Array.isArray(data.reviews) ? data.reviews : [];
    renderComments();
  } catch (error) {
    state.reviews = [];
    renderComments();
    if (error?.message && !String(error.message).toLowerCase().includes('not found')) {
      setMessage('resourceDetailMessage', error.message);
    }
  }
}

reviewForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const rating = Number(selectedRating || 0);
  const comment = String(commentInput.value || '').trim();

  if (!rating || rating < 1 || rating > 5) {
    setMessage('resourceReviewMessage', 'Please select a rating between 1 and 5.');
    return;
  }

  try {
    await api(`/resources/${encodeURIComponent(state.resourceId)}/reviews`, 'POST', {
      rating,
      comment
    });
    setMessage('resourceReviewMessage', 'Rating submitted successfully.', true);
    showToast('Thanks for your feedback.', true);
    selectedRating = 0;
    updateDetailRatingState(0);
    await Promise.all([loadResource(), loadComments()]);
  } catch (error) {
    setMessage('resourceReviewMessage', error.message);
  }
});

document.getElementById('backToResourcesBtn').addEventListener('click', () => {
  window.location.href = PAGES.resources;
});

document.getElementById('refreshCommentsBtn').addEventListener('click', () => {
  loadComments();
});

document.getElementById('openResourceBtn').addEventListener('click', () => {
  openResource();
});

document.getElementById('downloadResourceBtn').addEventListener('click', () => {
  openDownload();
});

state.resourceId = readResourceId();
setupDetailRatingPicker();
Promise.all([loadResource(), loadComments()]);
