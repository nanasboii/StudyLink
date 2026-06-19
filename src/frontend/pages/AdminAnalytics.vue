<template>
  <main class="view page active analytics-page">
    <section class="phone-shell">
      <div class="analytics-content">

        <!-- ── Header ── -->
        <div class="card page-header-card">
          <div class="header-left">
            <p class="page-kicker">Platform Overview</p>
            <h2>Analytics Dashboard</h2>
            <p class="page-subtext">Live snapshot of StudyLink activity and growth.</p>
          </div>
          <div class="header-right">
            <p v-if="lastUpdated" class="last-updated">Updated {{ lastUpdated }}</p>
            <button
              @click="loadAnalytics"
              class="btn-refresh"
              type="button"
              :disabled="isLoading"
              aria-label="Refresh analytics data"
            >
              <span class="btn-refresh-icon" aria-hidden="true">🔄</span>
              {{ isLoading ? 'Loading…' : 'Refresh' }}
            </button>
          </div>
        </div>

        <!-- ── Error ── -->
        <div
          v-if="message"
          class="error-banner"
          role="alert"
          aria-live="assertive"
        >
          ⚠️ {{ message }}
        </div>

        <!-- ── Stat Cards ── -->
        <div class="stats-grid" role="list" aria-label="Platform statistics">
          <template v-if="isLoading">
            <div v-for="n in 6" :key="n" class="stat-card card skeleton-card" aria-hidden="true"></div>
          </template>
          <template v-else>
            <div
              v-for="card in statCards"
              :key="card.key"
              class="stat-card card"
              role="listitem"
              :aria-label="`${card.label}: ${formatNumber(stats[card.key])}`"
            >
              <div class="stat-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" v-html="card.icon"></svg>
              </div>
              <div class="stat-body">
                <p class="stat-label">{{ card.label }}</p>
                <p class="stat-value">{{ formatNumber(stats[card.key]) }}</p>
              </div>
            </div>
          </template>
        </div>

        <!-- ── 7-Day Trends ── -->
        <div class="section-header">
          <h3>7-Day Trends</h3>
          <p class="section-sub">Comparing last 7 days vs prior 7 days</p>
        </div>

        <div v-if="!isLoading && trends.length === 0" class="card empty-state" role="status">
          <p class="empty-icon">📉</p>
          <p class="empty-text">No trend data yet.</p>
        </div>

        <div class="trends-grid" v-if="trends.length > 0">
          <div
            v-for="trend in trends"
            :key="trend.id ?? trend.label"
            class="trend-card card"
          >
            <div class="trend-head">
              <div class="trend-info">
                <strong class="trend-label">{{ trend.label }}</strong>
                <p class="trend-subtitle">
                  {{ trend.current ?? 0 }} this week · {{ trend.previous ?? 0 }} prior week
                </p>
              </div>
              <span
                class="trend-delta"
                :class="deltaClass(trend)"
                :aria-label="`Change: ${deltaLabel(trend)}`"
              >{{ deltaLabel(trend) }}</span>
            </div>
            <div class="trend-bars">
              <div class="bar-group">
                <span class="bar-legend">Last 7 days</span>
                <div class="bar-track" role="progressbar" :aria-valuenow="trend.current ?? 0">
                  <div class="bar-fill current" :style="{ width: barWidth(trend, 'current') }"></div>
                </div>
                <span class="bar-value">{{ trend.current ?? 0 }}</span>
              </div>
              <div class="bar-group">
                <span class="bar-legend">Prior 7 days</span>
                <div class="bar-track" role="progressbar" :aria-valuenow="trend.previous ?? 0">
                  <div class="bar-fill prior" :style="{ width: barWidth(trend, 'previous') }"></div>
                </div>
                <span class="bar-value">{{ trend.previous ?? 0 }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Top Contributors ── -->
        <template v-if="topContributors.length">
          <div class="section-header">
            <h3>Top Contributors 🏆</h3>
            <p class="section-sub">Users with the most uploaded resources</p>
          </div>

          <div class="contributors-list">
            <div
              v-for="(c, i) in topContributors"
              :key="c.email ?? i"
              class="contributor-row card"
            >
              <div class="contributor-rank" aria-label="Rank">#{{ i + 1 }}</div>
              <div class="contributor-avatar" aria-hidden="true">
                {{ (c.name || 'U')[0].toUpperCase() }}
              </div>
              <div class="contributor-info">
                <p class="contributor-name">{{ c.name || '—' }}</p>
                <p class="contributor-email">{{ c.email || '—' }}</p>
              </div>
              <div class="contributor-count">
                <span class="contributor-badge">
                  {{ c.resourcecount ?? 0 }} resource{{ (c.resourcecount ?? 0) !== 1 ? 's' : '' }}
                </span>
              </div>
            </div>
          </div>
        </template>

        <!-- ── Points Distribution ── -->
        <template v-if="Object.keys(pointsDistribution).length">
          <div class="section-header">
            <h3>Points Distribution 🌟</h3>
            <p class="section-sub">Breakdown of how points have been earned</p>
          </div>

          <div class="card points-breakdown">
            <div
              v-for="(val, key) in pointsDistribution"
              :key="key"
              class="points-row"
            >
              <span class="points-reason">{{ formatPointsReason(key) }}</span>
              <div class="points-bar-track">
                <div
                  class="points-bar-fill"
                  :style="{ width: pointsBarWidth(key) }"
                  role="progressbar"
                  :aria-valuenow="Number(val)"
                ></div>
              </div>
              <span class="points-value">{{ Number(val ?? 0).toLocaleString() }}</span>
            </div>
          </div>
        </template>

      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api, requireRoleSession } from '@/api.js'

