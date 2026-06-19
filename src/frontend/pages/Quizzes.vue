<template>
  <main class="page-bg">
    <div class="view">

      <!-- Hero -->
      <section class="quiz-hero">
        <p class="quiz-hero__kicker">🧠 KNOWLEDGE CHECK</p>
        <h2 class="quiz-hero__title">Quizzes</h2>
        <p class="quiz-hero__text">
          Test your knowledge. Earn points. Climb the board.
        </p>

        <!-- Summary Bar -->
        <div class="summary-bar">
          <div class="summary-bar__stat">
            <span class="summary-bar__val">{{ quizzes.length }}</span>
            <span class="summary-bar__label">Total Quizzes</span>
          </div>
          <div class="summary-bar__divider"></div>
          <div class="summary-bar__stat">
            <span class="summary-bar__val">{{ playedCount }}</span>
            <span class="summary-bar__label">You Played</span>
          </div>
          <div class="summary-bar__divider"></div>
          <div class="summary-bar__stat">
            <span class="summary-bar__val">{{ filteredQuizzes.length }}</span>
            <span class="summary-bar__label">Showing</span>
          </div>
        </div>
      </section>

      <!-- Create Button (tutor/admin) -->
      <div v-if="canCreate" class="create-row">
        <button class="btn-create" @click="router.push({ name: 'CreateQuiz' })">
          <svg viewBox="0 0 24 24" width="16" height="16"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/></svg>
          Create Quiz
        </button>
      </div>

      <!-- Search -->
      <div class="search-row">
        <div class="search-bar">
          <svg class="search-icon" viewBox="0 0 24 24" width="18" height="18">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search title, topic, course…"
            class="search-input"
            @input="filterQuizzes"
          />
          <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''; filterQuizzes()">✕</button>
        </div>
      </div>

      <!-- Filter & Sort Row -->
      <div class="controls-row">
        <div class="chip-group">
          <button
            class="chip"
            :class="{ active: selectedSort === 'newest' }"
            @click="setSort('newest')"
          >Newest</button>
          <button
            class="chip"
            :class="{ active: selectedSort === 'popular' }"
            @click="setSort('popular')"
          >Most Played</button>
          <button
            class="chip"
            :class="{ active: selectedSort === 'course' }"
            @click="setSort('course')"
          >By Course</button>
          <button
            v-if="playedCount > 0"
            class="chip"
            :class="{ active: selectedSort === 'played' }"
            @click="setSort('played')"
          >Played ✓</button>
        </div>

        <select
          v-if="courseOptions.length > 0"
          v-model="selectedCourse"
          class="course-select"
          @change="filterQuizzes"
        >
          <option value="">All Courses</option>
          <option v-for="c in courseOptions" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>

      <!-- Skeleton Loading -->
      <div v-if="loading" class="quiz-grid">
        <div v-for="n in 6" :key="n" class="quiz-card quiz-card--skeleton">
          <div class="skeleton skeleton--bar"></div>
          <div class="quiz-card__body">
            <div class="skeleton skeleton--tag"></div>
            <div class="skeleton skeleton--title"></div>
            <div class="skeleton skeleton--desc"></div>
            <div class="skeleton skeleton--desc short"></div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="errorMsg" class="empty-state">
        <svg viewBox="0 0 64 64" class="empty-icon" width="64" height="64">
          <circle cx="32" cy="32" r="30" fill="none" stroke="var(--primary-soft)" stroke-width="2"/>
          <text x="32" y="40" text-anchor="middle" font-size="28" fill="var(--primary)">!</text>
        </svg>
        <p class="empty-state__title">Failed to load</p>
        <p class="empty-state__sub">{{ errorMsg }}</p>
        <button class="btn-retry" @click="loadQuizzes">Try Again</button>
      </div>

      <!-- Empty — no quizzes at all -->
      <div v-else-if="!quizzes.length" class="empty-state">
        <svg viewBox="0 0 64 64" class="empty-icon" width="64" height="64">
          <circle cx="32" cy="32" r="30" fill="none" stroke="var(--primary-soft)" stroke-width="2"/>
          <text x="32" y="42" text-anchor="middle" font-size="28" fill="var(--primary)">?</text>
        </svg>
        <p class="empty-state__title">No quizzes yet</p>
        <p v-if="canCreate" class="empty-state__sub">Be the first — create one!</p>
        <p v-else class="empty-state__sub">Check back soon.</p>
        <button v-if="canCreate" class="btn-create" @click="router.push({ name: 'CreateQuiz' })">
          + Create Quiz
        </button>
      </div>

      <!-- Empty — search/filter returned nothing -->
      <div v-else-if="!filteredQuizzes.length" class="empty-state">
        <svg viewBox="0 0 64 64" class="empty-icon" width="64" height="64">
          <circle cx="32" cy="32" r="30" fill="none" stroke="var(--primary-soft)" stroke-width="2"/>
          <text x="32" y="42" text-anchor="middle" font-size="24" fill="var(--primary)">∅</text>
        </svg>
        <p class="empty-state__title">No matches</p>
        <p class="empty-state__sub">Try different keywords or filters.</p>
        <button class="btn-retry" @click="resetFilters">Clear Filters</button>
      </div>

      <!-- Quiz Grid -->
      <div v-else class="quiz-grid">
        <div
          v-for="quiz in filteredQuizzes"
          :key="quiz.id"
          class="quiz-card"
          @click="openQuiz(quiz.id)"
          role="button"
          tabindex="0"
          :aria-label="`Play ${quiz.title}`"
          @keydown.enter="openQuiz(quiz.id)"
        >
          <!-- Color Bar -->
          <div
            class="quiz-card__color-bar"
            :style="{ background: quiz.cover_color || 'var(--primary)' }"
          ></div>

          <div class="quiz-card__body">
            <!-- Header Row -->
            <div class="quiz-card__header">
              <span class="quiz-card__course" v-if="quiz.course_code">{{ quiz.course_code }}</span>
              <span class="quiz-card__course quiz-card__course--empty" v-else>General</span>
              <span class="quiz-card__plays">{{ (quiz.play_count || 0).toLocaleString() }} plays</span>
            </div>

            <!-- Title -->
            <h3 class="quiz-card__title">{{ quiz.title }}</h3>

            <!-- Description -->
            <p class="quiz-card__desc" v-if="quiz.description">{{ quiz.description }}</p>

            <!-- Meta -->
            <div class="quiz-card__meta">
              <span>{{ quiz.question_count || 0 }} question{{ (quiz.question_count || 0) !== 1 ? 's' : '' }}</span>
              <span class="quiz-card__dot">·</span>
              <span>{{ quiz.creator_name || 'Unknown' }}</span>
              <span class="quiz-card__dot">·</span>
              <span>{{ formatDate(quiz.created_at) }}</span>
            </div>

            <!-- Footer -->
            <div class="quiz-card__footer">
              <!-- Played badge -->
              <div
                class="quiz-card__badge"
                v-if="Number(quiz.my_attempts) > 0"
                title="You've played this"
              >
                <svg viewBox="0 0 16 16" width="14" height="14">
                  <path d="M6.5 12.5l-4-4 1.41-1.41L6.5 9.67l5.59-5.59L13.5 5.5l-7 7z" fill="currentColor"/>
                </svg>
                Best: {{ quiz.my_best_score ?? 0 }} pts
              </div>
              <div v-else class="quiz-card__badge--empty"></div>

              <button class="play-btn" @click.stop="openQuiz(quiz.id)" aria-label="Play quiz">
                <svg viewBox="0 0 24 24" width="12" height="12">
                  <polygon points="5,3 19,12 5,21" fill="currentColor"/>
                </svg>
                Play
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Success / Info feedback -->
      <transition name="fade">
        <p v-if="message" class="feedback-msg">{{ message }}</p>
      </transition>

    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api, getUser } from '@/api.js'

