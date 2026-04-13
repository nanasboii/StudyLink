import { api, requireSession, setMessage } from '../api.js';
import { mountNav } from '../nav.js';

const user = requireSession();
mountNav('review');

const form = document.getElementById('reviewForm');
const completedBookingsList = document.getElementById('completedBookingsList');

const reviewTargetLabel = user.role === 'tutor' ? 'Review Tutee' : 'Review Tutor';
const pageTitle = document.querySelector('h2');
const tipText = document.querySelector('#reviewForm .meta');

pageTitle.textContent = reviewTargetLabel;
tipText.textContent =
  user.role === 'tutor'
    ? 'Tip: Select a completed booking below to review the tutee.'
    : 'Tip: Select a completed booking below to review the tutor.';

function completedBookingCard(booking) {
  const div = document.createElement('div');
  div.className = 'item';
  const partnerName =
    user.role === 'tutor' ? booking.tutee_name || 'Unknown' : booking.tutor_name || 'Unknown';

  div.innerHTML = `
    <strong>#${booking.id} COMPLETED</strong>
    <div class="meta">With: ${partnerName}</div>
    <div class="meta">Time: ${new Date(booking.session_time).toLocaleString()}</div>
    <div class="meta">Course: ${booking.course_code || 'N/A'}</div>
    <div class="actions"><button type="button">Use Booking ID ${booking.id}</button></div>
  `;

  div.querySelector('button').addEventListener('click', () => {
    const bookingIdInput = form.querySelector('input[name="bookingId"]');
    bookingIdInput.value = booking.id;
    bookingIdInput.focus();
  });

  return div;
}

async function loadCompletedBookings() {
  completedBookingsList.innerHTML = '';

  try {
    const response = await api('/bookings/inbox');
    const completed = (response.bookings || []).filter((booking) => booking.status === 'completed');

    if (!completed.length) {
      completedBookingsList.innerHTML =
        `<div class="empty-state">No completed sessions available to ${reviewTargetLabel.toLowerCase()} yet.</div>`;
      return;
    }

    completed.forEach((booking) => {
      completedBookingsList.appendChild(completedBookingCard(booking));
    });
  } catch (error) {
    completedBookingsList.innerHTML = `<div class="empty-state">Unable to load completed sessions: ${error.message}</div>`;
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('reviewMessage', '');
  const data = new FormData(form);

  try {
    await api(`/bookings/${data.get('bookingId')}/review`, 'POST', {
      rating: Number(data.get('rating')),
      comment: data.get('comment')
    });
    setMessage('reviewMessage', 'Review submitted.', true);
    form.reset();
    await loadCompletedBookings();
  } catch (error) {
    setMessage('reviewMessage', error.message);
  }
});

document.getElementById('refreshCompletedBtn').addEventListener('click', loadCompletedBookings);

loadCompletedBookings();
