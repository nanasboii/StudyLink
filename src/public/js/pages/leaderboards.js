import { api, requireSession } from '../api.js';
import { mountNav } from '../nav.js';

requireSession();
mountNav('leaderboards');

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
        <div class="meta">Total Achievements: ${entry.total_achievements}</div>
        <div class="meta">Total Points: ${entry.total_points} | Rating: ${Number(entry.rating || 0).toFixed(2)} | Reviews Received: ${entry.reviews_received}</div>
      `;
      list.appendChild(div);
    });
  } catch (error) {
    list.innerHTML = `<div class="empty-state">Unable to load leaderboard: ${error.message}</div>`;
  }
}

document.getElementById('refreshBtn').addEventListener('click', loadLeaderboard);
loadLeaderboard();