// -> Router & user
const router = useRouter()
const user = computed(() => getUser())
const canCreate = computed(() => ['tutor', 'admin'].includes(user.value?.role))

// -> State
const quizzes = ref([])
const filteredQuizzes = ref([])
const loading = ref(true)
const message = ref('')
const errorMsg = ref('')
const searchQuery = ref('')
const selectedSort = ref('newest')
const selectedCourse = ref('')
const courseOptions = ref([])

// -> Derived
const playedCount = computed(() =>
  quizzes.value.filter(q => Number(q.my_attempts) > 0).length
)

// -> Load
const loadQuizzes = async () => {
  loading.value = true
  errorMsg.value = ''
  message.value = ''

  try {
    const resp = await api('/quizzes')
    // -> null guard on response
    const list = Array.isArray(resp?.quizzes) ? resp.quizzes : []
    quizzes.value = list

    // -> Unique sorted course codes
    const codes = new Set()
    list.forEach(q => { if (q?.course_code) codes.add(q.course_code) })
    courseOptions.value = [...codes].sort()

    filterQuizzes()
  } catch (err) {
    errorMsg.value = err?.message || 'Failed to load quizzes.'
  } finally {
    loading.value = false
  }
}

// -> Filter + sort
const filterQuizzes = () => {
  let list = [...quizzes.value]

  // -> Search: title, desc, course_code
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(quiz =>
      (quiz.title || '').toLowerCase().includes(q) ||
      (quiz.description || '').toLowerCase().includes(q) ||
      (quiz.course_code || '').toLowerCase().includes(q) ||
      (quiz.creator_name || '').toLowerCase().includes(q)
    )
  }

  // -> Course filter
  if (selectedCourse.value) {
    list = list.filter(quiz => quiz.course_code === selectedCourse.value)
  }

  // -> Sort
  switch (selectedSort.value) {
    case 'popular':
      list.sort((a, b) => (b.play_count || 0) - (a.play_count || 0))
      break
    case 'course':
      list.sort((a, b) => (a.course_code || 'ZZZ').localeCompare(b.course_code || 'ZZZ'))
      break
    case 'played':
      // -> Only played ones, sorted by best score desc
      list = list.filter(q => Number(q.my_attempts) > 0)
      list.sort((a, b) => (b.my_best_score || 0) - (a.my_best_score || 0))
      break
    default: // newest
      list.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0
        const db = b.created_at ? new Date(b.created_at).getTime() : 0
        return db - da
      })
  }

  filteredQuizzes.value = list
}

