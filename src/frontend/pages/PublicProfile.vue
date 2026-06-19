<template>
  <main class="page-bg public-profile-page">
    <div class="view page active">

      <!-- HEADER -->
      <div class="public-profile-header">
        <div>
          <p class="public-profile-kicker">Community Profile</p>
          <h2>{{ profile.fullName }}</h2>
        </div>
        <button @click="goBack" class="back-chip" type="button">
          ← {{ backButtonLabel }}
        </button>
      </div>

      <!-- LOADING SKELETON -->
      <div v-if="isLoading" class="card skeleton-card" aria-busy="true" aria-label="Loading profile">
        <div class="skeleton-top">
          <div class="skeleton-avatar shimmer"></div>
          <div class="skeleton-lines">
            <div class="shimmer sk-line sk-line--name"></div>
            <div class="shimmer sk-line sk-line--role"></div>
            <div class="shimmer sk-line sk-line--meta"></div>
          </div>
        </div>
        <div class="skeleton-stats">
          <div v-for="n in 5" :key="n" class="shimmer skeleton-stat-box"></div>
        </div>
      </div>

      <!-- ERROR STATE -->
      <div v-else-if="error" class="card error-card" role="alert">
        <span class="error-icon">⚠️</span>
        <p class="error-text">{{ error }}</p>
        <button class="retry-btn" @click="loadProfile">Try Again</button>
      </div>

      <!-- EMPTY STATE -->
      <div v-else-if="!profile.id" class="card empty-card">
        <span class="empty-icon">👤</span>
        <p class="empty-text">User not found.</p>
        <button class="back-chip" @click="goBack">← Go Back</button>
      </div>

      <!-- PROFILE CARD -->
      <div v-else class="card public-profile-card">

        <!-- TOP: AVATAR + NAME -->
        <div class="public-profile-top">
          <div class="avatar-wrap">
            <img
              v-if="normalizedProfilePictureUrl && !profileAvatarError"
              :src="normalizedProfilePictureUrl"
              alt="Profile picture"
              class="public-profile-pic"
              @error="profileAvatarError = true"
            />
            <div v-else class="public-profile-pic public-profile-pic-fallback" aria-hidden="true">
              <span class="avatar-initials">{{ profileInitials }}</span>
            </div>
            <!-- Verified badge -->
            <span v-if="profile.isVerified" class="verified-badge" title="Verified Tutor">✓</span>
          </div>

          <div class="profile-identity">
            <h3>{{ profile.fullName }}</h3>
            <span class="role-chip" :class="`role-chip--${profile.role}`">
              {{ roleLabel(profile.role) }}
            </span>
            <p v-if="profile.targetSubjects" class="public-profile-meta">
              🎯 {{ profile.targetSubjects }}
            </p>
          </div>
        </div>

        <!-- DIVIDER -->
        <div class="section-divider"></div>

        <!-- STATS ROW -->
        <div class="public-profile-stats">
          <div class="public-profile-stat">
            <span class="stat-label">🏆 Achievements</span>
            <strong class="stat-value">{{ profile.totalAchievements }}</strong>
          </div>
          <div class="public-profile-stat">
            <span class="stat-label">💎 Points</span>
            <strong class="stat-value">{{ profile.totalPoints.toLocaleString() }}</strong>
          </div>
          <div class="public-profile-stat">
            <span class="stat-label">⭐ Rating</span>
            <strong class="stat-value">
              {{ profile.reviewsReceived > 0 ? profile.rating.toFixed(2) : '—' }}
            </strong>
          </div>
          <div class="public-profile-stat">
            <span class="stat-label">📝 Reviews</span>
            <strong class="stat-value">{{ profile.reviewsReceived }}</strong>
          </div>
          <div class="public-profile-stat">
            <span class="stat-label">🔐 Verified</span>
            <strong class="stat-value" :class="profile.isVerified ? 'stat-yes' : 'stat-no'">
              {{ profile.isVerified ? 'Yes' : 'No' }}
            </strong>
          </div>
        </div>

        <!-- DIVIDER -->
        <div class="section-divider"></div>

        <!-- INFO GRID -->
        <div class="public-profile-grid">
          <div class="public-profile-row">
            <span class="row-label">📚 Major</span>
            <strong class="row-value">{{ profile.major || 'N/A' }}</strong>
          </div>
          <div class="public-profile-row">
            <span class="row-label">🎓 Year of Study</span>
            <strong class="row-value">{{ profile.yearOfStudy ? `Year ${profile.yearOfStudy}` : 'N/A' }}</strong>
          </div>
          <div class="public-profile-row">
            <span class="row-label">🛠️ Expertise</span>
            <strong class="row-value">{{ profile.expertiseText }}</strong>
          </div>
        </div>

        <!-- BIO -->
        <div v-if="profile.bio || true" class="public-profile-bio">
          <p class="public-profile-bio-label">About</p>
          <p class="bio-text">{{ profile.bio || 'No bio provided.' }}</p>
        </div>

      </div><!-- /profile card -->

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

