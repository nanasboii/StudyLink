<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active">

        <!-- Hero -->
        <section class="tutors-hero">
          <p class="hero-kicker">Expert help</p>
          <h2>Find Your Tutor</h2>
          <p class="hero-sub">Connect with verified tutors who excel in your subjects.</p>
          <div class="hero-stats" aria-label="Tutor highlights">
            <div class="hero-stat">
              <strong>{{ totalTutors }}</strong>
              <span>Active tutors</span>
            </div>
            <div class="hero-stat">
              <strong>{{ highlyRatedTutors }}</strong>
              <span>Highly rated</span>
            </div>
            <div class="hero-stat">
              <strong>{{ totalSessions }}</strong>
              <span>Sessions</span>
            </div>
          </div>
        </section>

        <!-- ✨ Suggested for You -->
        <section
          v-if="currentUserRole === 'tutee'"
          class="suggestions-section"
          aria-live="polite"
        >
          <!-- Skeleton shimmer while loading -->
          <div v-if="isLoadingRecommended" class="suggestions-skeleton">
            <div class="suggestions-header">
              <div class="skeleton-line w-40"></div>
              <div class="skeleton-line w-60 mt-4"></div>
            </div>
            <div class="suggestions-grid">
              <div v-for="n in 3" :key="n" class="skeleton-card"></div>
            </div>
          </div>

          <!-- Has matches -->
          <template v-else-if="recommendedTutors.length > 0">
            <div class="suggestions-header">
              <div>
                <h3 class="suggestions-title">✨ Suggested for You</h3>
                <p class="suggestions-sub">
                  Based on:
                  <span
                    v-for="token in matchedSubjectTokens"
                    :key="token"
                    class="match-chip"
                  >{{ token }}</span>
                </p>
              </div>
            </div>
            <div class="suggestions-grid">
              <button
                v-for="tutor in recommendedTutors"
                :key="'rec-' + tutor.id"
                class="suggestion-card"
                @click="openTutorModal(tutor)"
              >
                <div class="suggestion-avatar-wrap">
                  <img
                    v-if="hasTutorAvatar(tutor) && !tutorAvatarErrors[tutorAvatarKey(tutor)]"
                    :src="resolveTutorAvatar(tutor.profile_picture_url)"
                    :alt="tutor.full_name"
                    class="suggestion-avatar"
                    @error="markTutorAvatarError(tutor)"
                  />
                  <div v-else class="suggestion-avatar suggestion-avatar-fallback" aria-hidden="true">
                    {{ (tutor.full_name || '?')[0].toUpperCase() }}
                  </div>
                  <span v-if="tutor.is_verified" class="suggestion-verified" title="Verified">✓</span>
                </div>
                <div class="suggestion-info">
                  <p class="suggestion-name">{{ tutor.full_name }}</p>
                  <p class="suggestion-rating">⭐ {{ Number(tutor.rating ?? 0).toFixed(1) }}</p>
                  <div class="suggestion-tags">
                    <span
                      v-for="skill in (tutor.expertise || []).slice(0, 3)"
                      :key="skill"
                      class="suggestion-tag"
                      :class="{ 'tag-match': matchedSubjectTokens.some(t => skill.toLowerCase().includes(t) || t.includes(skill.toLowerCase())) }"
                    >{{ skill }}</span>
                  </div>
                  <p class="suggestion-match">
                    {{ tutor.matchScore }} match{{ tutor.matchScore !== 1 ? 'es' : '' }}
                  </p>
                </div>
              </button>
            </div>
          </template>

          <!-- Has subjects but no matching tutors -->
          <div
            v-else-if="hasTargetSubjects && !isLoadingRecommended"
            class="suggestions-empty"
          >
            <p>🔍 No tutor matches your subjects yet. Try the search below.</p>
          </div>

          <!-- No subjects set -->
          <div
            v-else-if="hasTargetSubjects === false && !isLoadingRecommended"
            class="suggestions-empty"
          >
            <p>💡 <strong>Add target subjects</strong> in your profile to get suggestions.</p>
            <button class="chip chip-soft" @click="$router.push('/profile')">Update Profile</button>
          </div>
        </section>

        <!-- Search -->
        <div class="tutor-toolbar search-row">
          <div class="tutor-search-shell" role="search">
            <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10.5 4a6.5 6.5 0 1 0 4.14 11.5l4.18 4.18 1.41-1.41-4.18-4.18A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" />
            </svg>
            <input
              v-model="searchQuery"
              placeholder="Search name, expertise, or course"
              autocomplete="off"
              @input="debouncedSearch"
            />
            <button class="icon-chip" type="button" aria-label="Toggle filters" @click="toggleFilters">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M3 5h18v2l-7 7v5l-4-2v-3L3 7V5Zm4 2 5 5 5-5H7Z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Expertise chip filters -->
        <div class="chip-row" role="group" aria-label="Filter by skill">
          <button
            v-for="skill in popularSkills"
            :key="skill"
            class="chip chip-soft"
            :class="{ 'chip-active': selectedSkill === skill }"
            type="button"
            @click="selectedSkill = selectedSkill === skill ? '' : skill"
          >{{ skill }}</button>
        </div>

        <!-- Filter panel backdrop -->
        <div v-if="showFilters" class="filter-backdrop" @click="showFilters = false"></div>

        <!-- Filter panel -->
        <div v-if="showFilters" class="filter-panel glass-panel">
          <div class="filter-section">
            <h4>Course Code</h4>
            <select v-model="selectedCourseCode" class="filter-select">
              <option value="">All courses</option>
              <option
                v-for="course in availableCourseCodes"
                :key="course"
                :value="course"
              >{{ course }}</option>
            </select>
          </div>
          <div class="filter-actions">
            <button class="chip chip-soft" type="button" @click="clearFilters">Clear</button>
            <button class="chip" type="button" @click="applyFilters">Apply</button>
          </div>
        </div>

        <!-- Tutors list -->
        <section class="tutors-section">
          <div class="search-row compact">
            <h3>Available Tutors</h3>
            <p class="meta" v-if="filteredTutors.length">
              {{ Math.min(visibleCount, filteredTutors.length) }} / {{ filteredTutors.length }}
            </p>
          </div>

          <div class="tutors-list">
            <!-- Skeleton shimmer -->
            <template v-if="isLoading">
              <div v-for="n in 4" :key="n" class="skeleton-item"></div>
            </template>

            <!-- Empty states -->
            <div v-else-if="filteredTutors.length === 0 && (searchQuery || selectedSkill || selectedCourseCode)" class="empty-state">
              <p>🔍 No tutors match your filter. Try clearing it.</p>
              <button class="chip chip-soft" @click="clearFilters">Clear filters</button>
            </div>
            <div v-else-if="filteredTutors.length === 0" class="empty-state">
              <p>👥 No tutors available yet.</p>
            </div>

            <!-- Cards -->
            <button
              v-for="tutor in paginatedTutors"
              :key="tutor.id"
              class="tutor-card"
              @click="selectTutor(tutor)"
            >
              <div class="tutor-avatar">
                <img
                  v-if="hasTutorAvatar(tutor)"
                  :src="resolveTutorAvatar(tutor.profile_picture_url)"
                  :alt="`${tutor.full_name} profile picture`"
                  @error="markTutorAvatarError(tutor)"
                />
                <div v-else class="tutor-avatar-fallback" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2c-4.42 0-8 2.46-8 5.5 0 .55.45 1 1 1h14c.55 0 1-.45 1-1 0-3.04-3.58-5.5-8-5.5Z" />
                  </svg>
                </div>
              </div>
              <div class="tutor-card-body">
                <div class="tutor-card-header">
                  <strong>{{ tutor.full_name }}</strong>
                  <span v-if="tutor.is_verified" class="badge">Verified ✓</span>
                </div>
                <div class="tutor-meta">{{ tutor.major || 'General' }}</div>
                <div class="meta">⭐ {{ Number(tutor.rating ?? 0).toFixed(1) }} · {{ tutor.total_points ?? 0 }} pts</div>
                <div v-if="tutor.expertise?.length" class="expertise-tags">
                  <span v-for="skill in tutor.expertise.slice(0, 3)" :key="skill" class="tag">{{ skill }}</span>
                </div>
              </div>
            </button>
          </div>

          <button
            v-if="visibleCount < filteredTutors.length"
            class="chip chip-soft load-more"
            type="button"
            @click="visibleCount += pageSize"
          >Load more tutors</button>
        </section>

        <!-- Tutor modal -->
        <div v-if="selectedTutorData" class="modal-backdrop" role="dialog" aria-modal="true" @click.self="selectedTutorData = null">
          <div class="modal-content glass-panel">
            <button class="modal-close" aria-label="Close" @click="selectedTutorData = null">×</button>

            <div class="tutor-profile-header">
              <img
                v-if="hasTutorAvatar(selectedTutorData)"
                :src="resolveTutorAvatar(selectedTutorData.profile_picture_url)"
                :alt="`${selectedTutorData.full_name} profile picture`"
                class="profile-pic"
                @error="markTutorAvatarError(selectedTutorData)"
              />
              <div v-else class="profile-pic profile-pic-fallback" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2c-4.42 0-8 2.46-8 5.5 0 .55.45 1 1 1h14c.55 0 1-.45 1-1 0-3.04-3.58-5.5-8-5.5Z" /></svg>
              </div>
              <div class="tutor-profile-info">
                <h2>{{ selectedTutorData.full_name }}</h2>
                <p class="role-badge">{{ selectedTutorData.major || 'Tutor' }} · Year {{ selectedTutorData.year_of_study || '?' }}</p>
                <p class="meta">⭐ {{ Number(selectedTutorData.rating ?? 0).toFixed(1) }} · {{ selectedTutorData.total_points ?? 0 }} pts</p>
                <span v-if="selectedTutorData.is_verified" class="badge">Verified ✓</span>
              </div>
            </div>

            <div v-if="selectedTutorData.bio" class="profile-section">
              <h4>About</h4>
              <p>{{ selectedTutorData.bio }}</p>
            </div>

            <div v-if="selectedTutorData.expertise?.length" class="profile-section">
              <h4>Expertise</h4>
              <div class="expertise-list">
                <span v-for="skill in selectedTutorData.expertise" :key="skill" class="tag">{{ skill }}</span>
              </div>
            </div>

            <div v-if="selectedTutorData.availability?.length" class="profile-section">
              <h4>Availability</h4>
              <div class="availability-list">
                <div
                  v-for="(slot, i) in selectedTutorData.availability"
                  :key="i"
                  class="availability-slot"
                >
                  <span class="slot-main">
                    <strong>{{ slot.dayOfWeek }}</strong>
                    {{ slot.startTime }} – {{ slot.endTime }}
                    <span v-if="slot.courseCode" class="course-code">{{ slot.courseCode }}</span>
                  </span>
                  <button
                    v-if="canBookTutorSessions"
                    class="slot-book-btn"
                    type="button"
                    @click="bookSlot(slot)"
                  >Book →</button>
                </div>
              </div>
            </div>

            <div class="profile-section">
              <h4>Reviews</h4>
              <div v-if="tutorReviews.length === 0" class="empty-state small">No reviews yet.</div>
              <div v-else class="reviews-list">
                <div v-for="review in tutorReviews" :key="review.id" class="review-card">
                  <div class="review-header">
                    <strong>{{ review.reviewer_name || 'Anonymous' }}</strong>
                    <span class="stars">{{ '★'.repeat(review.rating ?? 0) }}{{ '☆'.repeat(5 - (review.rating ?? 0)) }}</span>
                  </div>
                  <p class="review-meta">{{ review.reviewer_role || 'Tutee' }} · {{ formatDateValue(review.created_at, '', undefined, { month: 'short', day: 'numeric' }) }}</p>
                  <p class="review-comment">{{ review.comment || 'No comment.' }}</p>
                </div>
              </div>
            </div>

            <div class="profile-actions">
              <button class="chip chip-soft" type="button" @click="viewPublicProfile">View Profile</button>
              <button v-if="canBookTutorSessions" class="chip" type="button" @click="bookTutor">Book This Tutor</button>
            </div>
          </div>
        </div>

      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { api, getUser } from '@/api.js'
