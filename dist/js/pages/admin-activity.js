import { api, debounce, requireRoleSession, setMessage } from '../api.js';
import { mountNav } from '../nav.js';

requireRoleSession('admin');
mountNav('adminActivity');

const activityList = document.getElementById('activityList');
const activitySearch = document.getElementById('activitySearch');
const refreshBtn = document.getElementById('refreshBtn');
let allLogs = [];

function normalizeText(value) {
  return String(value || '').toLowerCase();
}

function renderLogs() {
  const query = normalizeText(activitySearch.value);
  activityList.innerHTML = '';

  const filtered = allLogs.filter((log) => {
    const target = `${log.target_type || ''} #${log.target_id || ''}`;
    return (
      normalizeText(log.action).includes(query) ||
      normalizeText(log.admin_name).includes(query) ||
      normalizeText(log.admin_email).includes(query) ||
      normalizeText(target).includes(query)
    );
  });

  if (!filtered.length) {
    activityList.innerHTML = '<div class="empty-state">No activity logs found. Admin actions will appear here.</div>';
    return;
  }

  filtered.forEach((log) => {
    const card = document.createElement('div');
    card.className = 'item';
    card.innerHTML = `
      <strong>${log.action}</strong>
      <div class="meta">Admin: ${log.admin_name} (${log.admin_email})</div>
      <div class="meta">Target: ${log.target_type} #${log.target_id || '-'}</div>
      <div class="meta">Time: ${new Date(log.created_at).toLocaleString()}</div>
    `;
    activityList.appendChild(card);
  });
}

async function loadLogs() {
  activityList.innerHTML = '<div class="skeleton-item"></div><div class="skeleton-item"></div>';

  try {
    const response = await api('/admin/activity-logs');
    allLogs = Array.isArray(response.logs) ? response.logs : [];
    renderLogs();
    setMessage('activityMessage', '', false);
  } catch (error) {
    console.error('Failed to load activity logs:', error);
    setMessage('activityMessage', `Error: ${error.message}`);
  }
}

refreshBtn.addEventListener('click', loadLogs);
activitySearch.addEventListener('input', debounce(renderLogs, 250));

loadLogs();
