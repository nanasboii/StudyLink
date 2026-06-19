<template>
  <main class="play-main" :style="bgStyle">

    <!-- ── LOADING ── -->
    <div v-if="state === 'loading'" class="play-center">
      <div class="play-spinner" aria-label="Loading quiz"></div>
      <p class="play-loading-text">Loading quiz…</p>
    </div>

    <!-- ── LOBBY ── -->
    <div v-else-if="state === 'lobby'" class="play-center lobby-screen">
      <div class="glass-card lobby-card">
        <div class="lobby-color-bar" :style="{ background: quiz.cover_color || '#FF85BB' }"></div>
        <div class="lobby-body">
          <span v-if="quiz.course_code" class="lobby-course">{{ quiz.course_code }}</span>
          <h1 class="lobby-title">{{ quiz.title || 'Quiz' }}</h1>
          <p v-if="quiz.description" class="lobby-desc">{{ quiz.description }}</p>
          <p class="lobby-meta">
            <span>{{ questions.length }} question{{ questions.length !== 1 ? 's' : '' }}</span>
            <span class="lobby-dot">·</span>
            <span>~{{ estimatedTime }} min</span>
            <span class="lobby-dot">·</span>
            <span>by {{ quiz.creator_name || '—' }}</span>
          </p>
          <div v-if="quiz.play_count" class="lobby-plays">{{ quiz.play_count }} plays so far</div>
          <button class="start-btn" @click="startQuiz" :disabled="!questions.length">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><polygon points="5,3 19,12 5,21" fill="currentColor"/></svg>
            Start Quiz
          </button>
          <p v-if="!questions.length" class="lobby-no-questions">This quiz has no questions yet.</p>
        </div>
      </div>
    </div>

    <!-- ── QUESTION ── -->
    <div v-else-if="state === 'question'" class="play-question-screen">
      <div class="play-topbar">
        <div class="play-progress" role="progressbar" :aria-valuenow="progressPercent" aria-valuemin="0" aria-valuemax="100">
          <div class="play-progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <div class="play-topbar-row">
          <span class="play-q-counter">{{ currentIndex + 1 }} / {{ questions.length }}</span>
          <span class="play-score-display">🏅 {{ totalScore }} pts</span>
        </div>
      </div>

      <div class="timer-area">
        <div class="timer-circle" :class="{ 'timer-warning': timeLeft <= 5 }">
          <svg class="timer-svg" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="45" class="timer-track"/>
            <circle cx="50" cy="50" r="45" class="timer-fill" :style="timerDashStyle"/>
          </svg>
          <span class="timer-text" aria-live="polite">{{ timeLeft }}</span>
        </div>
      </div>

      <div class="question-display">
        <h2 class="question-text">{{ currentQuestion.question_text }}</h2>
      </div>

      <div class="answer-blocks" role="group" aria-label="Select an answer">
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
          :aria-label="`Answer ${ai + 1}: ${answer.answer_text}`"
        >
          <span class="answer-shape" aria-hidden="true">{{ blockShapes[ai] }}</span>
          <span class="answer-label">{{ answer.answer_text }}</span>
        </button>
      </div>
    </div>

    <!-- ── FEEDBACK ── -->
    <div v-else-if="state === 'feedback'" class="play-center feedback-screen">
      <div class="glass-card feedback-card" :class="lastAnswerCorrect ? 'feedback--correct' : 'feedback--wrong'">
        <div class="feedback-icon">
          <svg v-if="lastAnswerCorrect" viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="30" fill="#34c759"/>
            <path d="M20 33l8 8 16-16" stroke="white" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <svg v-else viewBox="0 0 64 64" aria-hidden="true">
            <circle cx="32" cy="32" r="30" fill="#e53935"/>
            <path d="M22 22l20 20M42 22l-20 20" stroke="white" stroke-width="4" fill="none" stroke-linecap="round"/>
          </svg>
        </div>
        <h2>{{ lastAnswerCorrect ? 'Correct!' : 'Not quite!' }}</h2>
        <p v-if="lastAnswerCorrect" class="feedback-points">+{{ lastPointsEarned }} points</p>
        <p v-if="!lastAnswerCorrect && correctAnswerText" class="feedback-correct-label">
          Answer: {{ correctAnswerText }}
        </p>
      </div>
    </div>

    <!-- ── RESULTS ── -->
    <div v-else-if="state === 'results'" class="play-center results-screen">
      <div class="glass-card results-card">
        <div v-if="resultPercent >= 70" class="results-confetti" aria-hidden="true">🎉</div>
        <h1 class="results-title">Quiz Complete!</h1>

        <div class="results-score-ring" aria-label="`${correctCount} out of ${questions.length} correct`">
          <svg viewBox="0 0 120 120" class="ring-svg" aria-hidden="true">
            <circle cx="60" cy="60" r="52" class="ring-track"/>
            <circle cx="60" cy="60" r="52" class="ring-fill" :style="resultRingStyle"/>
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

        <div v-if="leaderboard.length" class="results-leaderboard">
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
import { api, getUser, setSession } from '@/api.js'

