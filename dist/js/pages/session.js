import { api, getUser, requireSession, setMessage } from '../api.js';
import { mountNav } from '../nav.js';

const user = requireSession();
mountNav('session');

const availabilityForm = document.getElementById('availabilityForm');
const bookingForm = document.getElementById('bookingForm');
const bookingCourseCodes = document.getElementById('bookingCourseCodes');
const bookingList = document.getElementById('bookingList');
const recentTutorsCard = document.getElementById('recentTutorsCard');
const recentTutorsList = document.getElementById('recentTutorsList');
const sessionPageTitle = document.getElementById('sessionPageTitle');
let bookingsState = [];
let knownCourseCodes = new Set();
let bookingSubmitInFlight = false;

if (user.role === 'tutor') {
  if (sessionPageTitle) {
    sessionPageTitle.textContent = 'Manage Session';
  }
  availabilityForm.classList.remove('hidden');
} else {
  if (sessionPageTitle) {
    sessionPageTitle.textContent = 'Book a Session';
  }
  bookingForm.classList.remove('hidden');
  recentTutorsCard.classList.remove('hidden');
}

const prefillTutorId = localStorage.getItem('prefillTutorId');
if (prefillTutorId && bookingForm) {
  const tutorIdInput = bookingForm.querySelector('input[name="tutorId"]');
  tutorIdInput.value = prefillTutorId;
  localStorage.removeItem('prefillTutorId');
}

async function loadCourses() {
  if (!bookingCourseCodes) {
    return;
  }

  try {
    const data = await api('/courses');
    const courses = Array.isArray(data.courses) ? data.courses : [];

    knownCourseCodes = new Set(
      courses
        .map((course) => String(course.code || '').trim().toUpperCase())
        .filter(Boolean)
    );

    bookingCourseCodes.innerHTML = courses
      .map((course) => {
        const code = String(course.code || '').trim().toUpperCase();
        const name = String(course.name || '').trim();
        return `<option value="${code}">${code}${name ? ` - ${name}` : ''}</option>`;
      })
      .join('');
  } catch (error) {
    bookingCourseCodes.innerHTML = '';
    knownCourseCodes = new Set();
  }
}

availabilityForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('sessionMessage', '');
  const data = new FormData(availabilityForm);

  try {
    await api('/availability', 'POST', {
      courseCode: data.get('courseCode') || null,
      dayOfWeek: data.get('dayOfWeek'),
      startTime: data.get('startTime'),
      endTime: data.get('endTime')
    });
    setMessage('sessionMessage', 'Availability updated.', true);
    availabilityForm.reset();
  } catch (error) {
    setMessage('sessionMessage', error.message);
  }
});

bookingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('sessionMessage', '');
  if (bookingSubmitInFlight) {
    return;
  }

  const data = new FormData(bookingForm);
  const tutorId = String(data.get('tutorId') || '').trim();
  const sessionTime = String(data.get('sessionTime') || '').trim();
  const courseCodeRaw = String(data.get('courseCode') || '').trim();
  const courseCode = courseCodeRaw ? courseCodeRaw.toUpperCase() : null;

  if (!tutorId || !sessionTime) {
    setMessage('sessionMessage', 'Tutor ID and session time are required.');
    return;
  }

  if (new Date(sessionTime).getTime() <= Date.now()) {
    setMessage('sessionMessage', 'Session time must be in the future.');
    return;
  }

  const submitBtn = bookingForm.querySelector('button[type="submit"]');
  bookingSubmitInFlight = true;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.dataset.originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
  }

  try {
    await api('/bookings', 'POST', {
      tutorId,
      courseCode,
      sessionTime
    });
    setMessage('sessionMessage', 'Booking request sent.', true);
    bookingForm.reset();
    loadBookings();
  } catch (error) {
    setMessage('sessionMessage', error.message);
  } finally {
    bookingSubmitInFlight = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = submitBtn.dataset.originalText || 'Book Session';
      delete submitBtn.dataset.originalText;
    }
  }
});

function buildActionButton(label, handler) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', handler);
  return button;
}

function showSkeletonList(container, count = 3) {
  container.innerHTML = '';
  for (let i = 0; i < count; i += 1) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-item';
    container.appendChild(skeleton);
  }
}

