<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active analytics-page">

        <div class="page-header">
          <div>
            <p class="page-kicker">Platform overview</p>
            <h2>Analytics Dashboard</h2>
            <p class="page-subtext">Live snapshot of StudyLink activity and growth.</p>
          </div>
          <div class="header-right">
            <p v-if="lastUpdated" class="last-updated">Updated {{ lastUpdated }}</p>
            <button @click="loadAnalytics" class="chip" type="button" :disabled="isLoading">
              {{ isLoading ? 'Loading…' : 'Refresh' }}
            </button>
          </div>
        </div>

        <p v-if="message" class="message error-msg">{{ message }}</p>

        <div class="stats-grid">
          <template v-if="isLoading">
            <div v-for="n in 6" :key="n" class="stat-card skeleton-card">
              <div class="skeleton-icon"></div>
              <div class="skeleton-body">
                <div class="skeleton-line short"></div>
                <div class="skeleton-line long"></div>
              </div>
            </div>
          </template>
          <template v-else>
            <div 
              class="stat-card" 
              v-for="card in statCards" 
              :key="card.key"
              role="region" 
              :aria-label="card.label"
            >
              <div class="stat-icon" :class="card.color" aria-hidden="true">
                <svg viewBox="0 0 24 24" v-html="card.icon"></svg>
              </div>
              <div class="stat-body">
                <p class="stat-label" :id="`stat-label-${card.key}`">{{ card.label }}</p>
                <p class="stat-value" :aria-labelledby="`stat-label-${card.key}`">
                  {{ formatNumber(stats[card.key]) }}
                </p>
              </div>
            </div>
          </template>
        </div>

        <div class="section-header">
          <h3>7-Day Trends</h3>
          <p class="section-sub">Comparing last 7 days vs prior 7 days</p>
        </div>

        <div v-if="trends.length === 0 && !isLoading" class="empty-state">No trend data available.</div>

        <div class="trends-list">
          <div v-for="trend in trends" :key="trend.id" class="trend-card">
            <div class="trend-head">
              <div>
                <strong class="trend-label">{{ trend.label }}</strong>
                <p class="trend-subtitle">{{ trend.current }} this week · {{ trend.previous }} prior week</p>
              </div>
              <span class="trend-delta" :class="deltaClass(trend)">{{ deltaLabel(trend) }}</span>
            </div>
            <div class="trend-bars">
              <div class="bar-group">
                <span class="bar-legend">Last 7 days</span>
                <div class="bar-track">
                  <div class="bar-fill current" :style="{ width: barWidth(trend, 'current') }"></div>
                </div>
                <span class="bar-value">{{ trend.current }}</span>
              </div>
              <div class="bar-group">
                <span class="bar-legend">Prior 7 days</span>
                <div class="bar-track">
                  <div class="bar-fill prior" :style="{ width: barWidth(trend, 'previous') }"></div>
                </div>
                <span class="bar-value">{{ trend.previous }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="section-header" v-if="topContributors.length">
          <h3>Top Contributors</h3>
          <p class="section-sub">Users with the most uploaded resources</p>
        </div>

        <div class="contributors-list" v-if="topContributors.length">
          <div v-for="(c, i) in topContributors" :key="c.email" class="contributor-row">
            <div class="contributor-rank">{{ i + 1 }}</div>
            <div class="contributor-avatar">{{ (c.name || 'U')[0].toUpperCase() }}</div>
            <div class="contributor-info">
              <p class="contributor-name">{{ c.name }}</p>
              <p class="contributor-email">{{ c.email }}</p>
            </div>
            <div class="contributor-count">
              <span class="contributor-badge">{{ c.resourcecount }} resource{{ c.resourcecount !== 1 ? 's' : '' }}</span>
            </div>
          </div>
        </div>

        <div class="section-header" v-if="Object.keys(pointsDistribution).length">
          <h3>Points Distribution</h3>
          <p class="section-sub">Breakdown of how points have been earned</p>
        </div>

        <div class="points-breakdown" v-if="Object.keys(pointsDistribution).length">
          <div v-for="(val, key) in pointsDistribution" :key="key" class="points-row">
            <span class="points-reason">{{ formatPointsReason(key) }}</span>
            <div class="points-bar-track">
              <div class="points-bar-fill" :style="{ width: pointsBarWidth(key) }"></div>
            </div>
            <span class="points-value">{{ Number(val).toLocaleString() }}</span>
          </div>
        </div>

      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api, requireRoleSession } from '@/api.js'

const stats = ref({
  totalUsers: 0,
  verifiedTutors: 0,
  activeBookings: 0,
  totalResources: 0,
  totalPoints: 0,
  totalBadges: 0,
})

// BUG 6: Initialized refs for server data
const trends = ref([])
const topContributors = ref([])
const pointsDistribution = ref({})

const message = ref('')
const isLoading = ref(false)
const lastUpdated = ref(null)

