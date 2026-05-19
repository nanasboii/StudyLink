<template>
  <main class="view page active achievements-page">
    <section class="card achievements-hero">
      <div class="hero-title-wrap">
        <h2>Achievements</h2>
        <p>Track your milestones and see what to unlock next.</p>
      </div>
      <div class="points-display" aria-label="Total learning points">
        <span class="points-label">Total Points</span>
        <span class="points-value">{{ totalPoints }}</span>
      </div>
    </section>

    <section class="card achievements-summary">
      <article class="summary-tile">
        <p class="summary-label">Unlocked</p>
        <p class="summary-value">{{ unlockedCount }}</p>
      </article>
      <article class="summary-tile">
        <p class="summary-label">Locked</p>
        <p class="summary-value">{{ lockedCount }}</p>
      </article>
      <article class="summary-tile">
        <p class="summary-label">Next Target</p>
        <p class="summary-value summary-value-next">{{ nextTargetLabel }}</p>
      </article>
    </section>

    <section class="card achievements-section">
      <h3>Your Badges</h3>
      <div class="badges-grid">
        <article
          v-for="badge in achievements"
          :key="badge.code"
          class="badge-item"
          :class="{ unlocked: badge.isUnlocked }"
            style="cursor: pointer;"
            @click="openBadge(badge)"
        >
          <img :src="badge.iconUrl" :alt="badge.name" class="badge-icon" @error="onBadgeIconError" />
          <h4 class="badge-name">{{ badge.name }}</h4>
          <p class="badge-desc">{{ badge.description || 'Unlock this milestone by contributing to StudyLink.' }}</p>
          <p class="badge-points">{{ badge.pointsRequired }} pts</p>
          <p class="badge-status">{{ badge.isUnlocked ? 'Unlocked' : `${remainingPoints(badge)} pts to unlock` }}</p>
        </article>
      </div>
    </section>

    <section class="card progress-section">
      <h3>Progress Breakdown</h3>
      <div class="progress-list">
        <article v-for="badge in achievements" :key="`progress-${badge.code}`" class="progress-item">
          <div class="progress-head">
            <p class="progress-label">{{ badge.name }}</p>
            <p class="progress-value">{{ Math.min(totalPoints, badge.pointsRequired) }} / {{ badge.pointsRequired }}</p>
          </div>
          <div class="progress-bar" role="progressbar" :aria-valuemin="0" :aria-valuemax="badge.pointsRequired" :aria-valuenow="Math.min(totalPoints, badge.pointsRequired)">
            <div class="progress-fill" :style="{ width: `${progressPercent(badge)}%` }"></div>
          </div>
        </article>
      </div>
    </section>

    <p v-if="message" class="message">{{ message }}</p>

    <!-- Badge detail modal -->
    <Transition name="modal-fade">
      <div v-if="selectedBadge" class="modal-backdrop" @click.self="selectedBadge = null">
        <div class="modal-card" role="dialog" aria-modal="true">
          <button class="modal-close" @click="selectedBadge = null" aria-label="Close">&times;</button>

          <div class="modal-badge-icon" :class="{ 'modal-icon-locked': !selectedBadge.isUnlocked }">
            <img :src="selectedBadge.iconUrl" :alt="selectedBadge.name" @error="onBadgeIconError" />
          </div>

          <div class="modal-status-pill" :class="selectedBadge.isUnlocked ? 'pill-unlocked' : 'pill-locked'">
            {{ selectedBadge.isUnlocked ? '✓ Unlocked' : '🔒 Locked' }}
          </div>

          <h3 class="modal-title">{{ selectedBadge.name }}</h3>
          <p class="modal-desc">{{ selectedBadge.description }}</p>

          <div class="modal-points-row">
            <div class="modal-stat">
              <span class="modal-stat-label">Required</span>
              <strong class="modal-stat-value">{{ selectedBadge.pointsRequired }} pts</strong>
            </div>
            <div class="modal-stat">
              <span class="modal-stat-label">Your Points</span>
              <strong class="modal-stat-value">{{ totalPoints }}</strong>
            </div>
            <div v-if="!selectedBadge.isUnlocked" class="modal-stat">
              <span class="modal-stat-label">Still Need</span>
              <strong class="modal-stat-value need">{{ remainingPoints(selectedBadge) }} pts</strong>
            </div>
          </div>

          <div class="modal-progress-wrap">
            <div class="modal-progress-bar">
              <div class="modal-progress-fill" :style="{ width: `${progressPercent(selectedBadge)}%` }"></div>
            </div>
            <span class="modal-progress-pct">{{ progressPercent(selectedBadge) }}%</span>
          </div>

          <p class="modal-tip">
            <template v-if="selectedBadge.isUnlocked">🎉 You've earned this badge — great work!</template>
            <template v-else>💡 Keep tutoring, uploading resources, and leaving reviews to earn more points.</template>
          </p>
        </div>
      </div>
    </Transition>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api.js'

