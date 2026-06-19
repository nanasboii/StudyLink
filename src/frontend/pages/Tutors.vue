<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active">

        <!-- ── Hero ── -->
        <section class="tutors-hero">
          <div class="tutors-hero__copy">
            <p class="tutors-hero__kicker">Expert Help</p>
            <h2>Find Your Tutor</h2>
            <p class="tutors-hero__text">Connect with verified peer tutors in your subjects.</p>
          </div>
          <div class="tutors-hero__stats" aria-label="Tutor highlights">
            <div class="hero-stat">
              <span class="hero-stat__label">Active</span>
              <strong>{{ totalTutors }}</strong>
            </div>
            <div class="hero-stat">
              <span class="hero-stat__label">Highly Rated</span>
              <strong>{{ highlyRatedTutors }}</strong>
            </div>
            <div class="hero-stat">
              <span class="hero-stat__label">Sessions</span>
              <strong>{{ totalSessions }}</strong>
            </div>
          </div>
        </section>

        <!-- ── Suggested For You ── -->
        <section
          v-if="currentUserRole === 'tutee' && recommendedTutors.length > 0"
          class="suggestions-section"
        >
          <div class="suggestions-header">
            <h3 class="suggestions-title">✨ Suggested For You</h3>
            <p class="suggestions-sub">
              Matched on:
              <span
                v-for="token in matchedSubjectTokens"
                :key="token"
                class="match-chip"
              >{{ token }}</span>
            </p>
          </div>
          <div class="suggestions-grid">
            <button
              v-for="tutor in recommendedTutors"
              :key="'rec-' + tutor.id"
              class="suggestion-card"
              @click="openTutorModal(tutor)"
              type="button"
            >
              <div class="suggestion-avatar-wrap">
                <img
                  v-if="hasTutorAvatar(tutor)"
                  :src="resolveTutorAvatar(tutor.profile_picture_url || tutor.profilePictureUrl || tutor.profilePicture)"
                  :alt="tutor.full_name || 'Tutor'"
                  class="suggestion-avatar"
                  @error="markTutorAvatarError(tutor)"
                />
                <div v-else class="suggestion-avatar suggestion-avatar-fallback" aria-hidden="true">
                  {{ (tutor.full_name || '?')[0].toUpperCase() }}
                </div>
                <span v-if="tutor.is_verified" class="suggestion-verified" title="Verified">✓</span>
              </div>
              <div class="suggestion-info">
                <p class="suggestion-name">{{ tutor.full_name || 'Unknown' }}</p>
                <p class="suggestion-rating">⭐ {{ Number(tutor.rating || 0).toFixed(1) }}</p>
                <div class="suggestion-tags">
                  <span
                    v-for="skill in (tutor.expertise || []).slice(0, 3)"
                    :key="skill"
                    class="suggestion-tag"
                    :class="{ 'tag-match': isMatchedSkill(skill) }"
                  >{{ skill }}</span>
                </div>
              </div>
            </button>
          </div>
        </section>

        <!-- ── Search & Filter toolbar ── -->
        <section class="tutors-toolbar">
          <div class="tutor-search-shell">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Name, subject, course…"
              aria-label="Search tutors"
              @input="debouncedSearch"
            />
            <button
              v-if="searchQuery"
              class="icon-chip"
              @click="searchQuery = ''; debouncedSearch()"
              aria-label="Clear search"
              type="button"
            >✕</button>
          </div>
          <button class="chip-outline" @click="toggleFilters" type="button">
            {{ showFilters ? 'Hide Filters' : 'Filters' }}
            <span v-if="activeFilterCount > 0" class="filter-badge">{{ activeFilterCount }}</span>
          </button>
        </section>

        <!-- ── Filter Panel ── -->
        <div v-if="showFilters" class="filter-panel">
          <div class="filter-row">
            <label class="filter-label" for="courseFilter">Course Code</label>
            <input
              id="courseFilter"
              v-model="selectedCourseCode"
              type="text"
              placeholder="e.g. TMF3953"
              class="filter-input"
              @input="selectedCourseCode = selectedCourseCode.toUpperCase()"
            />
          </div>
          <div class="filter-row">
            <label class="filter-label">Skill</label>
            <div class="skill-chips">
              <button
                v-for="skill in popularSkills"
                :key="skill"
                class="skill-chip"
                :class="{ active: selectedSkill === skill }"
                @click="selectedSkill = selectedSkill === skill ? '' : skill"
                type="button"
              >{{ skill }}</button>
            </div>
          </div>
          <div class="filter-actions">
            <button class="chip-soft" @click="clearFilters" type="button">Clear</button>
            <button class="chip" @click="applyFilters" type="button">Apply</button>
          </div>
        </div>

        <!-- ── Summary bar ── -->
        <div v-if="!isLoading" class="summary-bar">
          <span>{{ filteredTutors.length }} tutor{{ filteredTutors.length !== 1 ? 's' : '' }}</span>
          <span v-if="activeFilterCount > 0" class="summary-filtered">· filtered</span>
        </div>

        <!-- ── Skeleton loader ── -->
        <div v-if="isLoading" class="tutors-grid" aria-busy="true" aria-label="Loading tutors">
          <div v-for="n in 6" :key="n" class="tutor-card skeleton-card">
            <div class="skeleton skeleton-avatar"></div>
            <div class="skeleton-body">
              <div class="skeleton skeleton-line w60"></div>
              <div class="skeleton skeleton-line w40"></div>
              <div class="skeleton skeleton-line w80"></div>
            </div>
          </div>
        </div>

        <!-- ── Tutors Grid ── -->
        <section v-else class="tutors-list-section">
          <!-- Empty state -->
          <div v-if="filteredTutors.length === 0" class="empty-state">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p v-if="searchQuery || selectedSkill || selectedCourseCode">
              No tutors match your filters.
              <button class="link-btn" @click="clearFilters" type="button">Clear filters</button>
            </p>
            <p v-else>No tutors available yet.</p>
          </div>

          <div v-else class="tutors-grid">
            <button
              v-for="tutor in paginatedTutors"
              :key="tutor.id"
              class="tutor-card"
              @click="openTutorModal(tutor)"
              type="button"
            >
              <!-- Avatar -->
              <div class="tutor-avatar">
                <img
                  v-if="hasTutorAvatar(tutor)"
                  :src="resolveTutorAvatar(tutor.profile_picture_url || tutor.profilePictureUrl || tutor.profilePicture)"
                  :alt="`${tutor.full_name || 'Tutor'} photo`"
                  @error="markTutorAvatarError(tutor)"
                />
                <div v-else class="tutor-avatar-fallback" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2c-4.42 0-8 2.46-8 5.5 0 .55.45 1 1 1h14c.55 0 1-.45 1-1 0-3.04-3.58-5.5-8-5.5Z"/>
                  </svg>
                </div>
              </div>

              <!-- Info -->
              <div class="tutor-card-body">
                <div class="tutor-card-header">
                  <strong class="tutor-name">{{ tutor.full_name || 'Unknown Tutor' }}</strong>
                  <span v-if="tutor.is_verified" class="badge-verified">✓ Verified</span>
                </div>
                <p class="tutor-major">{{ tutor.major || 'General' }}</p>
                <div class="tutor-stats-row">
                  <span class="stat-pill">⭐ {{ Number(tutor.rating || 0).toFixed(1) }}</span>
                  <span class="stat-pill">🏆 {{ tutor.total_points || 0 }} pts</span>
                </div>
                <div v-if="tutor.expertise && tutor.expertise.length" class="expertise-tags">
                  <span
                    v-for="skill in tutor.expertise.slice(0, 3)"
                    :key="skill"
                    class="tag"
                  >{{ skill }}</span>
                </div>
              </div>
            </button>
          </div>

          <!-- Load more -->
          <button
            v-if="visibleCount < filteredTutors.length"
            class="chip load-more"
            @click="visibleCount += pageSize"
            type="button"
          >
            Load more ({{ filteredTutors.length - visibleCount }} left)
          </button>
        </section>

        <!-- ── Tutor Modal ── -->
        <Teleport to="body">
          <div
            v-if="selectedTutorData"
            class="modal-backdrop"
            @click.self="closeModal"
            role="dialog"
            aria-modal="true"
            :aria-label="`${selectedTutorData.full_name || 'Tutor'} profile`"
          >
            <div class="modal-content" ref="modalContentRef">
              <button class="modal-close" @click="closeModal" aria-label="Close" type="button">×</button>

              <!-- Profile header -->
              <div class="tutor-profile-header">
                <div class="profile-pic-wrap">
                  <img
                    v-if="hasTutorAvatar(selectedTutorData)"
                    :src="resolveTutorAvatar(selectedTutorData.profile_picture_url || selectedTutorData.profilePictureUrl || selectedTutorData.profilePicture)"
                    :alt="`${selectedTutorData.full_name || 'Tutor'} photo`"
                    class="profile-pic"
                    @error="markTutorAvatarError(selectedTutorData)"
                  />
                  <div v-else class="profile-pic profile-pic-fallback" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                      <path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2c-4.42 0-8 2.46-8 5.5 0 .55.45 1 1 1h14c.55 0 1-.45 1-1 0-3.04-3.58-5.5-8-5.5Z"/>
                    </svg>
                  </div>
                </div>
                <div class="profile-meta">
                  <h3 class="profile-name">{{ selectedTutorData.full_name || 'Unknown Tutor' }}</h3>
                  <p class="profile-major">{{ selectedTutorData.major || 'General' }}</p>
                  <div class="profile-badges">
                    <span v-if="selectedTutorData.is_verified" class="badge-verified">✓ Verified</span>
                    <span class="stat-pill">⭐ {{ Number(selectedTutorData.rating || 0).toFixed(1) }}</span>
                    <span class="stat-pill">🏆 {{ selectedTutorData.total_points || 0 }} pts</span>
                  </div>
                </div>
              </div>

              <!-- Expertise -->
              <div v-if="selectedTutorData.expertise?.length" class="profile-section">
                <p class="section-label">Expertise</p>
                <div class="expertise-tags">
                  <span v-for="skill in selectedTutorData.expertise" :key="skill" class="tag">{{ skill }}</span>
                </div>
              </div>

              <!-- Availability -->
              <div v-if="selectedTutorData.availability?.length" class="profile-section">
                <p class="section-label">Availability</p>
                <div class="availability-list">
                  <div
                    v-for="(slot, idx) in selectedTutorData.availability"
                    :key="idx"
                    class="availability-slot"
                  >
                    <span class="slot-day">{{ slot.dayOfWeek || slot.day_of_week || '—' }}</span>
                    <span class="slot-time">
                      {{ slot.startTime || slot.start_time || '' }}
                      {{ (slot.startTime || slot.start_time) && (slot.endTime || slot.end_time) ? '–' : '' }}
                      {{ slot.endTime || slot.end_time || '' }}
                    </span>
                    <span v-if="slot.courseCode || slot.course_code" class="course-code">
                      {{ slot.courseCode || slot.course_code }}
                    </span>
                  </div>
                </div>
              </div>
              <div v-else class="profile-section">
                <p class="section-label">Availability</p>
                <p class="muted-text">No availability set.</p>
              </div>

              <!-- Reviews -->
              <div class="profile-section">
                <p class="section-label">Reviews</p>
                <div v-if="isLoadingReviews" class="reviews-loading">
                  <div v-for="n in 2" :key="n" class="skeleton skeleton-review"></div>
                </div>
                <div v-else-if="tutorReviews.length === 0" class="muted-text">No reviews yet.</div>
                <div v-else class="reviews-list">
                  <div v-for="review in tutorReviews" :key="review.id" class="review-card">
                    <div class="review-header">
                      <strong>{{ review.reviewer_name || 'Anonymous' }}</strong>
                      <span class="stars" :aria-label="`${review.rating} out of 5 stars`">
                        {{ '★'.repeat(Math.max(0, Math.min(5, Number(review.rating) || 0))) }}{{ '☆'.repeat(5 - Math.max(0, Math.min(5, Number(review.rating) || 0))) }}
                      </span>
                    </div>
                    <p class="review-meta">
                      {{ review.reviewer_role || 'Tutee' }}
                      <span v-if="review.created_at"> · {{ formatDateValue(review.created_at, '', undefined, { month: 'short', day: 'numeric', year: 'numeric' }) }}</span>
                    </p>
                    <p class="review-comment">{{ review.comment || 'No comment left.' }}</p>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="profile-actions">
                <button class="chip-soft" @click="viewPublicProfile" type="button">View Profile</button>
                <button
                  v-if="canBookTutorSessions"
                  class="chip"
                  @click="bookTutor"
                  type="button"
                >Book This Tutor</button>
              </div>
            </div>
          </div>
        </Teleport>

      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { api, getUser } from '@/api.js'