// ── State ──
const stats = ref({
  totalUsers: 0,
  verifiedTutors: 0,
  activeBookings: 0,
  totalResources: 0,
  totalPoints: 0,
  totalBadges: 0,
})
const trends = ref([])
const topContributors = ref([])
const pointsDistribution = ref({})
const message = ref('')
const isLoading = ref(false)
const lastUpdated = ref(null)

// ── Stat card definitions ──
const statCards = [
  {
    key: 'totalUsers',
    label: 'Total Users',
    icon: '<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>',
  },
  {
    key: 'verifiedTutors',
    label: 'Verified Tutors',
    icon: '<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 14l-3-3 1.41-1.41L11 12.17l4.59-4.58L17 9l-6 6z"/>',
  },
  {
    key: 'activeBookings',
    label: 'Active Bookings',
    icon: '<path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>',
  },
  {
    key: 'totalResources',
    label: 'Total Resources',
    icon: '<path d="M19 3H5c-1.1 0-2 .9-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>',
  },
  {
    key: 'totalPoints',
    label: 'Total Points Awarded',
    icon: '<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>',
  },
  {
    key: 'totalBadges',
    label: 'Achievements Unlocked',
    icon: '<path d="M12 2L9.19 8.62 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2z"/>',
  },
]

// ── Helpers ──
const formatNumber = (n) => (n ?? 0).toLocaleString()

const deltaClass = (trend) => {
  const current = Number(trend.current ?? 0)
  const previous = Number(trend.previous ?? 0)
  if (!previous) return current > 0 ? 'up' : 'neutral'
  return current >= previous ? 'up' : 'down'
}

const deltaLabel = (trend) => {
  const current = Number(trend.current ?? 0)
  const previous = Number(trend.previous ?? 0)
  if (!previous) return current > 0 ? '+100%' : '—'
  const pct = Math.round(((current - previous) / previous) * 100)
  return pct >= 0 ? `+${pct}%` : `${pct}%`
}

const barWidth = (trend, key) => {
  const max = Math.max(Number(trend.current ?? 0), Number(trend.previous ?? 0), 1)
  return `${Math.round((Number(trend[key] ?? 0) / max) * 100)}%`
}

