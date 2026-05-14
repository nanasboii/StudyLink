import { api, debounce, getToken, requireSession, showToast } from '../api.js';
import { mountNav } from '../nav.js';
import { PAGES } from '../routes.js';

const currentUser = requireSession();
mountNav('resources');

let selectedType = '';
const resourceRatings = new Map();
const RESOURCE_PAGE_SIZE = 12;
let allVisibleResources = [];
let visibleResourceCount = RESOURCE_PAGE_SIZE;
const suggestedCarousel = document.getElementById('suggestedCarousel');
const suggestedSection = document.querySelector('.suggested-section');
const newestCarousel = document.getElementById('newestCarousel');
const newestSection = document.getElementById('newestSection');
const topRatedCarousel = document.getElementById('topRatedCarousel');
const topRatedSection = document.getElementById('topRatedSection');
const uploadModal = document.getElementById('uploadModal');
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
const resourcesHeroTitle = document.getElementById('resourcesHeroTitle');
const resourcesHeroText = document.getElementById('resourcesHeroText');
const heroResourceCount = document.getElementById('heroResourceCount');
const heroTopPickCount = document.getElementById('heroTopPickCount');
const heroLatestCount = document.getElementById('heroLatestCount');
const filterState = {
  resourceTypes: new Set(),
  sources: new Set(),
  minRating: 0,
  maxRating: 5
};

function normalizeText(value, fallback = '-') {
  const text = String(value || '').trim();
  return text || fallback;
}

function firstNameFromUser(user) {
  const name = normalizeText(user?.fullName || user?.full_name || user?.username || user?.name, '');
  return name ? name.split(/\s+/)[0] : 'there';
}

function formatFriendlyDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function resourceVisual(resource) {
  const type = normalizeType(resource.resource_type);
  const uploadKind = resource.metadata?.uploadKind || (resource.file_url?.startsWith('http') ? 'link' : 'file');
  const courseCode = String(resource.course_code || '').trim().toUpperCase();

  if (/^(IT|CS|SE|CT|CN|IS|SW)/.test(courseCode)) {
    return { icon: '&lt;/&gt;', tone: 'code', label: 'Code-ready', copy: 'Built for technical courses' };
  }

  if (uploadKind === 'link' || type === 'link') {
    return { icon: '↗', tone: 'link', label: 'External link', copy: 'Open in a new tab' };
  }

  if (type === 'past-year') {
    return { icon: 'PY', tone: 'exam', label: 'Past year', copy: 'Revision-focused paper set' };
  }

  if (type === 'lecture-note') {
    return { icon: 'LN', tone: 'note', label: 'Lecture note', copy: 'Quick class recap' };
  }

  if (type === 'slides') {
    return { icon: 'SL', tone: 'slides', label: 'Slides', copy: 'Presentation deck' };
  }

  if (type === 'pdf') {
    return { icon: 'PDF', tone: 'pdf', label: 'PDF', copy: 'Readable and ready' };
  }

  if (type === 'archive') {
    return { icon: 'ZIP', tone: 'archive', label: 'Archive', copy: 'Packaged resources' };
  }

  if (type === 'audio' || type === 'video') {
    return { icon: type === 'audio' ? 'AUD' : 'VID', tone: 'media', label: resourceTypeLabel(resource), copy: 'Media resource' };
  }

  if (type === 'picture') {
    return { icon: 'IMG', tone: 'media', label: 'Image', copy: 'Visual reference' };
  }

  return { icon: 'R', tone: 'generic', label: resourceTypeLabel(resource), copy: 'Shared study material' };
}

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
  const visual = resourceVisual(resource);
  card.innerHTML = `
    <div class="suggested-media suggested-media--${visual.tone}">
      <span aria-hidden="true">${visual.icon}</span>
    </div>
    <div class="suggested-body">
      <div class="suggested-type">${visual.label}</div>
      <strong>${normalizeText(resource.title, 'Untitled resource')}</strong>
      <div class="meta">${normalizeText(resource.course_code, 'General')} · ${normalizeText(resource.contributor_name, 'Unknown')}</div>
      <div class="meta rating-line">${renderStars(resource.avg_rating)} <span>${Number(resource.avg_rating || 0).toFixed(1)}</span></div>
    </div>
  `;

  card.addEventListener('click', () => {
    openResourceDetails(resource.id);
  });

  return card;
}

function compactRatingMarkup(resource) {
  const rating = Number(resource.avg_rating || 0);
  return `
    <span class="resource-rating-chip" title="Average rating ${rating.toFixed(1)} out of 5">
      <span class="resource-rating-chip__label">Avg rating</span>
      <span class="resource-rating-chip__value">${rating.toFixed(1)}</span>
      <span class="resource-rating-chip__stars" aria-hidden="true">${renderStars(rating)}</span>
    </span>
  `;
}