const statCards = [
  {
    key: 'totalUsers',
    label: 'Total Users',
    color: 'pink',
    icon: '<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>',
  },
  {
    key: 'verifiedTutors',
    label: 'Verified Tutors',
    color: 'rose',
    icon: '<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 14l-3-3 1.41-1.41L11 12.17l4.59-4.58L17 9l-6 6z"/>',
  },
  {
    key: 'activeBookings',
    label: 'Active Bookings',
    color: 'mauve',
    icon: '<path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>',
  },
  {
    key: 'totalResources',
    label: 'Total Resources',
    color: 'blush',
    // BUG 3 Fix: Replaced with valid SVG bounds
    icon: '<path d="M19 3H5c-1.1 0-2 .9-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>',
  },
  {
    key: 'totalPoints',
    label: 'Total Points Awarded',
    color: 'pink',
    // BUG 4 Fix: Star icon for points
    icon: '<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>',
  },
  {
    key: 'totalBadges',
    label: 'Achievements Unlocked',
    color: 'rose',
    icon: '<path d="M12 2L9.19 8.62 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2z"/>',
  },
]

const formatNumber = (n) => (n ?? 0).toLocaleString()

// BUG 5 Fix: Properly handle nulls -> NaN -> divisions by zero
const deltaClass = (trend) => {
  const current = Number(trend.current || 0)
  const previous = Number(trend.previous || 0)
  if (!previous) return current > 0 ? 'up' : 'neutral'
  return current >= previous ? 'up' : 'down'
}

const deltaLabel = (trend) => {
  const current = Number(trend.current || 0)
  const previous = Number(trend.previous || 0)
  if (!previous) return current > 0 ? '+100%' : '—'
  const pct = Math.round(((current - previous) / previous) * 100)
  return pct >= 0 ? `+${pct}%` : `${pct}%`
}

const barWidth = (trend, key) => {
  const max = Math.max(Number(trend.current || 0), Number(trend.previous || 0), 1)
  return `${Math.round((Number(trend[key] || 0) / max) * 100)}%`
}

// IMPROVEMENT 2: Points Formatting Helpers
const formatPointsReason = (key) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const pointsBarWidth = (key) => {
  const vals = Object.values(pointsDistribution.value).map(Number)
  const max = Math.max(...vals, 1)
  return `${Math.round((Number(pointsDistribution.value[key]) / max) * 100)}%`
}

const loadAnalytics = async () => {
  isLoading.value = true
  message.value = ''
  try {
    const resp = await api('/admin/analytics')
    stats.value = { ...stats.value, ...(resp.stats || {}) }
    trends.value = Array.isArray(resp.trends) ? resp.trends : []
    
    // BUG 6 Fix: Save topContributors & pointsDistribution
    topContributors.value = Array.isArray(resp.topContributors) ? resp.topContributors : []
    pointsDistribution.value = resp.pointsDistribution || {}
    
    lastUpdated.value = new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })
  } catch (err) {
    message.value = `Error: ${err.message}`
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  // BUG 1 Fix: Explicit admin gate
  requireRoleSession('admin')
  loadAnalytics()
})
</script>

<style scoped>
.analytics-page {
  padding-bottom: 3rem;
}

/* ── Header ── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 2rem 2rem 1.25rem;
  flex-wrap: wrap;
}

.page-kicker {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  margin: 0 0 0.25rem;
}

.page-header h2 {
  font-size: clamp(1.4rem, 2.5vw, 2rem);
  margin: 0 0 0.25rem;
  color: var(--ink);
}

.page-subtext {
  font-size: 0.85rem;
  color: var(--glass-pink-muted);
  margin: 0;
}

.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.last-updated {
  font-size: 0.75rem;
  color: var(--glass-pink-muted);
  margin: 0;
}

.error-msg {
  margin: 0 2rem 1rem;
  padding: 0.75rem 1rem;
  background: rgba(191, 47, 69, 0.08);
  border: 1px solid rgba(191, 47, 69, 0.2);
  border-radius: 10px;
  color: var(--danger);
  font-size: 0.875rem;
}

/* ── Stat cards grid ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  padding: 0 2rem 2rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-radius: 16px;
  background: var(--glass-pink-surface-strong);
  border: 1px solid var(--glass-pink-border);
  box-shadow: 0 4px 16px rgba(74, 20, 41, 0.07);
  backdrop-filter: blur(10px);
  transition: transform 150ms ease, box-shadow 150ms ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(74, 20, 41, 0.12);
}

/* Skeleton Loaders */
.skeleton-card {
  background: var(--glass-pink-surface-strong);
  border: 1px solid var(--glass-pink-border);
  border-radius: 16px;
  padding: 1.25rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  pointer-events: none;
}
.skeleton-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(90deg, #f0e6ea 25%, #e8d8de 50%, #f0e6ea 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  flex-shrink: 0;
}
.skeleton-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.skeleton-line {
  height: 12px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f0e6ea 25%, #e8d8de 50%, #f0e6ea 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
.skeleton-line.short { width: 55%; }
.skeleton-line.long  { width: 35%; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon svg {
  width: 22px;
  height: 22px;
  fill: currentColor;
}

.stat-icon.pink {
  background: rgba(177, 31, 75, 0.1);
  color: var(--accent);
}

.stat-icon.rose {
  background: rgba(161, 32, 75, 0.14);
  color: #a61f4b;
}

.stat-icon.mauve {
  background: rgba(119, 23, 56, 0.1);
  color: var(--accent-2);
}

.stat-icon.blush {
  background: rgba(255, 183, 197, 0.35);
  color: #9b2547;
}

.stat-body {
  min-width: 0;
}

.stat-label {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--glass-pink-muted);
  margin: 0 0 0.2rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  font-family: "Josefin Sans", "Trebuchet MS", sans-serif;
  color: var(--ink);
  margin: 0;
  line-height: 1;
}

/* ── Trends section ── */
.section-header {
  padding: 0 2rem 1rem;
  border-top: 1px solid var(--line);
  padding-top: 1.5rem;
}

.section-header h3 {
  font-size: 1.1rem;
  margin: 0 0 0.2rem;
  color: var(--ink);
}

.section-sub {
  font-size: 0.8rem;
  color: var(--glass-pink-muted);
  margin: 0;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--glass-pink-muted);
  font-size: 0.9rem;
}

