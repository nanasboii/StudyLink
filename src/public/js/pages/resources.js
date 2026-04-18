import { api, debounce, getToken, requireSession, showToast } from '../api.js';
import { mountNav } from '../nav.js';
import { PAGES } from '../routes.js';

requireSession();
mountNav('resources');

let selectedType = '';
const resourceRatings = new Map();
const RESOURCE_PAGE_SIZE = 12;
let allVisibleResources = [];
let visibleResourceCount = RESOURCE_PAGE_SIZE;
const suggestedCarousel = document.getElementById('suggestedCarousel');
const uploadPanel = document.getElementById('uploadPanel');
const uploadForm = document.getElementById('resourceUploadForm');
const uploadMessage = document.getElementById('resourceUploadMessage');
const resourceSearch = document.getElementById('resourceSearch');
const resourceFilterBtn = document.getElementById('resourceFilterBtn');
const filterPopupBtn = document.getElementById('filterPopupBtn');
const resourceFilterModal = document.getElementById('resourceFilterModal');
const closeFilterModalBtn = document.getElementById('closeFilterModalBtn');
const applyFilterBtn = document.getElementById('applyFilterBtn');
const resetFilterBtn = document.getElementById('resetFilterBtn');
const minRatingFilter = document.getElementById('minRatingFilter');
const maxRatingFilter = document.getElementById('maxRatingFilter');
const ratingRangeWrap = document.getElementById('ratingRangeWrap');
const minRatingValue = document.getElementById('minRatingValue');
const maxRatingValue = document.getElementById('maxRatingValue');
const typeFilterChecks = Array.from(document.querySelectorAll('input[data-filter="type"]'));
const sourceFilterChecks = Array.from(document.querySelectorAll('input[data-filter="source"]'));
const typeChips = Array.from(document.querySelectorAll('#typeChips .chip'));
const filterState = {
  resourceTypes: new Set(),
  sources: new Set(),
  minRating: 0,
  maxRating: 5
};

function ratingKey(resourceId) {
  return String(resourceId || '');
}

function showSkeletonList(container, count = 3) {
  container.innerHTML = '';
  for (let i = 0; i < count; i += 1) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-item';
    container.appendChild(skeleton);
  }
}

function ensureLoadMoreButton() {
  let button = document.getElementById('resourceLoadMoreBtn');
  if (!button) {
    button = document.createElement('button');
    button.id = 'resourceLoadMoreBtn';
    button.className = 'chip';
    button.type = 'button';
    button.textContent = 'Load more resources';
    button.addEventListener('click', () => {
      visibleResourceCount += RESOURCE_PAGE_SIZE;
      renderResourcesSection();
    });
    const list = document.getElementById('resourceList');
    list.insertAdjacentElement('afterend', button);
  }
  return button;
}

function ensureResourceCounter() {
  let counter = document.getElementById('resourceCounter');
  if (!counter) {
    counter = document.createElement('p');
    counter.id = 'resourceCounter';
    counter.className = 'meta';
    const list = document.getElementById('resourceList');
    list.insertAdjacentElement('beforebegin', counter);
  }
  return counter;
}

function renderResourcesSection() {
  const list = document.getElementById('resourceList');
  const counter = ensureResourceCounter();
  list.innerHTML = '';

  if (!allVisibleResources.length) {
    list.innerHTML = '<div class="empty-state">No resources found yet. Try another filter, or upload your first resource.</div>';
    counter.textContent = 'Showing 0 of 0 resources';
    const btn = ensureLoadMoreButton();
    btn.classList.add('hidden');
    return;
  }

  allVisibleResources
    .slice(0, visibleResourceCount)
    .forEach((resource) => list.appendChild(renderItem(resource)));

  counter.textContent = `Showing ${Math.min(visibleResourceCount, allVisibleResources.length)} of ${allVisibleResources.length} resources`;

  const loadMoreBtn = ensureLoadMoreButton();
  if (visibleResourceCount < allVisibleResources.length) {
    loadMoreBtn.classList.remove('hidden');
  } else {
    loadMoreBtn.classList.add('hidden');
  }
}

function setUploadMessage(text, isOk = false) {
  uploadMessage.textContent = text;
  uploadMessage.style.color = isOk ? '#1f7a45' : '#bc2f2f';
}

function ratingLabel(rating) {
  const value = Number(rating || 0).toFixed(1);
  return `${value} out of 5 stars`;
}

