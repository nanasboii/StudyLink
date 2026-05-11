<template>
  <main class="page-bg leaderboard-page">
    <section class="phone-shell">
      <div class="view page active">
        <section class="card leaderboard-hero">
          <p class="leaderboard-kicker">Community standings</p>
          <div class="leaderboard-header">
            <h2>Total Achievement Leaderboard</h2>
            <button @click="refreshLeaderboard" class="chip" type="button">Refresh</button>
          </div>
        </section>

        <div class="leaderboard-tabs" role="tablist" aria-label="Leaderboard type">
          <button
            v-for="board in ['overall', 'tutor', 'tutee']"
            :key="board"
            @click="activeBoard = board"
            class="tab-btn"
            :class="{ 'is-active': activeBoard === board }"
            type="button"
            role="tab"
            :aria-selected="activeBoard === board"
          >
            {{ boardLabel(board) }}
          </button>
        </div>

        <p class="leaderboard-summary">{{ leaderboardRankingLabel }} • {{ filteredLeaderboard.length }} ranked users • Updated {{ updateTime }}</p>

        <div class="leaderboard-list">
          <div v-for="(entry, index) in filteredLeaderboard" :key="entry.id" class="leaderboard-card">
            <div class="rank-badge" :style="{ backgroundColor: getRankColor(index) }">
              <span class="rank-number">#{{ index + 1 }}</span>
            </div>
            
            <div class="leaderboard-content">
              <div class="profile-section">
                <img :src="entry.profilePicture || '/default-avatar.svg'" :alt="entry.firstName" class="profile-pic" />
                <div class="profile-info">
                  <div class="profile-name">
                    <strong>{{ entry.firstName }} {{ entry.lastName }}</strong>
                    <span class="role-badge" :class="'role-' + String(entry.role).toLowerCase()">{{ roleLabel(entry.role) }}</span>
                  </div>
                </div>
              </div>

              <div class="stats-group">
                <div class="stat-item">
                  <span class="stat-label">Achievements</span>
                  <strong>{{ entry.achievementCount || 0 }}</strong>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Points</span>
                  <strong>{{ entry.points || 0 }}</strong>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Rating</span>
                  <strong>{{ (entry.rating || 0).toFixed(2) }}</strong>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Reviews</span>
                  <strong>{{ entry.reviewCount || 'undefined' }}</strong>
                </div>
              </div>

              <button @click="goToProfile(entry.id)" class="view-profile-btn" type="button">View Public Profile</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script>
import { api } from '../utils/api.js'
export default {
  name: 'Leaderboards',
  data() {
    return {
      activeBoard: 'overall',
      leaderboardState: [],
    }
  },
  computed: {
    leaderboardRankingLabel() {
      const board = this.activeBoard
      return board === 'tutor' ? 'Top Tutors Ranking' : board === 'tutee' ? 'Top Tutees Ranking' : 'Overall Ranking'
    },
    updateTime() {
      const now = new Date()
      return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    },
    leaderboardSummary() {
      const now = new Date()
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      return `${this.leaderboardState.length} users • Updated ${timeStr}`
    },
    filteredLeaderboard() {
      if (this.activeBoard === 'tutor') {
        return this.leaderboardState.filter((e) => String(e.role).toLowerCase() === 'tutor')
      }
      if (this.activeBoard === 'tutee') {
        return this.leaderboardState.filter((e) => String(e.role).toLowerCase() === 'tutee')
      }
      return this.leaderboardState
    },
  },
  methods: {
    getRankColor(index) {
      const colors = ['#FFD700', '#C0C0C0', '#CD7F32', '#9575CD', '#64B5F6', '#81C784']
      return colors[index % colors.length]
    },
    roleLabel(role) {
      const v = String(role || 'tutee').toLowerCase()
      return v === 'admin' ? 'ADMIN' : v === 'tutor' ? 'TUTOR' : 'TUTEE'
    },
    boardLabel(board) {
      return board === 'tutor' ? 'Top Tutors' : board === 'tutee' ? 'Top Tutees' : 'Overall'
    },
    goToProfile(userId) {
      this.$router.push({ name: 'PublicProfile', params: { userId } })
    },
    async refreshLeaderboard() {
      try {
        const resp = await api('/leaderboard')
        this.leaderboardState = resp.leaderboard || []
      } catch (err) {
        console.error('Failed to load leaderboard:', err)
      }
    },
  },
  mounted() {
    const viewEl = document.querySelector('.view')
    const topbar = document.querySelector('.topbar')
    if (viewEl) {
      viewEl.scrollTop = topbar ? topbar.offsetHeight : 80
    }
    this.refreshLeaderboard()
  },
}
</script>