.trends-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0 2rem 2rem; /* added bottom padding */
}

.trend-card {
  background: var(--glass-pink-surface-strong);
  border: 1px solid var(--glass-pink-border);
  border-radius: 14px;
  padding: 1.1rem 1.25rem;
  box-shadow: 0 2px 10px rgba(74, 20, 41, 0.06);
}

.trend-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 0.85rem;
}

.trend-label {
  font-size: 0.9rem;
  color: var(--ink);
}

.trend-subtitle {
  font-size: 0.73rem;
  color: var(--glass-pink-muted);
  margin: 2px 0 0;
  font-weight: 400;
}

.trend-delta {
  font-size: 0.78rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  margin-top: 2px; /* optical alignment */
}

.trend-delta.up {
  background: rgba(34, 134, 82, 0.12);
  color: #1b7a4a;
}

.trend-delta.down {
  background: rgba(191, 47, 69, 0.1);
  color: var(--danger);
}

.trend-delta.neutral {
  background: rgba(125, 90, 104, 0.1);
  color: var(--glass-pink-muted);
}

.trend-bars {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bar-group {
  display: grid;
  grid-template-columns: 90px 1fr 36px;
  align-items: center;
  gap: 0.6rem;
}

.bar-legend {
  font-size: 0.72rem;
  color: var(--glass-pink-muted);
  white-space: nowrap;
}

.bar-track {
  height: 8px;
  border-radius: 999px;
  background: rgba(177, 31, 75, 0.08);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 600ms cubic-bezier(0.4, 0, 0.2, 1);
}

.bar-fill.current {
  background: linear-gradient(90deg, #b11f4b, #d94070);
}

.bar-fill.prior {
  background: linear-gradient(90deg, rgba(177, 31, 75, 0.35), rgba(177, 31, 75, 0.5));
}

.bar-value {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--ink);
  text-align: right;
}

/* ── Top Contributors ── */
.contributors-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 2rem 2rem;
}

.contributor-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--glass-pink-surface-strong);
  border: 1px solid var(--glass-pink-border);
  border-radius: 12px;
}

.contributor-rank {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--glass-pink-muted);
  width: 18px;
  text-align: center;
}

.contributor-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(177, 31, 75, 0.12);
  color: var(--accent);
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.contributor-info {
  flex: 1;
  min-width: 0;
}

.contributor-name {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--ink);
}

.contributor-email {
  margin: 0;
  font-size: 0.75rem;
  color: var(--glass-pink-muted);
}

.contributor-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(177, 31, 75, 0.1);
  color: var(--accent);
}

/* ── Points Distribution ── */
.points-breakdown {
  padding: 0 2rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.points-row {
  display: grid;
  grid-template-columns: 140px 1fr 50px;
  align-items: center;
  gap: 0.8rem;
}

.points-reason {
  font-size: 0.8rem;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.points-bar-track {
  height: 8px;
  border-radius: 999px;
  background: rgba(177, 31, 75, 0.08);
  overflow: hidden;
}

.points-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #b11f4b, #d94070);
  transition: width 600ms ease;
}

.points-value {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink);
  text-align: right;
}

/* ── Responsive ── */
@media (max-width: 600px) {
  .page-header,
  .stats-grid,
  .section-header,
  .trends-list,
  .contributors-list,
  .points-breakdown {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }

  .stat-value {
    font-size: 1.4rem;
  }
}
</style>