function renderStars(rating) {
  const value = Math.max(0, Math.min(5, Number(rating || 0)));
  const fullStars = Math.floor(value);
  const hasHalfStar = value - fullStars >= 0.5;
  const stars = Array.from({ length: 5 }, (_, index) => {
    if (index < fullStars) {
      return '<span class="rating-star is-full">★</span>';
    }
    if (index === fullStars && hasHalfStar) {
      return '<span class="rating-star is-half">★</span>';
    }
    return '<span class="rating-star is-empty">★</span>';
  }).join('');

  return `<span class="rating-stars" aria-hidden="true">${stars}</span><span class="sr-only">${ratingLabel(value)}</span>`;
}

function resourcePreviewLabel(resource) {
  const uploadKind = resource.metadata?.uploadKind || (resource.file_url?.startsWith('http') ? 'link' : 'file');
  if (uploadKind === 'link') {
    return resource.metadata?.externalLink || resource.file_url;
  }
  return resource.metadata?.originalName || resource.title;
}

function resourceCoverLabel(resource) {
  return (resource.resource_type || 'resource').toString().trim() || 'resource';
}

function openResourceDetails(resourceId) {
  if (!resourceId) {
    return;
  }
  window.location.href = `${PAGES.resourceDetail}?id=${encodeURIComponent(resourceId)}`;
}

function resourceTypeLabel(resource) {
  const rawType = String(resource.resource_type || '').trim().toLowerCase();

  if (rawType === 'past-year') {
    return 'Past Year Paper';
  }
  if (rawType === 'lecture-note') {
    return 'Lecture Note';
  }
  if (rawType === 'notes') {
    return 'Notes';
  }
  if (rawType === 'slides') {
    return 'Slides';
  }
  if (rawType === 'pdf') {
    return 'PDF';
  }
  if (rawType === 'picture') {
    return 'Picture';
  }
  if (rawType === 'archive') {
    return 'Archive';
  }
  if (rawType === 'audio') {
    return 'Audio';
  }
  if (rawType === 'video') {
    return 'Video';
  }
  if (rawType === 'link' || resource.file_url?.startsWith('http')) {
    return 'Link';
  }

  return resource.resource_type || 'Resource';
}

function renderSuggestedCard(resource) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'suggested-card';
  card.innerHTML = `
    <div class="suggested-media">
      <span>${resourceCoverLabel(resource).slice(0, 1).toUpperCase()}</span>
    </div>
    <div class="suggested-body">
      <div class="suggested-type">${resourceTypeLabel(resource)}</div>
      <strong>${resource.title}</strong>
      <div class="meta">${resource.course_code || 'General'} · ${resource.contributor_name}</div>
      <div class="meta rating-line">${renderStars(resource.avg_rating)} <span>${Number(resource.avg_rating || 0).toFixed(1)}</span></div>
    </div>
  `;

  card.addEventListener('click', () => {
    openResourceDetails(resource.id);
  });

  return card;
}

async function submitResourceRating(resourceId, rating) {
  resourceRatings.set(ratingKey(resourceId), rating);
  await api(`/resources/${resourceId}/reviews`, 'POST', {
    rating,
    comment: `Rated ${rating} star${rating === 1 ? '' : 's'}`
  });
  loadResources();
}

