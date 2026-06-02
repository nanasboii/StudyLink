<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active">
        <section class="tutors-hero">
          <div class="tutors-hero__copy">
            <p class="tutors-hero__kicker">Expert help</p>
            <h2>Find Your Perfect Tutor</h2>
            <p class="tutors-hero__text">Connect with verified tutors who excel in your subject areas.</p>
          </div>
          <div class="tutors-hero__stats" aria-label="Tutor highlights">
            <div class="hero-stat">
              <span class="hero-stat__label">Active tutors</span>
              <strong>{{ totalTutors }}</strong>
            </div>
            <div class="hero-stat">
              <span class="hero-stat__label">Highly rated</span>
              <strong>{{ highlyRatedTutors }}</strong>
            </div>
            <div class="hero-stat">
              <span class="hero-stat__label">Sessions</span>
              <strong>{{ totalSessions }}</strong>
            </div>
          </div>
        </section>

        <div class="search-row tutor-toolbar">
          <div class="tutor-search-shell" role="search">
            <input 
              v-model="searchQuery" 
              placeholder="Search by name, expertise, or course" 
              @input="debouncedSearch"
            />
            <div class="search-inline-actions">
              <button class="icon-chip" type="button" aria-label="Search" @click="visibleCount = pageSize">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M10.5 4a6.5 6.5 0 1 0 4.14 11.5l4.18 4.18 1.41-1.41-4.18-4.18A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" />
                </svg>
              </button>
              <button class="icon-chip" type="button" aria-label="Open filters" @click="toggleFilters" title="Toggle filters">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M3 5h18v2l-7 7v5l-4-2v-3L3 7V5Zm4 2 5 5 5-5H7Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Expertise Chips Filter -->
        <div class="chip-row">
          <button 
            v-for="skill in popularSkills" 
            :key="skill"
            class="chip"
            :class="{ 'chip-active': selectedSkill === skill }"
            @click="selectedSkill = selectedSkill === skill ? '' : skill"
          >
            {{ skill }}
          </button>
        </div>

        <!-- Filter Panel Backdrop -->
        <div v-if="showFilters" class="filter-backdrop" @click="showFilters = false"></div>

        <!-- Simple Filter Panel -->
        <div v-if="showFilters" class="filter-panel">
          <div class="filter-section">
            <div class="filter-header">
              <h4>Course Code</h4>
            </div>
            <div class="filter-content">
              <select v-model="selectedCourseCode" class="filter-select">
                <option value="">All courses</option>
                <option v-for="course in Array.from(new Set(tutors.flatMap(t => (t.availability || []).map(s => s.courseCode || s.course_code || '').filter(Boolean))))" :key="course" :value="course">{{ course }}</option>
              </select>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px;">
            <button class="chip" type="button" @click="clearFilters">Clear</button>
            <button class="chip chip-strong" type="button" @click="applyFilters">Apply</button>
          </div>
        </div>

        <!-- Tutors List -->
        <section class="tutors-section">
          <div class="search-row compact">
            <h3>Available Tutors</h3>
            <p class="meta" v-if="filteredTutors.length">
              Showing {{ Math.min(visibleCount, filteredTutors.length) }} of {{ filteredTutors.length }} tutors
            </p>
          </div>
          <div class="tutors-list">
            <div v-if="isLoading" class="loading">Loading tutors...</div>
            <div v-else-if="filteredTutors.length === 0" class="empty-state">
              No tutors found. Try adjusting your search or filters.
            </div>
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
                  <svg viewBox="0 0 24 24" role="img">
                    <path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2c-4.42 0-8 2.46-8 5.5 0 .55.45 1 1 1h14c.55 0 1-.45 1-1 0-3.04-3.58-5.5-8-5.5Z" />
                  </svg>
                </div>
              </div>
              <div class="tutor-card-body">
                <div class="tutor-card-header">
                  <strong>{{ tutor.full_name }}</strong>
                  <span v-if="tutor.is_verified" class="badge">Verified</span>
                </div>
                <div class="meta tutor-meta">{{ tutor.major || 'General' }}</div>
                <div class="meta">Rating {{ Number(tutor.rating || 0).toFixed(1) }} - {{ tutor.total_points || 0 }} pts</div>
                <div v-if="tutor.expertise && tutor.expertise.length" class="expertise-tags">
                  <span v-for="skill in tutor.expertise.slice(0, 3)" :key="skill" class="tag">
                    {{ skill }}
                  </span>
                </div>
              </div>
            </button>
          </div>
          <button 
            v-if="visibleCount < filteredTutors.length"
            class="chip"
            @click="visibleCount += pageSize"
          >
            Load more tutors
          </button>
        </section>

        <!-- Tutor Profile Modal -->
        <div v-if="selectedTutorData" class="modal-backdrop" @click="selectedTutorData = null">
          <div class="modal-content" @click.stop>
            <button class="modal-close" @click="selectedTutorData = null">x</button>
            
            <div class="tutor-profile-header">
              <img
                v-if="hasTutorAvatar(selectedTutorData)"
                :src="resolveTutorAvatar(selectedTutorData.profile_picture_url)"
                :alt="`${selectedTutorData.full_name} profile picture`"
                class="profile-pic"
                @error="markTutorAvatarError(selectedTutorData)"
              />
              <div v-else class="profile-pic profile-pic-fallback" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img">
                  <path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2c-4.42 0-8 2.46-8 5.5 0 .55.45 1 1 1h14c.55 0 1-.45 1-1 0-3.04-3.58-5.5-8-5.5Z" />
                </svg>
              </div>
              <div class="tutor-profile-info">
                <h2>{{ selectedTutorData.full_name }}</h2>
                <p class="role-badge">
                  Tutor
                  <span v-if="selectedTutorData.is_verified" class="badge">Verified</span>
                </p>
              </div>
            </div>

            <div class="profile-section">
              <h4>Rating & Stats</h4>
              <p>Rating: <strong>{{ Number(selectedTutorData.rating || 0).toFixed(2) }} / 5</strong></p>
              <p>Points: <strong>{{ selectedTutorData.total_points || 0 }}</strong></p>
            </div>

            <div class="profile-section">
              <h4>Expertise</h4>
              <div v-if="selectedTutorData.expertise && selectedTutorData.expertise.length" class="expertise-list">
                <span v-for="skill in selectedTutorData.expertise" :key="skill" class="tag">
                  {{ skill }}
                </span>
              </div>
              <p v-else class="meta">No expertise listed</p>
            </div>

            <div class="profile-section">
              <h4>Bio</h4>
              <p>{{ selectedTutorData.bio || 'No bio provided.' }}</p>
            </div>

            <div class="profile-section">
              <h4>Availability</h4>
              <div v-if="selectedTutorData.availability && selectedTutorData.availability.length" class="availability-list">
                <div v-for="slot in selectedTutorData.availability" :key="`${slot.dayOfWeek}-${slot.startTime}`" class="availability-slot">
                  <div class="slot-main">
                    <strong>{{ slot.dayOfWeek }}</strong>
                    <span>{{ slot.startTime }} - {{ slot.endTime }}</span>
                    <span v-if="slot.courseCode" class="course-code">{{ slot.courseCode }}</span>
                  </div>
                  <button
                    v-if="canBookTutorSessions"
                    type="button"
                    class="slot-book-btn"
                    @click="bookSlot(slot)"
                  >
                    Book this session
                  </button>
                </div>
              </div>
              <p v-else class="meta">No availability set yet</p>
            </div>

            <!-- Reviews Section -->
            <div class="profile-section">
              <h4>Reviews ({{ tutorReviews.length }})</h4>
              <div v-if="tutorReviews.length === 0" class="empty-state">
                No reviews yet
              </div>
              <div v-else class="reviews-list">
                <div v-for="review in tutorReviews" :key="review.id" class="review-card">
                  <div class="review-header">
                    <strong>{{ review.reviewer_name || 'Anonymous' }}</strong>
                    <span class="stars">{{ '*'.repeat(review.rating) }}{{ '-'.repeat(5 - review.rating) }}</span>
                  </div>
                  <p class="review-meta">{{ review.reviewer_role || 'Tutee' }} - {{ formatDateValue(review.created_at, '', undefined, { month: 'short', day: 'numeric' }) }}</p>
                  <p class="review-comment">{{ review.comment || 'No comment' }}</p>
                </div>
              </div>
            </div>

            <div class="profile-actions">
              <button class="chip" @click="viewPublicProfile">
                View Profile
              </button>
              <button v-if="canBookTutorSessions" class="chip-strong" @click="bookTutor">
                Book This Tutor
              </button>
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
import { formatDateValue } from '@/utils/records.js'
import { normalizeTutor } from '@/utils/records.js'

