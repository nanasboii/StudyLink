import { api, requireSession } from '../api.js';
import { mountNav } from '../nav.js';

requireSession();
mountNav('leaderboards');

const badgeGalleryBtn = document.getElementById('badgeGalleryBtn');
const badgePanel = document.getElementById('badgePanel');
const badgeList = document.getElementById('badgeList');
const badgeDetail = document.getElementById('badgeDetail');

function showBadgeDetail(badge) {
  badgeDetail.classList.remove('hidden');
  badgeDetail.innerHTML = `
    <div class="badge-detail-head">
      <img src="${badge.icon_url || '/ui/assets/badges/helping-hand.svg'}" alt="${badge.name}" />
      <div>
        <h4>${badge.name}</h4>
        <div class="meta">Code: ${badge.code || 'N/A'}</div>
      </div>
    </div>
    <p>${badge.description || 'Achievement unlocked through your contributions.'}</p>
    <div class="badge-detail-grid">
      <div><strong>Required Points</strong><span>${badge.points_required}</span></div>
      <div><strong>Status</strong><span>${badge.is_unlocked ? 'Unlocked' : 'Locked'}</span></div>
    </div>
  `;
}

function badgeCard(badge) {
  const isUnlocked = Boolean(badge.is_unlocked);
  const div = document.createElement('button');
  div.type = 'button';
  div.className = `badge-card${isUnlocked ? '' : ' is-locked'}`;
  div.disabled = !isUnlocked;
  div.innerHTML = `
    <img src="${badge.icon_url || '/ui/assets/badges/helping-hand.svg'}" alt="${badge.name}" />
    <div>
      <strong>${badge.name}</strong>
      <div class="meta">${badge.description || 'Unlocked badge'}</div>
      <div class="meta">${badge.points_required} Learning Points</div>
      <div class="meta">${
        isUnlocked
          ? 'Unlocked. Click to view achievement details.'
          : `Locked until you reach ${badge.points_required} Learning Points`
      }</div>
    </div>
  `;

  if (isUnlocked) {
    div.addEventListener('click', () => {
      showBadgeDetail(badge);
    });
  }

  return div;
}

async function loadBadges() {
  badgeList.innerHTML = '<div class="empty-state">Loading badges...</div>';
  badgeDetail.classList.add('hidden');
  badgeDetail.innerHTML = '';

  try {
    const data = await api('/achievements/me');
    const badges = data.achievements || [];

    badgeList.innerHTML = '';
    badges.forEach((badge) => badgeList.appendChild(badgeCard(badge)));
  } catch (error) {
    badgeList.innerHTML = `<div class="empty-state">Unable to load badges: ${error.message}</div>`;
  }
}

badgeGalleryBtn.addEventListener('click', async () => {
  badgePanel.hidden = !badgePanel.hidden;
  badgeGalleryBtn.textContent = badgePanel.hidden ? 'Badge Gallery' : 'Hide Badges';

  if (!badgePanel.hidden && !badgeList.dataset.loaded) {
    badgeList.dataset.loaded = 'true';
    await loadBadges();
  }
});

badgePanel.hidden = false;
badgeGalleryBtn.textContent = 'Hide Badges';
loadBadges();

async function loadLeaderboard() {
  const list = document.getElementById('leaderboardList');
  list.innerHTML = '';

  try {
    const data = await api('/leaderboard');

    if (!data.leaderboard.length) {
      list.innerHTML = '<div class="empty-state">Leaderboard is empty for now.</div>';
      return;
    }

    data.leaderboard.forEach((entry, index) => {
      const div = document.createElement('div');
      div.className = 'item';
      div.innerHTML = `
        <strong>${index + 1}. ${entry.full_name}</strong>
        <div class="meta">Role: ${entry.role}</div>
        <div class="meta">Rating: ${Number(entry.rating || 0).toFixed(2)} | Reviews Received: ${entry.reviews_received} | Total Points: ${entry.total_points}</div>
      `;
      list.appendChild(div);
    });
  } catch (error) {
    list.innerHTML = `<div class="empty-state">Unable to load leaderboard: ${error.message}</div>`;
  }
}

document.getElementById('refreshBtn').addEventListener('click', loadLeaderboard);
loadLeaderboard();
