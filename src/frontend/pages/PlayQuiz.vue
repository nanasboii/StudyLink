<template>
  <main class="play-bg" :style="bgStyle">

    <!-- ── LOADING ── -->
    <div v-if="state === 'loading'" class="play-center">
      <div class="glass-card loading-card">
        <div class="spinner-lg"></div>
        <p class="play-loading-text">Loading quiz…</p>
      </div>
    </div>

    <!-- ── LOBBY ── -->
    <div v-else-if="state === 'lobby'" class="play-center lobby-screen">
      <div class="glass-card lobby-card">
        <div class="lobby-color-bar" :style="{ background: quiz.cover_color || 'var(--primary)' }"></div>
        <div class="lobby-body">
          <span class="lobby-course" v-if="quiz.course_code">{{ quiz.course_code }}</span>
          <h1 class="lobby-title">{{ quiz.title }}</h1>
          <p class="lobby-desc" v-if="quiz.description">{{ quiz.description }}</p>
          <div class="lobby-meta">
            <span>{{ questions.length }} question{{ questions.length !== 1 ? 's' : '' }}</span>
            <span class="lobby-dot">·</span>
            <span>~{{ estimatedTime }} min</span>
            <span class="lobby-dot">·</span>
            <span>by {{ quiz.creator_name }}</span>
          </div>
          <div class="lobby-plays" v-if="quiz.play_count">{{ quiz.play_count }} plays so far</div>
          <button class="start-btn" @click="startQuiz">
            <svg viewBox="0 0 24 24" width="18" height="18"><polygon points="5,3 19,12 5,21" fill="currentColor"/></svg>
            Start Quiz
          </button>
        </div>
      </div>
    </div>

    <!-- ── QUESTION ── -->
    <div v-else-if="state === 'question'" class="play-question-screen">
      <!-- top bar -->
      <div class="play-topbar">
        <div class="play-progress">
          <div class="play-progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <div class="play-topbar-row">
          <span class="play-q-counter">{{ currentIndex + 1 }} / {{ questions.length }}</span>
          <span class="play-score-display">🏅 {{ totalScore }} pts</span>
        </div>
      </div>

      <!-- timer circle -->
      <div class="timer-area">
        <div class="timer-circle" :class="{ 'timer-warning': timeLeft <= 5 }">
          <svg class="timer-svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" class="timer-track" />
            <circle cx="50" cy="50" r="45" class="timer-fill" :style="timerDashStyle" />
          </svg>
          <span class="timer-text">{{ timeLeft }}</span>
        </div>
      </div>

      <!-- question text -->
      <div class="question-display">
        <h2 class="question-text">{{ currentQuestion.question_text }}</h2>
      </div>

      <!-- answer blocks 2×2 -->
      <div class="answer-blocks">
        <button
          v-for="(answer, ai) in currentQuestion.answers"
          :key="answer.id"
          class="answer-block"
          :class="[
            `answer-block--${blockColors[ai]}`,
            { 'answer-block--selected': selectedAnswerId === answer.id },
            { 'answer-block--disabled': selectedAnswerId !== null }
          ]"
          :disabled="selectedAnswerId !== null"
          @click="selectAnswer(answer)"
        >
          <span class="answer-shape">{{ blockShapes[ai] }}</span>
          <span class="answer-label">{{ answer.answer_text }}</span>
        </button>
      </div>
    </div>

    <!-- ── FEEDBACK ── -->
    <div v-else-if="state === 'feedback'" class="play-center feedback-screen">
      <div class="glass-card feedback-card" :class="lastAnswerCorrect ? 'feedback--correct' : 'feedback--wrong'">
        <div class="feedback-icon">
          <svg v-if="lastAnswerCorrect" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="30" fill="#34c759"/>
            <path d="M20 33l8 8 16-16" stroke="white" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="30" fill="#e53935"/>
            <path d="M22 22l20 20M42 22l-20 20" stroke="white" stroke-width="4" fill="none" stroke-linecap="round"/>
          </svg>
        </div>
        <h2>{{ lastAnswerCorrect ? 'Correct!' : 'Not quite!' }}</h2>
        <p class="feedback-points" v-if="lastAnswerCorrect">+{{ lastPointsEarned }} points</p>
        <p class="feedback-correct-label" v-if="!lastAnswerCorrect && correctAnswerText">
          Answer: {{ correctAnswerText }}
        </p>
      </div>
    </div>

    <!-- ── RESULTS ── -->
    <div v-else-if="state === 'results'" class="play-center results-screen">
      <div class="glass-card results-card">
        <div class="results-confetti" v-if="resultPercent >= 70">🎉</div>
        <h1 class="results-title">Quiz Complete!</h1>

        <div class="results-score-ring">
          <svg viewBox="0 0 120 120" class="ring-svg">
            <circle cx="60" cy="60" r="52" class="ring-track" />
            <circle cx="60" cy="60" r="52" class="ring-fill" :style="resultRingStyle" />
          </svg>
          <div class="ring-text">
            <span class="ring-value">{{ correctCount }}</span>
            <span class="ring-label">/ {{ questions.length }}</span>
          </div>
        </div>

        <div class="results-stats">
          <div class="result-stat">
            <span class="result-stat__value">{{ totalScore }}</span>
            <span class="result-stat__label">Total Points</span>
          </div>
          <div class="result-stat">
            <span class="result-stat__value">{{ earnedLP }}</span>
            <span class="result-stat__label">LP Earned</span>
          </div>
          <div class="result-stat">
            <span class="result-stat__value">{{ totalTimeTaken }}s</span>
            <span class="result-stat__label">Time Taken</span>
          </div>
        </div>

        <!-- leaderboard -->
        <div class="results-leaderboard" v-if="leaderboard.length">
          <h3 class="lb-title">🏆 Leaderboard</h3>
          <div
            v-for="(entry, li) in leaderboard.slice(0, 10)"
            :key="entry.user_id"
            class="lb-row"
            :class="{ 'lb-row--me': entry.user_id === userId }"
          >
            <span class="lb-rank">{{ li + 1 }}</span>
            <span class="lb-name">{{ entry.full_name }}</span>
            <span class="lb-score">{{ entry.best_score }} pts</span>
          </div>
        </div>

        <div class="results-actions">
          <button class="btn-play-again" @click="restartQuiz">Play Again</button>
          <button class="btn-back-to-quizzes" @click="backToQuizzes">All Quizzes</button>
        </div>
      </div>
    </div>

  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api, getUser, getToken, setSession } from '@/api.js'

