<template>
  <main class="view page active achievements-page">

    <!-- ── Header ── -->
    <section class="card page-header-card">
      <div>
        <p class="page-kicker">Gamification</p>
        <h2>Achievements</h2>
        <p class="page-subtext">Track milestones. Unlock badges. Spend points.</p>
      </div>
      <div class="points-display" aria-label="Lifetime points earned">
        <span class="points-label">Lifetime Points</span>
        <span class="points-value">{{ lifetimePoints.toLocaleString() }}</span>
      </div>
    </section>

    <!-- ── Error ── -->
    <p v-if="message" class="error-msg" role="alert" aria-live="assertive">{{ message }}</p>

    <!-- ── Summary tiles ── -->
    <section class="stats-grid" aria-label="Points summary">
      <template v-if="isLoading">
        <div v-for="n in 4" :key="n" class="card skeleton-card" aria-hidden="true"></div>
      </template>
      <template v-else>
        <article class="card stat-card">
          <div class="stat-icon">🏆</div>
          <div class="stat-body">
            <p class="stat-label">Lifetime</p>
            <p class="stat-value">{{ lifetimePoints.toLocaleString() }}</p>
          </div>
        </article>
        <article class="card stat-card">
          <div class="stat-icon">💰</div>
          <div class="stat-body">
            <p class="stat-label">Available</p>
            <p class="stat-value">{{ availablePoints.toLocaleString() }}</p>
          </div>
        </article>
        <article class="card stat-card">
          <div class="stat-icon">🛍️</div>
          <div class="stat-body">
            <p class="stat-label">Spent</p>
            <p class="stat-value">{{ spentPoints.toLocaleString() }}</p>
          </div>
        </article>
        <article class="card stat-card">
          <div class="stat-icon">🎖️</div>
          <div class="stat-body">
            <p class="stat-label">Unlocked</p>
            <p class="stat-value">{{ unlockedCount }} / {{ achievements.length }}</p>
          </div>
        </article>
      </template>
    </section>

    <!-- ── Next target + Redeem CTA ── -->
    <section v-if="!isLoading" class="card next-row">
      <div class="next-target">
        <p class="stat-label">Next Target 🎯</p>
        <p class="next-value">{{ nextTargetLabel }}</p>
      </div>
      <router-link to="/redeem" class="chip chip-strong">Redeem Points →</router-link>
    </section>

    <!-- ── Points breakdown ── -->
    <section v-if="!isLoading && reasonBreakdown.length" class="card">
      <div class="section-header">
        <h3>How You Earned Points</h3>
        <p class="section-sub">Breakdown by activity type</p>
      </div>
      <div class="reason-grid">
        <article v-for="item in reasonBreakdown" :key="item.reason" class="reason-item card">
          <span class="reason-icon">{{ item.icon }}</span>
          <div>
            <p class="reason-label">{{ item.label }}</p>
            <p class="reason-points">{{ item.points.toLocaleString() }} pts</p>
          </div>
        </article>
      </div>
    </section>

    <!-- ── Achievements grid ── -->
    <section class="card">
      <div class="section-header">
        <h3>Badges</h3>
        <p class="section-sub">Click any badge for details</p>
      </div>

      <div v-if="isLoading" class="badges-grid">
        <div v-for="n in 8" :key="n" class="badge-skeleton" aria-hidden="true"></div>
      </div>

      <div v-else-if="!achievements.length" class="empty-state">
        <p class="empty-icon">🎯</p>
        <p class="empty-text">No achievements yet. Start earning points!</p>
      </div>

      <div v-else class="badges-grid">
        <button
          v-for="badge in achievements"
          :key="badge.id"
          class="badge-tile"
          :class="badge.isUnlocked ? 'badge-tile--unlocked' : 'badge-tile--locked'"
          @click="openBadge(badge)"
          :aria-label="`${badge.name} — ${badge.isUnlocked ? 'Unlocked' : 'Locked'}`"
          type="button"
        >
          <div class="badge-icon-wrap">
            <img
              :src="badge.iconUrl || '/assets/badges/first-steps.svg'"
              :alt="badge.name"
              class="badge-icon"
              @error="onBadgeIconError"
            />
            <span v-if="badge.isUnlocked" class="badge-check">✓</span>
          </div>
          <p class="badge-name">{{ badge.name }}</p>
          <p class="badge-pts">{{ badge.pointsRequired?.toLocaleString() ?? 0 }} pts</p>
          <div class="badge-progress-bar">
            <div
              class="badge-progress-fill"
              :style="{ width: `${progressPercent(badge)}%` }"
              :class="badge.isUnlocked ? 'fill-done' : 'fill-active'"
            ></div>
          </div>
        </button>
      </div>
    </section>

    <!-- ── Badge detail modal ── -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="selectedBadge"
          class="modal-backdrop"
          role="dialog"
          aria-modal="true"
          :aria-label="`Badge detail: ${selectedBadge.name}`"
          @click.self="selectedBadge = null"
        >
          <div class="modal-card">
            <div class="modal-top">
              <div class="modal-badge-wrap">
                <img
                  :src="selectedBadge.iconUrl || '/assets/badges/first-steps.svg'"
                  :alt="selectedBadge.name"
                  class="modal-badge-icon"
                  @error="onBadgeIconError"
                />
              </div>
              <button
                class="close-btn"
                type="button"
                aria-label="Close"
                @click="selectedBadge = null"
              >×</button>
            </div>

            <span class="status-pill" :class="selectedBadge.isUnlocked ? 'pill-unlocked' : 'pill-locked'">
              {{ selectedBadge.isUnlocked ? '✓ Unlocked' : '🔒 Locked' }}
            </span>

            <h3 class="modal-title">{{ selectedBadge.name }}</h3>
            <p class="modal-desc">{{ selectedBadge.description }}</p>

            <div class="modal-stats-row">
              <div class="modal-stat">
                <span class="modal-stat-label">Required</span>
                <strong class="modal-stat-value">{{ selectedBadge.pointsRequired?.toLocaleString() ?? 0 }} pts</strong>
              </div>
              <div class="modal-stat">
                <span class="modal-stat-label">Lifetime</span>
                <strong class="modal-stat-value">{{ lifetimePoints.toLocaleString() }} pts</strong>
              </div>
              <div v-if="!selectedBadge.isUnlocked" class="modal-stat">
                <span class="modal-stat-label">Still Need</span>
                <strong class="modal-stat-value modal-stat-need">{{ remainingPoints(selectedBadge).toLocaleString() }} pts</strong>
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
              <template v-else>Keep tutoring, uploading resources, and reviewing to earn more points.</template>
            </p>
          </div>
        </div>
      </Transition>
    </Teleport>

  </main>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { api } from '@/api.js'
