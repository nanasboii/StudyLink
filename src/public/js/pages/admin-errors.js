import { api, debounce, requireRoleSession, setMessage } from '../api.js';
import { mountNav } from '../nav.js';

requireRoleSession('admin');
mountNav('adminErrors');

const errorList = document.getElementById('errorList');
const errorSearch = document.getElementById('errorSearch');
const refreshBtn = document.getElementById('refreshBtn');
let allLogs = [];

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderLogs() {
  const query = normalizeText(errorSearch.value);
  errorList.innerHTML = '';

  const filtered = allLogs.filter((log) => {
    return (
      normalizeText(log.path).includes(query) ||
      normalizeText(log.method).includes(query) ||
      normalizeText(log.status_code).includes(query) ||
      normalizeText(log.message).includes(query) ||
      normalizeText(log.user_name).includes(query) ||
      normalizeText(log.user_email).includes(query)
    );
  });

  if (!filtered.length) {
    errorList.innerHTML = '<div class="empty-state">No server errors recorded. System is running smoothly.</div>';
    return;
  }

  filtered.forEach((log) => {
    const card = document.createElement('div');
    card.className = 'item';
    const method = escapeHtml(log.method);
    const path = escapeHtml(log.path);
    const status = escapeHtml(log.status_code);
    const message = escapeHtml(log.message);
    const userName = escapeHtml(log.user_name || 'Guest');
    const userEmail = escapeHtml(log.user_email || '');
    const stack = escapeHtml(log.stack || '');

    card.innerHTML = `
      <strong>${method} ${path}</strong>
      <div class="meta">Status: ${status}</div>
      <div class="meta">Message: ${message}</div>
      <div class="meta">User: ${userName}${userEmail ? ` (${userEmail})` : ''}</div>
      <div class="meta">Time: ${new Date(log.created_at).toLocaleString()}</div>
      ${stack ? `<details><summary>Stack trace</summary><pre class="meta" style="white-space: pre-wrap; margin-top: 8px;">${stack}</pre></details>` : ''}
    `;
    errorList.appendChild(card);
  });
}

async function loadLogs() {
  errorList.innerHTML = '<div class="skeleton-item"></div><div class="skeleton-item"></div>';

  try {
    const response = await api('/admin/error-logs');
    allLogs = Array.isArray(response.logs) ? response.logs : [];
    renderLogs();
    setMessage('errorMessage', '', false);
  } catch (error) {
    console.error('Failed to load error logs:', error);
    setMessage('errorMessage', `Error: ${error.message}`);
  }
}

refreshBtn.addEventListener('click', loadLogs);
errorSearch.addEventListener('input', debounce(renderLogs, 250));

loadLogs();