const router = useRouter()
const route  = useRoute()

// ── BUG FIX: quizId must survive re-parse; NaN guard added ──
const rawId  = route.params.id
const quizId = Number(rawId)

const userId = computed(() => getUser()?.id)

// state machine: loading | lobby | question | feedback | results
const state = ref('loading')

const quiz      = ref({})
const questions = ref([])
const leaderboard = ref([])

const currentIndex     = ref(0)
const selectedAnswerId = ref(null)
const timeLeft         = ref(20)
const timerInterval    = ref(null)
const totalScore       = ref(0)
const correctCount     = ref(0)
const earnedLP         = ref(0)
const totalTimeTaken   = ref(0)

const lastAnswerCorrect  = ref(false)
const lastPointsEarned   = ref(0)
const correctAnswerText  = ref('')

const userAnswers       = ref([])
const questionStartTime = ref(0)

const blockColors = ['red', 'blue', 'yellow', 'green']
const blockShapes = ['▲', '◆', '●', '■']

// ── computed ──

const currentQuestion = computed(() => questions.value[currentIndex.value] ?? {})

const estimatedTime = computed(() => {
  const total = questions.value.reduce(
    (sum, q) => sum + (q.time_limit_seconds || quiz.value.time_limit_seconds || 20),
    0
  )
  return Math.ceil(total / 60)
})