const router = useRouter()
const currentUser = getUser()
const currentUserRole = String(currentUser?.role || 'tutee').toLowerCase().trim()
const canBookTutorSessions = currentUserRole === 'tutee' || currentUserRole === 'admin'

const tutors = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
const selectedSkill = ref('')
const showFilters = ref(false)
const selectedCourseCode = ref('')
const visibleCount = ref(10)
const pageSize = 10
const selectedTutorData = ref(null)
const tutorReviews = ref([])
const tutorAvatarErrors = ref({})

const tutorAvatarKey = (tutor) => String(tutor?.id || tutor?.full_name || '')

const resolveTutorAvatar = (rawUrl) => {
  const value = String(rawUrl || '').trim()
  if (!value) return ''
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) return value
  return value.startsWith('/') ? value : `/${value.replace(/^\/+/, '')}`
}

const hasTutorAvatar = (tutor) => {
  const key = tutorAvatarKey(tutor)
  const raw = tutor?.profile_picture_url || tutor?.profilePictureUrl || tutor?.profilePicture || ''
  return !!resolveTutorAvatar(raw) && !tutorAvatarErrors.value[key]
}

const markTutorAvatarError = (tutor) => {
  const key = tutorAvatarKey(tutor)
  if (!key) return
  tutorAvatarErrors.value = {
    ...tutorAvatarErrors.value,
    [key]: true
  }
}

