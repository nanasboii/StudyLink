import { api, requireSession } from '../api.js';
import { mountNav } from '../nav.js';
import { PAGES } from '../routes.js';

requireSession();
mountNav('tutors');

function tutorCard(tutor) {
  const slots = Array.isArray(tutor.availability) ? tutor.availability : [];
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
  list.innerHTML = '';

  try {
    const code = document.getElementById('tutorCourse').value.trim();
    const query = code ? `?courseCode=${encodeURIComponent(code)}` : '';
    const data = await api(`/tutors${query}`);

    if (!data.tutors.length) {
      list.innerHTML = '<div class="empty-state">No tutors match this course yet.</div>';
      return;
    }

    data.tutors.forEach((tutor) => list.appendChild(tutorCard(tutor)));
  } catch (error) {
    list.innerHTML = `<div class="empty-state">Unable to load tutors: ${error.message}</div>`;
  }
}

document.getElementById('searchTutorBtn').addEventListener('click', loadTutors);
loadTutors();