function resourceCardMarkup(resource, layout = 'grid') {
  const visual = resourceVisual(resource);
  const title = normalizeText(resource.title, 'Untitled resource');
  const courseCode = normalizeText(resource.course_code, 'General');
  const contributor = normalizeText(resource.contributor_name, 'Unknown contributor');
  const uploadKind = resource.metadata?.uploadKind || (resource.file_url?.startsWith('http') ? 'link' : 'file');
  const sourceLabel = uploadKind === 'link' ? 'Link' : 'File';
  const fileLabel = resourcePreviewLabel(resource);

  return `
    <div class="resource-cover resource-cover--${visual.tone}">
      <div class="resource-cover-icon" aria-hidden="true">${visual.icon}</div>
      <div class="resource-cover-meta">
        <div class="resource-cover-tag">${visual.label}</div>
        <div class="resource-cover-copy">${visual.copy}</div>
      </div>
    </div>
    <div class="resource-card-body resource-card-body--${layout}">
      <div class="resource-card-topline">
        <strong>${courseCode} - ${title}</strong>
        ${compactRatingMarkup(resource)}
      </div>
      <div class="meta resource-meta-line">By ${contributor}</div>
      <div class="meta resource-meta-line">${sourceLabel}: ${fileLabel}</div>
      <div class="actions resource-card-actions">
        <button data-action="open">Open Resource</button>
        <button data-action="download">Download</button>
      </div>
    </div>
  `;
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
  if (!uploadModal) {
    return;
  }
  uploadModal.classList.remove('hidden');
  document.body.classList.add('upload-modal-open');
});

const closeUploadModalBtn = document.getElementById('closeUploadModalBtn');
const closeUploadModal = () => {
  if (!uploadModal) {
    return;
  }
  uploadModal.classList.add('hidden');
  document.body.classList.remove('upload-modal-open');
};

if (closeUploadModalBtn) {
  closeUploadModalBtn.addEventListener('click', closeUploadModal);
}

if (uploadModal) {
  uploadModal.addEventListener('click', (event) => {
    if (event.target === uploadModal || event.target.hasAttribute('data-close-upload-modal')) {
      closeUploadModal();
    }
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && uploadModal && !uploadModal.classList.contains('hidden')) {
    closeUploadModal();
  }
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
  div.innerHTML = resourceCardMarkup(resource, 'grid');

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

  return div;
}

function setHeroContent(visibleCount = 0, topPickCount = 0, latestCount = 0) {
  if (resourcesHeroTitle) {
    resourcesHeroTitle.textContent = `Welcome back, ${firstNameFromUser(currentUser)}`;
  }
  if (resourcesHeroText) {
    resourcesHeroText.textContent = 'Find past papers, lecture notes, slides, and shared links in a glassy workspace built to help you move faster.';
  }
  if (heroResourceCount) {
    heroResourceCount.textContent = String(visibleCount);
  }
  if (heroTopPickCount) {
    heroTopPickCount.textContent = String(topPickCount);
  }
  if (heroLatestCount) {
    heroLatestCount.textContent = String(latestCount);
  }
}

function renderCarousel(target, resources, emptyMessage) {
  if (!target) {
    return false;
  }

  target.innerHTML = '';
  if (!resources.length) {
    target.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
    return false;
  }

  resources.forEach((resource) => target.appendChild(renderSuggestedCard(resource)));
  return true;
}

async function loadResources() {
  const list = document.getElementById('resourceList');
  showSkeletonList(list, 4);
  suggestedCarousel.innerHTML = '';
  if (newestCarousel) newestCarousel.innerHTML = '';
  if (topRatedCarousel) topRatedCarousel.innerHTML = '';

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
    const newestResources = [...filteredResources]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 8);
    const topRatedResources = [...filteredResources]
      .sort((a, b) => Number(b.avg_rating || 0) - Number(a.avg_rating || 0) || Number(b.rating_count || 0) - Number(a.rating_count || 0))
      .slice(0, 8);

    if (suggestedSection) {
      suggestedSection.style.display = suggestions.length ? 'block' : 'none';
    }
    if (newestSection) {
      newestSection.style.display = newestResources.length ? 'block' : 'none';
    }
    if (topRatedSection) {
      topRatedSection.style.display = topRatedResources.length ? 'block' : 'none';
    }

    renderCarousel(suggestedCarousel, suggestions, 'No suggested resources for this search yet.');
    renderCarousel(newestCarousel, newestResources, 'No recent uploads match your search.');
    renderCarousel(topRatedCarousel, topRatedResources, 'No highly rated resources match your search.');

    allVisibleResources = filteredResources;
    setHeroContent(filteredResources.length, topRatedResources.length, newestResources.length);
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
    closeUploadModal();
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