// -> State
const profileData = ref({})
const isLoading = ref(true)
const error = ref('')
const profileAvatarError = ref(false)

// -> Computed: safe profile object
const profile = computed(() => {
  const row = profileData.value || {}
  const expertise = Array.isArray(row.expertise) ? row.expertise : []
  return {
    id: row.id ?? null,
    fullName: String(row.fullName || 'Unknown User').trim() || 'Unknown User',
    role: String(row.role || 'tutee').toLowerCase(),
    profilePictureUrl:
      row.profilePictureUrl ||
      row.profile_picture_url ||
      row.profilePicture ||
      row.profile_picture ||
      '',
    targetSubjects: String(row.targetSubjects || '').trim(),
    major: String(row.major || '').trim(),
    yearOfStudy: row.yearOfStudy ?? null,
    totalAchievements: Math.max(0, Number(row.totalAchievements) || 0),
    totalPoints: Math.max(0, Number(row.totalPoints) || 0),
    rating: Math.min(5, Math.max(0, Number(row.rating) || 0)),
    reviewsReceived: Math.max(0, Number(row.reviewsReceived) || 0),
    isVerified: Boolean(row.isVerified),
    bio: String(row.bio || '').trim(),
    expertiseText: expertise.length ? expertise.join(', ') : 'N/A',
  }
})

// -> Avatar fallback initials
const profileInitials = computed(() => {
  const parts = profile.value.fullName.split(/\s+/).filter(Boolean).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '?'
})

// -> Normalized image URL
const normalizedProfilePictureUrl = computed(() =>
  normalizeAssetUrl(profile.value.profilePictureUrl)
)

// -> Back navigation
const sourcePage = computed(() => String(route.query.from || '').toLowerCase())

const backButtonLabel = computed(() => {
  if (sourcePage.value === 'tutors') return 'Back to Tutors'
  if (sourcePage.value === 'leaderboards') return 'Back to Leaderboard'
  return 'Go Back'
})

const goBack = () => {
  if (sourcePage.value === 'tutors') { router.push('/tutors'); return }
  if (sourcePage.value === 'leaderboards') { router.push('/leaderboards'); return }
  router.back()
}

// -> Role display
const roleLabel = (role) => {
  const v = String(role || 'tutee').toLowerCase()
  return v.charAt(0).toUpperCase() + v.slice(1)
}

// -> Load
const loadProfile = async () => {
  isLoading.value = true
  error.value = ''
  profileAvatarError.value = false
  try {
    const userId = route.params.userId
    if (!userId) throw new Error('No user ID in route.')
    const resp = await api(`/users/${userId}/public`)
    // -> Safe response guard
    if (!resp || typeof resp !== 'object') throw new Error('Invalid server response.')
    profileData.value = resp.user || {}
  } catch (err) {
    error.value = err?.message || 'Failed to load profile.'
    profileData.value = {}
  } finally {
    isLoading.value = false
  }
}

onMounted(loadProfile)
</script>

<style scoped>
/* ─── PAGE BG ─────────────────────────────────────── */
.public-profile-page {
  min-height: 100vh;
  background:
    radial-gradient(42rem 20rem at 20% 0%, rgba(2, 26, 84, 0.06), transparent 62%),
    radial-gradient(36rem 18rem at 100% 15%, rgba(255, 133, 187, 0.07), transparent 58%),
    var(--canvas-parchment, #F5F5F5);
}

.view {
  overflow-y: auto;
  padding: 28px 18px 48px;
  max-width: 820px;
}

/* ─── HEADER ──────────────────────────────────────── */
.public-profile-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 14px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(2, 26, 84, 0.1);
}

