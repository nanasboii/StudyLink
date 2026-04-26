import { api, debounce, requireSession } from '../api.js';
import { mountNav } from '../nav.js';
import { PAGES } from '../routes.js';

requireSession();
mountNav('tutors');

const TUTOR_PAGE_SIZE = 10;
const defaultProfilePicture =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23999'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
let allTutors = [];
let visibleTutorCount = TUTOR_PAGE_SIZE;
let selectedTutorId = '';

const tutorProfilePanel = document.getElementById('tutorProfilePanel');
const tutorProfileName = document.getElementById('tutorProfileName');
const tutorProfilePicture = document.getElementById('tutorProfilePicture');
const tutorProfileRole = document.getElementById('tutorProfileRole');
const tutorProfileMatric = document.getElementById('tutorProfileMatric');
const tutorProfileStats = document.getElementById('tutorProfileStats');
const tutorProfileExpertise = document.getElementById('tutorProfileExpertise');
const tutorProfileAvailability = document.getElementById('tutorProfileAvailability');
const tutorProfileBio = document.getElementById('tutorProfileBio');
const tutorProfileActions = document.getElementById('tutorProfileActions');
const tutorReviewCount = document.getElementById('tutorReviewCount');
const tutorReviewList = document.getElementById('tutorReviewList');
const tutorProfileModal = document.getElementById('tutorProfileModal');

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderStars(rating) {
  const value = Math.max(0, Math.min(5, Number(rating || 0)));
  return '★★★★★'.slice(0, value) + '☆☆☆☆☆'.slice(0, 5 - value);
}

function getFirstAvailabilityText(tutor) {
  const slots = Array.isArray(tutor.availability) ? tutor.availability : [];
  if (!slots.length) {
    return 'No available time set yet';
  }

  const firstSlot = slots[0];
  return `${firstSlot.dayOfWeek} ${firstSlot.startTime}-${firstSlot.endTime}${firstSlot.courseCode ? ` (${firstSlot.courseCode})` : ''}`;
}

function showTutorProfileLoading(tutor) {
  if (!tutorProfilePanel || !tutorProfileModal) {
    return;
  }

  tutorProfileModal.classList.remove('hidden');
  tutorProfileModal.setAttribute('aria-hidden', 'false');
  tutorProfilePanel.classList.remove('hidden');
  tutorProfileName.textContent = tutor ? tutor.full_name : 'Tutor profile';
  tutorProfilePicture.src = defaultProfilePicture;
  tutorProfileRole.textContent = 'Loading profile...';
  tutorProfileMatric.textContent = 'Matric: -';
  tutorProfileStats.textContent = 'Rating: - | Points: -';
  tutorProfileExpertise.textContent = 'Expertise: -';
  tutorProfileAvailability.textContent = 'Availability: -';
  tutorProfileBio.textContent = 'Loading tutor details and reviews...';
  tutorProfileActions.innerHTML = '';
  tutorReviewCount.textContent = 'Loading reviews...';
  tutorReviewList.innerHTML = '<div class="empty-state">Loading reviews...</div>';
}

function renderTutorReviews(reviews) {
  if (!tutorReviewList || !tutorReviewCount) {
    return;
  }

  const list = Array.isArray(reviews) ? reviews : [];
  tutorReviewCount.textContent = `${list.length} review${list.length === 1 ? '' : 's'}`;
  tutorReviewList.innerHTML = '';

  if (!list.length) {
    tutorReviewList.innerHTML = '<div class="empty-state">No reviews left for this tutor yet.</div>';
    return;
  }

  list.forEach((review) => {
    const card = document.createElement('div');
    card.className = 'tutor-review-card';
    const header = document.createElement('div');
    header.className = 'tutor-review-card__top';

    const left = document.createElement('div');
    left.innerHTML = `
      <div class="tutor-review-card__name">${escapeHtml(review.reviewer_name || 'Anonymous')}</div>
      <div class="tutor-review-card__meta">${escapeHtml(review.reviewer_role || 'tutee')} • ${escapeHtml(
        new Date(review.created_at).toLocaleDateString()
      )}</div>
    `;

    const rating = document.createElement('div');
    rating.className = 'tutor-review-card__meta';
    rating.textContent = renderStars(review.rating);

    header.append(left, rating);
    card.appendChild(header);

    if (review.comment) {
      const comment = document.createElement('p');
      comment.className = 'tutor-review-card__comment';
      comment.textContent = review.comment;
      card.appendChild(comment);
    } else {
      const comment = document.createElement('p');
      comment.className = 'tutor-review-card__comment';
      comment.textContent = 'No comment left.';
      card.appendChild(comment);
    }

    tutorReviewList.appendChild(card);
  });
}

