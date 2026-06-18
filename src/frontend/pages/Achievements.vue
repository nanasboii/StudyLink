<template>
  <main class="view page active achievements-page">

    <!-- Hero -->
    <section class="card achievements-hero">
      <div class="hero-title-wrap">
        <h2>Achievements</h2>
        <p>Track your milestones and see what to unlock next.</p>
      </div>
      <div class="points-display" aria-label="Lifetime learning points">
        <span class="points-label">Lifetime Points</span>
        <span class="points-value">{{ lifetimePoints }}</span>
      </div>
    </section>

    <!-- Error -->
    <p v-if="message" class="message message-error" role="alert" aria-live="assertive">{{ message }}</p>

    <!-- Summary tiles -->
    <section class="achievements-summary">
      <article class="summary-tile card">
        <p class="summary-label">Lifetime Earned</p>
        <p class="summary-value">{{ lifetimePoints }}</p>
      </article>
      <article class="summary-tile card">
        <p class="summary-label">Available</p>
        <p class="summary-value">{{ availablePoints }}</p>
      </article>
      <article class="summary-tile card">
        <p class="summary-label">Spent on Redeem</p>
        <p class="summary-value">{{ spentPoints }}</p>
      </article>
      <article class="summary-tile card">
        <p class="summary-label">Unlocked</p>
        <p class="summary-value">{{ unlockedCount }} / {{ achievements.length }}</p>
      </article>
      <article class="summary-tile card summary-tile-next">
        <p class="summary-label">Next Target</p>
        <p class="summary-value summary-value-next">{{ nextTargetLabel }}</p>
      </article>
      <article class="summary-tile card summary-tile-cta">
        <p class="summary-label">Points to Spend</p>
        <p class="summary-value">{{ availablePoints }}</p>
        <router-link to="/redeem" class="chip chip-strong redeem-cta">Redeem Points →</router-link>
      </article>
    </section>

    <!-- How Points Were Earned -->
    <section class="card points-logic-section" v-if="!isLoading && reasonBreakdown.length">
      <h3>How Your Points Were Earned</h3>
      <div class="reason-grid">
        <article class="reason-item" v-for="item in reasonBreakdown" :key="item.reason">
          <span class="reason-icon">{{ item.icon }}</span>
          <div>
            <p class="reason-label">{{ item.label }}</p>
            <p class="reason-points">{{ item.points }} pts</p>
          </div>
        </article>
      </div>
    </section>

    <!-- Empty state for new users -->
    <section class="card points-logic-section" v-else-if="!isLoading">
      <h3>How Your Points Were Earned</h3>
      <p class="meta-empty">No points earned yet. Start uploading resources, booking sessions, and leaving reviews!</p>
    </section>

    <!-- Ways to Earn Guide -->
    <section class="card earn-guide-section">
      <h3>Ways to Earn Points</h3>
      <div class="earn-grid">
        <div class="earn-item">
          <span class="earn-icon">📤</span>
          <div>
            <strong>Upload a resource</strong>
            <p>+15 pts per upload</p>
          </div>
        </div>
        <div class="earn-item">
          <span class="earn-icon">⭐</span>
          <div>
            <strong>Review a resource</strong>
            <p>+5 pts per review</p>
          </div>
        </div>
        <div class="earn-item">
          <span class="earn-icon">✅</span>
          <div>
            <strong>Complete a session</strong>
            <p>+20 pts (tutor) / +10 pts (tutee)</p>
          </div>
        </div>
        <div class="earn-item">
          <span class="earn-icon">📅</span>
          <div>
            <strong>Accept a booking</strong>
            <p>+10 pts (tutor)</p>
          </div>
        </div>
        <div class="earn-item">
          <span class="earn-icon">💬</span>
          <div>
            <strong>Submit a session review</strong>
            <p>+8 pts</p>
          </div>
        </div>
        <div class="earn-item">
          <span class="earn-icon">🔥</span>
          <div>
            <strong>Daily login streak</strong>
            <p>+points per day</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Badges -->
    <section class="card achievements-section">
      <h3>Your Badges</h3>

      <!-- Loading skeleton -->
      <div v-if="isLoading" class="badges-grid">
        <article v-for="n in 6" :key="n" class="badge-item badge-skeleton"></article>
      </div>

      <!-- Loaded badges -->
      <div v-else class="badges-grid">
        <article
          v-for="badge in achievements"
          :key="badge.code"
          class="badge-item"
          :class="{ unlocked: badge.isUnlocked }"
          style="cursor: pointer;"
          @click="openBadge(badge)"
        >
          <div class="badge-icon-wrap">
            <img :src="badge.iconUrl" :alt="badge.name" class="badge-icon" @error="onBadgeIconError" />
            <span v-if="badge.isUnlocked" class="badge-unlocked-tick" aria-label="Unlocked">✓</span>
          </div>
          <h4 class="badge-name">{{ badge.name }}</h4>
          <p class="badge-desc">{{ badge.description || 'Unlock this milestone by contributing to StudyLink.' }}</p>
          <p class="badge-points">{{ badge.pointsRequired }} pts required</p>

          <!-- Mini progress bar for locked badges -->
          <div v-if="!badge.isUnlocked" class="badge-progress-mini-wrap">
            <div class="badge-progress-mini">
              <div
                class="badge-progress-mini-fill"
                :style="{ width: `${progressPercent(badge)}%` }"
              ></div>
            </div>
            <span class="badge-progress-pct">{{ progressPercent(badge) }}%</span>
          </div>

          <p class="badge-status">{{ badge.isUnlocked ? '🏆 Unlocked' : '🔒 Locked' }}</p>
        </article>
      </div>
    </section>

    <!-- Badge Detail Modal -->
    <Transition name="modal-fade">
      <div v-if="selectedBadge" class="modal-overlay" @click.self="selectedBadge = null" role="dialog" aria-modal="true" :aria-label="selectedBadge.name">
        <div class="modal-card">
          <button class="modal-close" @click="selectedBadge = null" aria-label="Close badge details">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
            </svg>
          </button>

          <img :src="selectedBadge.iconUrl" :alt="selectedBadge.name" class="modal-icon" @error="onBadgeIconError" />

          <div class="modal-pill" :class="selectedBadge.isUnlocked ? 'pill-unlocked' : 'pill-locked'">
            {{ selectedBadge.isUnlocked ? 'Unlocked' : 'Locked' }}
          </div>

          <h3 class="modal-title">{{ selectedBadge.name }}</h3>
          <p class="modal-desc">{{ selectedBadge.description }}</p>

          <div class="modal-points-row">
            <div class="modal-stat">
              <span class="modal-stat-label">Required</span>
              <strong class="modal-stat-value">{{ selectedBadge.pointsRequired }} pts</strong>
            </div>
            <div class="modal-stat">
              <span class="modal-stat-label">Lifetime Earned</span>
              <strong class="modal-stat-value">{{ lifetimePoints }} pts</strong>
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
            <template v-else>Keep tutoring, uploading resources, and leaving reviews to earn more points.</template>
          </p>
        </div>
      </div>
    </Transition>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { api } from '@/api.js'