const router = useRouter()
const route  = useRoute()

// FIX: NaN guard on quizId
const rawId  = route.params.id
const quizId = Number(rawId)
const userId = computed(() => getUser()?.id)

// state machine: loading | lobby | question | feedback | results
const state = ref('loading')

const quiz       = ref({})
const questions  = ref([])
const leaderboard = ref([])

const currentIndex      = ref(0)
const selectedAnswerId  = ref(null)
const timeLeft          = ref(20)
const timerInterval     = ref(null)
const totalScore        = ref(0)
const correctCount      = ref(0)
const earnedLP          = ref(0)
const totalTimeTaken    = ref(0)
const lastAnswerCorrect = ref(false)
const lastPointsEarned  = ref(0)
const correctAnswerText = ref('')
const userAnswers       = ref([])
const questionStartTime = ref(0)

const blockColors = ['red', 'blue', 'yellow', 'green']
const blockShapes = ['▲', '◆', '●', '■']

// ── Computed ──

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

// FIX: clamp to minimum 1 — prevents div-by-zero in timerDashStyle
const timeLimit = computed(() =>
  Math.max(currentQuestion.value.time_limit_seconds || quiz.value.time_limit_seconds || 20, 1)
)

const timerDashStyle = computed(() => {
  const circ = 2 * Math.PI * 45
  const progress = timeLeft.value / timeLimit.value
  return {
    strokeDasharray:  `${circ}`,
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
    strokeDasharray:  `${circ}`,
    strokeDashoffset: `${circ * (1 - progress)}`
  }
})

const bgStyle = computed(() => {
  const color = quiz.value.cover_color || '#FF85BB'
  if (state.value === 'question' || state.value === 'feedback') {
    return { background: `linear-gradient(135deg, ${color}18, #F5F5F5)` }
  }
  return {}
})

// ── API ──

const loadQuiz = async () => {
  // FIX: guard invalid id
  if (!quizId || isNaN(quizId)) {
    quiz.value  = { title: 'Invalid quiz ID' }
    questions.value = []
    state.value = 'lobby'
    return
  }
  try {
    const resp     = await api(`/quizzes/${quizId}`)
    quiz.value     = resp?.quiz      || {}
    questions.value = resp?.quiz?.questions || []
    leaderboard.value = resp?.leaderboard  || []
    state.value    = 'lobby'
  } catch {
    quiz.value      = { title: 'Quiz not found' }
    questions.value = []
    state.value     = 'lobby'
  }
}

const loadLeaderboard = async () => {
  try {
    const resp = await api(`/quizzes/${quizId}/leaderboard`)
    leaderboard.value = resp?.leaderboard || []
  } catch { /* silent */ }
}

// ── Quiz flow ──

