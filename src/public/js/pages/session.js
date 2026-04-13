import { api, getUser, requireSession, setMessage } from '../api.js';
import { mountNav } from '../nav.js';

const user = requireSession();
mountNav('session');

const availabilityForm = document.getElementById('availabilityForm');
const bookingForm = document.getElementById('bookingForm');
const bookingList = document.getElementById('bookingList');
const recentTutorsCard = document.getElementById('recentTutorsCard');
const recentTutorsList = document.getElementById('recentTutorsList');

if (user.role === 'tutor') {
  availabilityForm.classList.remove('hidden');
} else {
  bookingForm.classList.remove('hidden');
  recentTutorsCard.classList.remove('hidden');
}

const prefillTutorId = localStorage.getItem('prefillTutorId');
if (prefillTutorId && bookingForm) {
  const tutorIdInput = bookingForm.querySelector('input[name="tutorId"]');
  tutorIdInput.value = prefillTutorId;
  localStorage.removeItem('prefillTutorId');
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
  const data = new FormData(bookingForm);

  try {
    await api('/bookings', 'POST', {
      tutorId: String(data.get('tutorId')).trim(),
      courseCode: data.get('courseCode') || null,
      sessionTime: data.get('sessionTime')
    });
    setMessage('sessionMessage', 'Booking request sent.', true);
    bookingForm.reset();
    loadBookings();
  } catch (error) {
    setMessage('sessionMessage', error.message);
  }
});

function buildActionButton(label, handler) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', handler);
  return button;
}

function tutorPreviewCard(tutor) {
  const div = document.createElement('div');
  div.className = 'item';

  const slots = Array.isArray(tutor.availability) ? tutor.availability : [];
  const firstSlot = slots[0]
    ? `${slots[0].dayOfWeek} ${slots[0].startTime}-${slots[0].endTime}`
    : 'No time slot yet';

  div.innerHTML = `
    <strong>${tutor.full_name}</strong>
    <div class="meta">Matric Number: ${tutor.student_id}</div>
    <div class="meta">${firstSlot}</div>
    <div class="actions"><button type="button">Use Matric ${tutor.student_id}</button></div>
  `;

  div.querySelector('button').addEventListener('click', () => {
    const tutorIdInput = bookingForm.querySelector('input[name="tutorId"]');
    tutorIdInput.value = tutor.student_id;
  });

  return div;
}

async function loadRecentTutors() {
  if (user.role === 'tutor') {
    return;
  }

  recentTutorsList.innerHTML = '';
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

  if (user.role === 'tutor' && booking.status === 'pending') {
    actions.appendChild(
      buildActionButton('Accept', async () => {
        await api(`/bookings/${booking.id}/decision`, 'POST', { decision: 'accepted' });
        loadBookings();
      })
    );
    actions.appendChild(
      buildActionButton('Reject', async () => {
        await api(`/bookings/${booking.id}/decision`, 'POST', { decision: 'rejected' });
        loadBookings();
      })
    );
  }

  if (user.role === 'tutor' && booking.status === 'accepted') {
    actions.appendChild(
      buildActionButton('Complete', async () => {
        await api(`/bookings/${booking.id}/complete`, 'POST');
        loadBookings();
      })
    );
  }

  return div;
}

async function loadBookings() {
  bookingList.innerHTML = '';

  try {
    const data = await api('/bookings/inbox');

    if (!data.bookings.length) {
      bookingList.innerHTML = '<div class="empty-state">No session requests yet.</div>';
      return;
    }

    data.bookings.forEach((booking) => bookingList.appendChild(bookingCard(booking)));
  } catch (error) {
    bookingList.innerHTML = `<div class="empty-state">Unable to load sessions: ${error.message}</div>`;
  }
}

loadBookings();
loadRecentTutors();