const progressPercent = computed(() =>
  questions.value.length
    ? ((currentIndex.value + 1) / questions.value.length) * 100
    : 0
)

// BUG FIX: timeLimit must not be 0 (caused division by zero in timerDashStyle)
const timeLimit = computed(() =>
  Math.max(currentQuestion.value.time_limit_seconds || quiz.value.time_limit_seconds || 20, 1)
)

const timerDashStyle = computed(() => {
  const circ = 2 * Math.PI * 45
  const progress = timeLeft.value / timeLimit.value
  return {
    strokeDasharray: `${circ}`,
    strokeDashoffset: `${circ * (1 - Math.max(0, Math.min(progress, 1)))}`
  }
})

const resultPercent = computed(() =>
  questions.value.length
    ? Math.round((correctCount.value / questions.value.length) * 100)
    : 0
)

const resultRingStyle = computed(() => {
  const circ = 2 * Math.PI * 52
  const progress = correctCount.value / Math.max(questions.value.length, 1)
  return {
    strokeDasharray: `${circ}`,
    strokeDashoffset: `${circ * (1 - progress)}`
  }
})

const bgStyle = computed(() => {
  const color = quiz.value.cover_color || '#FF85BB'
  if (state.value === 'question' || state.value === 'feedback') {
    return { background: `linear-gradient(135deg, ${color}18, var(--canvas-parchment))` }
  }
  return {}
})

// ── api ──

const loadQuiz = async () => {
  // BUG FIX: guard invalid id before hitting API
  if (!quizId || isNaN(quizId)) {
    quiz.value  = { title: 'Invalid quiz ID' }
    state.value = 'lobby'
    return
  }
  try {
    const resp      = await api(`/quizzes/${quizId}`)
    quiz.value      = resp.quiz      || {}
    questions.value = resp.quiz?.questions || []
    leaderboard.value = resp.leaderboard   || []
    state.value     = 'lobby'
  } catch {
    quiz.value  = { title: 'Quiz not found' }
    questions.value = []
    state.value = 'lobby'
  }
}

// ── quiz flow ──

const startQuiz = () => {
  // BUG FIX: reset ALL state on (re)start — previously earnedLP stayed from prior run
  currentIndex.value   = 0
  totalScore.value     = 0
  correctCount.value   = 0
  earnedLP.value       = 0
  userAnswers.value    = []
  totalTimeTaken.value = 0
  lastAnswerCorrect.value = false
  lastPointsEarned.value  = 0
  correctAnswerText.value = ''
  showQuestion()
}

const showQuestion = () => {
  selectedAnswerId.value  = null
  lastAnswerCorrect.value = false
  state.value             = 'question'
  timeLeft.value          = timeLimit.value
  questionStartTime.value = Date.now()
  startTimer()
}

const startTimer = () => {
  clearInterval(timerInterval.value)
  timerInterval.value = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      clearInterval(timerInterval.value)
      handleTimeout()
    }
  }, 1000)
}

const handleTimeout = () => {
  // BUG FIX: guard against double-fire if answer already selected
  if (selectedAnswerId.value !== null) return

  const correct = currentQuestion.value.answers?.find(a => a.is_correct)
  userAnswers.value.push({
    questionId:       currentQuestion.value.id,
    selectedAnswerId: null,
    timeTaken:        timeLimit.value,
    isCorrect:        false
  })
  lastAnswerCorrect.value  = false
  lastPointsEarned.value   = 0
  correctAnswerText.value  = correct?.answer_text || ''
  // BUG FIX: add full timeLimit to totalTimeTaken, not arbitrary += timeLimit
  totalTimeTaken.value += timeLimit.value
  showFeedback()
}

