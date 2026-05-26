<template>
  <main class="page-bg public-profile-page">
    <div class="view page active">
      <div class="public-profile-header">
        <div>
          <p class="public-profile-kicker">Community profile</p>
          <h2>{{ profile.fullName }}</h2>
        </div>
        <button @click="goBack" class="chip" type="button">{{ backButtonLabel }}</button>
      </div>

      <div v-if="profile.id" class="card public-profile-card">
        <div class="public-profile-top">
          <img
            v-if="normalizedProfilePictureUrl && !profileAvatarError"
            :src="normalizedProfilePictureUrl"
            alt="Profile picture"
            class="public-profile-pic"
            @error="profileAvatarError = true"
          />
          <div v-else class="public-profile-pic public-profile-pic-fallback" aria-hidden="true">
            <svg viewBox="0 0 24 24" role="img">
              <path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2c-4.42 0-8 2.46-8 5.5 0 .55.45 1 1 1h14c.55 0 1-.45 1-1 0-3.04-3.58-5.5-8-5.5Z" />
            </svg>
          </div>
          <div>
            <h3>{{ profile.fullName }}</h3>
            <p class="public-profile-role">{{ roleLabel(profile.role) }}</p>
            <p class="public-profile-meta">Target subjects: {{ profile.targetSubjects || 'N/A' }}</p>
          </div>
        </div>

        <div class="public-profile-stats">
          <div class="public-profile-stat">
            <span>Achievements</span>
            <strong>{{ profile.totalAchievements }}</strong>
          </div>
          <div class="public-profile-stat">
            <span>Points</span>
            <strong>{{ profile.totalPoints }}</strong>
          </div>
          <div class="public-profile-stat">
            <span>Rating</span>
            <strong>{{ profile.rating.toFixed(2) }}</strong>
          </div>
          <div class="public-profile-stat">
            <span>Reviews</span>
            <strong>{{ profile.reviewsReceived }}</strong>
          </div>
          <div class="public-profile-stat">
            <span>Verified</span>
            <strong>{{ profile.isVerified ? 'Yes' : 'No' }}</strong>
          </div>
        </div>

        <div class="public-profile-grid">
          <div class="public-profile-row">
            <span>Major</span>
            <strong>{{ profile.major || 'N/A' }}</strong>
          </div>
          <div class="public-profile-row">
            <span>Year of study</span>
            <strong>{{ profile.yearOfStudy || 'N/A' }}</strong>
          </div>
          <div class="public-profile-row">
            <span>Expertise</span>
            <strong>{{ profile.expertiseText }}</strong>
          </div>
        </div>

        <div class="public-profile-bio">
          <p class="public-profile-bio-label">Bio</p>
          <p>{{ profile.bio || 'No bio provided.' }}</p>
        </div>
      </div>

      <p v-if="message" class="message">{{ message }}</p>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api.js'
import { normalizeAssetUrl } from '@/utils/records.js'

const route = useRoute()
const router = useRouter()

const profileData = ref({})
const message = ref('')
const profileAvatarError = ref(false)

const profile = computed(() => {
  const row = profileData.value || {}
  const expertise = Array.isArray(row.expertise) ? row.expertise : []
  return {
    id: row.id,
    fullName: String(row.fullName || 'Unknown User'),
    role: String(row.role || 'tutee'),
    profilePictureUrl: row.profilePictureUrl || row.profile_picture_url || row.profilePicture || row.profile_picture || '',
    targetSubjects: row.targetSubjects || '',
    major: row.major || '',
    yearOfStudy: row.yearOfStudy || '',
    totalAchievements: Number(row.totalAchievements || 0),
    totalPoints: Number(row.totalPoints || 0),
    rating: Number(row.rating || 0),
    reviewsReceived: Number(row.reviewsReceived || 0),
    isVerified: Boolean(row.isVerified),
    bio: row.bio || '',
    expertiseText: expertise.length ? expertise.join(', ') : 'N/A',
  }
})

const normalizedProfilePictureUrl = computed(() => normalizeAssetUrl(profile.value.profilePictureUrl))

const sourcePage = computed(() => String(route.query.from || '').toLowerCase())

const backButtonLabel = computed(() => {
  if (sourcePage.value === 'tutors') {
    return 'Back to Tutors'
  }
  if (sourcePage.value === 'leaderboards') {
    return 'Back to Leaderboard'
  }
  return 'Back'
})

