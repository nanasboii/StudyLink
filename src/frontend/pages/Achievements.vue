<template>
  <main class="view page active achievements-page">
    <section class="card achievements-hero">
      <div class="hero-title-wrap">
        <h2>Achievements</h2>
        <p>Track your milestones and see what to unlock next.</p>
      </div>
      <div class="points-display" aria-label="Total learning points">
        <span class="points-label">Total Points</span>
        <span class="points-value">{{ totalPoints }}</span>
      </div>
    </section>

    <section class="card achievements-summary">
      <article class="summary-tile">
        <p class="summary-label">Unlocked</p>
        <p class="summary-value">{{ unlockedCount }}</p>
      </article>
      <article class="summary-tile">
        <p class="summary-label">Locked</p>
        <p class="summary-value">{{ lockedCount }}</p>
      </article>
      <article class="summary-tile">
        <p class="summary-label">Next Target</p>
        <p class="summary-value summary-value-next">{{ nextTargetLabel }}</p>
      </article>
    </section>

    <section class="card achievements-section">
      <h3>Your Badges</h3>
      <div class="badges-grid">
        <article
          v-for="badge in achievements"
          :key="badge.code"
          class="badge-item"
          :class="{ unlocked: badge.isUnlocked }"
        >
          <img :src="badge.iconUrl" :alt="badge.name" class="badge-icon" @error="onBadgeIconError" />
          <h4 class="badge-name">{{ badge.name }}</h4>
          <p class="badge-desc">{{ badge.description || 'Unlock this milestone by contributing to StudyLink.' }}</p>
          <p class="badge-points">{{ badge.pointsRequired }} pts</p>
          <p class="badge-status">{{ badge.isUnlocked ? 'Unlocked' : `${remainingPoints(badge)} pts to unlock` }}</p>
        </article>
      </div>
    </section>

    <section class="card progress-section">
      <h3>Progress Breakdown</h3>
      <div class="progress-list">
        <article v-for="badge in achievements" :key="`progress-${badge.code}`" class="progress-item">
          <div class="progress-head">
            <p class="progress-label">{{ badge.name }}</p>
            <p class="progress-value">{{ Math.min(totalPoints, badge.pointsRequired) }} / {{ badge.pointsRequired }}</p>
          </div>
          <div class="progress-bar" role="progressbar" :aria-valuemin="0" :aria-valuemax="badge.pointsRequired" :aria-valuenow="Math.min(totalPoints, badge.pointsRequired)">
            <div class="progress-fill" :style="{ width: `${progressPercent(badge)}%` }"></div>
          </div>
        </article>
      </div>
    </section>

    <p v-if="message" class="message">{{ message }}</p>
  </main>
</template>

<script>
import { api } from '@/api.js'