const popularSkills = ['Java', 'Python', 'Database', 'Web Dev', 'C++', 'Mobile Dev']

const totalTutors = computed(() => tutors.value.length)
const highlyRatedTutors = computed(() => tutors.value.filter(t => t.rating >= 4).length)
const totalSessions = computed(() => tutors.value.reduce((sum, t) => sum + (t.total_points || 0), 0))

const filteredTutors = computed(() => {
  let filtered = [...tutors.value]

  if (selectedSkill.value) {
    const sel = String(selectedSkill.value || '').toLowerCase().trim()
    filtered = filtered.filter(t =>
      Array.isArray(t.expertise) && t.expertise.some(e => String(e || '').toLowerCase().includes(sel))
    )
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    filtered = filtered.filter(t =>
      t.full_name?.toLowerCase().includes(q) ||
      t.major?.toLowerCase().includes(q) ||
      (Array.isArray(t.expertise) && t.expertise.some(e => e.toLowerCase().includes(q))) ||
      (Array.isArray(t.availability) && t.availability.some(slot => String(slot.courseCode || slot.course_code || '').toLowerCase().includes(q)))
    )
  }

  if (selectedCourseCode.value) {
    const sc = String(selectedCourseCode.value).toLowerCase().trim()
    filtered = filtered.filter(t =>
      Array.isArray(t.availability) && t.availability.some(s => String(s.courseCode || s.course_code || '').toLowerCase().includes(sc))
    )
  }

  return filtered
})

const paginatedTutors = computed(() =>
  filteredTutors.value.slice(0, visibleCount.value)
)

const debouncedSearch = (() => {
  let timeout
  return () => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      visibleCount.value = pageSize
    }, 300)
  }
})()

const loadTutors = async () => {
  try {
    isLoading.value = true
    const qs = selectedCourseCode.value ? `?courseCode=${encodeURIComponent(String(selectedCourseCode.value).toUpperCase())}` : ''
    const data = await api(`/tutors${qs}`)
    const normalizedTutors = (data?.tutors || []).map(normalizeTutor)
    const uniqueTutors = Array.from(
      new Map(normalizedTutors.map((tutor) => [String(tutor.id), tutor])).values()
    )
    tutors.value = uniqueTutors
    tutorAvatarErrors.value = {}
  } catch (error) {
    console.error('Failed to load tutors:', error)
  } finally {
    isLoading.value = false
  }
}

const applyFilters = () => {
  loadTutors()
  showFilters.value = false
}

const clearFilters = () => {
  selectedCourseCode.value = ''
  loadTutors()
  showFilters.value = false
}