const selectAnswer = (answer) => {
  if (selectedAnswerId.value !== null) return
  clearInterval(timerInterval.value)

  selectedAnswerId.value = answer.id
  // BUG FIX: clamp timeTaken so it never goes negative
  const timeTaken = Math.max(
    Math.round((Date.now() - questionStartTime.value) / 1000),
    0
  )
  const correct   = currentQuestion.value.answers?.find(a => a.is_correct)
  const isCorrect = answer.id === correct?.id

  let pointsEarned = 0
  if (isCorrect) {
    const basePoints = currentQuestion.value.points || 100
    const speedBonus = Math.round(basePoints * (timeLeft.value / timeLimit.value) * 0.5)
    pointsEarned         = basePoints + speedBonus
    totalScore.value    += pointsEarned
    correctCount.value++
  }

  totalTimeTaken.value += timeTaken

  userAnswers.value.push({
    questionId:       currentQuestion.value.id,
    selectedAnswerId: answer.id,
    timeTaken,
    isCorrect
  })

  lastAnswerCorrect.value  = isCorrect
  lastPointsEarned.value   = pointsEarned
  correctAnswerText.value  = !isCorrect ? (correct?.answer_text || '') : ''

  setTimeout(showFeedback, 400)
}

const showFeedback = () => {
  state.value = 'feedback'
  setTimeout(() => {
    if (currentIndex.value < questions.value.length - 1) {
      currentIndex.value++
      showQuestion()
    } else {
      submitAttempt()
    }
  }, 1800)
}

const submitAttempt = async () => {
  state.value = 'loading'
  try {
    const resp  = await api(`/quizzes/${quizId}/attempt`, 'POST', {
      answers:          userAnswers.value,
      timeTakenSeconds: totalTimeTaken.value
    })
    earnedLP.value = resp.earnedPoints || 0

    // refresh session silently
    const token = getToken()
    if (token) {
      try {
        const meResp = await api('/me')
        if (meResp?.user) setSession(token, meResp.user)
      } catch { /* non-fatal */ }
    }

    // BUG FIX: leaderboard fetch in finally-style block — still shows results on error
    try {
      const lbResp      = await api(`/quizzes/${quizId}/leaderboard`)
      leaderboard.value = lbResp.leaderboard || []
    } catch { /* non-fatal */ }
  } catch (err) {
    console.error('submitAttempt failed:', err)
  }
  state.value = 'results'
}

const restartQuiz = () => {
  state.value = 'lobby'
}

const backToQuizzes = () => {
  router.push('/quizzes')
}

onMounted(loadQuiz)
onUnmounted(() => clearInterval(timerInterval.value))
</script>