import { formatDateValue, normalizeTutor } from '@/utils/records.js'

// ── Router & user ──
const router = useRouter()
const currentUser = getUser()
const currentUserRole = String(currentUser?.role || 'tutee').toLowerCase().trim()
const canBookTutorSessions = currentUserRole === 'tutee' || currentUserRole === 'admin'

// ── State ──
const tutors           = ref([])
const isLoading        = ref(true)
const isLoadingReviews = ref(false)
const searchQuery      = ref('')
const selectedSkill    = ref('')
const showFilters      = ref(false)
const selectedCourseCode = ref('')
const visibleCount     = ref(10)
const pageSize         = 10
const selectedTutorData = ref(null)
const tutorReviews     = ref([])
const tutorAvatarErrors = ref({})
const modalContentRef  = ref(null)

const recommendedTutors    = ref([])
const matchedSubjectTokens = ref([])
const hasTargetSubjects    = ref(false)

const popularSkills = ['Java', 'Python', 'Database', 'Web Dev', 'C++', 'Mobile Dev']

// ── Avatar helpers ──
const tutorAvatarKey = (tutor) => String(tutor?.id || tutor?.full_name || '')

const resolveTutorAvatar = (rawUrl) => {
  const value = String(rawUrl || '').trim()
  if (!value) return ''
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) return value
  return value.startsWith('/') ? value : `/${value.replace(/^\/+/, '')}`
}