import { normalizeAchievement } from '@/utils/records.js'

// ── State ──────────────────────────────────────────────────────────────────
const achievements    = ref([])
const totalPoints     = ref(0)
const availablePoints = ref(0)
const lifetimePoints  = ref(0)
const spentPoints     = ref(0)
const pointsByReason  = ref([])
const message         = ref('')
const isLoading       = ref(true)
const selectedBadge   = ref(null)

// ── Computed ───────────────────────────────────────────────────────────────
const unlockedCount = computed(() => achievements.value.filter(a => a.isUnlocked).length)
const progressPoints = computed(() => lifetimePoints.value)

const nextTarget = computed(() =>
  achievements.value
    .filter(a => !a.isUnlocked)
    .sort((a, b) => a.pointsRequired - b.pointsRequired)
    .find(a => a.pointsRequired > progressPoints.value)
)

const nextTargetLabel = computed(() => {
  if (!nextTarget.value) return '🎉 All badges unlocked!'
  return `${nextTarget.value.name} (${remainingPoints(nextTarget.value).toLocaleString()} pts left)`
})

const REASON_LABELS = {
  resource_upload:    'Resource Uploads',
  tutor_verification: 'Tutor Verification',
  resource_review:    'Resource Reviews',
  booking_review:     'Session Reviews',
  booking_progress:   'Session Activity',
  leaderboard_rank:   'Leaderboard',
  login_streak:       'Login Streak',
  profile_update:     'Profile Updates',
  general:            'General Activity',
}
const REASON_ICONS = {
  resource_upload:    '📤',
  tutor_verification: '✅',
  resource_review:    '⭐',
  booking_review:     '💬',
  booking_progress:   '📅',
  leaderboard_rank:   '🏆',
  login_streak:       '🔥',
  profile_update:     '👤',
  general:            '🎯',
}

const reasonBreakdown = computed(() =>
  [...pointsByReason.value]
    .map(entry => {
      const reason = String(entry.reason || '')
      return {
        reason,
        points: Number(entry.points ?? 0),
        label: REASON_LABELS[reason] || reason.replace(/_/g, ' '),
        icon: REASON_ICONS[reason] || '🎯',
      }
    })
    .filter(e => e.points > 0)
    .sort((a, b) => b.points - a.points)
)

// ── Helpers ────────────────────────────────────────────────────────────────
const remainingPoints = (badge) =>
  Math.max(Number(badge?.pointsRequired ?? 0) - progressPoints.value, 0)

const progressPercent = (badge) => {
  const target = Math.max(Number(badge?.pointsRequired ?? 0), 1)
  return Math.min(100, Math.round((progressPoints.value / target) * 100))
}