import { formatDateValue, normalizeTutor } from '@/utils/records.js'

// ── Auth ─────────────────────────────────────────────────────────────
const router = useRouter()
const currentUser = getUser()
const currentUserRole = String(currentUser?.role || 'tutee').toLowerCase().trim()
const canBookTutorSessions = currentUserRole === 'tutee' || currentUserRole === 'admin'

// ── State ─────────────────────────────────────────────────────────────
const tutors            = ref([])
const isLoading         = ref(true)
const searchQuery       = ref('')
const selectedSkill     = ref('')
const showFilters       = ref(false)
const selectedCourseCode = ref('')
const visibleCount      = ref(10)
const pageSize          = 10
const selectedTutorData = ref(null)
const tutorReviews      = ref([])
const tutorAvatarErrors = ref({})

// BUG FIX → init as null (not false) so nudge doesn't flash before load
const recommendedTutors    = ref([])
const matchedSubjectTokens = ref([])
const hasTargetSubjects    = ref(null)   // null = unknown, true/false after load
const isLoadingRecommended = ref(false)

const popularSkills = ['Java', 'Python', 'Database', 'Web Dev', 'C++', 'Mobile Dev']

// ── Avatar helpers ─────────────────────────────────────────────────
const tutorAvatarKey = (tutor) => String(tutor?.id || tutor?.full_name || '')

