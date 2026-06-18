<template>
  <main class="play-bg" :style="bgStyle">

    <!-- STATE: Loading -->
    <div v-if="state === 'loading'" class="play-center">
      <div class="spinner-lg"></div>
      <p class="play-loading-text">Loading quiz…</p>
    </div>

    <!-- STATE: Lobby / Pre-start -->
    <div v-else-if="state === 'lobby'" class="play-center lobby-screen">
      <div class="lobby-card">
        <div class="lobby-color-bar" :style="{ background: quiz.cover_color || '#b11f4b' }"></div>
        <div class="lobby-body">
          <span class="lobby-course" v-if="quiz.course_code">{{ quiz.course_code }}</span>
          <h1 class="lobby-title">{{ quiz.title }}</h1>
          <p class="lobby-desc" v-if="quiz.description">{{ quiz.description }}</p>
          <div class="lobby-meta">
            <span>{{ questions.length }} questions</span>
            <span class="lobby-dot">·</span>
            <span>~{{ estimatedTime }} min</span>
            <span class="lobby-dot">·</span>
            <span>by {{ quiz.creator_name }}</span>
          </div>
          <div class="lobby-plays" v-if="quiz.play_count">{{ quiz.play_count }} plays so far</div>
          <button class="start-btn" @click="startQuiz">
            <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" fill="currentColor"/></svg>
            Start Quiz
          </button>
        </div>
      </div>
    </div>

    <!-- STATE: Playing a question -->
    <div v-else-if="state === 'question'" class="play-question-screen">
      <!-- Top bar -->
      <div class="play-topbar">
        <div class="play-progress">
          <div class="play-progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <div class="play-topbar-row">
          <span class="play-q-counter">{{ currentIndex + 1 }} / {{ questions.length }}</span>
          <span class="play-score-display">{{ totalScore }} pts</span>
        </div>
      </div>

      <!-- Timer circle -->
      <div class="timer-area">
        <div class="timer-circle" :class="{ 'timer-warning': timeLeft <= 5 }">
          <svg class="timer-svg" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" class="timer-track" />
            <circle cx="50" cy="50" r="45" class="timer-fill" :style="timerDashStyle" />
          </svg>
          <span class="timer-text">{{ timeLeft }}</span>
        </div>
      </div>

      <!-- Question text -->
      <div class="question-display">
        <h2 class="question-text">{{ currentQuestion.question_text }}</h2>
      </div>

      <!-- Answer blocks (Kahoot-style 2x2) -->
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
          @click="selectAnswer(answer)"
          :disabled="selectedAnswerId !== null"
        >
          <span class="answer-shape">{{ blockShapes[ai] }}</span>
          <span class="answer-label">{{ answer.answer_text }}</span>
        </button>
      </div>
    </div>

    <!-- STATE: Answer feedback (brief reveal) -->
    <div v-else-if="state === 'feedback'" class="play-center feedback-screen">
      <div class="feedback-card" :class="lastAnswerCorrect ? 'feedback--correct' : 'feedback--wrong'">
        <div class="feedback-icon">
          <svg v-if="lastAnswerCorrect" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#34c759"/><path d="M20 33l8 8 16-16" stroke="white" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <svg v-else viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#e53935"/><path d="M22 22l20 20M42 22l-20 20" stroke="white" stroke-width="4" fill="none" stroke-linecap="round"/></svg>
        </div>
        <h2>{{ lastAnswerCorrect ? 'Correct!' : 'Not quite!' }}</h2>
        <p class="feedback-points" v-if="lastAnswerCorrect">+{{ lastPointsEarned }} points</p>
        <p class="feedback-correct-label" v-if="!lastAnswerCorrect && correctAnswerText">
          Answer: {{ correctAnswerText }}
        </p>
      </div>
    </div>

    <!-- STATE: Results screen -->
    <div v-else-if="state === 'results'" class="play-center results-screen">
      <div class="results-card">
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
            <span class="result-stat__label">Learning Points Earned</span>
          </div>
          <div class="result-stat">
            <span class="result-stat__value">{{ totalTimeTaken }}s</span>
            <span class="result-stat__label">Time Taken</span>
          </div>
        </div>

        <!-- Leaderboard -->
        <div class="results-leaderboard" v-if="leaderboard.length">
          <h3 class="lb-title">Leaderboard</h3>
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
const route = useRoute()
const quizId = Number(route.params.id)
const userId = computed(() => getUser()?.id)

