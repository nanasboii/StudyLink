import { api, debounce, requireSession } from '../api.js';
import { mountNav } from '../nav.js';
import { PAGES } from '../routes.js';

requireSession();
mountNav('tutors');

const TUTOR_PAGE_SIZE = 10;
let allTutors = [];
let visibleTutorCount = TUTOR_PAGE_SIZE;

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
    <div class="actions"><button>Use Matric ${tutor.student_id}</button></div>
  `;

  div.querySelector('button').addEventListener('click', () => {
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

loadTutors();