const resolveTutorAvatar = (rawUrl) => {
  const v = String(rawUrl || '').trim()
  if (!v) return ''
  if (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:')) return v
  return v.startsWith('/') ? v : `/${v.replace(/^\/+/, '')}`
}

const hasTutorAvatar = (tutor) => {
  const raw = tutor?.profile_picture_url || tutor?.profilePictureUrl || tutor?.profilePicture || ''
  return !!resolveTutorAvatar(raw) && !tutorAvatarErrors.value[tutorAvatarKey(tutor)]
}

const markTutorAvatarError = (tutor) => {
  const key = tutorAvatarKey(tutor)
  if (!key) return
  tutorAvatarErrors.value = { ...tutorAvatarErrors.value, [key]: true }
}

// ── Computed ───────────────────────────────────────────────────────
const totalTutors      = computed(() => tutors.value.length)
const highlyRatedTutors = computed(() => tutors.value.filter(t => (t.rating ?? 0) >= 4).length)
const totalSessions    = computed(() => tutors.value.reduce((s, t) => s + (t.total_points ?? 0), 0))

// BUG FIX → use tutors.value not tutors (non-ref access)
const availableCourseCodes = computed(() =>
  Array.from(new Set(
    tutors.value.flatMap(t =>
      (t.availability || []).map(s => s.courseCode || s.course_code || '').filter(Boolean)
    )
  )).sort()
)

const filteredTutors = computed(() => {
  let list = [...tutors.value]

  if (selectedSkill.value) {
    const sel = selectedSkill.value.toLowerCase().trim()
    list = list.filter(t =>
      Array.isArray(t.expertise) && t.expertise.some(e => String(e || '').toLowerCase().includes(sel))
    )
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(t =>
      t.full_name?.toLowerCase().includes(q) ||
      t.major?.toLowerCase().includes(q) ||
      (Array.isArray(t.expertise) && t.expertise.some(e => e.toLowerCase().includes(q))) ||
      (Array.isArray(t.availability) && t.availability.some(s =>
        String(s.courseCode || s.course_code || '').toLowerCase().includes(q)
      ))
    )
  }

  if (selectedCourseCode.value) {
    const sc = selectedCourseCode.value.toLowerCase().trim()
    list = list.filter(t =>
      Array.isArray(t.availability) && t.availability.some(s =>
        String(s.courseCode || s.course_code || '').toLowerCase().includes(sc)
      )
    )
  }

  return list
})

const paginatedTutors = computed(() => filteredTutors.value.slice(0, visibleCount.value))

// ── Debounce search ────────────────────────────────────────────────
const debouncedSearch = (() => {
  let t
  return () => { clearTimeout(t); t = setTimeout(() => { visibleCount.value = pageSize }, 300) }
})()

// ── Load tutors ────────────────────────────────────────────────────
const loadTutors = async () => {
  try {
    isLoading.value = true
    const qs = selectedCourseCode.value
      ? `?courseCode=${encodeURIComponent(String(selectedCourseCode.value).toUpperCase())}` : ''
    const data = await api(`/tutors${qs}`)
    const normalized = (data?.tutors || []).map(normalizeTutor)
    tutors.value = Array.from(new Map(normalized.map(t => [String(t.id), t])).values())
    tutorAvatarErrors.value = {}
  } catch (err) {
    console.error('Failed to load tutors:', err)
  } finally {
    isLoading.value = false
  }
}

// BUG FIX → separate fn so profile-update event reloads BOTH tutors AND recommendations
const loadRecommended = async () => {
  if (currentUserRole !== 'tutee') return
  try {
    isLoadingRecommended.value = true
    const resp = await api('/tutors/recommended')
    recommendedTutors.value = (resp.tutors || []).map(normalizeTutor)
    matchedSubjectTokens.value = resp.matchedOn || []
    // BUG FIX → hasTargetSubjects tracks whether user SET subjects, not whether matches found
    // Server returns empty matchedOn when target_subjects is blank → use that as signal
    // If matchedOn is empty AND tutors is empty → user likely has no subjects
    // Distinguish: server returns {tutors:[], matchedOn:[]} when no subjects set
    hasTargetSubjects.value = resp.hasSubjects ?? ((resp.matchedOn?.length ?? 0) > 0 || (resp.tutors?.length ?? 0) > 0)
  } catch {
    recommendedTutors.value = []
    hasTargetSubjects.value = false
  } finally {
    isLoadingRecommended.value = false
  }
}

// ── Filter actions ─────────────────────────────────────────────────
const applyFilters = () => { loadTutors(); showFilters.value = false }
const clearFilters = () => {
  selectedCourseCode.value = ''
  searchQuery.value = ''
  selectedSkill.value = ''
  visibleCount.value = pageSize
  loadTutors()
  showFilters.value = false
}
const toggleFilters = () => { showFilters.value = !showFilters.value }

// ── Select / modal ─────────────────────────────────────────────────
const selectTutor = async (tutor) => {
  selectedTutorData.value = tutor
  tutorReviews.value = []
  try {
    const res = await api(`/users/${tutor.id}/public/reviews`)
    tutorReviews.value = Array.isArray(res?.reviews) ? res.reviews : []
  } catch (e) {
    console.error('Failed to load reviews:', e)
  }
}

// BUG FIX → openTutorModal alias so suggestion cards work too
const openTutorModal = selectTutor

const bookTutor = () => {
  if (!selectedTutorData.value) return
  localStorage.setItem('prefillTutorId', String(selectedTutorData.value.id))
  router.push('/session')
}

// ── Slot date helpers ──────────────────────────────────────────────
const dayNameToIndex = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6 }