function renderTutorProfile(tutor, reviews = []) {
  if (!tutorProfilePanel || !tutorProfileModal) {
    return;
  }

  tutorProfileModal.classList.remove('hidden');
  tutorProfileModal.setAttribute('aria-hidden', 'false');
  tutorProfilePanel.classList.remove('hidden');
  tutorProfileName.textContent = tutor.full_name;
  tutorProfilePicture.src = tutor.profile_picture_url || defaultProfilePicture;
  tutorProfilePicture.alt = `${tutor.full_name} profile picture`;
  tutorProfileRole.textContent = `Tutor • ${tutor.is_verified ? 'Verified' : 'Not verified'}`;
  tutorProfileMatric.textContent = `Matric: ${tutor.student_id}`;
  tutorProfileStats.textContent = `Rating: ${Number(tutor.rating || 0).toFixed(2)} | Points: ${tutor.total_points || 0}`;
  tutorProfileExpertise.textContent = `Expertise: ${Array.isArray(tutor.expertise) && tutor.expertise.length ? tutor.expertise.join(', ') : 'Not listed'}`;
  tutorProfileAvailability.textContent = `Availability: ${getFirstAvailabilityText(tutor)}`;
  tutorProfileBio.textContent = tutor.bio ? tutor.bio : 'No bio provided.';

  tutorProfileActions.innerHTML = '';

  const bookBtn = document.createElement('button');
  bookBtn.type = 'button';
  bookBtn.className = 'chip';
  bookBtn.textContent = 'Book this tutor';
  bookBtn.addEventListener('click', () => {
    localStorage.setItem('prefillTutorId', String(tutor.student_id));
    window.location.href = PAGES.session;
  });
  tutorProfileActions.appendChild(bookBtn);

  const matricBtn = document.createElement('button');
  matricBtn.type = 'button';
  matricBtn.className = 'chip';
  matricBtn.textContent = `Use Matric ${tutor.student_id}`;
  matricBtn.addEventListener('click', () => {
    localStorage.setItem('prefillTutorId', String(tutor.student_id));
    window.location.href = PAGES.session;
  });
  tutorProfileActions.appendChild(matricBtn);

  renderTutorReviews(reviews);
}

async function loadTutorProfile(tutor) {
  if (!tutorProfilePanel || !tutorProfileModal) {
    return;
  }

  selectedTutorId = String(tutor.id || '');
  showTutorProfileLoading(tutor);

  try {
    const [profileResponse, reviewsResponse] = await Promise.all([
      api(`/users/${encodeURIComponent(selectedTutorId)}/public`),
      api(`/users/${encodeURIComponent(selectedTutorId)}/public/reviews`)
    ]);

    renderTutorProfile(profileResponse.user || tutor, reviewsResponse.reviews || []);
  } catch (error) {
    tutorProfileRole.textContent = 'Unable to load tutor details.';
    tutorProfileBio.textContent = error.message;
    tutorReviewCount.textContent = '0 reviews';
    tutorReviewList.innerHTML = `<div class="empty-state">Unable to load reviews: ${escapeHtml(error.message)}</div>`;
  }
}

function closeTutorProfile() {
  if (!tutorProfileModal) {
    return;
  }

  tutorProfileModal.classList.add('hidden');
  tutorProfileModal.setAttribute('aria-hidden', 'true');
  selectedTutorId = '';
}

function showSkeletonList(container, count = 3) {
  container.innerHTML = '';
  for (let i = 0; i < count; i += 1) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-item';
    container.appendChild(skeleton);
  }
}

function ensureLoadMoreButton(list) {
  let button = document.getElementById('tutorLoadMoreBtn');
  if (!button) {
    button = document.createElement('button');
    button.id = 'tutorLoadMoreBtn';
    button.type = 'button';
    button.className = 'chip';
    button.textContent = 'Load more tutors';
    button.addEventListener('click', () => {
      visibleTutorCount += TUTOR_PAGE_SIZE;
      renderTutors(list);
    });
    list.insertAdjacentElement('afterend', button);
  }
  return button;
}

function ensureTutorCounter(list) {
  let counter = document.getElementById('tutorCounter');
  if (!counter) {
    counter = document.createElement('p');
    counter.id = 'tutorCounter';
    counter.className = 'meta';
    list.insertAdjacentElement('beforebegin', counter);
  }
  return counter;
}