import { normalizeAchievement } from '@/utils/records.js'

const achievements = ref([])
const totalPoints = ref(0)
const availablePoints = ref(0)
const lifetimePoints = ref(0)
const spentPoints = ref(0)
const pointsByReason = ref([])
const message = ref('')
const isLoading = ref(true)
const selectedBadge = ref(null)

const openBadge = (badge) => { selectedBadge.value = badge }

// ── Computed ─────────────────────────────────────────────────────────────────

const unlockedCount = computed(() => achievements.value.filter((a) => a.isUnlocked).length)

// FIX B1: badges are unlocked by lifetime points, not available balance
const progressPoints = computed(() => lifetimePoints.value)

const nextTarget = computed(() =>
  achievements.value
    .filter((a) => !a.isUnlocked)
    .sort((a, b) => a.pointsRequired - b.pointsRequired)
    .find((a) => a.pointsRequired > progressPoints.value)
)

const nextTargetLabel = computed(() => {
  if (!nextTarget.value) return 'All unlocked! 🎉'
  return `${nextTarget.value.name} (${remainingPoints(nextTarget.value)} pts left)`
})

// FIX P1: added login_streak + booking_review; confirmed resource_upload key matches server
const reasonLabelByCode = {
  resource_upload:    'Resource Uploads',
  tutor_verification: 'Tutor Verification',
  resource_review:    'Resource Reviews',
  booking_review:     'Session Reviews',
  booking_progress:   'Session Activity',
  leaderboard_rank:   'Leaderboard Performance',
  login_streak:       'Login Streak',
  profile_update:     'Profile Updates',
  general:            'General Activity'
}

const reasonIconByCode = {
  resource_upload:    '📤',
  tutor_verification: '✅',
  resource_review:    '⭐',
  booking_review:     '💬',
  booking_progress:   '📅',
  leaderboard_rank:   '🏆',
  login_streak:       '🔥',
  profile_update:     '👤',
  general:            '🎯'
}

