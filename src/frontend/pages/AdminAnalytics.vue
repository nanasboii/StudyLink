<template>
  <main class="view page active analytics-page">
    <section class="phone-shell">
      <div class="analytics-content">

        <div class="card page-header">
          <div>
            <p class="page-kicker">Platform overview</p>
            <h2>Analytics Dashboard</h2>
            <p class="page-subtext">Live snapshot of StudyLink activity and growth.</p>
          </div>
          <div class="header-right">
            <p v-if="lastUpdated" class="last-updated">Updated {{ lastUpdated }}</p>
            <button @click="loadAnalytics" class="chip chip-strong" type="button" :disabled="isLoading">
              {{ isLoading ? 'Loading…' : 'Refresh 🔄' }}
            </button>
          </div>
        </div>

        <p v-if="message" class="message error-msg">{{ message }}</p>

        <div class="stats-grid">
          <template v-if="isLoading">
            <div v-for="n in 6" :key="n" class="stat-card card skeleton-card"></div>
          </template>
          <template v-else>
            <div 
              class="stat-card card" 
              v-for="card in statCards" 
              :key="card.key"
              role="region" 
              :aria-label="card.label"
            >
              <div class="stat-icon" aria-hidden="true">
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

        <div v-if="trends.length === 0 && !isLoading" class="card empty-state">
          <p class="empty-icon">📉</p>
          <p>No trend data available.</p>
        </div>

        <div class="trends-list">
          <div v-for="trend in trends" :key="trend.id" class="trend-card card">
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
          <h3>Top Contributors 🏆</h3>
          <p class="section-sub">Users with the most uploaded resources</p>
        </div>

        <div class="contributors-list" v-if="topContributors.length">
          <div v-for="(c, i) in topContributors" :key="c.email" class="contributor-row card">
            <div class="contributor-rank">#{{ i + 1 }}</div>
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
          <h3>Points Distribution 🌟</h3>
          <p class="section-sub">Breakdown of how points have been earned</p>
        </div>

        <div class="card points-breakdown" v-if="Object.keys(pointsDistribution).length">
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

const formatNumber = (n) => (n ?? 0).toLocaleString()

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
  requireRoleSession('admin')
  loadAnalytics()
})
</script>

<style scoped>
.analytics-page {
  max-width: 1024px;
  margin: 0 auto;
  padding: 20px;
}

.analytics-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Glass Card 🪟 */
.card {
  border: 2px solid #021A54;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(2, 26, 84, 0.05);
  padding: 20px;
}