.public-profile-kicker {
  margin: 0 0 5px;
  font-size: 0.7rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--primary, #FF85BB);
}

.public-profile-header h2 {
  margin: 0;
  font-size: clamp(26px, 3vw, 38px);
  color: var(--ink, #021A54);
  letter-spacing: -0.03em;
  line-height: 1.1;
}

/* ─── BACK CHIP ───────────────────────────────────── */
.back-chip {
  flex-shrink: 0;
  border: 1.5px solid rgba(255, 133, 187, 0.35);
  background: linear-gradient(180deg, #ffffff, #fff5f9);
  color: var(--ink, #021A54);
  border-radius: 999px;
  padding: 9px 18px;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 140ms ease;
  box-shadow: 0 4px 12px rgba(255, 133, 187, 0.15);
  white-space: nowrap;
}
.back-chip:hover {
  background: linear-gradient(180deg, #fff, #ffe8f3);
  border-color: var(--primary, #FF85BB);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(255, 133, 187, 0.25);
}
.back-chip:active { transform: translateY(0); }

/* ─── GLASS CARD BASE ─────────────────────────────── */
.card {
  background: linear-gradient(
    160deg,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(255, 246, 251, 0.92) 100%
  );
  border: 1px solid rgba(255, 133, 187, 0.2);
  border-radius: 24px;
  padding: 24px;
  box-shadow:
    0 20px 40px rgba(2, 26, 84, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* ─── PROFILE CARD LAYOUT ─────────────────────────── */
.public-profile-card {
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ─── SECTION DIVIDER ─────────────────────────────── */
.section-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 133, 187, 0.2), transparent);
  margin: 20px 0;
}

/* ─── TOP: AVATAR + IDENTITY ──────────────────────── */
.public-profile-top {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 20px;
  align-items: center;
}

.avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.public-profile-pic {
  width: 96px;
  height: 96px;
  border-radius: 22px;
  border: 2px solid rgba(255, 133, 187, 0.3);
  object-fit: cover;
  background: #fff5f9;
  box-shadow: 0 8px 20px rgba(2, 26, 84, 0.12);
  display: block;
}

.public-profile-pic-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary-soft, #FFCEE3), var(--primary, #FF85BB));
}

.avatar-initials {
  font-size: 2rem;
  font-weight: 800;
  color: var(--ink, #021A54);
  letter-spacing: -0.03em;
  line-height: 1;
}

/* -> Verified badge */
.verified-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--ink, #021A54);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(2, 26, 84, 0.3);
}

.profile-identity {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.profile-identity h3 {
  margin: 0;
  color: var(--ink, #021A54);
  font-size: clamp(22px, 2.2vw, 30px);
  letter-spacing: -0.03em;
  line-height: 1.1;
}

/* -> Role chips */
.role-chip {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  width: fit-content;
}
.role-chip--tutor {
  background: rgba(2, 26, 84, 0.08);
  color: var(--ink, #021A54);
  border: 1px solid rgba(2, 26, 84, 0.15);
}
.role-chip--tutee,
.role-chip--student {
  background: rgba(255, 133, 187, 0.12);
  color: #b5005b;
  border: 1px solid rgba(255, 133, 187, 0.25);
}
.role-chip--admin {
  background: rgba(2, 26, 84, 0.12);
  color: var(--ink, #021A54);
  border: 1px solid rgba(2, 26, 84, 0.2);
}

.public-profile-meta {
  margin: 0;
  color: var(--ink-muted, #6e6e73);
  font-size: 0.9rem;
  line-height: 1.4;
}

/* ─── STATS ───────────────────────────────────────── */
.public-profile-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.public-profile-stat {
  border: 1px solid rgba(255, 133, 187, 0.15);
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(255,255,255,0.9), rgba(255,206,227,0.12));
  padding: 12px 14px;
  box-shadow: 0 4px 12px rgba(2, 26, 84, 0.05);
  transition: transform 120ms ease, box-shadow 120ms ease;
}
.public-profile-stat:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(2, 26, 84, 0.08);
}

.stat-label {
  display: block;
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--ink-muted, #6e6e73);
  margin-bottom: 4px;
}

.stat-value {
  display: block;
  color: var(--ink, #021A54);
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: -0.01em;
}
.stat-yes { color: #0a7c3e; }
.stat-no  { color: var(--ink-muted, #6e6e73); }

/* ─── INFO GRID ───────────────────────────────────── */
.public-profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}

.public-profile-row {
  border: 1px solid rgba(255, 133, 187, 0.13);
  border-radius: 14px;
  background: linear-gradient(160deg, rgba(255,255,255,0.9), rgba(255,206,227,0.08));
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  box-shadow: 0 4px 10px rgba(2, 26, 84, 0.04);
}

.row-label {
  color: var(--ink-muted, #6e6e73);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.row-value {
  color: var(--ink, #021A54);
  font-size: 0.92rem;
  font-weight: 600;
  word-break: break-word;
}

/* ─── BIO ─────────────────────────────────────────── */
.public-profile-bio {
  border: 1px solid rgba(255, 133, 187, 0.13);
  border-radius: 16px;
  background: linear-gradient(160deg, rgba(255,255,255,0.9), rgba(255,206,227,0.08));
  padding: 16px 18px;
  box-shadow: 0 4px 10px rgba(2, 26, 84, 0.04);
}

.public-profile-bio-label {
  margin: 0 0 8px;
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--primary, #FF85BB);
}

.bio-text {
  margin: 0;
  color: var(--ink, #021A54);
  line-height: 1.65;
  font-size: 0.95rem;
}

/* ─── LOADING SKELETON ────────────────────────────── */
.skeleton-card { display: flex; flex-direction: column; gap: 20px; }

.skeleton-top {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 18px;
  align-items: center;
}

.skeleton-avatar {
  width: 96px;
  height: 96px;
  border-radius: 22px;
}

.skeleton-lines { display: flex; flex-direction: column; gap: 10px; }

.sk-line {
  height: 14px;
  border-radius: 8px;
}
.sk-line--name { width: 60%; height: 22px; }
.sk-line--role { width: 30%; }
.sk-line--meta { width: 50%; }

.skeleton-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
}
.skeleton-stat-box {
  height: 64px;
  border-radius: 14px;
}

/* -> Shimmer animation */
@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position: 600px 0; }
}
.shimmer {
  background: linear-gradient(
    90deg,
    rgba(255, 206, 227, 0.25) 25%,
    rgba(255, 133, 187, 0.15) 50%,
    rgba(255, 206, 227, 0.25) 75%
  );
  background-size: 600px 100%;
  animation: shimmer 1.5s infinite linear;
}

/* ─── ERROR / EMPTY STATES ────────────────────────── */
.error-card,
.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 24px;
  text-align: center;
}

.error-icon, .empty-icon {
  font-size: 2.5rem;
}

.error-text {
  margin: 0;
  color: #b5005b;
  font-weight: 600;
  font-size: 0.95rem;
}
.empty-text {
  margin: 0;
  color: var(--ink-muted, #6e6e73);
  font-size: 0.95rem;
}

.retry-btn {
  border: 1.5px solid rgba(255, 133, 187, 0.4);
  background: rgba(255, 133, 187, 0.08);
  color: var(--ink, #021A54);
  border-radius: 999px;
  padding: 8px 20px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 140ms ease;
}
.retry-btn:hover {
  background: rgba(255, 133, 187, 0.18);
  transform: translateY(-1px);
}

/* ─── RESPONSIVE ──────────────────────────────────── */
@media (max-width: 640px) {
  .view { padding: 16px 12px 36px; }

  .public-profile-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  .back-chip { width: 100%; text-align: center; }

  .public-profile-top {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .skeleton-top {
    grid-template-columns: 1fr;
  }

  .skeleton-stats {
    grid-template-columns: repeat(3, 1fr);
  }

  .public-profile-stats {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (prefers-reduced-motion: reduce) {
  .shimmer { animation: none; }
  .back-chip, .public-profile-stat, .retry-btn { transition: none; }
}
</style>