const formatPointsReason = (key) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const pointsBarWidth = (key) => {
  const vals = Object.values(pointsDistribution.value).map(Number)
  const max = Math.max(...vals, 1)
  return `${Math.round((Number(pointsDistribution.value[key] ?? 0) / max) * 100)}%`
}

// ── Load ──
const loadAnalytics = async () => {
  if (isLoading.value) return
  isLoading.value = true
  message.value = ''
  try {
    const resp = await api('/admin/analytics')
    stats.value = { ...stats.value, ...(resp?.stats ?? {}) }
    trends.value = Array.isArray(resp?.trends) ? resp.trends : []
    topContributors.value = Array.isArray(resp?.topContributors) ? resp.topContributors : []
    pointsDistribution.value = resp?.pointsDistribution ?? {}
    lastUpdated.value = new Date().toLocaleTimeString('en-MY', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (err) {
    message.value = err?.message ?? 'Failed to load analytics.'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  requireRoleSession('admin')
  loadAnalytics()
})
</script>

<style scoped>
/* ── Local token overrides ── */
.analytics-page {
  --ink: #021A54;
  --ink-muted: rgba(2, 26, 84, 0.65);
  --primary: #FF85BB;
  --primary-soft: #FFCEE3;
  --canvas: #ffffff;
  --canvas-parchment: #F5F5F5;
  --hairline: #e0e0e0;
  --radius-card: 16px;
  --radius-pill: 999px;
}

/* ── Layout ── */
.analytics-page {
  background: var(--canvas-parchment);
  min-height: 100vh;
}

.phone-shell {
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: 24px 20px 48px;
}

.analytics-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Glass Card Base ── */
.card {
  background: var(--canvas);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-card);
  padding: 20px;
  box-shadow: 0 2px 12px rgba(2, 26, 84, 0.05);
}

/* ── Page Header ── */
.page-header-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  background: linear-gradient(135deg, #ffffff 60%, var(--primary-soft) 100%);
  border: 1px solid var(--primary-soft);
}

.page-kicker {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--primary);
  margin: 0 0 6px;
}

.page-header-card h2 {
  font-size: clamp(1.5rem, 3vw, 2rem);
  font-weight: 800;
  color: var(--ink);
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}

.page-subtext {
  font-size: 0.9rem;
  color: var(--ink-muted);
  font-weight: 500;
  margin: 0;
}

.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.last-updated {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0;
}

.btn-refresh {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--primary);
  color: var(--ink);
  border: 1.5px solid var(--ink);
  border-radius: 10px;
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 120ms ease, transform 120ms ease;
}

.btn-refresh:hover:not(:disabled) {
  opacity: 0.88;
}

.btn-refresh:active {
  transform: scale(0.96);
}

.btn-refresh:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-refresh-icon {
  font-size: 0.95rem;
}

/* ── Error Banner ── */
.error-banner {
  background: rgba(255, 133, 187, 0.15);
  border: 1.5px solid var(--primary);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ink);
}

/* ── Stats Grid ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 14px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  transition: transform 150ms ease, box-shadow 150ms ease;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(2, 26, 84, 0.1);
}

/* Skeleton */
.skeleton-card {
  height: 96px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.5) 0%,
    rgba(255, 206, 227, 0.4) 50%,
    rgba(255, 255, 255, 0.5) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
  pointer-events: none;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-card { animation: none; }
  .bar-fill, .points-bar-fill { transition: none; }
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--primary-soft);
  color: var(--ink);
  border: 1.5px solid var(--ink);
}

.stat-icon svg {
  width: 24px;
  height: 24px;
  fill: var(--ink);
}

.stat-body {
  min-width: 0;
}

.stat-label {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--primary);
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-value {
  font-size: 1.9rem;
  font-weight: 800;
  color: var(--ink);
  margin: 0;
  line-height: 1;
  letter-spacing: -0.02em;
}

/* ── Section Headers ── */
.section-header {
  margin-top: 4px;
  padding-bottom: 2px;
}

