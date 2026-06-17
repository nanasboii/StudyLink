<template>
  <main class="page-bg">
    <div class="view">
      <!-- Hero Section -->
      <section class="quiz-hero">
        <p class="quiz-hero__kicker">KNOWLEDGE CHECK</p>
        <h2>Quizzes</h2>
        <p class="quiz-hero__text">
          Test your knowledge with community-created quizzes. Earn points, climb the leaderboard, and learn while you play.
        </p>
        <div class="quiz-hero__stats">
          <div class="hero-stat">
            <span class="hero-stat__label">Total Quizzes</span>
            <strong>{{ quizzes.length }}</strong>
          </div>
          <div class="hero-stat">
            <span class="hero-stat__label">Played by You</span>
            <strong>{{ playedCount }}</strong>
          </div>
        </div>
      </section>

      <!-- Search & Filter -->
      <div class="search-row">
        <div class="search-bar">
          <svg class="search-icon" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/></svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search quizzes by title or topic…"
            class="quiz-search-input"
            @input="filterQuizzes"
          />
        </div>
      </div>

      <!-- Filter Chips -->
      <div class="chip-row">
        <button
          class="chip"
          :class="{ active: selectedSort === 'newest' }"
          @click="selectedSort = 'newest'; filterQuizzes()"
        >Newest</button>
        <button
          class="chip"
          :class="{ active: selectedSort === 'popular' }"
          @click="selectedSort = 'popular'; filterQuizzes()"
        >Most Played</button>
        <button
          class="chip"
          :class="{ active: selectedSort === 'course' }"
          @click="selectedSort = 'course'; filterQuizzes()"
        >By Course</button>
        <select v-model="selectedCourse" class="course-filter-select" @change="filterQuizzes">
          <option value="">All Courses</option>
          <option v-for="c in courseOptions" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading quizzes…</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="!filteredQuizzes.length" class="empty-state">
        <svg viewBox="0 0 64 64" class="empty-icon"><circle cx="32" cy="32" r="30" fill="none" stroke="#e0e0e0" stroke-width="2"/><text x="32" y="38" text-anchor="middle" font-size="24" fill="#ccc">?</text></svg>
        <p>No quizzes found.</p>
        <p class="empty-hint" v-if="canCreate">Create the first one!</p>
      </div>

      <!-- Quiz Grid -->
      <div v-else class="quiz-grid">
        <div
          v-for="quiz in filteredQuizzes"
          :key="quiz.id"
          class="quiz-card"
          @click="openQuiz(quiz.id)"
        >
          <div class="quiz-card__color-bar" :style="{ background: quiz.cover_color || '#b11f4b' }"></div>
          <div class="quiz-card__body">
            <div class="quiz-card__header">
              <span class="quiz-card__course" v-if="quiz.course_code">{{ quiz.course_code }}</span>
              <span class="quiz-card__plays">{{ quiz.play_count || 0 }} plays</span>
            </div>
            <h3 class="quiz-card__title">{{ quiz.title }}</h3>
            <p class="quiz-card__desc" v-if="quiz.description">{{ quiz.description }}</p>
            <div class="quiz-card__meta">
              <span class="quiz-card__questions">{{ quiz.question_count }} question{{ quiz.question_count != 1 ? 's' : '' }}</span>
              <span class="quiz-card__dot">·</span>
              <span class="quiz-card__creator">{{ quiz.creator_name }}</span>
            </div>
            <div class="quiz-card__footer">
              <div class="quiz-card__badge" v-if="Number(quiz.my_attempts) > 0">
                <svg viewBox="0 0 16 16" class="check-icon"><path d="M6.5 12.5l-4-4 1.41-1.41L6.5 9.67l5.59-5.59L13.5 5.5l-7 7z" fill="currentColor"/></svg>
                Best: {{ quiz.my_best_score || 0 }} pts
              </div>
              <button class="play-btn" @click.stop="playQuiz(quiz.id)">
                <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" fill="currentColor"/></svg>
                Play
              </button>
            </div>
          </div>
        </div>
      </div>

      <p v-if="message" class="feedback-msg">{{ message }}</p>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api, getUser } from '@/api.js'

const router = useRouter()
const user = computed(() => getUser())
const canCreate = computed(() => user.value?.role === 'tutor' || user.value?.role === 'admin')

const quizzes = ref([])
const filteredQuizzes = ref([])
const loading = ref(true)
const message = ref('')
const searchQuery = ref('')
const selectedSort = ref('newest')
const selectedCourse = ref('')
const courseOptions = ref([])

const playedCount = computed(() => {
  return quizzes.value.filter(q => Number(q.my_attempts) > 0).length
})

const loadQuizzes = async () => {
  loading.value = true
  try {
    const resp = await api('/quizzes')
    quizzes.value = resp.quizzes || []

    // Extract unique course codes
    const codes = new Set()
    quizzes.value.forEach(q => { if (q.course_code) codes.add(q.course_code) })
    courseOptions.value = [...codes].sort()

    filterQuizzes()
  } catch (err) {
    message.value = err.message || 'Failed to load quizzes.'
  } finally {
    loading.value = false
  }
}