const state = ref('loading') // loading | lobby | question | feedback | results
const quiz = ref({})
const questions = ref([])
const leaderboard = ref([])

const currentIndex = ref(0)
const selectedAnswerId = ref(null)
const timeLeft = ref(20)
const timerInterval = ref(null)
const totalScore = ref(0)
const correctCount = ref(0)
const earnedLP = ref(0)
const totalTimeTaken = ref(0)

const lastAnswerCorrect = ref(false)
const lastPointsEarned = ref(0)
const correctAnswerText = ref('')

const userAnswers = ref([])
const questionStartTime = ref(0)

const blockColors = ['red', 'blue', 'yellow', 'green']
const blockShapes = ['▲', '◆', '●', '■']

const currentQuestion = computed(() => questions.value[currentIndex.value] || {})

const estimatedTime = computed(() => {
  const total = questions.value.reduce((sum, q) => sum + (q.time_limit_seconds || quiz.value.time_limit_seconds || 20), 0)
  return Math.ceil(total / 60)
})

const progressPercent = computed(() => {
  return ((currentIndex.value + 1) / questions.value.length) * 100
})

const timeLimit = computed(() => {
  return currentQuestion.value.time_limit_seconds || quiz.value.time_limit_seconds || 20
})

const timerDashStyle = computed(() => {
  const circumference = 2 * Math.PI * 45
  const progress = timeLeft.value / timeLimit.value
  return {
    strokeDasharray: `${circumference}`,
    strokeDashoffset: `${circumference * (1 - progress)}`
  }
})

const resultPercent = computed(() => {
  return questions.value.length ? Math.round((correctCount.value / questions.value.length) * 100) : 0
})

const resultRingStyle = computed(() => {
  const circumference = 2 * Math.PI * 52
  const progress = correctCount.value / Math.max(questions.value.length, 1)
  return {
    strokeDasharray: `${circumference}`,
    strokeDashoffset: `${circumference * (1 - progress)}`
  }
})

const bgStyle = computed(() => {
  const color = quiz.value.cover_color || '#b11f4b'
  if (state.value === 'question' || state.value === 'feedback') {
    return { background: `linear-gradient(135deg, ${color}11, ${color}05)` }
  }
  return {}
})

const loadQuiz = async () => {
  try {
    const resp = await api(`/quizzes/${quizId}`)
    quiz.value = resp.quiz || {}
    questions.value = resp.quiz?.questions || []
    leaderboard.value = resp.leaderboard || []
    state.value = 'lobby'
  } catch (err) {
    state.value = 'lobby'
    quiz.value = { title: 'Quiz not found' }
  }
}

const startQuiz = () => {
  currentIndex.value = 0
  totalScore.value = 0
  correctCount.value = 0
  userAnswers.value = []
  totalTimeTaken.value = 0
  showQuestion()
}

const showQuestion = () => {
  selectedAnswerId.value = null
  lastAnswerCorrect.value = false
  state.value = 'question'
  timeLeft.value = timeLimit.value
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
  if (selectedAnswerId.value === null) {
    // No answer selected — mark as wrong
    const correct = currentQuestion.value.answers?.find(a => a.is_correct)
    userAnswers.value.push({
      questionId: currentQuestion.value.id,
      selectedAnswerId: null,
      timeTaken: timeLimit.value,
      isCorrect: false
    })
    lastAnswerCorrect.value = false
    lastPointsEarned.value = 0
    correctAnswerText.value = correct?.answer_text || ''
    totalTimeTaken.value += timeLimit.value
    showFeedback()
  }
}

