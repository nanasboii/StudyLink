import { api, requireSession, setMessage } from '../api.js';
import { mountNav } from '../nav.js';

requireSession();
mountNav('achievements');

const badgesContainer = document.getElementById('badgesContainer');
const progressContainer = document.getElementById('progressContainer');
const totalPointsEl = document.getElementById('totalPoints');
const unlockedCountEl = document.getElementById('unlockedCount');
const lockedCountEl = document.getElementById('lockedCount');
const nextTargetEl = document.getElementById('nextTarget');

const CONTRIBUTION_HINT = 'Points are earned by uploading resources, completing bookings, leaving reviews, and staying active in StudyLink.';

function normalizeAchievement(item) {
  return {
    code: item.code,
    name: item.name,
    description: item.description,
    pointsRequired: Number(item.points_required || 0),
    iconUrl: item.icon_url,
    isUnlocked: Boolean(item.is_unlocked)
  };
}

function getRemainingPoints(entry, totalPoints) {
  return Math.max(entry.pointsRequired - totalPoints, 0);
}

function getDetailCopy(entry, totalPoints) {
  const remainingPoints = getRemainingPoints(entry, totalPoints);
  const milestoneCopy = entry.isUnlocked
    ? `Unlocked because you reached ${entry.pointsRequired} points.`
    : `${remainingPoints} points left to unlock.`;

  return {
    milestoneCopy,
    progressCopy: entry.isUnlocked
      ? 'Keep going to reach the next milestone and stack up more badges.'
      : CONTRIBUTION_HINT,
    summaryCopy: entry.description || 'No additional description available.'
  };
}

function buildDetailPanel(entry, totalPoints) {
  const detailCopy = getDetailCopy(entry, totalPoints);
  const remainingPoints = getRemainingPoints(entry, totalPoints);

  return `
    <div class="achievement-details" hidden id="details-${entry.code}">
      <p class="achievement-detail-lead">${detailCopy.milestoneCopy}</p>
      <ul class="achievement-detail-list">
        <li><strong>Milestone:</strong> ${entry.pointsRequired} points</li>
        <li><strong>Status:</strong> ${entry.isUnlocked ? 'Unlocked' : `${remainingPoints} points to unlock`}</li>
        <li><strong>Why it matters:</strong> ${detailCopy.summaryCopy}</li>
        <li><strong>How points build up:</strong> ${detailCopy.progressCopy}</li>
      </ul>
    </div>
  `;
}

function renderBadgeCard(entry, totalPoints) {
  return `
    <div class="badge earned achievement-card">
      <button
        type="button"
        class="achievement-toggle achievement-toggle--badge"
        aria-expanded="false"
        aria-controls="details-${entry.code}"
      >
        <img src="${entry.iconUrl}" alt="${entry.name}" class="badge-icon" />
        <h3>${entry.name}</h3>
        <p>${entry.description || ''}</p>
        <p class="badge-points">${entry.pointsRequired} pts</p>
        <span class="achievement-toggle-hint">Tap for more details</span>
      </button>
      ${buildDetailPanel(entry, totalPoints)}
    </div>
  `;
}

function renderProgressCard(entry, totalPoints) {
  const percentage = Math.min(100, Math.round((totalPoints / Math.max(entry.pointsRequired, 1)) * 100));
  const remaining = getRemainingPoints(entry, totalPoints);

  return `
    <div class="progress-item ${entry.isUnlocked ? 'earned' : ''} achievement-card">
      <button
        type="button"
        class="achievement-toggle achievement-toggle--progress"
        aria-expanded="false"
        aria-controls="details-${entry.code}"
      >
        <div class="progress-info">
          <h4>${entry.name}</h4>
          <p>${entry.description || ''}</p>
          <p class="points-needed">${entry.isUnlocked ? 'Unlocked' : `${remaining} points to unlock`}</p>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width: ${percentage}%"></div></div>
        <p class="progress-text">${Math.min(totalPoints, entry.pointsRequired)}/${entry.pointsRequired}</p>
        <span class="achievement-toggle-hint">Tap for more details</span>
      </button>
      ${buildDetailPanel(entry, totalPoints)}
    </div>
  `;
}

function bindExpandableCards(container) {
  container.addEventListener('click', (event) => {
    const toggle = event.target.closest('.achievement-toggle');
    if (!toggle || !container.contains(toggle)) {
      return;
    }

    const card = toggle.closest('.achievement-card');
    const details = card ? card.querySelector('.achievement-details') : null;
    const isExpanded = toggle.getAttribute('aria-expanded') === 'true';

    toggle.setAttribute('aria-expanded', String(!isExpanded));
    if (card) {
      card.classList.toggle('expanded', !isExpanded);
    }
    if (details) {
      details.hidden = isExpanded;
    }
  });
}

function render(achievements, totalPoints) {
  totalPointsEl.textContent = String(totalPoints || 0);

  const unlocked = achievements.filter((entry) => entry.isUnlocked);
  const locked = achievements.filter((entry) => !entry.isUnlocked);
  const nextTarget = locked
    .sort((a, b) => a.pointsRequired - b.pointsRequired)
    .find((entry) => entry.pointsRequired > totalPoints);

  unlockedCountEl.textContent = String(unlocked.length);
  lockedCountEl.textContent = String(locked.length);
  nextTargetEl.textContent = nextTarget
    ? `${nextTarget.name} (${Math.max(nextTarget.pointsRequired - totalPoints, 0)} pts left)`
    : 'All unlocked';

  if (!unlocked.length) {
    badgesContainer.innerHTML = '<div class="empty-state">No unlocked badges yet.</div>';
  } else {
    badgesContainer.innerHTML = unlocked.map((entry) => renderBadgeCard(entry, totalPoints)).join('');
  }

  progressContainer.innerHTML = achievements.map((entry) => renderProgressCard(entry, totalPoints)).join('');
}

bindExpandableCards(badgesContainer);
bindExpandableCards(progressContainer);

async function loadAchievements() {
  try {
    const [meData, achievementData] = await Promise.all([api('/me'), api('/achievements/me')]);
    const totalPoints = Number(meData.user?.totalPoints || 0);
    const achievements = (achievementData.achievements || []).map(normalizeAchievement);
    render(achievements, totalPoints);
  } catch (error) {
    setMessage('achievementsMessage', error.message);
  }
}

loadAchievements();
