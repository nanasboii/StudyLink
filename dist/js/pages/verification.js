import { api, getToken, requireSession, setMessage } from '../api.js';
import { mountNav } from '../nav.js';
import { PAGES } from '../routes.js';

const user = requireSession();
if (user && user.role !== 'tutor') {
  window.location.href = PAGES.resources;
}

mountNav('verification');

const form = document.getElementById('verifyForm');
const myApplicationsList = document.getElementById('myApplicationsList');
const verificationNotificationsList = document.getElementById(
  'verificationNotificationsList'
);

function formatStatus(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'approved') {
    return 'Approved';
  }
  if (normalized === 'rejected') {
    return 'Rejected';
  }
  return 'Pending';
}

function renderApplicationItem(application) {
  const item = document.createElement('div');
  item.className = 'item';
  item.innerHTML = `
    <strong>#${application.id} - ${formatStatus(application.status)}</strong>
    <div class="meta">Course: ${application.course_code || 'N/A'}</div>
    <div class="meta">Submitted: ${new Date(application.created_at).toLocaleString()}</div>
    <div class="meta">Reviewed by: ${application.reviewed_by_name || '-'}</div>
    <div class="meta">Proof file: <a href="${application.proof_url}" target="_blank" rel="noopener noreferrer">Open file</a></div>
  `;
  return item;
}

function renderNotificationItem(notification) {
  const item = document.createElement('div');
  item.className = 'item';
  item.innerHTML = `
    <strong>${notification.is_read ? 'Update' : 'New update'}</strong>
    <div class="meta">${notification.message}</div>
    <div class="meta">${new Date(notification.created_at).toLocaleString()}</div>
  `;
  return item;
}

async function loadMyApplications() {
  myApplicationsList.innerHTML = '';

  try {
    const response = await api('/tutor-verifications/me');
    const applications = response.applications || [];

    if (!applications.length) {
      myApplicationsList.innerHTML =
        '<div class="empty-state">No verification applications submitted yet.</div>';
      return;
    }

    applications.slice(0, 5).forEach((application) => {
      myApplicationsList.appendChild(renderApplicationItem(application));
    });
  } catch (error) {
    myApplicationsList.innerHTML = `<div class="empty-state">Unable to load applications: ${error.message}</div>`;
  }
}

async function loadVerificationNotifications() {
  verificationNotificationsList.innerHTML = '';

  try {
    const response = await api('/notifications');
    const notifications = (response.notifications || []).filter((entry) =>
      String(entry.message || '').toLowerCase().includes('verification')
    );

    if (!notifications.length) {
      verificationNotificationsList.innerHTML =
        '<div class="empty-state">No verification notifications yet.</div>';
      return;
    }

    notifications.slice(0, 5).forEach((notification) => {
      verificationNotificationsList.appendChild(renderNotificationItem(notification));
    });
  } catch (error) {
    verificationNotificationsList.innerHTML = `<div class="empty-state">Unable to load notifications: ${error.message}</div>`;
  }
}

async function uploadVerificationFile(file) {
  const token = getToken();
  if (!token) {
    throw new Error('Session expired. Please login again.');
  }

  const payload = new FormData();
  payload.append('document', file);

  const response = await fetch('/uploads/verification', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: payload
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.message || 'Unable to upload file.');
  }

  return result.fileUrl;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage('verifyMessage', '');
  const data = new FormData(form);
  const file = data.get('document');

  if (!(file instanceof File) || !file.name) {
    setMessage('verifyMessage', 'Please choose a file before submitting.');
    return;
  }

  try {
    const proofUrl = await uploadVerificationFile(file);
    const courseCodeRaw = String(data.get('courseCode') || '').trim();

    await api('/tutor-verifications', 'POST', {
      courseCode: courseCodeRaw ? courseCodeRaw.toUpperCase() : null,
      proofUrl
    });
    setMessage('verifyMessage', 'Verification request submitted.', true);
    form.reset();
    await loadMyApplications();
    await loadVerificationNotifications();
  } catch (error) {
    setMessage('verifyMessage', error.message);
  }
});

document
  .getElementById('refreshApplicationsBtn')
  .addEventListener('click', loadMyApplications);

document
  .getElementById('refreshNotificationsBtn')
  .addEventListener('click', loadVerificationNotifications);

loadMyApplications();
loadVerificationNotifications();