const startQuiz = () => {
  // FIX: reset ALL state on (re)start
  currentIndex.value      = 0
  totalScore.value        = 0
  correctCount.value      = 0
  earnedLP.value          = 0
  userAnswers.value       = []
  totalTimeTaken.value    = 0
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
  // FIX: guard against double-fire
  if (selectedAnswerId.value !== null) return
  const correct = currentQuestion.value.answers?.find(a => a.is_correct)
  userAnswers.value.push({
    questionId:       currentQuestion.value.id,
    selectedAnswerId: null,
    timeTaken:        timeLimit.value,
    isCorrect:        false,
  })
  lastAnswerCorrect.value = false
  lastPointsEarned.value  = 0
  correctAnswerText.value = correct?.answer_text || ''
  totalTimeTaken.value   += timeLimit.value
  showFeedback()
}

const selectAnswer = (answer) => {
  if (selectedAnswerId.value !== null) return
  clearInterval(timerInterval.value)
  selectedAnswerId.value = answer.id

  // FIX: clamp timeTaken to >= 0
  const timeTaken = Math.max(Math.round((Date.now() - questionStartTime.value) / 1000), 0)
  const correct   = currentQuestion.value.answers?.find(a => a.is_correct)
  const isCorrect = answer.id === correct?.id

  let pointsEarned = 0
  if (isCorrect) {
    const basePoints  = currentQuestion.value.points || 100
    const speedBonus  = Math.round(basePoints * (timeLeft.value / timeLimit.value) * 0.5)
    pointsEarned      = basePoints + speedBonus
    totalScore.value += pointsEarned
    correctCount.value++
  }

  totalTimeTaken.value += timeTaken

  userAnswers.value.push({
    questionId:       currentQuestion.value.id,
    selectedAnswerId: answer.id,
    timeTaken,
    isCorrect,
  })

  lastAnswerCorrect.value = isCorrect
  lastPointsEarned.value  = pointsEarned
  correctAnswerText.value = !isCorrect ? (correct?.answer_text || '') : ''
  showFeedback()
}

const showFeedback = () => {
  state.value = 'feedback'
  setTimeout(() => {
    if (currentIndex.value + 1 < questions.value.length) {
      currentIndex.value++
      showQuestion()
    } else {
      finishQuiz()
    }
  }, 1600)
}

const finishQuiz = async () => {
  state.value = 'results'
  try {
    const resp = await api(`/quizzes/${quizId}/submit`, 'POST', {
      answers:         userAnswers.value,
      totalScore:      totalScore.value,
      timeTakenSeconds: totalTimeTaken.value,
    })
    // FIX: guard earnedPoints null
    earnedLP.value = Number(resp?.earnedPoints ?? 0)
    // Refresh session user points
    try {
      const me = await api('/me')
      if (me?.user) {
        const token = localStorage.getItem('studylinkToken') || ''
        setSession(token, me.user)
      }
    } catch { /* silent */ }
    await loadLeaderboard()
  } catch { /* silent — show results anyway */ }
}

const restartQuiz = () => { startQuiz() }
const backToQuizzes = () => { router.push('/quizzes') }

onMounted(() => { loadQuiz() })
onUnmounted(() => { clearInterval(timerInterval.value) })
</script>

<style scoped>
/* ── Shell ── */
.play-main {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #F5F5F5;
  transition: background 0.5s ease;
}

.play-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
}
.lobby-screen, .results-screen { flex-direction: column }

/* Glass card */
.glass-card {
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 2px solid #021A54;
  border-radius: 20px;
  box-shadow: 0 16px 48px rgba(2,26,84,0.1);
}

