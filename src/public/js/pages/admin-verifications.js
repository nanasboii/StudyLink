import { api, requireRoleSession, setMessage } from '../api.js';
import { mountNav } from '../nav.js';

requireRoleSession('admin');

mountNav('adminVerifications');

const list = document.getElementById('applicationsList');

function toTitleCase(value) {
  return String(value || '')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function takeDecision(id, decision) {
  setMessage('adminMessage', '');
  try {
    await api(`/admin/tutor-verifications/${id}/decision`, 'POST', { decision });
    setMessage('adminMessage', `Application #${id} marked as ${decision}.`, true);
    await loadApplications();
  } catch (error) {
    setMessage('adminMessage', error.message);
  }
}

function renderCard(app) {
  const card = document.createElement('div');
  card.className = 'item';
  card.innerHTML = `
    <strong>#${app.id} - ${app.tutor_name}</strong>
    <div class="meta">Email: ${app.tutor_email}</div>
    <div class="meta">Course: ${app.course_code || 'N/A'}</div>
    <div class="meta">Status: ${toTitleCase(app.status)}</div>
    <div class="meta">
      File: <a href="${app.proof_url}" target="_blank" rel="noopener noreferrer">Open uploaded proof</a>
    </div>
    <div class="actions"></div>
  `;

  const actions = card.querySelector('.actions');

  if (app.status === 'pending') {
    const approveBtn = document.createElement('button');
    approveBtn.type = 'button';
    approveBtn.textContent = 'Approve';
    approveBtn.addEventListener('click', () => takeDecision(app.id, 'approved'));

    const rejectBtn = document.createElement('button');
    rejectBtn.type = 'button';
    rejectBtn.textContent = 'Reject';
    rejectBtn.addEventListener('click', () => takeDecision(app.id, 'rejected'));

    actions.append(approveBtn, rejectBtn);
  }

  return card;
}

async function loadApplications() {
  list.innerHTML = '';

  try {
    const response = await api('/admin/tutor-verifications');
    const applications = response.applications || [];

    if (!applications.length) {
      list.innerHTML = '<div class="empty-state">No verification applications yet.</div>';
      return;
    }

    applications.forEach((app) => list.appendChild(renderCard(app)));
  } catch (error) {
    list.innerHTML = `<div class="empty-state">Unable to load applications: ${error.message}</div>`;
  }
}

document.getElementById('refreshBtn').addEventListener('click', loadApplications);

loadApplications();