const reasonBreakdown = computed(() =>
  [...pointsByReason.value]
    .map((entry) => {
      const reason = String(entry.reason || '')
      return {
        reason,
        points: Number(entry.points || 0),
        label: reasonLabelByCode[reason] || reason.replace(/_/g, ' '),
        icon: reasonIconByCode[reason] || '🎯'
      }
    })
    .filter((entry) => entry.points > 0)
    .sort((a, b) => b.points - a.points)
)

// ── Badge helpers ────────────────────────────────────────────────────────────

const onBadgeIconError = (event) => {
  const fallback = '/assets/badges/first-steps.svg'
  const target = event?.target
  if (target && target.src && !target.src.endsWith(fallback)) {
    target.onerror = null
    target.src = fallback
  }
}

const remainingPoints = (badge) =>
  Math.max(Number(badge.pointsRequired || 0) - progressPoints.value, 0)

const progressPercent = (badge) => {
  const target = Math.max(Number(badge.pointsRequired || 0), 1)
  return Math.min(100, Math.round((progressPoints.value / target) * 100))
}

// ── Modal accessibility (Esc + scroll lock) ──────────────────────────────────

const handleKeydown = (e) => {
  if (e.key === 'Escape' && selectedBadge.value) {
    selectedBadge.value = null
  }
}

watch(selectedBadge, (badge) => {
  document.body.style.overflow = badge ? 'hidden' : ''
  if (badge) window.addEventListener('keydown', handleKeydown)
  else window.removeEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})

// ── Data loading ─────────────────────────────────────────────────────────────

const loadAchievements = async () => {
  isLoading.value = true
  try {
    const achievementsData = await api('/achievements/me')
    totalPoints.value = Number(achievementsData.totalPoints || 0)
    availablePoints.value = Number(achievementsData.availablePoints ?? achievementsData.totalPoints ?? 0)
    lifetimePoints.value = Number(achievementsData.lifetimePoints ?? achievementsData.totalPoints ?? 0)
    spentPoints.value = Number(achievementsData.spentPoints || 0)
    pointsByReason.value = Array.isArray(achievementsData.pointsByReason) ? achievementsData.pointsByReason : []
    achievements.value = (achievementsData.achievements || [])
      .map(normalizeAchievement)
      .sort((a, b) => {
        // Unlocked badges first, then by points required ascending
        if (a.isUnlocked !== b.isUnlocked) return a.isUnlocked ? -1 : 1
        return a.pointsRequired - b.pointsRequired
      })
  } catch (err) {
    message.value = `Error loading achievements: ${err.message}`
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  const viewEl = document.querySelector('.view')
  if (viewEl) viewEl.scrollTop = 0
  loadAchievements()
})
</script>

<style scoped>
.achievements-page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.card {
  border: 1px solid #f1cdd9;
  border-radius: 16px;
  background: linear-gradient(180deg, #fffefe 0%, #fff7fa 100%);
  box-shadow: 0 12px 28px rgba(141, 28, 66, 0.08);
  padding: 18px;
}

/* ── Hero ── */
.achievements-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
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

/* ── Summary tiles ── */
.achievements-summary {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
}

.summary-tile {
  margin: 0;
  padding: 12px;
}

.summary-tile-cta {
  display: flex;
  flex-direction: column;
  gap: 6px;
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
  font-size: 1.35rem;
  font-weight: 800;
}

.summary-value-next {
  font-size: 0.88rem;
  line-height: 1.35;
}

.redeem-cta {
  margin-top: 6px;
  font-size: 0.8rem;
  padding: 6px 12px;
  text-decoration: none;
}

/* ── Error message ── */
.message-error {
  margin: 0;
  padding: 10px 14px;
  border-radius: 10px;
  background: #fdeef3;
  border: 1px solid #f5c0cf;
  color: #9a244b;
  font-size: 0.9rem;
  font-weight: 600;
}

/* ── Points breakdown ── */
.points-logic-section h3,
.earn-guide-section h3,
.achievements-section h3 {
  margin: 0 0 12px;
  color: #4f2437;
  font-size: 1rem;
}

.reason-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 10px;
}

.reason-item {
  border: 1px solid #f0d8e1;
  border-radius: 12px;
  background: #fff;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.reason-icon {
  font-size: 1.4rem;
  flex-shrink: 0;
}

.reason-label {
  margin: 0;
  color: #6c4656;
  font-size: 0.8rem;
}

.reason-points {
  margin: 2px 0 0;
  color: #5d1f36;
  font-size: 1rem;
  font-weight: 800;
}

.meta-empty {
  margin: 0;
  color: #9a7080;
  font-size: 0.9rem;
}

