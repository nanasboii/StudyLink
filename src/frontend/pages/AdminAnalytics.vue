<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active analytics-page">

        <!-- Header -->
        <div class="page-header">
          <div>
            <p class="page-kicker">Platform overview</p>
            <h2>Analytics Dashboard</h2>
            <p class="page-subtext">Live snapshot of StudyLink activity and growth.</p>
          </div>
          <button @click="loadAnalytics" class="chip" type="button" :disabled="isLoading">
            {{ isLoading ? 'Loading…' : 'Refresh' }}
          </button>
        </div>

        <p v-if="message" class="message error-msg">{{ message }}</p>

        <!-- Stat cards -->
        <div class="stats-grid">
          <div class="stat-card" v-for="card in statCards" :key="card.key">
            <div class="stat-icon" :class="card.color">
              <svg viewBox="0 0 24 24" aria-hidden="true" v-html="card.icon"></svg>
            </div>
            <div class="stat-body">
              <p class="stat-label">{{ card.label }}</p>
              <p class="stat-value">{{ formatNumber(stats[card.key]) }}</p>
            </div>
          </div>
        </div>

        <!-- 7-day trends -->
        <div class="section-header">
          <h3>7-Day Trends</h3>
          <p class="section-sub">Comparing last 7 days vs prior 7 days</p>
        </div>

        <div v-if="trends.length === 0 && !isLoading" class="empty-state">No trend data available.</div>

        <div class="trends-list">
          <div v-for="trend in trends" :key="trend.id" class="trend-card">
            <div class="trend-head">
              <strong class="trend-label">{{ trend.label }}</strong>
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

      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api.js'

const stats = ref({
  totalUsers: 0,
  verifiedTutors: 0,
  activeBookings: 0,
  totalResources: 0,
  totalPoints: 0,
  totalBadges: 0,
})
const trends = ref([])
const message = ref('')
const isLoading = ref(false)

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
    icon: '<path d="M20 6h-2.18c.07-.44.18-.88.18-1.36C18 2.53 15.86.5 13.25.5c-1.4 0-2.69.61-3.59 1.57L8 3.75 6.34 2.07C5.44 1.11 4.15.5 2.75.5.14.5-2 2.53-2 5.14c0 .48.11.92.18 1.36H-4v14h28V6h-4zM13.25 3c1.11 0 2 .89 2 2-.01.47-.14.89-.35 1.25L11.38 8.5C11.19 7.84 11 7.16 11 6.5V5c0-1.1.89-2 2-2zm-9.5 0c1.11 0 2 .89 2 2v1.5c0 .67-.19 1.34-.38 2L2.1 6.25C1.89 5.89 1.76 5.47 1.75 5c0-1.11.89-2 2-2z"/>',
  },
  {
    key: 'totalPoints',
    label: 'Total Points Awarded',
    color: 'pink',
    icon: '<path d="M11.5 2C6.81 2 3 5.81 3 10.5S6.81 19 11.5 19h.5v3c4.86-2.34 8-7 8-11.5C20 5.81 16.19 2 11.5 2zm1 14.5h-2v-2h2v2zm0-4h-2c0-3.25 3-3 3-5 0-1.1-.9-2-2-2s-2 .9-2 2h-2c0-2.21 1.79-4 4-4s4 1.79 4 4c0 2.5-3 2.75-3 5z"/>',
  },
  {
    key: 'totalBadges',
    label: 'Achievements Unlocked',
    color: 'rose',
    icon: '<path d="M12 2L9.19 8.62 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2z"/>',
  },
]

const formatNumber = (n) => (n ?? 0).toLocaleString()

const deltaClass = (trend) => {
  if (!trend.previous) return trend.current > 0 ? 'up' : 'neutral'
  return trend.current >= trend.previous ? 'up' : 'down'
}

const deltaLabel = (trend) => {
  if (!trend.previous) return trend.current > 0 ? '+100%' : '—'
  const pct = Math.round(((trend.current - trend.previous) / trend.previous) * 100)
  return pct >= 0 ? `+${pct}%` : `${pct}%`
}

const barWidth = (trend, key) => {
  const max = Math.max(trend.current, trend.previous, 1)
  return `${Math.round((trend[key] / max) * 100)}%`
}

const loadAnalytics = async () => {
  isLoading.value = true
  message.value = ''
  try {
    const resp = await api('/admin/analytics')
    stats.value = { ...stats.value, ...(resp.stats || {}) }
    trends.value = Array.isArray(resp.trends) ? resp.trends : []
  } catch (err) {
    message.value = `Error: ${err.message}`
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
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
  padding: 0 2rem;
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
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.85rem;
}

.trend-label {
  font-size: 0.9rem;
  color: var(--ink);
}

.trend-delta {
  font-size: 0.78rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
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

/* ── Responsive ── */
@media (max-width: 600px) {
  .page-header,
  .stats-grid,
  .section-header,
  .trends-list {
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
