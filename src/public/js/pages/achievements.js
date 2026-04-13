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
    badgesContainer.innerHTML = unlocked
      .map(
        (entry) => `
          <div class="badge earned">
            <img src="${entry.iconUrl}" alt="${entry.name}" class="badge-icon" />
            <h3>${entry.name}</h3>
            <p>${entry.description || ''}</p>
            <p class="badge-points">${entry.pointsRequired} pts</p>
          </div>
        `
      )
      .join('');
  }

  progressContainer.innerHTML = achievements
    .map((entry) => {
      const percentage = Math.min(100, Math.round((totalPoints / Math.max(entry.pointsRequired, 1)) * 100));
      const remaining = Math.max(entry.pointsRequired - totalPoints, 0);
      return `
        <div class="progress-item ${entry.isUnlocked ? 'earned' : ''}">
          <div class="progress-info">
            <h4>${entry.name}</h4>
            <p>${entry.description || ''}</p>
            <p class="points-needed">${entry.isUnlocked ? 'Unlocked' : `${remaining} points to unlock`}</p>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width: ${percentage}%"></div></div>
          <p class="progress-text">${Math.min(totalPoints, entry.pointsRequired)}/${entry.pointsRequired}</p>
        </div>
      `;
    })
    .join('');
}

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