// -> Sort helper
const setSort = (sort) => {
  selectedSort.value = sort
  filterQuizzes()
}

// -> Reset all filters
const resetFilters = () => {
  searchQuery.value = ''
  selectedSort.value = 'newest'
  selectedCourse.value = ''
  filterQuizzes()
}

// -> Navigate
const openQuiz = (id) => {
  if (!id) return
  router.push({ name: 'PlayQuiz', params: { id } })
}

// -> Format date safely
const formatDate = (raw) => {
  if (!raw) return '—'
  const d = new Date(raw)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// -> Mount
onMounted(loadQuizzes)
</script>

<style scoped>
/* ---- Page ---- */
.page-bg {
  min-height: 100vh;
  background: var(--canvas-parchment, #F5F5F5);
}
.view {
  overflow-y: auto;
  padding: 20px 16px 48px;
  max-width: 960px;
  margin: 0 auto;
}

/* ---- Hero ---- */
.quiz-hero {
  margin-bottom: 20px;
}
.quiz-hero__kicker {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  color: var(--primary, #FF85BB);
  letter-spacing: 0.8px;
  text-transform: uppercase;
}
.quiz-hero__title {
  margin: 0 0 6px;
  font-size: 26px;
  font-weight: 700;
  color: var(--ink, #021A54);
  line-height: 1.2;
}
.quiz-hero__text {
  margin: 0 0 16px;
  font-size: 14px;
  color: var(--ink-muted, #6e6e73);
  line-height: 1.5;
}

/* ---- Summary Bar ---- */
.summary-bar {
  display: flex;
  align-items: center;
  gap: 0;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--hairline, #e0e0e0);
  border-radius: 14px;
  padding: 14px 20px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 2px 12px rgba(2, 26, 84, 0.06);
}
.summary-bar__stat {
  flex: 1;
  text-align: center;
}
.summary-bar__val {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: var(--ink, #021A54);
  line-height: 1.1;
}
.summary-bar__label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: var(--primary, #FF85BB);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
}
.summary-bar__divider {
  width: 1px;
  height: 36px;
  background: var(--hairline, #e0e0e0);
}

/* ---- Create Row ---- */
.create-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 14px;
}
.btn-create {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  background: var(--primary, #FF85BB);
  color: #fff;
  border: none;
  border-radius: 22px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 150ms ease, transform 100ms ease;
  box-shadow: 0 2px 8px rgba(255, 133, 187, 0.3);
}
.btn-create:hover { background: var(--primary-hover, #ff6da9); }
.btn-create:active { transform: scale(0.96); }

/* ---- Search ---- */
.search-row {
  margin-bottom: 12px;
}
.search-bar {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid var(--hairline, #e0e0e0);
  border-radius: 12px;
  padding: 0 12px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.search-bar:focus-within {
  border-color: var(--primary, #FF85BB);
  box-shadow: 0 0 0 3px rgba(255, 133, 187, 0.15);
}
.search-icon {
  color: var(--ink-muted, #6e6e73);
  flex-shrink: 0;
}
.search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 11px 8px;
  font-size: 14px;
  background: transparent;
  color: var(--ink, #021A54);
}
.search-input::placeholder { color: var(--ink-muted, #6e6e73); }
.search-clear {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--ink-muted, #6e6e73);
  font-size: 14px;
  padding: 4px;
  line-height: 1;
}
.search-clear:hover { color: var(--ink, #021A54); }

/* ---- Controls Row ---- */
.controls-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.chip-group {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
}
.chip {
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid var(--hairline, #e0e0e0);
  background: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-muted, #6e6e73);
  cursor: pointer;
  transition: all 140ms ease;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}
.chip:hover {
  border-color: var(--primary, #FF85BB);
  color: var(--primary, #FF85BB);
}
.chip.active {
  background: var(--primary, #FF85BB);
  color: #fff;
  border-color: var(--primary, #FF85BB);
  box-shadow: 0 2px 6px rgba(255, 133, 187, 0.25);
}
.course-select {
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid var(--hairline, #e0e0e0);
  background: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-muted, #6e6e73);
  cursor: pointer;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  outline: none;
  transition: border-color 140ms ease;
}
.course-select:focus {
  border-color: var(--primary, #FF85BB);
}

/* ---- Grid ---- */
.quiz-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

/* ---- Quiz Card ---- */
.quiz-card {
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid var(--hairline, #e0e0e0);
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 140ms ease, box-shadow 140ms ease;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 2px 8px rgba(2, 26, 84, 0.05);
  outline: none;
}
.quiz-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(2, 26, 84, 0.10);
}
.quiz-card:focus-visible {
  box-shadow: 0 0 0 3px var(--primary, #FF85BB);
}
.quiz-card:active { transform: scale(0.98); }

/* Skeleton card */
.quiz-card--skeleton {
  cursor: default;
  pointer-events: none;
}
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #fafafa 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 6px;
}
.skeleton--bar  { height: 6px; width: 100%; border-radius: 0; margin-bottom: 14px; }
.skeleton--tag  { height: 16px; width: 64px; margin-bottom: 10px; }
.skeleton--title{ height: 18px; width: 80%; margin-bottom: 8px; }
.skeleton--desc { height: 12px; width: 100%; margin-bottom: 6px; }
.skeleton--desc.short { width: 60%; }
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Card internals */
.quiz-card__color-bar {
  height: 5px;
  width: 100%;
}
.quiz-card__body {
  padding: 14px 16px 16px;
}
.quiz-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.quiz-card__course {
  font-size: 10px;
  font-weight: 700;
  color: var(--primary, #FF85BB);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  background: var(--primary-soft, #FFCEE3);
  padding: 2px 8px;
  border-radius: 5px;
}
.quiz-card__course--empty {
  color: var(--ink-muted, #6e6e73);
  background: var(--surface-soft, #F5F5F5);
}
.quiz-card__plays {
  font-size: 11px;
  color: var(--ink-muted, #6e6e73);
}
.quiz-card__title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink, #021A54);
  line-height: 1.3;
}
.quiz-card__desc {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--ink-muted, #6e6e73);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.quiz-card__meta {
  font-size: 11px;
  color: #8e8e93;
  margin-bottom: 12px;
}
.quiz-card__dot { margin: 0 4px; }
.quiz-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.quiz-card__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #2ec46d;
  background: rgba(46, 196, 109, 0.1);
  padding: 3px 8px;
  border-radius: 20px;
}
.quiz-card__badge--empty { flex: 1; }

/* Play Button */
.play-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 18px;
  background: var(--primary, #FF85BB);
  color: #fff;
  border: none;
  border-radius: 22px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 140ms ease, transform 100ms ease;
  box-shadow: 0 2px 6px rgba(255, 133, 187, 0.25);
}
.play-btn:hover { background: var(--primary-hover, #ff6da9); }
.play-btn:active { transform: scale(0.94); }

/* ---- Empty States ---- */
.empty-state {
  text-align: center;
  padding: 52px 20px;
}
.empty-icon {
  margin-bottom: 14px;
  opacity: 0.7;
}
.empty-state__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--ink, #021A54);
  margin: 0 0 6px;
}
.empty-state__sub {
  font-size: 13px;
  color: var(--ink-muted, #6e6e73);
  margin: 0 0 16px;
}
.btn-retry {
  padding: 8px 20px;
  border: 1.5px solid var(--primary, #FF85BB);
  background: transparent;
  color: var(--primary, #FF85BB);
  border-radius: 22px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 140ms ease, color 140ms ease;
}
.btn-retry:hover {
  background: var(--primary, #FF85BB);
  color: #fff;
}

/* ---- Feedback ---- */
.feedback-msg {
  text-align: center;
  color: var(--primary, #FF85BB);
  font-size: 13px;
  font-weight: 600;
  margin-top: 16px;
}

/* ---- Fade Transition ---- */
.fade-enter-active,
.fade-leave-active { transition: opacity 300ms ease; }
.fade-enter-from,
.fade-leave-to { opacity: 0; }

/* ---- Mobile ---- */
@media (max-width: 640px) {
  .quiz-grid { grid-template-columns: 1fr; }
  .summary-bar { padding: 12px 14px; }
  .summary-bar__val { font-size: 18px; }
  .controls-row { flex-direction: column; align-items: flex-start; }
  .course-select { width: 100%; }
}
</style>