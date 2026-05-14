import { api, requireSession } from '../api.js';
import { mountNav } from '../nav.js';
import { PAGES } from '../routes.js';

const user = requireSession();
mountNav('leaderboards');

const leaderboardTabs = document.getElementById('leaderboardTabs');
const leaderboardList = document.getElementById('leaderboardList');
const leaderboardSummary = document.getElementById('leaderboardSummary');

const BOARD_TYPES = ['overall', 'tutor', 'tutee'];
let activeBoard = 'overall';
let leaderboardState = [];

function roleLabel(role) {
  const value = String(role || 'tutee').toLowerCase();
  if (value === 'admin') return 'Admin';
  if (value === 'tutor') return 'Tutor';
  return 'Tutee';
}

function roleClass(role) {
  const value = String(role || 'tutee').toLowerCase();
  if (value === 'admin' || value === 'tutor' || value === 'tutee') {
    return value;
  }
  return 'tutee';
}

function formatSummary(totalEntries) {
  const now = new Date();
  return `${totalEntries} ranked users • Updated ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function boardLabel(board) {
  if (board === 'tutor') return 'Top Tutors';
  if (board === 'tutee') return 'Top Tutees';
  return 'Overall Ranking';
}

function getBoardEntries(board) {
  if (board === 'tutor') {
    return leaderboardState.filter((entry) => String(entry.role).toLowerCase() === 'tutor');
  }
  if (board === 'tutee') {
    return leaderboardState.filter((entry) => String(entry.role).toLowerCase() === 'tutee');
  }
  return leaderboardState;
}

function normalizeText(value, fallback = '-') {
  const text = String(value || '').trim();
  return text || fallback;
}

function openPublicProfile(entry) {
  const userId = normalizeText(entry.id, '');
  if (!userId) {
    return;
  }

  window.location.href = `${PAGES.publicProfile}?userId=${encodeURIComponent(userId)}`;
}

function setActiveBoard(board) {
  activeBoard = BOARD_TYPES.includes(board) ? board : 'overall';

  if (leaderboardTabs) {
    leaderboardTabs.querySelectorAll('[data-board]').forEach((btn) => {
      const isActive = btn.dataset.board === activeBoard;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  renderLeaderboard();
}

function buildActionButton(label, className = '') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `leaderboard-action-btn ${className}`.trim();
  button.textContent = label;
  return button;
}

function renderLeaderboard() {
  if (!leaderboardList) {
    return;
  }

  leaderboardList.innerHTML = '';
  const entries = getBoardEntries(activeBoard);

  if (!entries.length) {
    leaderboardList.innerHTML = `<div class="empty-state">No users found for ${boardLabel(activeBoard)} yet.</div>`;
    if (leaderboardSummary) {
      leaderboardSummary.textContent = `${boardLabel(activeBoard)} • 0 ranked users`;
    }
    return;
  }

  if (leaderboardSummary) {
    leaderboardSummary.textContent = `${boardLabel(activeBoard)} • ${formatSummary(entries.length)}`;
  }

  entries.forEach((entry, index) => {
    const div = document.createElement('div');
    const rank = index + 1;
    const rankClass = rank <= 3 ? ` rank-${rank}` : ' rank-other';
    const role = roleClass(entry.role);
    div.className = `item leaderboard-item${rankClass}`;
    div.innerHTML = `
      <div class="leaderboard-rank">#${rank}</div>
      <div class="leaderboard-main">
        <div class="leaderboard-topline">
          <strong>${entry.fullName || entry.full_name}</strong>
          <span class="role-pill role-${role}">${roleLabel(entry.role)}</span>
        </div>
        <div class="leaderboard-stats">
          <span class="stat-chip"><b>Achievements:</b> ${entry.totalAchievements || entry.total_achievements}</span>
          <span class="stat-chip"><b>Points:</b> ${entry.totalPoints || entry.total_points}</span>
          <span class="stat-chip"><b>Rating:</b> ${Number(entry.rating || 0).toFixed(2)}</span>
          <span class="stat-chip"><b>Reviews:</b> ${entry.reviewsReceived || entry.reviews_received}</span>
        </div>
        <div class="leaderboard-actions"></div>
      </div>
    `;

    const actions = div.querySelector('.leaderboard-actions');
    const profileBtn = buildActionButton('View Public Profile');
    profileBtn.addEventListener('click', () => {
      openPublicProfile(entry);
    });
    actions.appendChild(profileBtn);

    if (user?.role === 'tutee' && role === 'tutor') {
      const bookBtn = buildActionButton('Book a Session', 'is-primary');
      bookBtn.addEventListener('click', () => {
        localStorage.setItem('prefillTutorId', normalizeText(entry.id, ''));
        window.location.href = PAGES.session;
      });
      actions.appendChild(bookBtn);
    }

    leaderboardList.appendChild(div);
  });
}

async function loadLeaderboard() {
  if (leaderboardList) {
    leaderboardList.innerHTML = '';
  }
  if (leaderboardSummary) {
    leaderboardSummary.textContent = 'Loading current standings...';
  }

  try {
    const data = await api('/leaderboard');
    leaderboardState = Array.isArray(data.leaderboard) ? data.leaderboard : [];

    if (!leaderboardState.length) {
      if (leaderboardList) {
        leaderboardList.innerHTML = '<div class="empty-state">Leaderboard is empty for now.</div>';
      }
      if (leaderboardSummary) {
        leaderboardSummary.textContent = 'No rankings available yet.';
      }
      return;
    }

    renderLeaderboard();
  } catch (error) {
    if (leaderboardList) {
      leaderboardList.innerHTML = `<div class="empty-state">Unable to load leaderboard: ${error.message}</div>`;
    }
    if (leaderboardSummary) {
      leaderboardSummary.textContent = 'Unable to refresh leaderboard right now.';
    }
  }
}

if (leaderboardTabs) {
  leaderboardTabs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-board]');
    if (!button || !leaderboardTabs.contains(button)) {
      return;
    }
    setActiveBoard(button.dataset.board);
  });
}

document.getElementById('refreshBtn').addEventListener('click', loadLeaderboard);
loadLeaderboard();
