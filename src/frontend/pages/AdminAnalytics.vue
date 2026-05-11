<template>
  <div class="view page active">
    <div class="search-row">
      <h2>Analytics Dashboard</h2>
      <button @click="loadAnalytics" class="chip" type="button">Refresh</button>
    </div>
    <div class="analytics-grid">
      <div class="stat-card users">
        <h3>Total Users</h3>
        <div class="number">{{ stats.totalUsers }}</div>
      </div>
      <div class="stat-card tutors">
        <h3>Verified Tutors</h3>
        <div class="number">{{ stats.verifiedTutors }}</div>
      </div>
      <div class="stat-card bookings">
        <h3>Active Bookings</h3>
        <div class="number">{{ stats.activeBookings }}</div>
      </div>
      <div class="stat-card resources">
        <h3>Total Resources</h3>
        <div class="number">{{ stats.totalResources }}</div>
      </div>
      <div class="stat-card points">
        <h3>Total Points</h3>
        <div class="number">{{ stats.totalPoints }}</div>
      </div>
      <div class="stat-card badges">
        <h3>Achievements Unlocked</h3>
        <div class="number">{{ stats.totalBadges }}</div>
      </div>
    </div>
    <div class="section">
      <h2>7-Day Trends</h2>
      <div class="list">
        <div v-for="trend in trends" :key="trend.id" class="list-item">
          <p><strong>{{ trend.label }}</strong></p>
          <p class="meta">Last 7 days: {{ trend.current }} | Previous 7 days: {{ trend.previous }}</p>
        </div>
      </div>
    </div>
    <p v-if="message" class="message">{{ message }}</p>
  </div>
</template>

<script>
import { api } from '@/api.js'
export default {
  name: 'AdminAnalytics',
  data() {
    return {
      stats: {
        totalUsers: 0,
        verifiedTutors: 0,
        activeBookings: 0,
        totalResources: 0,
        totalPoints: 0,
        totalBadges: 0,
      },
      trends: [],
      message: '',
    }
  },
  methods: {
    async loadAnalytics() {
      try {
        const resp = await api('/admin/analytics')
        this.stats = resp.stats || {}
        this.trends = resp.trends || []
      } catch (err) {
        this.message = `Error: ${err.message}`
      }
    },
  },
  mounted() {
    const viewEl = document.querySelector('.view')
    const topbar = document.querySelector('.topbar')
    if (viewEl) {
      viewEl.scrollTop = topbar ? topbar.offsetHeight : 80
    }
    this.loadAnalytics()
  },
}
</script>

<style scoped>
.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}
.stat-card {
  padding: 1.5rem;
  border-radius: 8px;
  background: #f5f5f5;
  text-align: center;
}
.stat-card h3 {
  font-size: 0.875rem;
  color: #666;
  margin: 0 0 0.5rem 0;
}
.stat-card .number {
  font-size: 2rem;
  font-weight: 700;
  color: #000;
}
</style>