/* ── Ways to Earn ── */
.earn-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.earn-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  border: 1px solid #f0d8e1;
  border-radius: 12px;
  background: #fff;
  padding: 10px 12px;
}

.earn-icon {
  font-size: 1.4rem;
  flex-shrink: 0;
}

.earn-item strong {
  display: block;
  color: #4a2132;
  font-size: 0.88rem;
}

.earn-item p {
  margin: 2px 0 0;
  color: #96264f;
  font-size: 0.82rem;
  font-weight: 700;
}

/* ── Badges grid ── */
.badges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

/* Skeleton shimmer */
.badge-skeleton {
  height: 200px;
  border-radius: 14px;
  background: linear-gradient(90deg, #f5e8ed 25%, #fdf0f4 50%, #f5e8ed 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
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
  background: linear-gradient(180deg, #fff, #f5f5f7);
  box-shadow: 0 10px 22px rgba(162, 35, 86, 0.12);
  opacity: 1;
}

.badge-icon-wrap {
  position: relative;
  display: inline-block;
}

.badge-icon {
  width: 68px;
  height: 68px;
  object-fit: contain;
}

.badge-unlocked-tick {
  position: absolute;
  bottom: 0;
  right: -4px;
  background: #1a8a4a;
  color: #fff;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
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

/* Mini progress bar on badge card */
.badge-progress-mini-wrap {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
}

.badge-progress-mini {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: #f2e3e9;
  overflow: hidden;
}

.badge-progress-mini-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #d91c5c, #94234c);
  transition: width 300ms ease;
}

.badge-progress-pct {
  font-size: 0.72rem;
  font-weight: 700;
  color: #96264f;
  min-width: 28px;
  text-align: right;
}

.badge-status {
  margin: 0;
  color: #6e4a58;
  font-size: 0.82rem;
  font-weight: 600;
}

/* ── Badge modal ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(60, 10, 30, 0.45);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.modal-card {
  position: relative;
  background: #fff;
  border-radius: 20px;
  padding: 32px 28px 24px;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 24px 60px rgba(100, 10, 40, 0.22);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.modal-close {
  position: absolute;
  top: 14px;
  right: 14px;
  background: #f5f0f2;
  border: none;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #7a4a58;
  transition: background 0.15s;
}

.modal-close:hover {
  background: #f0dce5;
}

.modal-icon {
  width: 88px;
  height: 88px;
  object-fit: contain;
}

.modal-pill {
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.pill-unlocked {
  background: #d4f0e0;
  color: #1a6e3d;
}

.pill-locked {
  background: #f5e8ed;
  color: #8a3050;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  color: #3e1828;
  text-align: center;
}

.modal-desc {
  margin: 0;
  font-size: 0.9rem;
  color: #7a5060;
  text-align: center;
  max-width: 320px;
  line-height: 1.5;
}

.modal-points-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  width: 100%;
}

.modal-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  flex: 1 1 80px;
}

.modal-stat-label {
  font-size: 0.72rem;
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

.modal-stat-value.need {
  color: #c0254f;
}

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
  background: #f5f5f7;
  border: 1px solid #f2d4e0;
  border-radius: 10px;
  padding: 10px 14px;
  width: 100%;
  box-sizing: border-box;
  text-align: center;
}

/* ── Modal transition ── */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-card,
.modal-fade-leave-to .modal-card {
  transform: scale(0.94) translateY(12px);
}

/* ── Responsive ── */
@media (max-width: 1024px) {
  .achievements-summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .achievements-page { padding: 14px; }

  .achievements-hero {
    flex-direction: column;
    align-items: stretch;
  }

  .achievements-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .points-display {
    width: 100%;
    min-width: 0;
  }

  .badges-grid {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }

  .reason-grid,
  .earn-grid {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  }
}

@media (max-width: 640px) {
  .achievements-page { padding: 12px; }
  .card { padding: 14px; }

  .hero-title-wrap h2 { font-size: 1.45rem; }

  .achievements-summary {
    grid-template-columns: 1fr 1fr;
  }

  .summary-value { font-size: 1.2rem; }

  .badges-grid,
  .reason-grid,
  .earn-grid {
    grid-template-columns: 1fr;
  }

  .modal-card {
    padding: 24px 18px 18px;
    max-width: 100%;
  }

  .modal-desc { max-width: 100%; }
}

@media (max-width: 420px) {
  .achievements-summary {
    grid-template-columns: 1fr;
  }

  .modal-points-row { gap: 8px; }

  .modal-stat {
    flex: 1 1 calc(50% - 8px);
    min-width: 0;
  }
}
</style>
