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
              <button class="icon-chip" type="button" aria-label="Search">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M10.5 4a6.5 6.5 0 1 0 4.14 11.5l4.18 4.18 1.41-1.41-4.18-4.18A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" />
                </svg>
              </button>
              <button class="icon-chip" type="button" aria-label="Open filters" @click="showFilters = !showFilters">
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
                <img :src="tutor.profile_picture_url || defaultProfilePic" :alt="tutor.full_name" />
              </div>
              <div class="tutor-card-body">
                <div class="tutor-card-header">
                  <strong>{{ tutor.full_name }}</strong>
                  <span v-if="tutor.is_verified" class="badge">✓ Verified</span>
                </div>
                <div class="meta tutor-meta">{{ tutor.major || 'General' }}</div>
                <div class="meta">⭐ {{ Number(tutor.rating || 0).toFixed(1) }} • {{ tutor.total_points || 0 }} pts</div>
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
            <button class="modal-close" @click="selectedTutorData = null">×</button>
            
            <div class="tutor-profile-header">
              <img :src="selectedTutorData.profile_picture_url || defaultProfilePic" :alt="selectedTutorData.full_name" class="profile-pic" />
              <div class="tutor-profile-info">
                <h2>{{ selectedTutorData.full_name }}</h2>
                <p class="role-badge">
                  Tutor
                  <span v-if="selectedTutorData.is_verified" class="badge">✓ Verified</span>
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
                  <strong>{{ slot.dayOfWeek }}</strong>
                  <span>{{ slot.startTime }} - {{ slot.endTime }}</span>
                  <span v-if="slot.courseCode" class="course-code">{{ slot.courseCode }}</span>
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
                    <span class="stars">{{ '★'.repeat(review.rating) }}{{ '☆'.repeat(5 - review.rating) }}</span>
                  </div>
                  <p class="review-meta">{{ review.reviewer_role || 'Tutee' }} • {{ formatDate(review.created_at) }}</p>
                  <p class="review-comment">{{ review.comment || 'No comment' }}</p>
                </div>
              </div>
            </div>

            <div class="profile-actions">
              <button v-if="currentUserRole === 'tutee'" class="chip-strong" @click="bookTutor">
                Book This Tutor
              </button>
              <button v-else class="chip" disabled>
                View Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api, getUser } from '@/api.js'

const router = useRouter()
const currentUser = getUser()
const currentUserRole = currentUser?.role || 'tutee'

const tutors = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
const selectedSkill = ref('')
const showFilters = ref(false)
const visibleCount = ref(10)
const pageSize = 10
const selectedTutorData = ref(null)
const tutorReviews = ref([])

const defaultProfilePic = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23999'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E"

const popularSkills = ['Java', 'Python', 'Database', 'Web Dev', 'C++', 'Mobile Dev']

const totalTutors = computed(() => tutors.value.length)
const highlyRatedTutors = computed(() => tutors.value.filter(t => t.rating >= 4).length)
const totalSessions = computed(() => tutors.value.reduce((sum, t) => sum + (t.total_points || 0), 0))

const filteredTutors = computed(() => {
  let filtered = [...tutors.value]

  if (selectedSkill.value) {
    filtered = filtered.filter(t =>
      Array.isArray(t.expertise) && t.expertise.includes(selectedSkill.value)
    )
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    filtered = filtered.filter(t =>
      t.full_name?.toLowerCase().includes(q) ||
      t.major?.toLowerCase().includes(q) ||
      (Array.isArray(t.expertise) && t.expertise.some(e => e.toLowerCase().includes(q)))
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

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const loadTutors = async () => {
  try {
    isLoading.value = true
    const data = await api('/tutors')
    tutors.value = data.tutors || []
  } catch (error) {
    console.error('Failed to load tutors:', error)
  } finally {
    isLoading.value = false
  }
}

const selectTutor = async (tutor) => {
  selectedTutorData.value = tutor
  tutorReviews.value = []

  try {
    const reviews = await api(`/tutors/${tutor.id}/reviews`)
    tutorReviews.value = Array.isArray(reviews) ? reviews : []
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

onMounted(() => {
  const viewEl = document.querySelector('.view')
  const topbar = document.querySelector('.topbar')
  if (viewEl) {
    viewEl.scrollTop = topbar ? topbar.offsetHeight : 80
  }
  loadTutors()
})
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

.tutors-hero {
  margin-bottom: 24px;
}

.tutors-hero__kicker {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: #c41e3a;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.tutors-hero__copy h2 {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 700;
  color: #3f2f38;
  font-family: "Josefin Sans", "Trebuchet MS", sans-serif;
}

.tutors-hero__text {
  margin: 0;
  color: #666;
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
  color: #999;
  margin-bottom: 4px;
  font-weight: 500;
}

.hero-stat strong {
  display: block;
  font-size: 20px;
  color: #3f2f38;
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
  color: #666;
  transition: color 150ms ease;
}

.icon-chip:hover {
  color: #3f2f38;
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
  border: 2px solid #c41e3a;
  background: #1a1a1a;
  color: #fff;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
  white-space: nowrap;
}

.chip:hover:not(:disabled) {
  border-color: #e63a52;
  background: #2d2d2d;
}

.chip-strong {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  box-shadow: 0 4px 12px rgba(196, 30, 58, 0.3);
}

.chip-active {
  background: linear-gradient(135deg, #2d2d2d 0%, #3d3d3d 100%);
}

.search-row.compact {
  margin-bottom: 12px;
  flex-wrap: nowrap;
}

.search-row h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #3f2f38;
}

.meta {
  margin: 0;
  font-size: 12px;
  color: #999;
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
  border-color: #c41e3a;
  box-shadow: 0 4px 12px rgba(196, 30, 58, 0.15);
  transform: translateY(-2px);
}

.tutor-avatar {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  background: #f0f0f0;
}

.tutor-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  color: #3f2f38;
}

.tutor-meta {
  font-size: 12px;
  color: #c41e3a;
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
  color: #c41e3a;
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
  color: #999;
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
  color: #999;
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

.tutor-profile-info h2 {
  margin: 0 0 4px;
  font-size: 18px;
  font-weight: 600;
  color: #3f2f38;
}

.role-badge {
  margin: 0;
  font-size: 12px;
  color: #666;
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
  color: #3f2f38;
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
  gap: 8px;
  align-items: center;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 12px;
}

.availability-slot strong {
  min-width: 60px;
  color: #c41e3a;
}

.course-code {
  margin-left: auto;
  background: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
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
  border-left: 3px solid #c41e3a;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.review-header strong {
  font-size: 12px;
  color: #3f2f38;
}

.stars {
  font-size: 12px;
  color: #ffc107;
}

.review-meta {
  margin: 0 0 6px;
  font-size: 11px;
  color: #999;
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
  .tutors-hero__stats {
    grid-template-columns: 1fr;
  }

  .modal-content {
    padding: 16px;
  }

  .tutor-profile-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
}
</style>