const toggleFilters = () => {
  showFilters.value = !showFilters.value
}

const selectTutor = async (tutor) => {
  selectedTutorData.value = tutor
  tutorReviews.value = []

  try {
    const response = await api(`/users/${tutor.id}/public/reviews`)
    tutorReviews.value = Array.isArray(response?.reviews) ? response.reviews : []
  } catch (error) {
    console.error('Failed to load reviews:', error)
  }
}

const bookTutor = () => {
  if (selectedTutorData.value) {
    localStorage.setItem('prefillTutorId', String(selectedTutorData.value.id))
    router.push('/session')
  }
}

const dayNameToIndex = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
}

const toDateTimeLocalValue = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hour}:${minute}`
}

const getNextSlotDateTime = (dayOfWeek, startTime) => {
  const dayIndex = dayNameToIndex[String(dayOfWeek || '').toLowerCase()]
  if (dayIndex === undefined || !String(startTime || '').includes(':')) return ''

  const [hours, minutes] = String(startTime)
    .split(':')
    .map((value) => Number(value))

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return ''

  const now = new Date()
  const candidate = new Date(now)
  const dayDelta = (dayIndex - candidate.getDay() + 7) % 7

  candidate.setDate(candidate.getDate() + dayDelta)
  candidate.setHours(hours, minutes, 0, 0)

  if (candidate <= now) {
    candidate.setDate(candidate.getDate() + 7)
  }

  return toDateTimeLocalValue(candidate)
}

const bookSlot = (slot) => {
  if (!selectedTutorData.value) return

  const query = {
    tutorId: String(selectedTutorData.value.id)
  }

  if (slot?.courseCode) {
    query.courseCode = String(slot.courseCode).toUpperCase()
  }

  const nextSlot = getNextSlotDateTime(slot?.dayOfWeek, slot?.startTime)
  if (nextSlot) {
    query.sessionTime = nextSlot
  }

  selectedTutorData.value = null
  router.push({ path: '/session', query })
}

const viewPublicProfile = () => {
  if (!selectedTutorData.value) {
    return
  }

  const tutorId = selectedTutorData.value.id
  selectedTutorData.value = null
  router.push({
    name: 'PublicProfile',
    params: { userId: tutorId },
    query: { from: 'tutors' }
  })
}

onMounted(() => {
  const viewEl = document.querySelector('.view')
  const topbar = document.querySelector('.topbar')
  if (viewEl) {
    viewEl.scrollTop = topbar ? topbar.offsetHeight : 80
  }
  loadTutors()
  window.addEventListener('studylink-profile-updated', loadTutors)
})

onUnmounted(() => {
  window.removeEventListener('studylink-profile-updated', loadTutors)
})
</script>

<style scoped>
.page-bg {
  min-height: 100vh;
  display: block;
  padding: 0;
  background: linear-gradient(180deg, #ffffff, #f5f5f7);
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

.tutors-hero {
  margin-bottom: 24px;
}

.tutors-hero__kicker {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: #b11f4b;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.tutors-hero__copy h2 {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 700;
  color: #1d1d1f;
  font-family: "Josefin Sans", "Trebuchet MS", sans-serif;
}

.tutors-hero__text {
  margin: 0;
  color: #6e6e73;
  font-size: 14px;
  line-height: 1.5;
}

.tutors-hero__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.hero-stat {
  padding: 12px;
  background: rgba(255, 183, 197, 0.1);
  border-radius: 10px;
  text-align: center;
}

.hero-stat__label {
  display: block;
  font-size: 11px;
  color: #6e6e73;
  margin-bottom: 4px;
  font-weight: 500;
  overflow-wrap: anywhere;
}

.hero-stat strong {
  display: block;
  font-size: 20px;
  color: #1d1d1f;
}

.search-row {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.tutor-search-shell {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  background: white;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
  padding: 0 12px;
  width: 100%;
}

.tutor-search-shell input {
  flex: 1;
  border: none;
  outline: none;
  padding: 10px 0;
  font-size: 14px;
}

.search-inline-actions {
  display: flex;
  gap: 4px;
}

.icon-chip {
  background: none;
  border: none;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6e6e73;
  transition: color 150ms ease;
}

.icon-chip:hover {
  color: #1d1d1f;
}

.icon-chip svg {
  width: 20px;
  height: 20px;
}

.chip-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  margin-bottom: 20px;
  padding-bottom: 8px;
}

.chip {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.search-row.compact {
  margin-bottom: 12px;
  flex-wrap: nowrap;
}

.search-row h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1d1d1f;
}

.meta {
  margin: 0;
  font-size: 12px;
  color: #6e6e73;
}

.tutors-section {
  margin-top: 24px;
}

.tutors-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.tutor-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 12px;
  display: flex;
  gap: 12px;
  cursor: pointer;
  transition: all 150ms ease;
  text-align: left;
}

.tutor-card:hover {
  border-color: #b11f4b;
  box-shadow: 0 4px 12px rgba(196, 30, 58, 0.15);
  transform: translateY(-2px);
}

.tutor-avatar {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  background: #f5f5f7;
  border: 1px solid #e0e0e0;
}

.tutor-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tutor-avatar-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b11f4b;
}

.tutor-avatar-fallback svg {
  width: 30px;
  height: 30px;
  fill: currentColor;
}

.tutor-card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tutor-card-header {
  display: flex;
  gap: 8px;
  align-items: center;
}

.tutor-card-header strong {
  font-size: 13px;
  color: #1d1d1f;
}

.tutor-meta {
  font-size: 12px;
  color: #b11f4b;
  font-weight: 600;
}

.expertise-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.tag {
  display: inline-block;
  background: rgba(196, 30, 58, 0.1);
  color: #b11f4b;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
}

.badge {
  display: inline-block;
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
}

.loading,
.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #6e6e73;
  grid-column: 1 / -1;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #6e6e73;
}

.tutor-profile-header {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  align-items: flex-start;
}

.profile-pic {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.profile-pic-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f7;
  color: #b11f4b;
  border: 1px solid #e0e0e0;
}

.profile-pic-fallback svg {
  width: 42px;
  height: 42px;
  fill: currentColor;
}

.tutor-profile-info h2 {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 600;
  color: #1d1d1f;
}

.role-badge {
  margin: 0;
  font-size: 12px;
  color: #6e6e73;
}

.profile-section {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.profile-section:last-of-type {
  border-bottom: none;
}

.profile-section h4 {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: #1d1d1f;
  text-transform: uppercase;
}

.profile-section p {
  margin: 0;
  font-size: 13px;
  color: #555;
  line-height: 1.6;
}

.expertise-list,
.availability-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.availability-slot {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 12px;
}

.slot-main {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.availability-slot strong {
  min-width: 60px;
  color: #b11f4b;
}

.course-code {
  margin-left: auto;
  background: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.slot-book-btn {
  border: none;
  border-radius: 999px;
  background: #b11f4b;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  padding: 6px 10px;
  cursor: pointer;
  white-space: nowrap;
}

.slot-book-btn:hover {
  background: #9d1c43;
}

.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.review-card {
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
  border-left: 3px solid #b11f4b;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.review-header strong {
  font-size: 12px;
  color: #1d1d1f;
}

.stars {
  font-size: 12px;
  color: #ffc107;
}

.review-meta {
  margin: 0 0 6px;
  font-size: 11px;
  color: #6e6e73;
}

.review-comment {
  margin: 0;
  font-size: 12px;
  color: #555;
  line-height: 1.5;
}

.profile-actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}

.profile-actions button {
  flex: 1;
}

@media (max-width: 640px) {
  .view {
    padding: 14px 12px;
  }

  .search-row {
    align-items: stretch;
  }

  .tutor-search-shell {
    min-width: 0;
  }

  .search-row .chip {
    width: 100%;
    justify-content: center;
  }

  .tutors-hero__stats {
    grid-template-columns: 1fr;
  }

  .tutor-card {
    gap: 10px;
    padding: 10px;
  }

  .tutor-avatar {
    width: 52px;
    height: 52px;
  }

  .modal-content {
    padding: 16px;
  }

  .tutor-profile-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .profile-actions {
    flex-direction: column;
  }
}

@media (max-width: 420px) {
  .tutor-card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .availability-slot strong {
    min-width: 0;
  }

  .course-code {
    margin-left: 0;
  }
}
</style>