/* ── Loading ── */
.play-spinner {
  width: 48px; height: 48px;
  border: 4px solid #FFCEE3;
  border-top-color: #FF85BB;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin-bottom: 16px;
}
@keyframes spin { to { transform: rotate(360deg) } }
.play-loading-text { color: #6e6e73; font-size: 15px }

/* ── Lobby ── */
.lobby-card { max-width: 440px; width: 100%; overflow: hidden }
.lobby-color-bar { height: 8px; width: 100% }
.lobby-body { padding: 28px 24px 32px; text-align: center }

.lobby-course {
  display: inline-block;
  font-size: 11px; font-weight: 700;
  color: #FF85BB; text-transform: uppercase; letter-spacing: 0.8px;
  background: #FFCEE3; padding: 4px 12px; border-radius: 6px; margin-bottom: 16px;
}
.lobby-title { margin: 0 0 10px; font-size: 22px; font-weight: 800; color: #021A54; line-height: 1.3 }
.lobby-desc  { margin: 0 0 14px; color: #6e6e73; font-size: 14px; line-height: 1.5 }
.lobby-meta  { font-size: 13px; color: #6e6e73; margin-bottom: 6px }
.lobby-dot   { margin: 0 6px }
.lobby-plays { font-size: 12px; color: #6e6e73; margin-bottom: 24px }
.lobby-no-questions { font-size: 13px; color: #FF85BB; margin-top: 12px; font-weight: 600 }

.start-btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 14px 36px; background: #FF85BB;
  color: #fff; border: 2px solid #021A54;
  border-radius: 28px; font-size: 17px; font-weight: 700;
  cursor: pointer; transition: background 150ms, transform 150ms;
  box-shadow: 0 4px 14px rgba(255,133,187,0.4);
}
.start-btn:hover:not(:disabled)  { background: #ff6da9 }
.start-btn:active { transform: scale(0.96) }
.start-btn:disabled { opacity: 0.5; cursor: not-allowed }

/* ── Question screen ── */
.play-question-screen { min-height: 100vh; display: flex; flex-direction: column }

.play-topbar { padding: 12px 16px 0 }
.play-progress {
  height: 5px; background: rgba(2,26,84,0.1);
  border-radius: 3px; overflow: hidden; margin-bottom: 10px;
}
.play-progress-fill {
  height: 100%; background: #FF85BB;
  border-radius: 3px; transition: width 400ms ease;
}
.play-topbar-row { display: flex; justify-content: space-between; align-items: center }
.play-q-counter    { font-size: 13px; font-weight: 600; color: #6e6e73 }
.play-score-display { font-size: 14px; font-weight: 700; color: #021A54 }

.timer-area { display: flex; justify-content: center; padding: 20px 0 12px }
.timer-circle { position: relative; width: 80px; height: 80px }
.timer-svg { transform: rotate(-90deg); width: 100%; height: 100% }
.timer-track { fill: none; stroke: rgba(2,26,84,0.08); stroke-width: 7 }
.timer-fill  { fill: none; stroke: #FF85BB; stroke-width: 7; stroke-linecap: round; transition: stroke-dashoffset 0.9s linear }
.timer-warning .timer-fill { stroke: #e53935 }
.timer-text {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 800; color: #021A54;
}
.timer-warning .timer-text { color: #e53935 }

.question-display { padding: 8px 20px 16px; text-align: center }
.question-text { margin: 0; font-size: 19px; font-weight: 700; color: #021A54; line-height: 1.4 }

.answer-blocks {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 10px; padding: 0 14px 24px; flex: 1;
}
.answer-block {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 12px; border: none; border-radius: 14px;
  font-size: 15px; font-weight: 600; color: #fff;
  cursor: pointer; text-align: left;
  transition: transform 120ms, opacity 120ms, filter 120ms;
  min-height: 72px;
}
.answer-block--red    { background: #e05a6f }
.answer-block--blue   { background: #4a7dc8 }
.answer-block--yellow { background: #d4962a }
.answer-block--green  { background: #3aaa6b }
.answer-block:hover:not(:disabled) { transform: scale(1.03); filter: brightness(1.08) }
.answer-block:active:not(:disabled) { transform: scale(0.97) }
.answer-block--selected { box-shadow: 0 0 0 3px #fff, 0 0 0 5px rgba(255,133,187,0.8); transform: scale(1.03) }
.answer-block--disabled:not(.answer-block--selected) { opacity: 0.55 }
.answer-shape { font-size: 18px; flex-shrink: 0; width: 26px; text-align: center }
.answer-label { line-height: 1.3 }

/* ── Feedback ── */
.feedback-card {
  text-align: center; padding: 36px 28px; max-width: 360px; width: 100%;
  animation: popIn 300ms cubic-bezier(.34,1.56,.64,1);
}
@keyframes popIn { from { transform: scale(0.82); opacity: 0 } to { transform: scale(1); opacity: 1 } }
.feedback-icon svg { width: 64px; height: 64px; margin-bottom: 14px }
.feedback-card h2 { margin: 0 0 8px; font-size: 24px; font-weight: 800; color: #021A54 }
.feedback--correct h2 { color: #34c759 }
.feedback--wrong   h2 { color: #e53935 }
.feedback-points  { font-size: 17px; font-weight: 700; color: #FF85BB; margin: 0 }
.feedback-correct-label { font-size: 14px; color: #6e6e73; margin: 4px 0 0 }

/* ── Results ── */
.results-card  { padding: 32px 24px; max-width: 440px; width: 100%; text-align: center }
.results-confetti { font-size: 48px; margin-bottom: 8px }
.results-title { margin: 0 0 20px; font-size: 26px; font-weight: 800; color: #021A54 }

.results-score-ring { position: relative; width: 120px; height: 120px; margin: 0 auto 24px }
.ring-svg  { transform: rotate(-90deg); width: 100%; height: 100% }
.ring-track { fill: none; stroke: rgba(2,26,84,0.08); stroke-width: 8 }
.ring-fill  { fill: none; stroke: #FF85BB; stroke-width: 8; stroke-linecap: round; transition: stroke-dashoffset 1s ease }
.ring-text  { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center }
.ring-value { font-size: 32px; font-weight: 800; color: #021A54; line-height: 1 }
.ring-label { font-size: 14px; color: #6e6e73 }

.results-stats {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 8px; margin-bottom: 24px;
}
.result-stat { padding: 10px 4px; background: #FFCEE3; border-radius: 12px }
.result-stat__value {
  display: block; font-size: 18px; font-weight: 800; color: #021A54;
}
.result-stat__label {
  display: block; font-size: 10px; color: #6e6e73;
  text-transform: uppercase; letter-spacing: 0.3px; margin-top: 2px;
}

.results-leaderboard { text-align: left; margin-bottom: 20px }
.lb-title { font-size: 14px; font-weight: 700; color: #021A54; margin: 0 0 10px }
.lb-row {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 10px; border-radius: 8px; transition: background 120ms;
}
.lb-row:nth-child(even) { background: rgba(2,26,84,0.04) }
/* FIX: off-by-1 — lb-title is child 1, rows start at 2 */
.lb-row:nth-child(2) .lb-rank { color: #f5a623; font-weight: 800 }
.lb-row:nth-child(3) .lb-rank { color: #8e8e93; font-weight: 700 }
.lb-row:nth-child(4) .lb-rank { color: #cd7f32; font-weight: 700 }
.lb-row--me { background: #FFCEE3 !important }
.lb-rank  { width: 24px; text-align: center; font-size: 13px; font-weight: 700; color: #6e6e73 }
.lb-name  { flex: 1; font-size: 13px; font-weight: 500; color: #021A54 }
.lb-score { font-size: 13px; font-weight: 700; color: #FF85BB }

.results-actions { display: flex; gap: 10px; justify-content: center }
.btn-play-again {
  padding: 12px 28px; background: #FF85BB; color: #fff;
  border: 2px solid #021A54; border-radius: 24px;
  font-size: 15px; font-weight: 700; cursor: pointer;
  transition: background 150ms, transform 150ms;
}
.btn-play-again:hover  { background: #ff6da9 }
.btn-play-again:active { transform: scale(0.96) }
.btn-back-to-quizzes {
  padding: 12px 28px; background: rgba(2,26,84,0.06);
  color: #021A54; border: 1.5px solid rgba(2,26,84,0.12);
  border-radius: 24px; font-size: 15px; font-weight: 600;
  cursor: pointer; transition: background 150ms;
}
.btn-back-to-quizzes:hover { background: rgba(2,26,84,0.1) }

@media (max-width: 480px) {
  .answer-blocks   { grid-template-columns: 1fr }
  .results-stats   { grid-template-columns: 1fr }
  .results-actions { flex-direction: column }
  .answer-block    { min-height: 56px }
}
@media (prefers-reduced-motion: reduce) {
  .play-spinner { animation: none }
  .feedback-card { animation: none }
  .timer-fill, .play-progress-fill, .ring-fill { transition: none }
}
</style>