function updateStarState(container, selectedRating = 0, previewRating = 0) {
  const buttons = Array.from(container.querySelectorAll('[data-rating]'));
  const activeRating = previewRating || selectedRating;

  buttons.forEach((button) => {
    const rating = Number(button.dataset.rating);
    const isActive = rating <= activeRating;
    button.classList.toggle('is-active', rating <= selectedRating);
    button.classList.toggle('is-previewed', previewRating ? isActive : false);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function wireStarPreview(container, resourceId) {
  const buttons = Array.from(container.querySelectorAll('[data-rating]'));
  const key = ratingKey(resourceId);
  const selectedRating = resourceRatings.get(key) || 0;
  let previewRating = 0;

  const syncState = () => updateStarState(container, resourceRatings.get(key) || 0, previewRating);

  buttons.forEach((button) => {
    const rating = Number(button.dataset.rating);
    button.addEventListener('mouseenter', () => {
      previewRating = rating;
      syncState();
    });
    button.addEventListener('focus', () => {
      previewRating = rating;
      syncState();
    });
    button.addEventListener('click', async () => {
      previewRating = rating;
      button.classList.add('is-just-selected');
      window.setTimeout(() => button.classList.remove('is-just-selected'), 180);
      resourceRatings.set(key, rating);
      syncState();
      await submitResourceRating(resourceId, rating);
    });
  });

  container.addEventListener('mouseleave', () => {
    previewRating = 0;
    syncState();
  });

  container.addEventListener('focusout', (event) => {
    if (!container.contains(event.relatedTarget)) {
      previewRating = 0;
      syncState();
    }
  });

  updateStarState(container, selectedRating, 0);
}

document.getElementById('toggleUploadBtn').addEventListener('click', () => {
  uploadPanel.classList.toggle('hidden');
  document.getElementById('toggleUploadBtn').textContent = uploadPanel.classList.contains('hidden')
    ? 'Upload Resource'
    : 'Hide Upload';
});

function getActiveFilter() {
  return selectedType || '';
}

function normalizeType(resourceType) {
  const rawType = String(resourceType || '').trim().toLowerCase();
  if (rawType === 'past year' || rawType === 'past paper' || rawType === 'past-year-paper') {
    return 'past-year';
  }
  if (rawType === 'lecture note' || rawType === 'lecture-notes') {
    return 'lecture-note';
  }
  return rawType;
}

function getResourceSource(resource) {
  return resource.metadata?.uploadKind || (resource.file_url?.startsWith('http') ? 'link' : 'file');
}

function matchesPopupFilters(resource) {
  const normalizedType = normalizeType(resource.resource_type);
  const source = getResourceSource(resource);
  const rating = Number(resource.avg_rating || 0);

  const selectedTypes = filterState.resourceTypes;
  const wantsLinkType = selectedTypes.has('link');
  const typeWithoutLink = new Set(Array.from(selectedTypes).filter((type) => type !== 'link'));

  const linkTypePass = wantsLinkType && (normalizedType === 'link' || source === 'link');
  const regularTypePass = typeWithoutLink.has(normalizedType);

  const typePass =
    !selectedTypes.size ||
    linkTypePass ||
    regularTypePass;
  const sourcePass = !filterState.sources.size || filterState.sources.has(source);
  const ratingPass = rating >= filterState.minRating && rating <= filterState.maxRating;

  return typePass && sourcePass && ratingPass;
}

function openFilterModal() {
  resourceFilterModal.classList.remove('hidden');
}

function closeFilterModal() {
  resourceFilterModal.classList.add('hidden');
}

function syncFilterStateFromInputs() {
  filterState.resourceTypes = new Set(
    typeFilterChecks.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value)
  );
  filterState.sources = new Set(
    sourceFilterChecks.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value)
  );
  filterState.minRating = Number(minRatingFilter.value || 0);
  filterState.maxRating = Number(maxRatingFilter.value || 5);
}

function resetPopupFilters() {
  typeFilterChecks.forEach((checkbox) => {
    checkbox.checked = false;
  });
  sourceFilterChecks.forEach((checkbox) => {
    checkbox.checked = false;
  });
  minRatingFilter.value = '0';
  maxRatingFilter.value = '5';
  updateRatingRangeUI();
  syncFilterStateFromInputs();
}

function updateRatingRangeUI() {
  const minValue = Number(minRatingFilter.value || 0);
  const maxValue = Number(maxRatingFilter.value || 5);
  const min = Number(minRatingFilter.min || 0);
  const max = Number(minRatingFilter.max || 5);
  const range = max - min || 1;
  const from = ((minValue - min) / range) * 100;
  const to = ((maxValue - min) / range) * 100;
  minRatingValue.textContent = sliderStarsLabel(minValue);
  maxRatingValue.textContent = sliderStarsLabel(maxValue);
  ratingRangeWrap.style.setProperty('--range-from', `${from}%`);
  ratingRangeWrap.style.setProperty('--range-to', `${to}%`);
}

function sliderStarsLabel(value) {
  const safeValue = Math.max(0, Math.min(5, Number(value || 0)));
  const fullStars = Math.floor(safeValue);
  const hasHalfStar = safeValue - fullStars >= 0.5;
  const stars = Array.from({ length: 5 }, (_, index) => {
    if (index < fullStars) {
      return '★';
    }
    if (index === fullStars && hasHalfStar) {
      return '⯨';
    }
    return '☆';
  }).join('');

  return stars;
}

function handleMinRatingInput() {
  const minValue = Number(minRatingFilter.value || 0);
  const maxValue = Number(maxRatingFilter.value || 5);
  if (minValue > maxValue) {
    minRatingFilter.value = String(maxValue);
  }
  updateRatingRangeUI();
}

function handleMaxRatingInput() {
  const minValue = Number(minRatingFilter.value || 0);
  const maxValue = Number(maxRatingFilter.value || 5);
  if (maxValue < minValue) {
    maxRatingFilter.value = String(minValue);
  }
  updateRatingRangeUI();
}

async function resolveResourceUrl(rawUrl) {
  const fileUrl = String(rawUrl || '').trim();
  if (!fileUrl) {
    return '';
  }

  if (/^https?:\/\//i.test(fileUrl)) {
    return fileUrl;
  }

  if (!fileUrl.startsWith('/')) {
    return fileUrl;
  }

  try {
    const response = await fetch(fileUrl, { method: 'HEAD' });
    if (response.ok) {
      return fileUrl;
    }
  } catch (error) {
    // Fall back to docker app URL for uploaded files when local dev server cannot serve them.
  }

  if (fileUrl.startsWith('/uploads/') && window.location.port !== '3000') {
    return `${window.location.protocol}//${window.location.hostname}:3000${fileUrl}`;
  }

  return fileUrl;
}

async function openDownload(resource) {
  try {
    const payload = await api(`/resources/${resource.id}/download`, 'POST');
    const fileUrl = await resolveResourceUrl(payload?.resource?.file_url || resource.file_url);
    if (!fileUrl) {
      throw new Error('No downloadable file found for this resource.');
    }
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
  } catch (error) {
    window.alert(`Download failed: ${error.message}`);
  }
}

function renderItem(resource) {
  const div = document.createElement('div');
  div.className = 'item resource-item-link';
  div.tabIndex = 0;
  div.setAttribute('role', 'button');
  div.setAttribute('aria-label', `Open details for ${resource.title}`);
  const selectedRating = resourceRatings.get(ratingKey(resource.id));
  const hasSelectedRating = Number.isFinite(selectedRating) && selectedRating > 0;
  const displayRating = hasSelectedRating ? selectedRating : Number(resource.avg_rating || 0);
  const displayValueText = hasSelectedRating
    ? `${displayRating.toFixed(1)} (You)`
    : Number(resource.avg_rating || 0).toFixed(1);
  const uploadKind = resource.metadata?.uploadKind || (resource.file_url?.startsWith('http') ? 'link' : 'file');
  const sourceLabel = uploadKind === 'link' ? 'Link' : 'File';
  const fileLabel = resourcePreviewLabel(resource);
  div.innerHTML = `
    <div class="resource-cover">
      <div class="resource-cover-tag">${resourceTypeLabel(resource)}</div>
      <div class="resource-cover-copy">Uploaded by ${resource.contributor_name}</div>
    </div>
    <strong>${resource.course_code || 'General'} - ${resource.title}</strong>
    <div class="meta resource-rating">${renderStars(displayRating)} <span>${displayValueText}</span></div>
    <div class="meta">${resourceTypeLabel(resource)}</div>
    <div class="meta">By ${resource.contributor_name}</div>
    <div class="meta">${sourceLabel}: ${fileLabel}</div>
    <div class="actions">
      <button data-action="open">Open Resource</button>
      <button data-action="download">Download</button>
      <div class="star-rating" role="group" aria-label="Rate this resource">
        <button type="button" data-rating="1" aria-label="Rate 1 star">★</button>
        <button type="button" data-rating="2" aria-label="Rate 2 stars">★</button>
        <button type="button" data-rating="3" aria-label="Rate 3 stars">★</button>
        <button type="button" data-rating="4" aria-label="Rate 4 stars">★</button>
        <button type="button" data-rating="5" aria-label="Rate 5 stars">★</button>
      </div>
    </div>
  `;

  div.querySelector('[data-action="open"]').addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openResourceDetails(resource.id);
  });

  div.querySelector('[data-action="download"]').addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    await openDownload(resource);
  });

  div.addEventListener('click', () => {
    openResourceDetails(resource.id);
  });

  div.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openResourceDetails(resource.id);
    }
  });

  const starRatingEl = div.querySelector('.star-rating');
  starRatingEl.addEventListener('click', (event) => {
    event.stopPropagation();
  });
  starRatingEl.addEventListener('keydown', (event) => {
    event.stopPropagation();
  });

  wireStarPreview(starRatingEl, resource.id);

  return div;
}