const achievements = ref([])
const totalPoints = ref(0)
const message = ref('')
const selectedBadge = ref(null)
const openBadge = (badge) => { selectedBadge.value = badge }

const unlockedCount = computed(() => achievements.value.filter((a) => a.isUnlocked).length)
const lockedCount = computed(() => achievements.value.filter((a) => !a.isUnlocked).length)
const nextTarget = computed(() =>
  achievements.value
    .filter((a) => !a.isUnlocked)
    .sort((a, b) => a.pointsRequired - b.pointsRequired)
    .find((a) => a.pointsRequired > totalPoints.value)
)
const nextTargetLabel = computed(() => {
  if (!nextTarget.value) return 'All unlocked'
  return `${nextTarget.value.name} (${remainingPoints(nextTarget.value)} pts left)`
})

const resolveBadgeIcon = (item) => {
  const code = String(item.code || '').toLowerCase().trim()
  const iconByCode = {
    first_steps: '/assets/badges/first-steps.svg',
    helping_hand: '/assets/badges/helping-hand.svg',
    campus_mentor: '/assets/badges/campus-mentor.svg',
    community_builder: '/assets/badges/community-builder.svg',
    rising_contributor: '/assets/badges/rising-contributor.svg',
    studylink_champion: '/assets/badges/studylink-champion.svg',
      welcome_aboard: '/assets/badges/welcome-aboard.svg',
      rising_star: '/assets/badges/rising-star.svg',
      knowledge_titan: '/assets/badges/knowledge-titan.svg',
      elite_scholar: '/assets/badges/elite-scholar.svg',
      studylink_legend: '/assets/badges/studylink-legend.svg',
      points_15: '/assets/badges/first-steps.svg',
      points_50: '/assets/badges/helping-hand.svg',
      points_100: '/assets/badges/campus-mentor.svg',
      points_175: '/assets/badges/community-builder.svg',
      points_250: '/assets/badges/studylink-champion.svg',
  }
  if (iconByCode[code]) return iconByCode[code]
  const iconFromApi = String(item.iconUrl || item.icon_url || '').trim()
  if (iconFromApi) {
    if (iconFromApi.startsWith('http://') || iconFromApi.startsWith('https://')) return iconFromApi
    const cleanPath = iconFromApi
      .replace(/^\.\//, '')
      .replace(/^\/ui\//, '/')
      .replace(/^public\//, '')
    return cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`
  }
  return '/assets/badges/first-steps.svg'
}

const normalizeAchievement = (item) => ({
  code: String(item.code || ''),
  name: String(item.name || 'Achievement'),
  description: String(item.description || ''),
  pointsRequired: Number(item.pointsRequired ?? item.points_required ?? 0),
  iconUrl: resolveBadgeIcon(item),
  isUnlocked: Boolean(item.isUnlocked ?? item.is_unlocked),
})

const onBadgeIconError = (event) => {
  const fallback = '/assets/badges/first-steps.svg'
  const target = event?.target
  if (target && target.src && !target.src.endsWith(fallback)) {
    target.onerror = null
    target.src = fallback
  }
}

const remainingPoints = (badge) =>
  Math.max(Number(badge.pointsRequired || 0) - totalPoints.value, 0)

const progressPercent = (badge) => {
  const target = Math.max(Number(badge.pointsRequired || 0), 1)
  return Math.min(100, Math.round((totalPoints.value / target) * 100))
}

const loadAchievements = async () => {
  try {
    const achievementsData = await api('/achievements/me')
    totalPoints.value = Number(achievementsData.totalPoints || 0)
    achievements.value = (achievementsData.achievements || [])
      .map(normalizeAchievement)
      .sort((a, b) => a.pointsRequired - b.pointsRequired)
  } catch (err) {
    message.value = `Error: ${err.message}`
  }
}

onMounted(() => {
  loadAchievements()
})
</script>

<style scoped>
.achievements-page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 20px;
}

.card {
  border: 1px solid #f1cdd9;
  border-radius: 16px;
  background: linear-gradient(180deg, #fffefe 0%, #fff7fa 100%);
  box-shadow: 0 12px 28px rgba(141, 28, 66, 0.08);
  padding: 18px;
}

.achievements-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 14px;
}

.hero-title-wrap h2 {
  margin: 0;
  font-size: clamp(24px, 3vw, 34px);
  color: #4a1f32;
}

.hero-title-wrap p {
  margin: 6px 0 0;
  color: #83566a;
  font-size: 0.95rem;
}

.points-display {
  min-width: 170px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid #f0b6c8;
  background: linear-gradient(135deg, #d91c5c, #8f1c46);
  color: #fff;
  text-align: center;
}

.points-label {
  display: block;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.9;
  font-weight: 700;
}

.points-value {
  display: block;
  margin-top: 4px;
  font-size: 1.8rem;
  line-height: 1;
  font-weight: 800;
}

.achievements-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.summary-tile {
  margin: 0;
  border: 1px solid #f1cfda;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  padding: 12px;
}

.summary-label {
  margin: 0;
  color: #7d5a68;
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
}

.summary-value {
  margin: 8px 0 0;
  color: #5d1f36;
  font-size: 1.45rem;
  font-weight: 800;
}

.summary-value-next {
  font-size: 0.96rem;
  line-height: 1.35;
}

.achievements-section,
.progress-section {
  margin-bottom: 14px;
}

.achievements-section h3,
.progress-section h3 {
  margin: 0 0 12px;
  color: #4f2437;
}

.badges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.badge-item {
  border: 1px solid #f2d9e1;
  border-radius: 14px;
  background: #fff;
  padding: 14px;
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 6px;
  opacity: 0.82;
    transition: transform 140ms ease, box-shadow 140ms ease;
}

  .badge-item:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(162, 35, 86, 0.15);
  }

.badge-item.unlocked {
  border-color: #e88eb1;
  background: linear-gradient(180deg, #fff, #fff4f8);
  box-shadow: 0 10px 22px rgba(162, 35, 86, 0.12);
  opacity: 1;
}

.badge-icon {
  width: 68px;
  height: 68px;
  object-fit: contain;
}

.badge-name {
  margin: 0;
  color: #4a2132;
  font-size: 1rem;
}

.badge-desc {
  margin: 0;
  color: #7a5a66;
  font-size: 0.86rem;
  line-height: 1.45;
}

.badge-points {
  margin: 4px 0 0;
  color: #96264f;
  font-size: 0.9rem;
  font-weight: 700;
}

.badge-status {
  margin: 0;
  color: #6e4a58;
  font-size: 0.82rem;
  font-weight: 600;
}

.progress-list {
  display: grid;
  gap: 10px;
}

.progress-item {
  border: 1px solid #f0d8e1;
  border-radius: 12px;
  background: #fff;
  padding: 12px;
}

.progress-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.progress-label,
.progress-value {
  margin: 0;
  color: #4b2735;
  font-size: 0.9rem;
  font-weight: 700;
}

.progress-bar {
  height: 8px;
  border-radius: 999px;
  background: #f2e3e9;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #d91c5c, #94234c);
  transition: width 220ms ease;
}

.message {
  margin: 10px 2px 0;
  color: #9a244b;

  /* ── Modal ── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 999;
    background: rgba(30, 10, 18, 0.55);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .modal-card {
    position: relative;
    width: 100%;
    max-width: 400px;
    background: linear-gradient(160deg, #fff 0%, #fff6f9 100%);
    border: 1px solid #f0c8d8;
    border-radius: 22px;
    padding: 32px 28px 28px;
    box-shadow: 0 24px 60px rgba(120, 20, 60, 0.22);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
  }

  .modal-close {
    position: absolute;
    top: 14px;
    right: 16px;
    background: none;
    border: none;
    font-size: 1.5rem;
    line-height: 1;
    color: #9a6070;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 8px;
    transition: background 120ms;
  }
  .modal-close:hover { background: #fde8ef; }

  .modal-badge-icon {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff4f8;
    border: 2px solid #f2c4d4;
    padding: 10px;
  }
  .modal-badge-icon.modal-icon-locked {
    filter: grayscale(0.7);
    opacity: 0.65;
  }
  .modal-badge-icon img {
    width: 76px;
    height: 76px;
    object-fit: contain;
  }

  .modal-status-pill {
    padding: 5px 14px;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.05em;
  }
  .pill-unlocked { background: #d4edda; color: #155724; }
  .pill-locked   { background: #f3e8f5; color: #6a1b9a; }

  .modal-title {
    margin: 0;
    font-size: 1.3rem;
    color: #3f1828;
    font-weight: 800;
  }

  .modal-desc {
    margin: 0;
    color: #6e445a;
    font-size: 0.92rem;
    line-height: 1.55;
    max-width: 320px;
  }

  .modal-points-row {
    display: flex;
    gap: 16px;
    justify-content: center;
    flex-wrap: wrap;
    width: 100%;
  }

  .modal-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-width: 70px;
    background: #fff;
    border: 1px solid #f2d4e0;
    border-radius: 12px;
    padding: 10px 14px;
  }
  .modal-stat-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: #9e7080;
    font-weight: 700;
  }
  .modal-stat-value {
    font-size: 1.1rem;
    color: #5d1838;
    font-weight: 800;
  }
  .modal-stat-value.need { color: #c0254f; }

  .modal-progress-wrap {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .modal-progress-bar {
    flex: 1;
    height: 10px;
    border-radius: 999px;
    background: #f2e3e9;
    overflow: hidden;
  }
  .modal-progress-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #d91c5c, #8f1c46);
    transition: width 400ms ease;
  }
  .modal-progress-pct {
    font-size: 0.8rem;
    font-weight: 700;
    color: #96264f;
    min-width: 36px;
  }

  .modal-tip {
    margin: 0;
    font-size: 0.85rem;
    color: #7a5060;
    background: #fff4f8;
    border: 1px solid #f2d4e0;
    border-radius: 10px;
    padding: 10px 14px;
    width: 100%;
    box-sizing: border-box;
  }

  /* Transition */
  .modal-fade-enter-active,
  .modal-fade-leave-active { transition: opacity 180ms ease, transform 180ms ease; }
  .modal-fade-enter-from,
  .modal-fade-leave-to { opacity: 0; }
  .modal-fade-enter-from .modal-card,
  .modal-fade-leave-to .modal-card { transform: scale(0.94) translateY(12px); }
  font-weight: 600;
}

@media (max-width: 820px) {
  .achievements-page {
    padding: 14px;
  }

  .achievements-hero {
    flex-direction: column;
    align-items: stretch;
  }

  .achievements-summary {
    grid-template-columns: 1fr;
  }
}
</style>