const selectAnswer = (answer) => {
  if (selectedAnswerId.value !== null) return
  clearInterval(timerInterval.value)

  selectedAnswerId.value = answer.id
  const timeTaken = Math.round((Date.now() - questionStartTime.value) / 1000)
  const correct = currentQuestion.value.answers?.find(a => a.is_correct)
  const isCorrect = answer.id === correct?.id

  // Calculate points (bonus for speed)
  let pointsEarned = 0
  if (isCorrect) {
    const basePoints = currentQuestion.value.points || 100
    const speedBonus = Math.round(basePoints * (timeLeft.value / timeLimit.value) * 0.5)
    pointsEarned = basePoints + speedBonus
    totalScore.value += pointsEarned
    correctCount.value++
  }

  totalTimeTaken.value += timeTaken

  userAnswers.value.push({
    questionId: currentQuestion.value.id,
    selectedAnswerId: answer.id,
    timeTaken,
    isCorrect
  })

  lastAnswerCorrect.value = isCorrect
  lastPointsEarned.value = pointsEarned
  correctAnswerText.value = !isCorrect ? (correct?.answer_text || '') : ''

  // Brief pause then show feedback
  setTimeout(() => showFeedback(), 400)
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
    const resp = await api(`/quizzes/${quizId}/attempt`, 'POST', {
      answers: userAnswers.value,
      timeTakenSeconds: totalTimeTaken.value
    })
    earnedLP.value = resp.earnedPoints || 0

    const token = getToken()
    if (token) {
      try {
        const meResp = await api('/me')
        if (meResp?.user) {
          setSession(token, meResp.user)
        }
      } catch (refreshError) {
        console.warn('Failed to refresh user session after quiz attempt:', refreshError)
      }
    }

    // Refresh leaderboard
    const lbResp = await api(`/quizzes/${quizId}/leaderboard`)
    leaderboard.value = lbResp.leaderboard || []
  } catch (err) {
    console.error('Failed to submit attempt:', err)
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
.play-bg {
  min-height: 100vh;
  background: linear-gradient(180deg, #ffffff, #f5f5f7);
  transition: background 400ms ease;
}

/* Center layout utility */
.play-center {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}

/* Loading */
.spinner-lg {
  width: 48px;
  height: 48px;
  border: 4px solid #e0e0e0;
  border-top-color: #b11f4b;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin: 0 auto 16px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.play-loading-text {
  color: #6e6e73;
  font-size: 15px;
  text-align: center;
}

/* ─── Lobby ─── */
.lobby-card {
  background: white;
  border-radius: 20px;
  overflow: hidden;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0,0,0,0.08);
}
.lobby-color-bar {
  height: 8px;
}
.lobby-body {
  padding: 28px 24px;
  text-align: center;
}
.lobby-course {
  font-size: 12px;
  font-weight: 700;
  color: #b11f4b;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  background: rgba(177,31,75,0.08);
  padding: 4px 12px;
  border-radius: 6px;
  display: inline-block;
  margin-bottom: 16px;
}
.lobby-title {
  margin: 0 0 10px;
  font-size: 22px;
  font-weight: 700;
  color: #1d1d1f;
  line-height: 1.3;
}
.lobby-desc {
  margin: 0 0 14px;
  color: #6e6e73;
  font-size: 14px;
  line-height: 1.4;
}
.lobby-meta {
  font-size: 13px;
  color: #8e8e93;
  margin-bottom: 6px;
}
.lobby-dot {
  margin: 0 6px;
}
.lobby-plays {
  font-size: 12px;
  color: #6e6e73;
  margin-bottom: 24px;
}
.start-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 36px;
  background: #b11f4b;
  color: white;
  border: none;
  border-radius: 28px;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  transition: background 150ms ease, transform 150ms ease;
}
.start-btn svg {
  width: 18px;
  height: 18px;
}
.start-btn:hover {
  background: #8d1630;
}
.start-btn:active {
  transform: scale(0.96);
}

/* ─── Question screen ─── */
.play-question-screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Top bar */
.play-topbar {
  padding: 0 16px;
  padding-top: 12px;
}
.play-progress {
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 10px;
}
.play-progress-fill {
  height: 100%;
  background: #b11f4b;
  border-radius: 2px;
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
  color: #6e6e73;
}
.play-score-display {
  font-size: 14px;
  font-weight: 700;
  color: #b11f4b;
}

/* Timer */
.timer-area {
  display: flex;
  justify-content: center;
  padding: 20px 0 10px;
}
.timer-circle {
  position: relative;
  width: 80px;
  height: 80px;
}
.timer-svg {
  transform: rotate(-90deg);
}
.timer-track {
  fill: none;
  stroke: #e0e0e0;
  stroke-width: 6;
}
.timer-fill {
  fill: none;
  stroke: #b11f4b;
  stroke-width: 6;
  stroke-linecap: round;
  transition: stroke-dashoffset 1s linear;
}
.timer-warning .timer-fill {
  stroke: #e53935;
}
.timer-warning .timer-text {
  color: #e53935;
}
.timer-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 800;
  color: #1d1d1f;
}

/* Question display */
.question-display {
  text-align: center;
  padding: 10px 24px 20px;
  flex: 0 0 auto;
}
.question-text {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1d1d1f;
  line-height: 1.4;
}