const toDateTimeLocalValue = (d) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const getNextSlotDateTime = (dayOfWeek, startTime) => {
  const idx = dayNameToIndex[String(dayOfWeek || '').toLowerCase()]
  if (idx === undefined || !String(startTime || '').includes(':')) return ''
  const [h, m] = String(startTime).split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return ''
  const now = new Date()
  const cand = new Date(now)
  const delta = (idx - cand.getDay() + 7) % 7
  cand.setDate(cand.getDate() + delta)
  cand.setHours(h, m, 0, 0)
  if (cand <= now) cand.setDate(cand.getDate() + 7)
  return toDateTimeLocalValue(cand)
}

const bookSlot = (slot) => {
  if (!selectedTutorData.value) return
 
  const query = { tutorId: String(selectedTutorData.value.id) }
  if (slot?.courseCode) query.courseCode = String(slot.courseCode).toUpperCase()
  const next = getNextSlotDateTime(slot?.dayOfWeek, slot?.startTime)
  if (next) query.sessionTime = next
 
  // FIX → optimistic remove: strip slot from modal view
  const tutorId = selectedTutorData.value.id
  selectedTutorData.value = {
    ...selectedTutorData.value,
    availability: (selectedTutorData.value.availability || []).filter(s =>
      !(s.dayOfWeek === slot?.dayOfWeek &&
        s.startTime === slot?.startTime &&
        s.endTime   === slot?.endTime &&
        s.courseCode === slot?.courseCode)
    )
  }
 
  // FIX → also remove from global tutors[] cache so re-open shows same state
  const idx = tutors.value.findIndex(t => String(t.id) === String(tutorId))
  if (idx !== -1) {
    tutors.value[idx] = {
      ...tutors.value[idx],
      availability: (tutors.value[idx].availability || []).filter(s =>
        !(s.dayOfWeek === slot?.dayOfWeek &&
          s.startTime === slot?.startTime &&
          s.endTime   === slot?.endTime &&
          s.courseCode === slot?.courseCode)
      )
    }
  }
 
  // close modal + navigate
  selectedTutorData.value = null
  router.push({ path: '/session', query })
}