const hasTutorAvatar = (tutor) => {
  if (!tutor) return false
  const key = tutorAvatarKey(tutor)
  if (tutorAvatarErrors.value[key]) return false
  const raw = tutor.profile_picture_url || tutor.profilePictureUrl || tutor.profilePicture || ''
  return !!resolveTutorAvatar(raw)
}

const markTutorAvatarError = (tutor) => {
  const key = tutorAvatarKey(tutor)
  if (!key) return
  tutorAvatarErrors.value = { ...tutorAvatarErrors.value, [key]: true }
}

// ── Computed stats ──
const totalTutors      = computed(() => tutors.value.length)
const highlyRatedTutors = computed(() => tutors.value.filter(t => (t.rating || 0) >= 4).length)
const totalSessions    = computed(() => tutors.value.reduce((sum, t) => sum + (t.total_points || 0), 0))

const activeFilterCount = computed(() => {
  let count = 0
  if (selectedSkill.value) count++
  if (selectedCourseCode.value) count++
  return count
})

// ── Filtered + paginated ──
const filteredTutors = computed(() => {
  let list = [...tutors.value]

  if (selectedSkill.value) {
    const sel = selectedSkill.value.toLowerCase().trim()
    list = list.filter(t =>
      Array.isArray(t.expertise) &&
      t.expertise.some(e => String(e || '').toLowerCase().includes(sel))
    )
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(t =>
      t.full_name?.toLowerCase().includes(q) ||
      t.major?.toLowerCase().includes(q) ||
      (Array.isArray(t.expertise) && t.expertise.some(e => String(e || '').toLowerCase().includes(q))) ||
      (Array.isArray(t.availability) && t.availability.some(s =>
        String(s.courseCode || s.course_code || '').toLowerCase().includes(q)
      ))
    )
  }

  if (selectedCourseCode.value.trim()) {
    const sc = selectedCourseCode.value.toLowerCase().trim()
    list = list.filter(t =>
      Array.isArray(t.availability) &&
      t.availability.some(s => String(s.courseCode || s.course_code || '').toLowerCase().includes(sc))
    )
  }

  return list
})