async function loadResources() {
  const list = document.getElementById('resourceList');
  showSkeletonList(list, 4);
  suggestedCarousel.innerHTML = '';
  showSkeletonList(suggestedCarousel, 2);

  try {
    const search = resourceSearch.value.trim();
    const params = new URLSearchParams();

    if (search) {
      params.set('q', search);
    }
    if (getActiveFilter()) {
      params.set('resourceType', selectedType);
    }

    const query = params.toString();
    const data = await api(query ? `/resources?${query}` : '/resources');
    const filteredResources = data.resources.filter(matchesPopupFilters);
    const suggestions = [...filteredResources]
      .sort((a, b) => Number(b.avg_rating || 0) - Number(a.avg_rating || 0) || Number(b.rating_count || 0) - Number(a.rating_count || 0) || new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8);

    if (suggestions.length) {
      suggestions.forEach((resource) => suggestedCarousel.appendChild(renderSuggestedCard(resource)));
    } else {
      suggestedCarousel.innerHTML = '<div class="empty-state">No suggestions yet. Upload or rate resources to populate this feed.</div>';
    }

    allVisibleResources = filteredResources;
    renderResourcesSection();
  } catch (error) {
    list.innerHTML = `<div class="empty-state">Unable to load resources: ${error.message}</div>`;
    const btn = ensureLoadMoreButton();
    btn.classList.add('hidden');
  }
}

uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setUploadMessage('');

  const formData = new FormData(uploadForm);
  const title = String(formData.get('title') || '').trim();
  const resourceType = String(formData.get('resourceType') || '').trim();
  const resourceFile = formData.get('resourceFile');
  const resourceLink = String(formData.get('resourceLink') || '').trim();

  if (title.length < 4) {
    setUploadMessage('Title should be at least 4 characters long.');
    return;
  }

  if (!resourceType) {
    setUploadMessage('Please select a resource type.');
    return;
  }

  if (resourceLink && !/^https?:\/\//i.test(resourceLink)) {
    setUploadMessage('Resource link must start with http:// or https://');
    return;
  }

  if (!resourceFile || resourceFile.size === 0) {
    formData.delete('resourceFile');
  }

  if (!resourceLink) {
    formData.delete('resourceLink');
  }

  if (!formData.get('resourceFile') && !formData.get('resourceLink')) {
    setUploadMessage('Add a file or a resource link before publishing.');
    return;
  }

  try {
    const response = await fetch('/resources/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getToken()}`
      },
      body: formData
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.message || 'Upload failed');
    }

    setUploadMessage('Resource published. You earned 15 Learning Points.', true);
    showToast('Resource published successfully.', true);
    uploadForm.reset();
    visibleResourceCount = RESOURCE_PAGE_SIZE;
    await loadResources();
  } catch (error) {
    setUploadMessage(error.message);
  }
});

resourceFilterBtn.addEventListener('click', loadResources);
filterPopupBtn.addEventListener('click', () => {
  openFilterModal();
});
closeFilterModalBtn.addEventListener('click', () => {
  closeFilterModal();
});
resourceFilterModal.addEventListener('click', (event) => {
  if (event.target === resourceFilterModal) {
    closeFilterModal();
  }
});
applyFilterBtn.addEventListener('click', async () => {
  syncFilterStateFromInputs();
  closeFilterModal();
  visibleResourceCount = RESOURCE_PAGE_SIZE;
  await loadResources();
});
resetFilterBtn.addEventListener('click', async () => {
  resetPopupFilters();
  visibleResourceCount = RESOURCE_PAGE_SIZE;
  await loadResources();
});
minRatingFilter.addEventListener('input', handleMinRatingInput);
maxRatingFilter.addEventListener('input', handleMaxRatingInput);
updateRatingRangeUI();
resourceSearch.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    visibleResourceCount = RESOURCE_PAGE_SIZE;
    loadResources();
  }
});

resourceSearch.addEventListener(
  'input',
  debounce(() => {
    visibleResourceCount = RESOURCE_PAGE_SIZE;
    loadResources();
  }, 350)
);

typeChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    typeChips.forEach((c) => c.classList.remove('chip-active'));
    chip.classList.add('chip-active');
    selectedType = chip.dataset.type || '';
    visibleResourceCount = RESOURCE_PAGE_SIZE;
    loadResources();
  });
});

loadResources();