const viewPublicProfile = () => {
  if (!selectedTutorData.value) return
  const id = selectedTutorData.value.id
  selectedTutorData.value = null
  router.push({ name: 'PublicProfile', params: { userId: id }, query: { from: 'tutors' } })
}

// ── Lifecycle ──────────────────────────────────────────────────────
const onProfileUpdated = () => {
  loadTutors()
  loadRecommended()  // BUG FIX → was missing; suggestions never refreshed after profile edit
}

onMounted(() => {
  const viewEl = document.querySelector('.view')
  const topbar = document.querySelector('.topbar')
  if (viewEl) viewEl.scrollTop = topbar ? topbar.offsetHeight : 80

  // BUG FIX → parallel fetch
  Promise.all([loadTutors(), loadRecommended()])

  window.addEventListener('studylink-profile-updated', onProfileUpdated)
})

onUnmounted(() => {
  window.removeEventListener('studylink-profile-updated', onProfileUpdated)
})
</script>

<style scoped>
/* ── Local tokens ── */
.page-bg {
  --_primary: #FF85BB;
  --_primary-soft: #FFCEE3;
  --_ink: #021A54;
  --_muted: #6e6e73;
  --_border: #e0e0e0;
  --_accent-light: rgba(255, 133, 187, 0.12);
  --_accent-strong: rgba(255, 133, 187, 0.25);
  --_surface: rgba(255, 255, 255, 0.72);

  min-height: 100vh;
  background: linear-gradient(180deg, #ffffff, var(--canvas-parchment, #F5F5F5));
}

.phone-shell {
  width: 100%;
  min-height: 100vh;
  background: transparent;
}

.view {
  padding: 20px 16px 80px;
  overflow-x: hidden;
}

/* ── Glass util ── */
.glass-panel {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 133, 187, 0.2);
  border-radius: 14px;
}