/* ── Header ── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.page-kicker {
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #FF85BB;
  margin: 0 0 4px;
}

.page-header h2 {
  font-size: clamp(1.6rem, 2.5vw, 2.2rem);
  margin: 0 0 4px;
  color: #021A54;
}

.page-subtext {
  font-size: 0.95rem;
  color: rgba(2, 26, 84, 0.7);
  font-weight: 600;
  margin: 0;
}

.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.last-updated {
  font-size: 0.8rem;
  font-weight: 700;
  color: #021A54;
  margin: 0;
}

.chip-strong {
  background: #FF85BB;
  color: #021A54;
  border: 2px solid #021A54;
  border-radius: 8px;
  padding: 8px 14px;
  font-weight: bold;
  cursor: pointer;
  font-size: 0.9rem;
}

.error-msg {
  margin: 0;
  padding: 12px 16px;
  background: #FFCEE3;
  border: 2px solid #FF85BB;
  border-radius: 12px;
  color: #021A54;
  font-size: 0.95rem;
  font-weight: 800;
}

/* ── Stat cards grid ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  transition: transform 150ms ease, box-shadow 150ms ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(2, 26, 84, 0.1);
}

/* Skeleton Loaders */
.skeleton-card {
  height: 100px;
  background: linear-gradient(90deg, rgba(255,255,255,0.4) 25%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.4) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  pointer-events: none;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.stat-icon {
  width: 54px;
  height: 54px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: #FFCEE3;
  color: #021A54;
  border: 2px solid #021A54;
}

.stat-icon svg {
  width: 26px;
  height: 26px;
  fill: currentColor;
}

.stat-body {
  min-width: 0;
}

.stat-label {
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #FF85BB;
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-value {
  font-size: 2rem;
  font-weight: 800;
  color: #021A54;
  margin: 0;
  line-height: 1;
}

/* ── Section Headers ── */
.section-header {
  margin-top: 10px;
}

.section-header h3 {
  font-size: 1.4rem;
  font-weight: 800;
  margin: 0 0 4px;
  color: #021A54;
}

.section-sub {
  font-size: 0.95rem;
  color: rgba(2, 26, 84, 0.7);
  font-weight: 600;
  margin: 0;
}

.empty-state {
  text-align: center;
  padding: 32px;
  color: #021A54;
  font-weight: 800;
  font-size: 1.1rem;
}

.empty-icon {
  font-size: 2.5rem;
  margin: 0 0 10px;
}

/* ── Trends section ── */
.trends-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.trend-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trend-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.trend-label {
  font-size: 1.1rem;
  font-weight: 800;
  color: #021A54;
}

.trend-subtitle {
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(2, 26, 84, 0.7);
  margin: 4px 0 0;
}

.trend-delta {
  font-size: 0.85rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 999px;
  border: 2px solid #021A54;
}

.trend-delta.up { background: #FF85BB; color: #021A54; }
.trend-delta.down { background: #FFCEE3; color: #021A54; }
.trend-delta.neutral { background: #F5F5F5; color: #021A54; }

.trend-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 6px;
}

.bar-group {
  display: grid;
  grid-template-columns: 85px 1fr 40px;
  align-items: center;
  gap: 10px;
}

.bar-legend {
  font-size: 0.8rem;
  font-weight: 800;
  color: #021A54;
}

.bar-track {
  height: 12px;
  border-radius: 999px;
  background: rgba(2, 26, 84, 0.1);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 600ms cubic-bezier(0.4, 0, 0.2, 1);
}

.bar-fill.current { background: #FF85BB; }
.bar-fill.prior { background: #FFCEE3; }

.bar-value {
  font-size: 0.9rem;
  font-weight: 800;
  color: #021A54;
  text-align: right;
}

/* ── Top Contributors ── */
.contributors-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.contributor-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
}

.contributor-rank {
  font-size: 1rem;
  font-weight: 800;
  color: #FF85BB;
  width: 24px;
}

.contributor-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #FFCEE3;
  color: #021A54;
  border: 2px solid #021A54;
  font-size: 1.1rem;
  font-weight: 800;
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
  margin: 0 0 4px;
  font-size: 1.05rem;
  font-weight: 800;
  color: #021A54;
}

.contributor-email {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(2, 26, 84, 0.7);
}

.contributor-badge {
  font-size: 0.85rem;
  font-weight: 800;
  padding: 6px 14px;
  border-radius: 999px;
  background: #FF85BB;
  color: #021A54;
  border: 2px solid #021A54;
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
  grid-template-columns: 160px 1fr 60px;
  align-items: center;
  gap: 12px;
}

.points-reason {
  font-size: 0.95rem;
  font-weight: 800;
  color: #021A54;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.points-bar-track {
  height: 12px;
  border-radius: 999px;
  background: rgba(2, 26, 84, 0.1);
  overflow: hidden;
}

.points-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: #FF85BB;
  transition: width 600ms ease;
}

.points-value {
  font-size: 1rem;
  font-weight: 800;
  color: #021A54;
  text-align: right;
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header-right {
    align-items: flex-start;
    width: 100%;
  }
  
  .trends-list {
    grid-template-columns: 1fr;
  }
  
  .contributor-row {
    flex-wrap: wrap;
  }
  
  .contributor-count {
    width: 100%;
    padding-left: 56px;
  }
  
  .points-row {
    grid-template-columns: 1fr 60px;
  }
  
  .points-bar-track {
    grid-column: 1 / -1;
    order: 3;
    margin-top: -4px;
  }
  
  .points-value {
    order: 2;
  }
}
</style>