/* Answer blocks (Kahoot 2x2) */
.answer-blocks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 0 16px 24px;
  flex: 1;
  align-content: start;
}
.answer-block {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 16px;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  color: white;
  text-align: left;
  transition: transform 150ms ease, opacity 150ms ease, box-shadow 150ms ease;
  min-height: 70px;
}
.answer-block:hover:not(:disabled) {
  transform: scale(1.02);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}
.answer-block:active:not(:disabled) {
  transform: scale(0.97);
}
.answer-block--disabled:not(.answer-block--selected) {
  opacity: 0.45;
  cursor: default;
}
.answer-block--selected {
  transform: scale(1.03);
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
}

/* Kahoot-style colors */
.answer-block--red { background: #e53935; }
.answer-block--blue { background: #1e88e5; }
.answer-block--yellow { background: #ffb300; color: #1d1d1f; }
.answer-block--green { background: #43a047; }

.answer-shape {
  font-size: 20px;
  flex-shrink: 0;
  width: 28px;
  text-align: center;
}
.answer-label {
  line-height: 1.3;
}

/* ─── Feedback ─── */
.feedback-card {
  text-align: center;
  padding: 32px;
  border-radius: 20px;
  background: white;
  max-width: 360px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0,0,0,0.1);
  animation: popIn 300ms ease;
}
@keyframes popIn {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
.feedback-icon svg {
  width: 64px;
  height: 64px;
  margin-bottom: 12px;
}
.feedback-card h2 {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 800;
}
.feedback--correct h2 { color: #34c759; }
.feedback--wrong h2 { color: #e53935; }
.feedback-points {
  font-size: 16px;
  font-weight: 700;
  color: #b11f4b;
  margin: 0;
}
.feedback-correct-label {
  font-size: 14px;
  color: #6e6e73;
  margin: 0;
}

/* ─── Results ─── */
.results-card {
  background: white;
  border-radius: 20px;
  padding: 32px 24px;
  max-width: 440px;
  width: 100%;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0,0,0,0.08);
}
.results-confetti {
  font-size: 48px;
  margin-bottom: 8px;
}
.results-title {
  margin: 0 0 20px;
  font-size: 24px;
  font-weight: 800;
  color: #1d1d1f;
}

/* Score ring */
.results-score-ring {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 20px;
}
.ring-svg {
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
}
.ring-track {
  fill: none;
  stroke: #e0e0e0;
  stroke-width: 8;
}
.ring-fill {
  fill: none;
  stroke: #b11f4b;
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
  color: #1d1d1f;
  line-height: 1;
}
.ring-label {
  font-size: 14px;
  color: #6e6e73;
}

/* Stats */
.results-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 24px;
}
.result-stat {
  padding: 10px 4px;
  background: #f5f5f7;
  border-radius: 10px;
}
.result-stat__value {
  display: block;
  font-size: 18px;
  font-weight: 700;
  color: #b11f4b;
}
.result-stat__label {
  display: block;
  font-size: 10px;
  color: #6e6e73;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-top: 2px;
}

/* Leaderboard */
.results-leaderboard {
  text-align: left;
  margin-bottom: 20px;
}
.lb-title {
  font-size: 14px;
  font-weight: 700;
  color: #1d1d1f;
  margin: 0 0 10px;
}
.lb-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  transition: background 120ms ease;
}
.lb-row:nth-child(even) {
  background: #f5f5f7;
}
.lb-row--me {
  background: rgba(177, 31, 75, 0.08) !important;
}
.lb-rank {
  width: 24px;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: #6e6e73;
}
.lb-row:nth-child(2) .lb-rank { color: #ffb300; }
.lb-row:nth-child(3) .lb-rank { color: #8e8e93; }
.lb-row:nth-child(4) .lb-rank { color: #cd7f32; }
.lb-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: #1d1d1f;
}
.lb-score {
  font-size: 13px;
  font-weight: 700;
  color: #b11f4b;
}

/* Actions */
.results-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}
.btn-play-again {
  padding: 12px 28px;
  background: #b11f4b;
  color: white;
  border: none;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}
.btn-play-again:hover { background: #8d1630; }
.btn-back-to-quizzes {
  padding: 12px 28px;
  background: #f5f5f7;
  color: #6e6e73;
  border: 1px solid #e0e0e0;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}
.btn-back-to-quizzes:hover { background: #e8e8ed; }

@media (max-width: 640px) {
  .answer-blocks {
    grid-template-columns: 1fr !important;
  }
  .results-stats {
    grid-template-columns: 1fr !important;
  }
  .results-actions {
    flex-direction: column;
  }
}
</style>