/* ── Hero ── */
.tutors-hero { margin-bottom: 24px; }

.hero-kicker {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--_primary);
}

.tutors-hero h2 {
  margin: 0 0 8px;
  font-size: 26px;
  font-weight: 800;
  color: var(--_ink);
  font-family: "Josefin Sans", "Trebuchet MS", sans-serif;
}

.hero-sub {
  margin: 0 0 16px;
  font-size: 14px;
  color: var(--_muted);
  line-height: 1.5;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.hero-stat {
  padding: 12px 8px;
  background: var(--_accent-light);
  border: 1px solid rgba(255, 133, 187, 0.18);
  border-radius: 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hero-stat strong {
  font-size: 22px;
  font-weight: 800;
  color: var(--_ink);
}

.hero-stat span {
  font-size: 11px;
  color: var(--_muted);
  font-weight: 500;
}

/* ── Suggestions ── */
.suggestions-section { margin-bottom: 24px; }

.suggestions-header { margin-bottom: 12px; }

.suggestions-title {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 700;
  color: var(--_ink);
}

.suggestions-sub {
  margin: 0;
  font-size: 13px;
  color: var(--_muted);
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.match-chip {
  display: inline-block;
  padding: 2px 8px;
  background: var(--_primary-soft, #FFCEE3);
  color: var(--_ink);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.suggestions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 10px;
}

.suggestion-card {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 133, 187, 0.22);
  border-radius: 14px;
  padding: 14px 10px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
  text-align: center;
  backdrop-filter: blur(8px);
}

.suggestion-card:hover {
  transform: translateY(-3px);
  border-color: var(--_primary);
  box-shadow: 0 6px 18px rgba(255, 133, 187, 0.2);
}

.suggestion-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.suggestion-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(255, 133, 187, 0.3);
}

.suggestion-avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--_accent-light);
  color: var(--_ink);
  font-size: 20px;
  font-weight: 700;
}