const onBadgeIconError = (e) => {
  const fallback = '/assets/badges/first-steps.svg'
  const t = e?.target
  if (t && !t.src.endsWith(fallback)) {
    t.onerror = null
    t.src = fallback
  }
}

// ── Modal keyboard ─────────────────────────────────────────────────────────
const handleKeydown = (e) => {
  if (e.key === 'Escape' && selectedBadge.value) selectedBadge.value = null
}

watch(selectedBadge, badge => {
  document.body.style.overflow = badge ? 'hidden' : ''
  if (badge) window.addEventListener('keydown', handleKeydown)
  else window.removeEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})

// ── Data load ──────────────────────────────────────────────────────────────
const loadAchievements = async () => {
  isLoading.value = true
  message.value = ''
  try {
    const data = await api('/achievements/me')
    // BUG FIX -> null guard all fields
    totalPoints.value     = Number(data?.totalPoints ?? 0)
    availablePoints.value = Number(data?.availablePoints ?? data?.totalPoints ?? 0)
    lifetimePoints.value  = Number(data?.lifetimePoints ?? data?.totalPoints ?? 0)
    spentPoints.value     = Number(data?.spentPoints ?? 0)
    pointsByReason.value  = Array.isArray(data?.pointsByReason) ? data.pointsByReason : []
    achievements.value    = (data?.achievements || [])
      .map(normalizeAchievement)
      .sort((a, b) => {
        if (a.isUnlocked !== b.isUnlocked) return a.isUnlocked ? -1 : 1
        return (a.pointsRequired ?? 0) - (b.pointsRequired ?? 0)
      })
  } catch (err) {
    message.value = `Error loading achievements: ${err?.message ?? 'Unknown error'}`
  } finally {
    isLoading.value = false
  }
}

const openBadge = (badge) => { selectedBadge.value = badge }

onMounted(() => {
  document.querySelector('.view')?.scrollTo(0, 0)
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
  gap: 16px;
}

/* ── Glass Card ── */
.card {
  border: 2px solid #021A54;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(2, 26, 84, 0.05);
  padding: 20px;
}

/* ── Header ── */
.page-header-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.page-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #FF85BB;
  margin: 0 0 4px;
}

.page-header-card h2 {
  font-size: clamp(1.6rem, 2.5vw, 2.2rem);
  color: #021A54;
  margin: 0 0 4px;
}

.page-subtext {
  font-size: 0.9rem;
  color: rgba(2, 26, 84, 0.7);
  font-weight: 600;
  margin: 0;
}

.points-display {
  min-width: 160px;
  padding: 12px 20px;
  border-radius: 12px;
  border: 2px solid #021A54;
  background: linear-gradient(135deg, #FF85BB, #FFCEE3);
  color: #021A54;
  text-align: center;
}

.points-label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
}

.points-value {
  display: block;
  font-size: 1.9rem;
  font-weight: 800;
  line-height: 1.2;
  margin-top: 2px;
}

/* ── Error ── */
.error-msg {
  padding: 12px 16px;
  background: #FFCEE3;
  border: 2px solid #FF85BB;
  border-radius: 12px;
  color: #021A54;
  font-weight: 800;
  margin: 0;
}

/* ── Stats Grid ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  transition: transform 150ms ease;
}

.stat-card:hover { transform: translateY(-3px); }

.skeleton-card {
  height: 80px;
  background: linear-gradient(90deg, rgba(255,255,255,0.4) 25%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.4) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.stat-icon {
  font-size: 1.8rem;
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFCEE3;
  border: 2px solid #021A54;
  flex-shrink: 0;
}

.stat-label {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #FF85BB;
  margin: 0 0 4px;
}

.stat-value {
  font-size: 1.7rem;
  font-weight: 800;
  color: #021A54;
  margin: 0;
  line-height: 1;
}

/* ── Next row ── */
.next-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 16px 20px;
}

.next-target { min-width: 0; }

.next-value {
  font-size: 1rem;
  font-weight: 800;
  color: #021A54;
  margin: 4px 0 0;
}

/* ── Chips ── */
.chip {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 800;
  padding: 10px 18px;
  border-radius: 8px;
  border: 2px solid #021A54;
  cursor: pointer;
  transition: transform 100ms;
  white-space: nowrap;
}

.chip:active { transform: scale(0.95); }

.chip-strong {
  background: #FF85BB;
  color: #021A54;
}

/* ── Section header ── */
.section-header { margin-bottom: 16px; }
.section-header h3 { font-size: 1.3rem; font-weight: 800; color: #021A54; margin: 0 0 4px; }
.section-sub { font-size: 0.88rem; color: rgba(2, 26, 84, 0.7); font-weight: 600; margin: 0; }

/* ── Reason grid ── */
.reason-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
}

.reason-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
}

