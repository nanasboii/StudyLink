<template>
  <div class="view page active">
    <div class="achievements-header">
      <h2>Achievements</h2>
      <div class="points-display">
        <span class="points-label">Total Points:</span>
        <span class="points-value">{{ totalPoints }}</span>
      </div>
    </div>
    <section class="card achievements-summary">
      <div class="summary-tile">
        <div class="summary-label">Unlocked</div>
        <div class="summary-value">{{ unlockedCount }}</div>
      </div>
      <div class="summary-tile">
        <div class="summary-label">Locked</div>
        <div class="summary-value">{{ lockedCount }}</div>
      </div>
      <div class="summary-tile">
        <div class="summary-label">Next Target</div>
        <div class="summary-value">{{ nextTarget }}</div>
      </div>
    </section>
    <section class="achievements-section card">
      <h3>Your Achievements</h3>
      <div class="badges-grid">
        <div v-for="badge in achievements" :key="badge.id" class="badge-item" :class="{ unlocked: badge.isUnlocked }">
          <img :src="badge.icon" :alt="badge.name" class="badge-icon" />
          <p class="badge-name">{{ badge.name }}</p>
          <p class="badge-points">{{ badge.pointsRequired }} pts</p>
        </div>
      </div>
    </section>
    <section class="progress-section card">
      <h3>Achievement Progress</h3>
      <div class="progress-list">
        <div v-for="prog in progressItems" :key="prog.id" class="progress-item">
          <p class="progress-label">{{ prog.label }}</p>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: prog.percentage + '%' }"></div>
          </div>
          <p class="progress-value">{{ prog.current }} / {{ prog.total }}</p>
        </div>
      </div>
    </section>
    <p v-if="message" class="message">{{ message }}</p>
  </div>
</template>

<script>
import { api } from '../utils/api.js'
export default {
  name: 'Achievements',
  data() {
    return {
      achievements: [],
      progressItems: [],
      totalPoints: 0,
      message: '',
    }
  },
  computed: {
    unlockedCount() {
      return this.achievements.filter((a) => a.isUnlocked).length
    },
    lockedCount() {
      return this.achievements.filter((a) => !a.isUnlocked).length
    },
    nextTarget() {
      const next = this.achievements.find((a) => !a.isUnlocked)
      return next ? `${next.pointsRequired} pts` : '–'
    },
  },
  methods: {
    async loadAchievements() {
      try {
        const resp = await api('/achievements/me')
        this.achievements = resp.achievements || []
        this.totalPoints = resp.totalPoints || 0
        this.progressItems = resp.progressItems || []
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
    this.loadAchievements()
  },
}
</script>