.suggestion-verified {
  position: absolute;
  bottom: 0;
  right: -2px;
  background: #2ecc71;
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #fff;
}

.suggestion-info { width: 100%; }

.suggestion-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--_ink);
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.suggestion-rating {
  font-size: 11px;
  color: var(--_muted);
  margin: 0 0 4px;
}

.suggestion-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  justify-content: center;
  margin-bottom: 4px;
}

.suggestion-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--_accent-light);
  color: var(--_ink);
}

.suggestion-tag.tag-match {
  background: var(--_accent-strong);
  color: var(--_ink);
  font-weight: 700;
}

.suggestion-match {
  font-size: 10px;
  font-weight: 600;
  color: var(--_primary);
  margin: 0;
}

.suggestions-empty {
  background: var(--_accent-light);
  border: 1px dashed rgba(255, 133, 187, 0.35);
  border-radius: 12px;
  padding: 14px 16px;
  font-size: 13px;
  color: var(--_ink);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

/* ── Skeleton ── */
.suggestions-skeleton .suggestions-header { margin-bottom: 12px; }
.skeleton-line {
  height: 14px;
  border-radius: 7px;
  background: linear-gradient(90deg, #f0f0f0, #e0e0e0, #f0f0f0);
  background-size: 200% 100%;
  animation: shimmer 1.6s linear infinite;
}
.skeleton-line.w-40 { width: 40%; }
.skeleton-line.w-60 { width: 60%; }
.skeleton-line.mt-4 { margin-top: 4px; }

.skeleton-card {
  height: 130px;
  border-radius: 14px;
  background: linear-gradient(90deg, #f8f8f8, #efefef, #f8f8f8);
  background-size: 200% 100%;
  animation: shimmer 1.6s linear infinite;
}

.skeleton-item {
  height: 88px;
  border-radius: 12px;
  background: linear-gradient(90deg, #f8f8f8, #efefef, #f8f8f8);
  background-size: 200% 100%;
  animation: shimmer 1.6s linear infinite;
}

@keyframes shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-item, .skeleton-card, .skeleton-line { animation: none; }
}

/* ── Search / toolbar ── */
.search-row { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }

.tutor-search-shell {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  background: rgba(255,255,255,0.85);
  border-radius: 12px;
  border: 1px solid var(--_border);
  padding: 0 10px 0 12px;
  gap: 6px;
  backdrop-filter: blur(8px);
}

.tutor-search-shell input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  padding: 10px 0;
  font-size: 14px;
  background: transparent;
  color: var(--_ink);
}

.search-icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  fill: var(--_muted);
}

.icon-chip {
  background: none;
  border: none;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--_muted);
  border-radius: 8px;
  transition: background 120ms;
  flex-shrink: 0;
}

.icon-chip:hover { background: var(--_accent-light); }
.icon-chip svg { width: 18px; height: 18px; fill: currentColor; }

/* ── Chips ── */
.chip-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  margin-bottom: 20px;
  padding-bottom: 4px;
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.chip-row::-webkit-scrollbar { display: none; }

/* ── Filter panel ── */
.filter-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
}

.filter-panel {
  position: relative;
  z-index: 91;
  padding: 14px;
  margin-bottom: 16px;
}

.filter-section h4 {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--_muted);
}

.filter-select {
  width: 100%;
  border: 1px solid var(--_border);
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 13px;
  background: #fff;
  color: var(--_ink);
}

.filter-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

/* ── Tutors list ── */
.tutors-section { margin-top: 4px; }

.search-row.compact {
  margin-bottom: 12px;
  flex-wrap: nowrap;
  align-items: center;
}

.search-row.compact h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--_ink);
}

.meta { font-size: 12px; color: var(--_muted); }

.tutors-list {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
}

.tutor-card {
  background: rgba(255,255,255,0.85);
  border: 1px solid var(--_border);
  border-radius: 14px;
  padding: 12px;
  display: flex;
  gap: 12px;
  cursor: pointer;
  transition: border-color 140ms, box-shadow 140ms, transform 140ms;
  text-align: left;
  backdrop-filter: blur(8px);
}

