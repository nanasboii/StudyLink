import { api, requireRoleSession, setMessage } from '../api.js';
import { mountNav } from '../nav.js';

requireRoleSession('admin');

mountNav('adminAnalytics');

const refreshBtn = document.getElementById('refreshBtn');

async function loadAnalytics() {
  try {
    const response = await api('/admin/analytics');
    const analytics = response.analytics || {};

    // Update main stats
    document.getElementById('totalUsers').textContent = analytics.totalUsers || 0;
    document.getElementById('verifiedTutors').textContent = analytics.verifiedTutors || 0;
    document.getElementById('activeBookings').textContent = analytics.activeBookings || 0;
    document.getElementById('totalResources').textContent = analytics.totalResources || 0;
    document.getElementById('totalPoints').textContent = analytics.totalPoints || 0;
    document.getElementById('totalBadges').textContent = analytics.totalBadges || 0;

    // Render top contributors
    renderTopContributors(analytics.topContributors || []);

    // Render points distribution
    renderPointsDistribution(analytics.pointsDistribution || {});

    setMessage('adminMessage', '', false);
  } catch (error) {
    setMessage('adminMessage', `Error loading analytics: ${error.message}`);
  }
}

function renderTopContributors(contributors) {
  const container = document.getElementById('topContributors');
  container.innerHTML = '';

  if (!contributors.length) {
    container.innerHTML = '<div class="empty-state">No contributors yet.</div>';
    return;
  }

  contributors.forEach((contributor, index) => {
    const item = document.createElement('div');
    item.className = 'item';
    item.innerHTML = `
      <div>
        <div class="item-label">${index + 1}. ${contributor.name}</div>
        <div style="font-size: 12px; color: #999; margin-top: 2px;">${contributor.email}</div>
      </div>
      <div class="item-value">${contributor.resourceCount} resources</div>
    `;
    container.appendChild(item);
  });
}

function renderPointsDistribution(distribution) {
  const container = document.getElementById('pointsDistribution');
  container.innerHTML = '';

  const sources = [
    { key: 'resource_upload', label: 'Resource Uploads', color: '#43e97b' },
    { key: 'tutor_verification', label: 'Tutor Verification', color: '#f093fb' },
    { key: 'resource_review', label: 'Resource Reviews', color: '#4facfe' },
    { key: 'leaderboard_rank', label: 'Leaderboard Bonus', color: '#fa709a' }
  ];

  const totalPoints = Object.values(distribution).reduce((sum, val) => sum + (val || 0), 0);

  sources.forEach((source) => {
    const points = distribution[source.key] || 0;
    const percentage = totalPoints > 0 ? (points / totalPoints) * 100 : 0;

    const item = document.createElement('div');
    item.className = 'item';
    item.style.flexDirection = 'column';
    item.style.alignItems = 'flex-start';
    item.innerHTML = `
      <div style="width: 100%; display: flex; justify-content: space-between; margin-bottom: 8px;">
        <div class="item-label">${source.label}</div>
        <div class="item-value" style="font-size: 14px;">${points.toLocaleString()} pts</div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${percentage}%; background: ${source.color};"></div>
      </div>
    `;
    container.appendChild(item);
  });
}

refreshBtn.addEventListener('click', loadAnalytics);

loadAnalytics();