function renderTutors(list) {
  const counter = ensureTutorCounter(list);
  list.innerHTML = '';

  if (!allTutors.length) {
    list.innerHTML = '<div class="empty-state">No tutors match this course yet. <button id="clearTutorFilterBtn" type="button" class="chip">Clear filter</button></div>';
    counter.textContent = 'Showing 0 of 0 tutors';
    const clearFilterBtn = document.getElementById('clearTutorFilterBtn');
    if (clearFilterBtn) {
      clearFilterBtn.addEventListener('click', () => {
        document.getElementById('tutorCourse').value = '';
        visibleTutorCount = TUTOR_PAGE_SIZE;
        loadTutors();
      });
    }
    ensureLoadMoreButton(list).classList.add('hidden');
    return;
  }

  allTutors.slice(0, visibleTutorCount).forEach((tutor) => list.appendChild(tutorCard(tutor)));
  counter.textContent = `Showing ${Math.min(visibleTutorCount, allTutors.length)} of ${allTutors.length} tutors`;
  const loadMoreBtn = ensureLoadMoreButton(list);
  if (visibleTutorCount < allTutors.length) {
    loadMoreBtn.classList.remove('hidden');
  } else {
    loadMoreBtn.classList.add('hidden');
  }
}

function tutorCard(tutor) {
  const slots = Array.isArray(tutor.availability) ? tutor.availability : [];
  const expertise = Array.isArray(tutor.expertise)
    ? tutor.expertise.filter((item) => String(item).trim())
    : [];
  const previewSlots = slots.slice(0, 3);
  const slotText = previewSlots.length
    ? previewSlots
        .map(
          (slot) =>
            `${slot.dayOfWeek} ${slot.startTime}-${slot.endTime}${
              slot.courseCode ? ` (${slot.courseCode})` : ''
            }`
        )
        .join(' | ')
    : 'No available time set yet';

  const div = document.createElement('div');
  div.className = 'item';
  div.innerHTML = `
    <strong>${tutor.full_name}</strong>
    <div class="meta"><b>Matric Number:</b> ${tutor.student_id}</div>
    <div class="meta">Rating: ${tutor.rating} | Points: ${tutor.total_points}</div>
    <div class="meta">Expertise: ${expertise.length ? expertise.join(', ') : 'Not listed'}</div>
    <div class="meta">Availability: ${slotText}</div>
    ${slots.length > 3 ? `<div class="meta">+${slots.length - 3} more time slots</div>` : ''}
    <div class="actions"><button type="button">Book this tutor</button></div>
  `;

  const openProfile = () => {
    loadTutorProfile(tutor);
    div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  div.addEventListener('click', (event) => {
    if (event.target.closest('button')) {
      return;
    }
    openProfile();
  });

  div.querySelector('button').addEventListener('click', (event) => {
    event.stopPropagation();
    localStorage.setItem('prefillTutorId', String(tutor.student_id));
    window.location.href = PAGES.session;
  });

  return div;
}

async function loadTutors() {
  const list = document.getElementById('tutorList');
  showSkeletonList(list, 3);

  try {
    const code = document.getElementById('tutorCourse').value.trim();
    const query = code ? `?courseCode=${encodeURIComponent(code)}` : '';
    const data = await api(`/tutors${query}`);

    allTutors = data.tutors || [];
    renderTutors(list);
  } catch (error) {
    list.innerHTML = `<div class="empty-state">Unable to load tutors: ${error.message}</div>`;
    ensureLoadMoreButton(list).classList.add('hidden');
  }
}

document.getElementById('searchTutorBtn').addEventListener('click', () => {
  visibleTutorCount = TUTOR_PAGE_SIZE;
  loadTutors();
});
document.getElementById('tutorCourse').addEventListener(
  'input',
  debounce(() => {
    visibleTutorCount = TUTOR_PAGE_SIZE;
    loadTutors();
  }, 350)
);

document.getElementById('tutorCourse').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    visibleTutorCount = TUTOR_PAGE_SIZE;
    loadTutors();
  }
});

const closeTutorProfileBtn = document.getElementById('closeTutorProfileBtn');
if (closeTutorProfileBtn) {
  closeTutorProfileBtn.addEventListener('click', closeTutorProfile);
}

if (tutorProfileModal) {
  tutorProfileModal.addEventListener('click', (event) => {
    if (event.target && event.target.hasAttribute('data-close-tutor-profile')) {
      closeTutorProfile();
    }
  });
}

loadTutors();