const paginatedTutors = computed(() => filteredTutors.value.slice(0, visibleCount.value))

// ── Debounced search ──
let _searchTimeout = null
const debouncedSearch = () => {
  clearTimeout(_searchTimeout)
  _searchTimeout = setTimeout(() => { visibleCount.value = pageSize }, 300)
}

// ── Skill match helper (for suggestion tags) ──
const isMatchedSkill = (skill) =>
  matchedSubjectTokens.value.some(t => String(skill || '').toLowerCase().includes(t.toLowerCase()))

// ── Load tutors ──
const loadTutors = async () => {
  try {
    isLoading.value = true
    const qs = selectedCourseCode.value
      ? `?courseCode=${encodeURIComponent(String(selectedCourseCode.value).toUpperCase())}`
      : ''
    const data = await api(`/tutors${qs}`)
    const normalized = (data?.tutors || []).map(normalizeTutor)
    tutors.value = Array.from(
      new Map(normalized.map(t => [String(t.id), t])).values()
    )
    tutorAvatarErrors.value = {}
  } catch (err) {
    console.error('Failed to load tutors:', err)
    tutors.value = []
  } finally {
    isLoading.value = false
  }
}

// ── Filter controls ──
const applyFilters = () => { loadTutors(); showFilters.value = false }
const clearFilters = () => {
  selectedCourseCode.value = ''
  selectedSkill.value = ''
  searchQuery.value = ''
  visibleCount.value = pageSize
  loadTutors()
  showFilters.value = false
}
const toggleFilters = () => { showFilters.value = !showFilters.value }