.reason-icon { font-size: 1.5rem; flex-shrink: 0; }

.reason-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: #021A54;
  margin: 0 0 2px;
}

.reason-points {
  font-size: 1rem;
  font-weight: 800;
  color: #FF85BB;
  margin: 0;
}

/* ── Badges grid ── */
.badges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-top: 4px;
}

.badge-skeleton {
  height: 160px;
  border-radius: 12px;
  background: linear-gradient(90deg, rgba(255,255,255,0.4) 25%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.4) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.badge-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 10px;
  border-radius: 14px;
  border: 2px solid #021A54;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
  cursor: pointer;
  transition: transform 150ms ease, box-shadow 150ms ease;
  text-align: center;
}

.badge-tile:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 24px rgba(2, 26, 84, 0.12);
}

.badge-tile--locked { opacity: 0.65; filter: grayscale(0.4); }
.badge-tile--unlocked { border-color: #FF85BB; }

.badge-icon-wrap {
  position: relative;
  width: 56px;
  height: 56px;
}

.badge-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.badge-check {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #FF85BB;
  border: 2px solid #021A54;
  color: #021A54;
  font-size: 11px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.badge-name {
  font-size: 0.8rem;
  font-weight: 800;
  color: #021A54;
  margin: 0;
  line-height: 1.2;
}

.badge-pts {
  font-size: 0.75rem;
  color: #FF85BB;
  font-weight: 700;
  margin: 0;
}

.badge-progress-bar {
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: rgba(2, 26, 84, 0.1);
  overflow: hidden;
  margin-top: 4px;
}

.badge-progress-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 600ms cubic-bezier(0.4, 0, 0.2, 1);
}

.fill-active { background: #FF85BB; }
.fill-done   { background: #021A54; }

/* ── Empty state ── */
.empty-state { text-align: center; padding: 36px; }
.empty-icon  { font-size: 2.5rem; margin: 0 0 10px; }
.empty-text  { font-weight: 800; color: #021A54; margin: 0; }

/* ── Modal ── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 26, 84, 0.45);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 1200;
}

.modal-card {
  width: min(480px, 100%);
  border-radius: 20px;
  border: 2px solid #021A54;
  background: linear-gradient(180deg, #fff 0%, #fff8fb 100%);
  box-shadow: 0 24px 60px rgba(2, 26, 84, 0.25);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: calc(100dvh - 40px);
  overflow-y: auto;
}

.modal-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.modal-badge-wrap {
  width: 72px;
  height: 72px;
}

.modal-badge-icon { width: 100%; height: 100%; object-fit: contain; }

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid #021A54;
  background: #F5F5F5;
  color: #021A54;
  font-size: 1.3rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  flex-shrink: 0;
}

.close-btn:hover { background: #FFCEE3; }

.status-pill {
  display: inline-block;
  font-size: 0.8rem;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 999px;
  border: 2px solid #021A54;
}

.pill-unlocked { background: #FF85BB; color: #021A54; }
.pill-locked   { background: #F5F5F5; color: #021A54; }

.modal-title { font-size: 1.3rem; font-weight: 800; color: #021A54; margin: 0; }
.modal-desc  { font-size: 0.9rem; color: rgba(2, 26, 84, 0.75); font-weight: 600; margin: 0; }

.modal-stats-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.modal-stat { display: flex; flex-direction: column; gap: 2px; }
.modal-stat-label { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: #FF85BB; }
.modal-stat-value { font-size: 1rem; font-weight: 800; color: #021A54; }
.modal-stat-need  { color: #FF85BB; }

.modal-progress-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-progress-bar {
  flex: 1;
  height: 10px;
  border-radius: 999px;
  background: rgba(2, 26, 84, 0.1);
  overflow: hidden;
}

.modal-progress-fill {
  height: 100%;
  background: #FF85BB;
  border-radius: 999px;
  transition: width 600ms cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-progress-pct { font-size: 0.85rem; font-weight: 800; color: #021A54; }

.modal-tip {
  font-size: 0.88rem;
  font-weight: 600;
  color: rgba(2, 26, 84, 0.75);
  margin: 0;
  padding: 10px 14px;
  border-radius: 10px;
  background: #FFCEE3;
  border: 2px solid #FF85BB;
}

/* ── Transitions ── */
.fade-enter-active, .fade-leave-active { transition: opacity 180ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── Responsive ── */
@media (max-width: 640px) {
  .achievements-page { padding: 12px; gap: 12px; }
  .page-header-card { flex-direction: column; align-items: flex-start; }
  .badges-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (prefers-reduced-motion: reduce) {
  .badge-tile, .stat-card { transition: none; }
  .badge-progress-fill, .modal-progress-fill { transition: none; }
  .skeleton-card, .badge-skeleton { animation: none; }
}
</style>