.section-header h3 {
  font-size: 1.3rem;
  font-weight: 800;
  color: var(--ink);
  margin: 0 0 3px;
  letter-spacing: -0.01em;
}

.section-sub {
  font-size: 0.88rem;
  color: var(--ink-muted);
  font-weight: 500;
  margin: 0;
}

/* ── Empty State ── */
.empty-state {
  text-align: center;
  padding: 36px 20px;
  color: var(--ink-muted);
}

.empty-icon {
  font-size: 2.2rem;
  margin: 0 0 10px;
}

.empty-text {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink-muted);
  margin: 0;
}

/* ── Trends Grid ── */
.trends-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
}

.trend-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.trend-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.trend-label {
  font-size: 1rem;
  font-weight: 800;
  color: var(--ink);
  display: block;
}

.trend-subtitle {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--ink-muted);
  margin: 4px 0 0;
}

.trend-delta {
  font-size: 0.82rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  border: 1.5px solid var(--ink);
  white-space: nowrap;
  flex-shrink: 0;
}

.trend-delta.up   { background: var(--primary); color: var(--ink); }
.trend-delta.down { background: var(--primary-soft); color: var(--ink); }
.trend-delta.neutral { background: var(--canvas-parchment); color: var(--ink-muted); border-color: var(--hairline); }

.trend-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bar-group {
  display: grid;
  grid-template-columns: 90px 1fr 36px;
  align-items: center;
  gap: 10px;
}

.bar-legend {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ink);
}

.bar-track {
  height: 10px;
  border-radius: var(--radius-pill);
  background: rgba(2, 26, 84, 0.08);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: var(--radius-pill);
  transition: width 550ms cubic-bezier(0.4, 0, 0.2, 1);
}

.bar-fill.current { background: var(--primary); }
.bar-fill.prior   { background: var(--primary-soft); }

.bar-value {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--ink);
  text-align: right;
}

/* ── Top Contributors ── */
.contributors-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.contributor-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
}

.contributor-rank {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--primary);
  width: 26px;
  flex-shrink: 0;
}

.contributor-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--ink);
  border: 1.5px solid var(--ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 800;
  flex-shrink: 0;
}

.contributor-info {
  flex: 1;
  min-width: 0;
}

.contributor-name {
  margin: 0 0 2px;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contributor-email {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--ink-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contributor-count {
  flex-shrink: 0;
}

.contributor-badge {
  display: inline-block;
  font-size: 0.8rem;
  font-weight: 800;
  padding: 5px 12px;
  border-radius: var(--radius-pill);
  background: var(--primary);
  color: var(--ink);
  border: 1.5px solid var(--ink);
  white-space: nowrap;
}

/* ── Points Distribution ── */
.points-breakdown {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.points-row {
  display: grid;
  grid-template-columns: 160px 1fr 70px;
  align-items: center;
  gap: 12px;
}

.points-reason {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.points-bar-track {
  height: 10px;
  border-radius: var(--radius-pill);
  background: rgba(2, 26, 84, 0.08);
  overflow: hidden;
}

.points-bar-fill {
  height: 100%;
  border-radius: var(--radius-pill);
  background: var(--primary);
  transition: width 550ms cubic-bezier(0.4, 0, 0.2, 1);
}

.points-value {
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--ink);
  text-align: right;
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .phone-shell {
    padding: 16px 12px 40px;
  }

  .page-header-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-right {
    align-items: flex-start;
    width: 100%;
  }

  .btn-refresh {
    width: 100%;
    justify-content: center;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }

  .trends-grid {
    grid-template-columns: 1fr;
  }

  .points-row {
    grid-template-columns: 1fr 60px;
  }

  .points-bar-track {
    grid-column: 1 / -1;
    margin-top: -8px;
  }

  .contributor-row {
    flex-wrap: wrap;
  }

  .contributor-count {
    width: 100%;
    padding-left: 54px;
  }
}

@media (max-width: 400px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>