export default {
  name: 'Achievements',
  data() {
    return {
      achievements: [],
      totalPoints: 0,
      message: ''
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
      return this.achievements
        .filter((a) => !a.isUnlocked)
        .sort((a, b) => a.pointsRequired - b.pointsRequired)
        .find((a) => a.pointsRequired > this.totalPoints)
    },
    nextTargetLabel() {
      if (!this.nextTarget) {
        return 'All unlocked'
      }

      return `${this.nextTarget.name} (${this.remainingPoints(this.nextTarget)} pts left)`
    }
  },
  methods: {
    resolveBadgeIcon(item) {
      const code = String(item.code || '').toLowerCase().trim()
      const iconByCode = {
        first_steps: '/assets/badges/first-steps.svg',
        helping_hand: '/assets/badges/helping-hand.svg',
        campus_mentor: '/assets/badges/campus-mentor.svg',
        community_builder: '/assets/badges/community-builder.svg',
        rising_contributor: '/assets/badges/rising-contributor.svg',
        studylink_champion: '/assets/badges/studylink-champion.svg'
      }

      if (iconByCode[code]) {
        return iconByCode[code]
      }

      const iconFromApi = String(item.iconUrl || item.icon_url || '').trim()
      if (iconFromApi) {
        if (iconFromApi.startsWith('http://') || iconFromApi.startsWith('https://')) {
          return iconFromApi
        }

        const cleanPath = iconFromApi
          .replace(/^\.\//, '')
          .replace(/^\/ui\//, '/')
          .replace(/^public\//, '')

        return cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`
      }

      return iconByCode[code] || '/assets/badges/first-steps.svg'
    },
    normalizeAchievement(item) {
      return {
        code: String(item.code || ''),
        name: String(item.name || 'Achievement'),
        description: String(item.description || ''),
        pointsRequired: Number(item.pointsRequired ?? item.points_required ?? 0),
        iconUrl: this.resolveBadgeIcon(item),
        isUnlocked: Boolean(item.isUnlocked ?? item.is_unlocked)
      }
    },
    onBadgeIconError(event) {
      const fallback = '/assets/badges/first-steps.svg'
      const target = event?.target
      if (target && target.src && !target.src.endsWith(fallback)) {
        target.onerror = null
        target.src = fallback
      }
    },
    remainingPoints(badge) {
      return Math.max(Number(badge.pointsRequired || 0) - this.totalPoints, 0)
    },
    progressPercent(badge) {
      const target = Math.max(Number(badge.pointsRequired || 0), 1)
      return Math.min(100, Math.round((this.totalPoints / target) * 100))
    },
    async loadAchievements() {
      try {
        const [meData, achievementsData] = await Promise.all([
          api('/me'),
          api('/achievements/me')
        ])

        this.totalPoints = Number(meData.user?.totalPoints || 0)
        this.achievements = (achievementsData.achievements || []).map(this.normalizeAchievement)
          .sort((a, b) => a.pointsRequired - b.pointsRequired)
      } catch (err) {
        this.message = `Error: ${err.message}`
      }
    }
  },
  mounted() {
    this.loadAchievements()
  }
}
</script>

<style scoped>
.achievements-page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 20px;
}

.card {
  border: 1px solid #f1cdd9;
  border-radius: 16px;
  background: linear-gradient(180deg, #fffefe 0%, #fff7fa 100%);
  box-shadow: 0 12px 28px rgba(141, 28, 66, 0.08);
  padding: 18px;
}

.achievements-hero {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 14px;
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

.achievements-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.summary-tile {
  margin: 0;
  border: 1px solid #f1cfda;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  padding: 12px;
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
  font-size: 1.45rem;
  font-weight: 800;
}

.summary-value-next {
  font-size: 0.96rem;
  line-height: 1.35;
}

.achievements-section,
.progress-section {
  margin-bottom: 14px;
}

.achievements-section h3,
.progress-section h3 {
  margin: 0 0 12px;
  color: #4f2437;
}

.badges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
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
}

.badge-item.unlocked {
  border-color: #e88eb1;
  background: linear-gradient(180deg, #fff, #fff4f8);
  box-shadow: 0 10px 22px rgba(162, 35, 86, 0.12);
  opacity: 1;
}

.badge-icon {
  width: 68px;
  height: 68px;
  object-fit: contain;
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

.badge-status {
  margin: 0;
  color: #6e4a58;
  font-size: 0.82rem;
  font-weight: 600;
}

.progress-list {
  display: grid;
  gap: 10px;
}

.progress-item {
  border: 1px solid #f0d8e1;
  border-radius: 12px;
  background: #fff;
  padding: 12px;
}

.progress-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.progress-label,
.progress-value {
  margin: 0;
  color: #4b2735;
  font-size: 0.9rem;
  font-weight: 700;
}

.progress-bar {
  height: 8px;
  border-radius: 999px;
  background: #f2e3e9;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #d91c5c, #94234c);
  transition: width 220ms ease;
}

.message {
  margin: 10px 2px 0;
  color: #9a244b;
  font-weight: 600;
}

@media (max-width: 820px) {
  .achievements-page {
    padding: 14px;
  }

  .achievements-hero {
    flex-direction: column;
    align-items: stretch;
  }

  .achievements-summary {
    grid-template-columns: 1fr;
  }
}
</style>