<style scoped>
/* ── canvas ── */
.play-bg {
  min-height: 100vh;
  background: linear-gradient(160deg, var(--canvas-parchment, #F5F5F5), #fff);
  transition: background 400ms ease;
}

.play-center {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}

/* ── glass card base ── */
.glass-card {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  border: 1px solid rgba(255, 133, 187, 0.18);
  box-shadow:
    0 4px 24px rgba(2, 26, 84, 0.08),
    0 1px 4px rgba(2, 26, 84, 0.04);
  border-radius: 20px;
  overflow: hidden;
}

/* ── loading ── */
.loading-card {
  padding: 40px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 220px;
}

.spinner-lg {
  width: 48px;
  height: 48px;
  border: 4px solid var(--primary-soft, #FFCEE3);
  border-top-color: var(--primary, #FF85BB);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin-bottom: 16px;
}
@keyframes spin { to { transform: rotate(360deg); } }

.play-loading-text {
  color: var(--ink-muted, #6e6e73);
  font-size: 15px;
}

/* ── lobby ── */
.lobby-screen { flex-direction: column; }

.lobby-card {
  max-width: 420px;
  width: 100%;
}

.lobby-color-bar {
  height: 6px;
  width: 100%;
}

.lobby-body {
  padding: 28px 24px 32px;
  text-align: center;
}

.lobby-course {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  color: var(--primary, #FF85BB);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  background: var(--primary-soft, #FFCEE3);
  padding: 4px 12px;
  border-radius: 6px;
  margin-bottom: 16px;
}

.lobby-title {
  margin: 0 0 10px;
  font-size: 22px;
  font-weight: 800;
  color: var(--ink, #021A54);
  line-height: 1.3;
}

.lobby-desc {
  margin: 0 0 14px;
  color: var(--ink-muted, #6e6e73);
  font-size: 14px;
  line-height: 1.5;
}

.lobby-meta {
  font-size: 13px;
  color: var(--ink-muted, #6e6e73);
  margin-bottom: 6px;
}
.lobby-dot { margin: 0 6px; }

.lobby-plays {
  font-size: 12px;
  color: var(--ink-muted, #6e6e73);
  margin-bottom: 24px;
}

.start-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 36px;
  background: var(--primary, #FF85BB);
  color: #fff;
  border: none;
  border-radius: 28px;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  transition: background 150ms, transform 150ms;
  box-shadow: 0 4px 14px rgba(255, 133, 187, 0.4);
}
.start-btn:hover  { background: var(--primary-hover, #ff6da9); }
.start-btn:active { transform: scale(0.96); }

/* ── question screen ── */
.play-question-screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* top bar */
.play-topbar {
  padding: 12px 16px 0;
}
.play-progress {
  height: 5px;
  background: rgba(2, 26, 84, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 10px;
}
.play-progress-fill {
  height: 100%;
  background: var(--primary, #FF85BB);
  border-radius: 3px;
  transition: width 400ms ease;
}
.play-topbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.play-q-counter {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-muted, #6e6e73);
}
.play-score-display {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink, #021A54);
}

/* timer */
.timer-area {
  display: flex;
  justify-content: center;
  padding: 20px 0 12px;
}
.timer-circle {
  position: relative;
  width: 80px;
  height: 80px;
}
.timer-svg {
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
}
.timer-track {
  fill: none;
  stroke: rgba(2, 26, 84, 0.08);
  stroke-width: 7;
}
.timer-fill {
  fill: none;
  stroke: var(--primary, #FF85BB);
  stroke-width: 7;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.9s linear;
}
.timer-warning .timer-fill { stroke: #e53935; }
.timer-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 800;
  color: var(--ink, #021A54);
}
.timer-warning .timer-text { color: #e53935; }

/* question text */
.question-display {
  padding: 8px 20px 16px;
  text-align: center;
}
.question-text {
  margin: 0;
  font-size: 19px;
  font-weight: 700;
  color: var(--ink, #021A54);
  line-height: 1.4;
}

/* answer blocks 2×2 */
.answer-blocks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 0 14px 24px;
  flex: 1;
}

.answer-block {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 12px;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  text-align: left;
  transition: transform 120ms, opacity 120ms, filter 120ms;
  min-height: 72px;
  backdrop-filter: blur(8px);
}

.answer-block--red    { background: #e05a6f; }
.answer-block--blue   { background: #4a7dc8; }
.answer-block--yellow { background: #d4962a; color: #fff; }
.answer-block--green  { background: #3aaa6b; }

.answer-block:hover:not(:disabled) { transform: scale(1.03); filter: brightness(1.08); }
.answer-block:active:not(:disabled){ transform: scale(0.97); }

.answer-block--selected {
  box-shadow: 0 0 0 3px #fff, 0 0 0 5px rgba(255,133,187,0.8);
  transform: scale(1.03);
}
.answer-block--disabled:not(.answer-block--selected) {
  opacity: 0.55;
}

.answer-shape {
  font-size: 18px;
  flex-shrink: 0;
  width: 26px;
  text-align: center;
}
.answer-label { line-height: 1.3; }

/* ── feedback ── */
.feedback-card {
  text-align: center;
  padding: 36px 28px;
  max-width: 360px;
  width: 100%;
  animation: popIn 300ms cubic-bezier(.34,1.56,.64,1);
}
@keyframes popIn {
  from { transform: scale(0.82); opacity: 0; }
  to   { transform: scale(1);    opacity: 1; }
}
.feedback-icon svg {
  width: 64px;
  height: 64px;
  margin-bottom: 14px;
}
.feedback-card h2 {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 800;
  color: var(--ink, #021A54);
}
.feedback--correct h2 { color: #34c759; }
.feedback--wrong   h2 { color: #e53935; }
.feedback-points {
  font-size: 17px;
  font-weight: 700;
  color: var(--primary, #FF85BB);
  margin: 0;
}
.feedback-correct-label {
  font-size: 14px;
  color: var(--ink-muted, #6e6e73);
  margin: 4px 0 0;
}

/* ── results ── */
.results-card {
  padding: 32px 24px;
  max-width: 440px;
  width: 100%;
  text-align: center;
}
.results-confetti {
  font-size: 48px;
  margin-bottom: 8px;
}
.results-title {
  margin: 0 0 20px;
  font-size: 26px;
  font-weight: 800;
  color: var(--ink, #021A54);
}

/* score ring */
.results-score-ring {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 24px;
}
.ring-svg {
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
}
.ring-track {
  fill: none;
  stroke: rgba(2, 26, 84, 0.08);
  stroke-width: 8;
}
.ring-fill {
  fill: none;
  stroke: var(--primary, #FF85BB);
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s ease;
}
.ring-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.ring-value {
  font-size: 32px;
  font-weight: 800;
  color: var(--ink, #021A54);
  line-height: 1;
}
.ring-label {
  font-size: 14px;
  color: var(--ink-muted, #6e6e73);
}

/* stats row */
.results-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 24px;
}
.result-stat {
  padding: 10px 4px;
  background: var(--primary-soft, #FFCEE3);
  border-radius: 12px;
}
.result-stat__value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: var(--ink, #021A54);
}
.result-stat__label {
  display: block;
  font-size: 10px;
  color: var(--ink-muted, #6e6e73);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-top: 2px;
}

/* leaderboard */
.results-leaderboard {
  text-align: left;
  margin-bottom: 20px;
}
.lb-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink, #021A54);
  margin: 0 0 10px;
}
.lb-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  transition: background 120ms;
}
.lb-row:nth-child(even) {
  background: rgba(2, 26, 84, 0.04);
}
/* BUG FIX: was nth-child(2/3/4) — off by 1 because .lb-title is child 1 */
.lb-row:nth-child(2) .lb-rank { color: #f5a623; font-weight: 800; }
.lb-row:nth-child(3) .lb-rank { color: #8e8e93; font-weight: 700; }
.lb-row:nth-child(4) .lb-rank { color: #cd7f32; font-weight: 700; }
.lb-row--me {
  background: var(--primary-soft, #FFCEE3) !important;
}
.lb-rank {
  width: 24px;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: var(--ink-muted, #6e6e73);
}
.lb-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink, #021A54);
}
.lb-score {
  font-size: 13px;
  font-weight: 700;
  color: var(--primary, #FF85BB);
}

/* action buttons */
.results-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}
.btn-play-again {
  padding: 12px 28px;
  background: var(--primary, #FF85BB);
  color: #fff;
  border: none;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(255, 133, 187, 0.35);
  transition: background 150ms, transform 150ms;
}
.btn-play-again:hover  { background: var(--primary-hover, #ff6da9); }
.btn-play-again:active { transform: scale(0.96); }

.btn-back-to-quizzes {
  padding: 12px 28px;
  background: rgba(2, 26, 84, 0.06);
  color: var(--ink, #021A54);
  border: 1px solid rgba(2, 26, 84, 0.12);
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms;
}
.btn-back-to-quizzes:hover { background: rgba(2, 26, 84, 0.1); }

/* ── responsive ── */
@media (max-width: 480px) {
  .answer-blocks    { grid-template-columns: 1fr; }
  .results-stats    { grid-template-columns: 1fr; }
  .results-actions  { flex-direction: column; }
  .answer-block     { min-height: 56px; }
}
</style>