// ── Modal open/close ──
const openTutorModal = async (tutor) => {
  selectedTutorData.value = tutor
  tutorReviews.value = []
  document.body.style.overflow = 'hidden'

  await nextTick()
  modalContentRef.value?.focus()

  isLoadingReviews.value = true
  try {
    const resp = await api(`/users/${tutor.id}/public/reviews`)
    tutorReviews.value = Array.isArray(resp?.reviews) ? resp.reviews : []
  } catch {
    tutorReviews.value = []
  } finally {
    isLoadingReviews.value = false
  }
}

// Keep legacy selectTutor alias
const selectTutor = openTutorModal

const closeModal = () => {
  selectedTutorData.value = null
  document.body.style.overflow = ''
}

// ── Navigation ──
const viewPublicProfile = () => {
  if (!selectedTutorData.value?.id) return
  router.push(`/users/${selectedTutorData.value.id}`)
  closeModal()
}

const bookTutor = () => {
  if (!selectedTutorData.value?.id) return
  router.push({ name: 'Session', query: { tutorId: selectedTutorData.value.id } })
  closeModal()
}

// ── Keyboard: Escape closes modal ──
const onKeydown = (e) => {
  if (e.key === 'Escape' && selectedTutorData.value) closeModal()
}

// ── Lifecycle ──
onMounted(() => {
  loadTutors()
  window.addEventListener('studylink-profile-updated', loadTutors)
  window.addEventListener('keydown', onKeydown)

  const loadRecommended = async () => {
    try {
      const resp = await api('/tutors/recommended')
      recommendedTutors.value = Array.isArray(resp?.tutors) ? resp.tutors : []
      matchedSubjectTokens.value = Array.isArray(resp?.matchedOn) ? resp.matchedOn : []
      hasTargetSubjects.value = matchedSubjectTokens.value.length > 0
    } catch {
      recommendedTutors.value = []
      hasTargetSubjects.value = false
    }
  }
  loadRecommended()
})