function tutorPreviewCard(tutor) {
  const div = document.createElement('div');
  div.className = 'item';

  const slots = Array.isArray(tutor.availability) ? tutor.availability : [];
  const firstSlot = slots[0]
    ? `${slots[0].dayOfWeek} ${slots[0].startTime}-${slots[0].endTime}`
    : 'No time slot yet';

  div.innerHTML = `
    <strong>${tutor.fullName || tutor.full_name}</strong>
    <div class="meta">${firstSlot}</div>
    <div class="actions"><button type="button">Use this tutor</button></div>
  `;

  div.querySelector('button').addEventListener('click', () => {
    const tutorIdInput = bookingForm.querySelector('input[name="tutorId"]');
    tutorIdInput.value = tutor.id;
  });

  return div;
}

async function loadRecentTutors() {
  if (user.role === 'tutor') {
    return;
  }

  showSkeletonList(recentTutorsList, 2);
  try {
    const data = await api('/tutors');
    if (!data.tutors.length) {
      recentTutorsList.innerHTML = '<div class="empty-state">No tutors available now.</div>';
      return;
    }

    data.tutors.slice(0, 5).forEach((tutor) => {
      recentTutorsList.appendChild(tutorPreviewCard(tutor));
    });
  } catch (error) {
    recentTutorsList.innerHTML = `<div class="empty-state">Unable to load tutors: ${error.message}</div>`;
  }
}

function bookingCard(booking) {
  const div = document.createElement('div');
  div.className = 'item';
  const partner = user.role === 'tutor' ? booking.tutee_name : booking.tutor_name;

  div.innerHTML = `
    <strong>#${booking.id} ${booking.status.toUpperCase()}</strong>
    <div class="meta">With: ${partner}</div>
    <div class="meta">Time: ${new Date(booking.session_time).toLocaleString()}</div>
    <div class="meta">Course: ${booking.course_code || 'N/A'}</div>
    <div class="actions"></div>
  `;

  const actions = div.querySelector('.actions');

  const runOptimistic = async (nextStatus, requestFn) => {
    const previousStatus = booking.status;
    booking.status = nextStatus;
    renderBookingState();

    try {
      await requestFn();
      await loadBookings();
    } catch (error) {
      booking.status = previousStatus;
      renderBookingState();
      setMessage('sessionMessage', error.message || 'Action failed.');
    }
  };

  if (user.role === 'tutor' && booking.status === 'pending') {
    actions.appendChild(
      buildActionButton('Accept', async () => {
        await runOptimistic('accepted', () =>
          api(`/bookings/${booking.id}/decision`, 'POST', { decision: 'accepted' })
        );
      })
    );
    actions.appendChild(
      buildActionButton('Reject', async () => {
        await runOptimistic('rejected', () =>
          api(`/bookings/${booking.id}/decision`, 'POST', { decision: 'rejected' })
        );
      })
    );
  }

  if (user.role === 'tutor' && booking.status === 'accepted') {
    actions.appendChild(
      buildActionButton('Complete', async () => {
        await runOptimistic('completed', () => api(`/bookings/${booking.id}/complete`, 'POST'));
      })
    );
  }

  if (
    (user.role === 'tutee' || user.role === 'tutor') &&
    ['pending', 'accepted'].includes(booking.status)
  ) {
    actions.appendChild(
      buildActionButton('Cancel', async () => {
        await runOptimistic('cancelled', () => api(`/bookings/${booking.id}/cancel`, 'POST'));
      })
    );
  }

  return div;
}

function renderBookingState() {
  let counter = document.getElementById('bookingCounter');
  if (!counter) {
    counter = document.createElement('p');
    counter.id = 'bookingCounter';
    counter.className = 'meta';
    bookingList.insertAdjacentElement('beforebegin', counter);
  }

  bookingList.innerHTML = '';

  if (!bookingsState.length) {
    bookingList.innerHTML = '<div class="empty-state">No session requests yet. Create one from the booking form above.</div>';
    counter.textContent = 'Showing 0 of 0 sessions';
    return;
  }

  counter.textContent = `Showing ${bookingsState.length} of ${bookingsState.length} sessions`;
  bookingsState.forEach((booking) => bookingList.appendChild(bookingCard(booking)));
}

async function loadBookings() {
  showSkeletonList(bookingList, 3);

  try {
    const data = await api('/bookings/inbox');
    bookingsState = Array.isArray(data.bookings) ? data.bookings : [];
    renderBookingState();
  } catch (error) {
    bookingList.innerHTML = `<div class="empty-state">Unable to load sessions: ${error.message}</div>`;
  }
}

loadBookings();
loadRecentTutors();
loadCourses();