const filterQuizzes = () => {
  let list = [...quizzes.value]

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(quiz =>
      (quiz.title || '').toLowerCase().includes(q) ||
      (quiz.description || '').toLowerCase().includes(q) ||
      (quiz.course_code || '').toLowerCase().includes(q)
    )
  }

  if (selectedCourse.value) {
    list = list.filter(quiz => quiz.course_code === selectedCourse.value)
  }

  if (selectedSort.value === 'popular') {
    list.sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
  } else if (selectedSort.value === 'course') {
    list.sort((a, b) => (a.course_code || '').localeCompare(b.course_code || ''))
  } else {
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }

  filteredQuizzes.value = list
}

const openQuiz = (id) => {
  router.push(`/quizzes/${id}`)
}

const playQuiz = (id) => {
  router.push(`/quizzes/${id}/play`)
}

onMounted(loadQuizzes)
</script>

<style scoped>
.page-bg {
  min-height: 100vh;
  background: linear-gradient(180deg, #ffffff, #f5f5f7);
}
.view {
  overflow-y: auto;
  padding: 20px 16px;
}
.quiz-hero {
  margin-bottom: 24px;
}
.quiz-hero__kicker {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: #b11f4b;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.quiz-hero h2 {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 700;
  color: #1d1d1f;
}
.quiz-hero__text {
  margin: 0 0 16px;
  color: #6e6e73;
  font-size: 14px;
  line-height: 1.5;
}
.quiz-hero__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 10px;
}
.hero-stat {
  padding: 12px;
  background: rgba(177, 31, 75, 0.06);
  border-radius: 10px;
  text-align: center;
}
.hero-stat__label {
  display: block;
  font-size: 11px;
  color: #b11f4b;
  margin-bottom: 4px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.hero-stat strong {
  display: block;
  font-size: 20px;
  color: #1d1d1f;
}

/* Search */
.search-row {
  margin-bottom: 12px;
}
.search-bar {
  display: flex;
  align-items: center;
  background: rgba(255,255,255,0.7);
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 0 12px;
  backdrop-filter: blur(8px);
}
.search-icon {
  width: 18px;
  height: 18px;
  color: #6e6e73;
  flex-shrink: 0;
}
.quiz-search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 10px 8px;
  font-size: 14px;
  background: transparent;
}

/* Chips */
.chip-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
}
.chip {
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid #e0e0e0;
  background: #f5f5f7;
  font-size: 12px;
  font-weight: 500;
  color: #6e6e73;
  cursor: pointer;
  transition: all 150ms ease;
}
.chip:hover {
  border-color: #c7c7cc;
}
.chip.active {
  background: #b11f4b;
  color: white;
  border-color: #b11f4b;
}
.course-filter-select {
  padding: 6px 10px;
  border-radius: 20px;
  border: 1px solid #e0e0e0;
  background: #f5f5f7;
  font-size: 12px;
  color: #6e6e73;
  cursor: pointer;
}

/* Loading */
.loading-state {
  text-align: center;
  padding: 48px 0;
  color: #6e6e73;
}
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top-color: #b11f4b;
  border-radius: 50%;
  margin: 0 auto 12px;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Empty */
.empty-state {
  text-align: center;
  padding: 48px 0;
  color: #6e6e73;
}
.empty-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 12px;
}
.empty-hint {
  font-size: 13px;
  color: #b11f4b;
}

/* Quiz Grid */
.quiz-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.quiz-card {
  background: rgba(255,255,255,0.7);
  border: 1px solid #e0e0e0;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 150ms ease, box-shadow 150ms ease;
  backdrop-filter: blur(8px);
}
.quiz-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}
.quiz-card:active {
  transform: scale(0.98);
}
.quiz-card__color-bar {
  height: 6px;
  width: 100%;
}
.quiz-card__body {
  padding: 16px;
}
.quiz-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.quiz-card__course {
  font-size: 11px;
  font-weight: 700;
  color: #b11f4b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: rgba(177, 31, 75, 0.08);
  padding: 2px 8px;
  border-radius: 4px;
}
.quiz-card__plays {
  font-size: 11px;
  color: #6e6e73;
}
.quiz-card__title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
  color: #1d1d1f;
  line-height: 1.3;
}
.quiz-card__desc {
  margin: 0 0 10px;
  font-size: 13px;
  color: #6e6e73;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.quiz-card__meta {
  font-size: 12px;
  color: #8e8e93;
  margin-bottom: 12px;
}
.quiz-card__dot {
  margin: 0 4px;
}
.quiz-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.quiz-card__badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: #34c759;
}
.check-icon {
  width: 14px;
  height: 14px;
}
.play-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 16px;
  background: #b11f4b;
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease;
}
.play-btn svg {
  width: 12px;
  height: 12px;
}
.play-btn:hover {
  background: #8d1630;
}
.play-btn:active {
  transform: scale(0.95);
}

.feedback-msg {
  text-align: center;
  color: #b11f4b;
  font-size: 13px;
  margin-top: 16px;
}

@media (max-width: 640px) {
  .quiz-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>