onUnmounted(() => {
  window.removeEventListener('studylink-profile-updated', loadTutors)
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* ═══════════════════════════════════════
   Page shell
═══════════════════════════════════════ */
.page-bg {
  min-height: 100vh;
  background: linear-gradient(180deg, #ffffff, var(--canvas-parchment, #F5F5F5));
}

.phone-shell {
  width: 100%;
  max-width: 100%;
  margin: 0;
  min-height: 100vh;
  background: transparent;
}

.view {
  padding: 20px 16px 40px;
  overflow-y: auto;
}

/* ═══════════════════════════════════════
   Hero
═══════════════════════════════════════ */
.tutors-hero {
  margin-bottom: 24px;
}

.tutors-hero__kicker {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--primary, #FF85BB);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.tutors-hero__copy h2 {
  margin: 0 0 8px;
  font-size: 26px;
  font-weight: 700;
  color: var(--ink, #021A54);
  font-family: "Josefin Sans", "Trebuchet MS", sans-serif;
  letter-spacing: -0.01em;
}

.tutors-hero__text {
  margin: 0;
  font-size: 14px;
  color: var(--ink-muted, #6e6e73);
  line-height: 1.5;
}

.tutors-hero__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 16px;
}

.hero-stat {
  padding: 12px 10px;
  background: rgba(255, 206, 227, 0.25);
  border: 1px solid rgba(255, 133, 187, 0.2);
  border-radius: 12px;
  text-align: center;
}

.hero-stat__label {
  display: block;
  font-size: 10px;
  color: var(--ink-muted, #6e6e73);
  margin-bottom: 4px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.hero-stat strong {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: var(--ink, #021A54);
}

/* ═══════════════════════════════════════
   Suggestions
═══════════════════════════════════════ */
.suggestions-section {
  margin-bottom: 20px;
  padding: 14px 16px;
  background: rgba(255, 206, 227, 0.15);
  border: 1px solid rgba(255, 133, 187, 0.22);
  border-radius: 16px;
}

.suggestions-header { margin-bottom: 12px; }

.suggestions-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink, #021A54);
}

.suggestions-sub {
  margin: 0;
  font-size: 12px;
  color: var(--ink-muted, #6e6e73);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.match-chip {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--primary-soft, #FFCEE3);
  color: var(--ink, #021A54);
  font-size: 11px;
  font-weight: 600;
}

.suggestions-grid {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}
.suggestions-grid::-webkit-scrollbar { display: none; }

.suggestion-card {
  flex-shrink: 0;
  width: 110px;
  background: #ffffff;
  border: 1px solid var(--theme-border, #e0e0e0);
  border-radius: 14px;
  padding: 12px 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.suggestion-card:hover {
  border-color: var(--primary, #FF85BB);
  box-shadow: 0 2px 12px rgba(255, 133, 187, 0.18);
}

.suggestion-avatar-wrap {
  position: relative;
  width: 48px;
  height: 48px;
}

.suggestion-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--primary-soft, #FFCEE3);
}

.suggestion-avatar-fallback {
  background: var(--primary-soft, #FFCEE3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
  color: var(--ink, #021A54);
}

.suggestion-verified {
  position: absolute;
  bottom: 0; right: -2px;
  background: #22c55e;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  width: 16px; height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #fff;
}

.suggestion-info { width: 100%; }

.suggestion-name {
  margin: 0 0 2px;
  font-size: 12px;
  font-weight: 700;
  color: var(--ink, #021A54);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-rating {
  margin: 0 0 4px;
  font-size: 11px;
  color: var(--ink-muted, #6e6e73);
}

.suggestion-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  justify-content: center;
}

.suggestion-tag {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 8px;
  background: rgba(255, 133, 187, 0.1);
  color: var(--ink, #021A54);
}

.suggestion-tag.tag-match {
  background: var(--primary-soft, #FFCEE3);
  color: var(--ink, #021A54);
  font-weight: 700;
}

/* ═══════════════════════════════════════
   Toolbar
═══════════════════════════════════════ */
.tutors-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.tutor-search-shell {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border: 1px solid var(--theme-border, #e0e0e0);
  border-radius: 10px;
  padding: 0 12px;
}
.tutor-search-shell:focus-within {
  border-color: var(--primary, #FF85BB);
  box-shadow: 0 0 0 3px rgba(255, 133, 187, 0.15);
}
.tutor-search-shell svg { color: var(--ink-muted, #6e6e73); flex-shrink: 0; }
.tutor-search-shell input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  padding: 10px 0;
  font-size: 14px;
  color: var(--ink, #021A54);
  background: transparent;
}
.tutor-search-shell input::placeholder { color: var(--ink-muted, #6e6e73); }

.icon-chip {
  background: none;
  border: none;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--ink-muted, #6e6e73);
  border-radius: 999px;
  font-size: 13px;
  flex-shrink: 0;
}
.icon-chip:hover { color: var(--ink, #021A54); background: var(--canvas-parchment, #F5F5F5); }

.chip-outline {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 14px;
  border: 1px solid var(--theme-border, #e0e0e0);
  border-radius: 999px;
  background: #ffffff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  color: var(--ink, #021A54);
  white-space: nowrap;
  transition: border-color 120ms ease;
  flex-shrink: 0;
}
.chip-outline:hover { border-color: var(--primary, #FF85BB); }

.filter-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--primary, #FF85BB);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}

/* ═══════════════════════════════════════
   Filter panel
═══════════════════════════════════════ */
.filter-panel {
  background: #ffffff;
  border: 1px solid var(--theme-border, #e0e0e0);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.filter-row { display: flex; flex-direction: column; gap: 6px; }

.filter-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--ink-muted, #6e6e73);
}

.filter-input {
  padding: 9px 12px;
  border: 1px solid var(--theme-border, #e0e0e0);
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  color: var(--ink, #021A54);
  background: var(--canvas-parchment, #F5F5F5);
}
.filter-input:focus { border-color: var(--primary, #FF85BB); }

.skill-chips { display: flex; flex-wrap: wrap; gap: 6px; }

.skill-chip {
  padding: 5px 12px;
  border: 1px solid var(--theme-border, #e0e0e0);
  border-radius: 999px;
  background: #ffffff;
  font-size: 12px;
  cursor: pointer;
  color: var(--ink, #021A54);
  transition: all 120ms ease;
}
.skill-chip:hover { border-color: var(--primary, #FF85BB); }
.skill-chip.active {
  background: var(--primary, #FF85BB);
  border-color: var(--primary, #FF85BB);
  color: #ffffff;
  font-weight: 600;
}

.filter-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* ── Shared button atoms ── */
.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 9px 18px;
  border-radius: 999px;
  background: var(--primary, #FF85BB);
  color: #ffffff;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 120ms ease;
}
.chip:hover { background: var(--primary-hover, #ff6da9); }

.chip-soft {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 9px 18px;
  border-radius: 999px;
  background: var(--canvas-parchment, #F5F5F5);
  color: var(--ink, #021A54);
  border: 1px solid var(--theme-border, #e0e0e0);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.chip-soft:hover { border-color: var(--primary, #FF85BB); }

/* ═══════════════════════════════════════
   Summary bar
═══════════════════════════════════════ */
.summary-bar {
  font-size: 12px;
  color: var(--ink-muted, #6e6e73);
  margin-bottom: 10px;
  display: flex;
  gap: 4px;
  align-items: center;
}
.summary-filtered { color: var(--primary, #FF85BB); font-weight: 600; }

/* ═══════════════════════════════════════
   Skeleton
═══════════════════════════════════════ */
.skeleton {
  border-radius: 6px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.skeleton-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid var(--theme-border, #e0e0e0);
  border-radius: 14px;
}
.skeleton-avatar { width: 52px; height: 52px; border-radius: 50%; flex-shrink: 0; }
.skeleton-body { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.skeleton-line { height: 12px; }
.w40 { width: 40%; }
.w60 { width: 60%; }
.w80 { width: 80%; }
.skeleton-review { height: 60px; margin-bottom: 8px; border-radius: 10px; }

/* ═══════════════════════════════════════
   Tutors grid
═══════════════════════════════════════ */
.tutors-list-section { display: flex; flex-direction: column; gap: 10px; }

.tutors-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tutor-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 16px;
  background: #ffffff;
  border: 1px solid var(--theme-border, #e0e0e0);
  border-radius: 14px;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.tutor-card:hover {
  border-color: var(--primary, #FF85BB);
  box-shadow: 0 2px 16px rgba(255, 133, 187, 0.12);
}

.tutor-avatar {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid var(--primary-soft, #FFCEE3);
}
.tutor-avatar img {
  width: 100%; height: 100%;
  object-fit: cover;
}
.tutor-avatar-fallback {
  width: 100%; height: 100%;
  background: var(--canvas-parchment, #F5F5F5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.tutor-avatar-fallback svg {
  width: 28px; height: 28px;
  fill: var(--ink-muted, #6e6e73);
}

.tutor-card-body { flex: 1; min-width: 0; }

.tutor-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 2px;
}

.tutor-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink, #021A54);
}

.badge-verified {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(34, 197, 94, 0.12);
  color: #15803d;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.tutor-major {
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--ink-muted, #6e6e73);
}

.tutor-stats-row {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.stat-pill {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--canvas-parchment, #F5F5F5);
  border: 1px solid var(--theme-border, #e0e0e0);
  font-size: 11px;
  font-weight: 600;
  color: var(--ink, #021A54);
}

.expertise-tags { display: flex; flex-wrap: wrap; gap: 5px; }

.tag {
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(255, 133, 187, 0.1);
  border: 1px solid rgba(255, 133, 187, 0.2);
  font-size: 11px;
  color: var(--ink, #021A54);
  font-weight: 500;
}

/* ── Empty state ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 20px;
  text-align: center;
  color: var(--ink-muted, #6e6e73);
  font-size: 14px;
  border: 1px dashed rgba(255, 133, 187, 0.3);
  border-radius: 14px;
  background: rgba(255, 206, 227, 0.06);
}
.empty-state svg { color: rgba(255, 133, 187, 0.5); }

.link-btn {
  background: none;
  border: none;
  color: var(--primary, #FF85BB);
  font-size: 14px;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  font-weight: 600;
}

/* Load more */
.load-more {
  align-self: center;
  margin-top: 4px;
}

/* ═══════════════════════════════════════
   Modal
═══════════════════════════════════════ */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 26, 84, 0.35);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 9999;
  padding: 0;
}

@media (min-width: 600px) {
  .modal-backdrop {
    align-items: center;
    padding: 20px;
  }
}

.modal-content {
  background: #ffffff;
  border: 1px solid var(--theme-border, #e0e0e0);
  border-radius: 20px 20px 0 0;
  padding: 24px 20px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  outline: none;
}

@media (min-width: 600px) {
  .modal-content {
    border-radius: 20px;
    max-height: calc(100vh - 40px);
  }
}

.modal-close {
  position: absolute;
  top: 16px; right: 16px;
  background: var(--canvas-parchment, #F5F5F5);
  border: none;
  width: 32px; height: 32px;
  border-radius: 50%;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  color: var(--ink-muted, #6e6e73);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 120ms ease;
}
.modal-close:hover { background: var(--primary-soft, #FFCEE3); color: var(--ink, #021A54); }

/* Profile header */
.tutor-profile-header {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  padding-right: 36px;
}

.profile-pic-wrap {
  flex-shrink: 0;
}

.profile-pic {
  width: 72px; height: 72px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--primary-soft, #FFCEE3);
}

.profile-pic-fallback {
  background: var(--canvas-parchment, #F5F5F5);
  display: flex;
  align-items: center;
  justify-content: center;
}
.profile-pic-fallback svg {
  width: 36px; height: 36px;
  fill: var(--ink-muted, #6e6e73);
}

.profile-meta { flex: 1; min-width: 0; }

.profile-name {
  margin: 0 0 2px;
  font-size: 18px;
  font-weight: 700;
  color: var(--ink, #021A54);
}

.profile-major {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--ink-muted, #6e6e73);
}

.profile-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

/* Profile sections */
.profile-section {
  margin-bottom: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--theme-border, #e0e0e0);
}

.section-label {
  margin: 0 0 8px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-muted, #6e6e73);
}

.muted-text {
  font-size: 13px;
  color: var(--ink-muted, #6e6e73);
  margin: 0;
}

/* Availability */
.availability-list { display: flex; flex-direction: column; gap: 6px; }

.availability-slot {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--canvas-parchment, #F5F5F5);
  border-radius: 8px;
  font-size: 13px;
  flex-wrap: wrap;
}

.slot-day {
  font-weight: 700;
  color: var(--ink, #021A54);
  min-width: 80px;
}

.slot-time { color: var(--ink-muted, #6e6e73); }

.course-code {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(255, 133, 187, 0.12);
  color: var(--ink, #021A54);
  font-size: 11px;
  font-weight: 700;
}

/* Reviews */
.reviews-list { display: flex; flex-direction: column; gap: 10px; }

.review-card {
  padding: 12px 14px;
  background: var(--canvas-parchment, #F5F5F5);
  border-radius: 10px;
  border: 1px solid var(--theme-border, #e0e0e0);
}

.review-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 2px;
}
.review-header strong {
  font-size: 13px;
  color: var(--ink, #021A54);
}

.stars {
  font-size: 13px;
  color: #f59e0b;
  letter-spacing: 1px;
}

.review-meta {
  margin: 0 0 6px;
  font-size: 11px;
  color: var(--ink-muted, #6e6e73);
}

.review-comment {
  margin: 0;
  font-size: 13px;
  color: var(--ink, #021A54);
  line-height: 1.5;
}

.reviews-loading { display: flex; flex-direction: column; gap: 8px; }

/* Profile actions */
.profile-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 16px;
  border-top: 1px solid var(--theme-border, #e0e0e0);
}
.profile-actions .chip,
.profile-actions .chip-soft {
  flex: 1;
  min-width: 120px;
}

/* ═══════════════════════════════════════
   Responsive
═══════════════════════════════════════ */
@media (max-width: 400px) {
  .tutors-hero__stats { grid-template-columns: 1fr 1fr; }
  .tutor-card-header { flex-direction: column; align-items: flex-start; gap: 4px; }
  .tutor-profile-header { flex-direction: column; align-items: center; text-align: center; }
  .profile-badges { justify-content: center; }
}
</style>