const roleLabel = (role) => {
  const value = String(role || 'tutee').toLowerCase()
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const loadProfile = async () => {
  try {
    profileAvatarError.value = false
    const resp = await api(`/users/${route.params.userId}/public`)
    profileData.value = resp.user || {}
  } catch (err) {
    message.value = `Error: ${err.message}`
  }
}

const goBack = () => {
  if (sourcePage.value === 'tutors') {
    router.push('/tutors')
    return
  }

  if (sourcePage.value === 'leaderboards') {
    router.push('/leaderboards')
    return
  }

  router.back()
}

onMounted(() => {
  loadProfile()
})
</script>

<style scoped>
.public-profile-page {
  min-height: 100vh;
  background:
    radial-gradient(42rem 20rem at 20% 0%, rgba(177, 31, 75, 0.08), transparent 62%),
    radial-gradient(36rem 18rem at 100% 15%, rgba(117, 24, 55, 0.08), transparent 58%);
}

.view {
  overflow-y: auto;
  padding: 28px 18px 40px;
  max-width: 1120px;
}

.public-profile-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 14px;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(177, 31, 75, 0.1);
}

.public-profile-kicker {
  margin: 0 0 6px;
  font-size: 0.75rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-weight: 700;
  color: #8a5a6a;
}

.public-profile-header h2 {
  margin: 0;
  font-size: clamp(30px, 3vw, 42px);
  color: #271d25;
  letter-spacing: -0.03em;
}

.chip {
  border: 1px solid rgba(177, 31, 75, 0.18);
  background: linear-gradient(180deg, #ffffff, #fff5f8);
  color: #65172f;
  border-radius: 999px;
  padding: 10px 16px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 150ms ease;
  box-shadow: 0 10px 22px rgba(74, 20, 41, 0.08);
}

.chip:hover {
  background: linear-gradient(180deg, #fff, #ffeef3);
  border-color: rgba(177, 31, 75, 0.3);
  transform: translateY(-1px);
}

.card {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 246, 249, 0.94)),
    linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0));
  border: 1px solid rgba(177, 31, 75, 0.14);
  border-radius: 24px;
  padding: 24px;
  box-shadow:
    0 18px 34px rgba(74, 20, 41, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.62);
}

.public-profile-card {
  display: grid;
  gap: 20px;
}

.public-profile-top {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  gap: 18px;
  align-items: center;
}

.public-profile-pic {
  width: 112px;
  height: 112px;
  border-radius: 24px;
  border: 1px solid rgba(177, 31, 75, 0.16);
  object-fit: cover;
  background: #fff6f8;
  box-shadow: 0 12px 24px rgba(74, 20, 41, 0.12);
}

.public-profile-pic-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fff7f9, #ffe8ef);
  color: #a61f49;
  border: 1px solid rgba(177, 31, 75, 0.14);
}

.public-profile-pic-fallback svg {
  width: 54px;
  height: 54px;
  fill: currentColor;
}

.public-profile-top h3 {
  margin: 0;
  color: #271d25;
  font-size: clamp(26px, 2.1vw, 34px);
  letter-spacing: -0.03em;
}

.public-profile-role,
.public-profile-meta {
  margin: 4px 0 0;
  color: #735a66;
  font-size: 0.95rem;
}

.public-profile-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.public-profile-stat {
  border: 1px solid rgba(177, 31, 75, 0.12);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 246, 249, 0.9));
  padding: 12px 14px;
  box-shadow: 0 10px 22px rgba(74, 20, 41, 0.06);
}

.public-profile-stat span {
  display: block;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
  color: #8a5a6a;
}

.public-profile-stat strong {
  display: block;
  margin-top: 4px;
  color: #271d25;
  font-size: 1.02rem;
}

.public-profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.public-profile-row {
  border: 1px solid rgba(177, 31, 75, 0.12);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 246, 249, 0.9));
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  box-shadow: 0 10px 22px rgba(74, 20, 41, 0.06);
}

.public-profile-row span {
  color: #8a5a6a;
  font-size: 0.86rem;
}

.public-profile-row strong {
  color: #271d25;
  font-size: 0.92rem;
  text-align: right;
}

.public-profile-bio {
  border: 1px solid rgba(177, 31, 75, 0.12);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 246, 249, 0.9));
  padding: 14px 16px;
  box-shadow: 0 10px 22px rgba(74, 20, 41, 0.06);
}

.public-profile-bio-label {
  margin: 0 0 6px;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
  color: #8a5a6a;
}

.public-profile-bio p {
  margin: 0;
  color: #3f2f38;
  line-height: 1.55;
}

.message {
  margin-top: 12px;
  color: #a61f49;
  font-weight: 600;
}

@media (max-width: 640px) {
  .view {
    padding: 20px 14px 32px;
  }

  .public-profile-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .chip {
    width: 100%;
  }

  .public-profile-top {
    grid-template-columns: 1fr;
    align-items: flex-start;
  }

  .public-profile-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .public-profile-row strong {
    text-align: left;
  }
}
</style>