.tutor-card:hover {
  border-color: var(--_primary);
  box-shadow: 0 4px 14px rgba(255, 133, 187, 0.18);
  transform: translateY(-2px);
}

.tutor-avatar {
  flex-shrink: 0;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--_accent-light);
  border: 1px solid rgba(255,133,187,0.25);
}

.tutor-avatar img { width: 100%; height: 100%; object-fit: cover; }

.tutor-avatar-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  fill: var(--_primary);
}
.tutor-avatar-fallback svg { width: 28px; height: 28px; fill: var(--_primary); }

.tutor-card-body { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }

.tutor-card-header {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.tutor-card-header strong { font-size: 14px; color: var(--_ink); }

.tutor-meta { font-size: 12px; font-weight: 600; color: var(--_primary); }

.expertise-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }

.tag {
  display: inline-block;
  background: var(--_accent-light);
  color: var(--_ink);
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
}

.badge {
  display: inline-block;
  background: rgba(46,204,113,0.12);
  color: #1a7a45;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
}

.empty-state {
  padding: 36px 16px;
  text-align: center;
  color: var(--_muted);
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.empty-state.small { padding: 14px 0; font-size: 13px; }

.load-more { margin: 4px auto 0; display: block; }

/* ── Modal ── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 26, 84, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 14px;
  background: none;
  border: none;
  font-size: 26px;
  cursor: pointer;
  color: var(--_muted);
  line-height: 1;
}

.tutor-profile-header {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  align-items: flex-start;
}

.profile-pic {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid rgba(255,133,187,0.3);
}

.profile-pic-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--_accent-light);
  border: 1px solid var(--_border);
}
.profile-pic-fallback svg { width: 42px; height: 42px; fill: var(--_primary); }

.tutor-profile-info h2 { margin: 0 0 4px; font-size: 18px; font-weight: 700; color: var(--_ink); }
.tutor-profile-info .role-badge { margin: 0 0 4px; font-size: 13px; color: var(--_muted); }

.profile-section {
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--_border);
}
.profile-section:last-of-type { border-bottom: none; }

.profile-section h4 {
  margin: 0 0 10px;
  font-size: 11px;
  font-weight: 700;
  color: var(--_muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.profile-section p { margin: 0; font-size: 13px; color: var(--_ink); line-height: 1.6; }

.expertise-list { display: flex; flex-wrap: wrap; gap: 6px; }

.availability-list { display: flex; flex-direction: column; gap: 8px; }

.availability-slot {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  padding: 9px 10px;
  background: var(--_accent-light);
  border-radius: 10px;
  font-size: 12px;
}

.slot-main {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.availability-slot strong { color: var(--_ink); font-weight: 700; min-width: 60px; }

.course-code {
  background: #fff;
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  color: var(--_ink);
  border: 1px solid var(--_border);
}

.slot-book-btn {
  border: none;
  border-radius: 999px;
  background: var(--_primary);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 6px 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 120ms;
}
.slot-book-btn:hover { background: #ff6da9; }

.reviews-list { display: flex; flex-direction: column; gap: 10px; }

.review-card {
  background: var(--_accent-light);
  border-radius: 10px;
  padding: 10px 12px;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.review-header strong { font-size: 13px; color: var(--_ink); }

.stars { font-size: 12px; color: #f5a623; letter-spacing: 1px; }

.review-meta { font-size: 11px; color: var(--_muted); margin: 0 0 4px; }
.review-comment { font-size: 13px; color: var(--_ink); margin: 0; line-height: 1.5; }

.profile-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding-top: 4px;
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .hero-stats { grid-template-columns: repeat(3, 1fr); }
  .suggestions-grid { grid-template-columns: repeat(3, 1fr); }
  .tutor-profile-header { flex-direction: column; align-items: center; text-align: center; }
  .profile-actions { flex-direction: column; }
  .modal-content { padding: 16px; }
}

@media (max-width: 380px) {
  .hero-stats { grid-template-columns: 1fr 1fr; }
  .suggestions-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>