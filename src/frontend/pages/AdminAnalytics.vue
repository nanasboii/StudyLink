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

<script setup>
import { ref, onMounted } from 'vue'
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

const loadAnalytics = async () => {
  try {
    const resp = await api('/admin/analytics')
    stats.value = resp.stats || stats.value
    trends.value = resp.trends || []
  } catch (err) {
    message.value = `Error: ${err.message}`
  }
}

onMounted(() => {
  loadAnalytics()
})
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