<style scoped>
.page-bg {
  min-height: 100vh;
  display: block;
  padding: 0;
  background: linear-gradient(180deg, #ffffff, #fff5f8 60%, #ffe7ee);
}

.phone-shell {
  width: 100%;
  max-width: 100%;
  margin: 0;
  min-height: 100vh;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  display: grid;
  grid-template-rows: 1fr;
  overflow: hidden;
}

.view {
  overflow-y: auto;
  padding: 20px 16px;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.leaderboard-kicker {
  margin: 0 0 8px 0;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: #c41e3a;
  font-weight: 700;
}

.leaderboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.leaderboard-header h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: #3f2f38;
}

.chip {
  border: 1px solid #c41e3a;
  background: #000;
  color: #fff;
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.chip:hover {
  background: #c41e3a;
  border-color: #c41e3a;
}

.leaderboard-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.tab-btn {
  border: 1px solid #e0e0e0;
  background: white;
  color: #666;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
}

.tab-btn:hover {
  border-color: #c41e3a;
  color: #c41e3a;
}

.tab-btn.is-active {
  background: #f5c1d1;
  color: #c41e3a;
  border-color: #c41e3a;
}

.leaderboard-summary {
  margin: 0 0 20px 0;
  font-size: 13px;
  color: #999;
}

.leaderboard-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.leaderboard-card {
  background: white;
  border: 1px solid #f0c4d1;
  border-radius: 8px;
  display: flex;
  gap: 16px;
  align-items: stretch;
  overflow: hidden;
  transition: all 150ms ease;
}

.leaderboard-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-color: #ffb7c5;
}

.rank-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  padding: 16px;
  font-weight: 700;
  color: white;
}

.rank-number {
  font-size: 16px;
  font-weight: 700;
}

.leaderboard-content {
  flex: 1;
  padding: 16px;
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
}

.profile-section {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 180px;
}

.profile-pic {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.profile-info {
  flex: 1;
}

.profile-name {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.profile-name strong {
  color: #3f2f38;
  font-size: 14px;
}

.role-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 3px 6px;
  border-radius: 3px;
}

.role-badge.role-tutor {
  background: #fff3cd;
  color: #997404;
}

.role-badge.role-tutee {
  background: #e7f3ff;
  color: #0c5aa0;
}

.role-badge.role-admin {
  background: #f8d7da;
  color: #721c24;
}

.stats-group {
  display: flex;
  gap: 24px;
  align-items: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.stat-label {
  font-size: 11px;
  color: #999;
  font-weight: 500;
  margin-bottom: 4px;
}

.stat-item strong {
  font-size: 16px;
  color: #3f2f38;
}

.view-profile-btn {
  border: 1px solid #e0e0e0;
  background: white;
  color: #666;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 150ms ease;
  white-space: nowrap;
}

.view-profile-btn:hover {
  border-color: #c41e3a;
  color: #c41e3a;
  background: #fff5f8;
}

@media (max-width: 768px) {
  .leaderboard-content {
    flex-direction: column;
    gap: 12px;
  }

  .profile-section {
    width: 100%;
  }

  .stats-group {
    width: 100%;
    justify-content: space-around;
  }

  .view-profile-btn {
    width: 100%;
  }
}
</style>
