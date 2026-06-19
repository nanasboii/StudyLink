<template>
  <main class="cq-page">
    <div class="cq-view">

      <!-- ── Load error banner ── -->
      <transition name="fade-slide">
        <div v-if="loadError" class="cq-load-error" role="alert">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/></svg>
          {{ loadError }}
        </div>
      </transition>

      <!-- ── Hero ── -->
      <section class="cq-hero">
        <button class="cq-back" type="button" @click="goBack" aria-label="Go back">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>
          Back
        </button>

        <p class="cq-kicker">{{ isEditing ? 'Edit Quiz' : 'Create Quiz' }}</p>
        <h2 class="cq-title">{{ isEditing ? 'Edit Your Quiz' : 'Build a New Quiz' }}</h2>
        <p class="cq-subtitle">
          {{ isEditing
            ? 'Update your questions and settings below.'
            : 'Craft interactive questions for your peers. Earn 10 Learning Points when you publish!' }}
        </p>

        <!-- Progress bar -->
        <div class="cq-progress-track"
             role="progressbar"
             :aria-valuenow="progressPct"
             aria-valuemin="0"
             aria-valuemax="100"
             :aria-label="`Quiz completion: ${progressPct}%`">
          <div class="cq-progress-fill" :style="{ width: progressPct + '%' }"></div>
        </div>
        <p class="cq-progress-label">{{ progressLabel }}</p>
      </section>

      <!-- ── Quiz Details ── -->
      <section class="cq-card" aria-labelledby="details-heading">
        <h3 class="cq-section-title" id="details-heading">Quiz Details</h3>

        <div class="cq-field">
          <label class="cq-label" for="quiz-title">
            Title <span class="cq-required" aria-label="required">*</span>
          </label>
          <input
            id="quiz-title"
            v-model="quiz.title"
            type="text"
            class="cq-input"
            :class="{ 'cq-input--error': fieldErrors.title }"
            placeholder="e.g. Data Structures Fundamentals"
            maxlength="250"
            autocomplete="off"
            @input="clearError('title')"
            aria-describedby="title-err"
          />
          <p v-if="fieldErrors.title" id="title-err" class="cq-field-error" role="alert">{{ fieldErrors.title }}</p>
          <p class="cq-char-count" aria-live="polite">{{ quiz.title.length }}/250</p>
        </div>

        <div class="cq-field">
          <label class="cq-label" for="quiz-desc">Description</label>
          <textarea
            id="quiz-desc"
            v-model="quiz.description"
            class="cq-input cq-textarea"
            placeholder="What will this quiz cover?"
            rows="2"
            maxlength="500"
          ></textarea>
          <p class="cq-char-count" aria-live="polite">{{ quiz.description.length }}/500</p>
        </div>

        <div class="cq-row">
          <div class="cq-field cq-field--half">
            <label class="cq-label" for="quiz-course">Course Code</label>
            <input
              id="quiz-course"
              v-model="quiz.courseCode"
              type="text"
              class="cq-input"
              placeholder="e.g. TMC1024"
              maxlength="30"
              autocomplete="off"
            />
          </div>
          <div class="cq-field cq-field--half">
            <label class="cq-label" for="quiz-time">
              Default Time
              <span class="cq-label-unit">sec / question</span>
            </label>
            <input
              id="quiz-time"
              v-model.number="quiz.timeLimitSeconds"
              type="number"
              class="cq-input"
              :class="{ 'cq-input--error': fieldErrors.timeLimitSeconds }"
              min="5"
              max="120"
              @blur="clampTimeLimit"
              aria-describedby="time-err"
            />
            <p v-if="fieldErrors.timeLimitSeconds" id="time-err" class="cq-field-error" role="alert">{{ fieldErrors.timeLimitSeconds }}</p>
          </div>
        </div>

        <div class="cq-field">
          <label class="cq-label">Cover Colour</label>
          <div class="cq-color-row" role="radiogroup" aria-label="Pick a cover colour">
            <button
              v-for="color in colorOptions"
              :key="color"
              type="button"
              class="cq-swatch"
              :class="{ 'cq-swatch--active': quiz.coverColor === color }"
              :style="{ background: color }"
              :aria-label="`Cover colour ${color}`"
              :aria-pressed="quiz.coverColor === color"
              @click="quiz.coverColor = color"
            ></button>
          </div>
          <div class="cq-cover-preview" :style="{ background: quiz.coverColor }">
            <span class="cq-cover-preview__title">{{ quiz.title || 'Quiz Title Preview' }}</span>
          </div>
        </div>
      </section>

      <!-- ── Questions ── -->
      <section class="cq-card" aria-labelledby="questions-heading">
        <div class="cq-section-header">
          <h3 class="cq-section-title" id="questions-heading">
            Questions
            <span class="cq-count-badge">{{ quiz.questions.length }}</span>
          </h3>
          <button class="cq-add-btn" type="button" @click="addQuestion">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/></svg>
            Add Question
          </button>
        </div>

        <!-- Empty state -->
        <div v-if="quiz.questions.length === 0" class="cq-empty">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z" fill="currentColor"/></svg>
          <p>No questions yet</p>
          <p class="cq-empty__sub">Click "Add Question" to get started.</p>
        </div>

        <!-- Question cards -->
        <div
          v-for="(question, qi) in quiz.questions"
          :key="qi"
          :id="`question-${qi}`"
          class="cq-question-card"
          :class="{ 'cq-question-card--error': questionHasError(qi) }"
        >
          <!-- Card header -->
          <div class="cq-question-header">
            <span class="cq-question-num">Q{{ qi + 1 }}</span>

            <div class="cq-meta-row">
              <span class="cq-meta-label">Pts</span>
              <input
                v-model.number="question.points"
                type="number"
                class="cq-input cq-input--tiny"
                min="10"
                max="1000"
                step="10"
                :aria-label="`Points for question ${qi + 1}`"
              />
              <span class="cq-meta-label">Sec</span>
              <input
                v-model.number="question.timeLimitSeconds"
                type="number"
                class="cq-input cq-input--tiny"
                min="5"
                max="120"
                placeholder="default"
                :aria-label="`Time limit for question ${qi + 1}`"
              />
            </div>

            <div class="cq-question-actions">
              <button
                class="cq-icon-btn"
                :class="confirmDeleteIdx === qi ? 'cq-icon-btn--confirm' : 'cq-icon-btn--danger'"
                type="button"
                @click="handleDeleteQuestion(qi)"
                :title="confirmDeleteIdx === qi ? 'Click again to confirm delete' : 'Delete question'"
                :aria-label="confirmDeleteIdx === qi ? `Confirm delete question ${qi + 1}` : `Delete question ${qi + 1}`"
              >
                <svg v-if="confirmDeleteIdx !== qi" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg>
                <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/></svg>
              </button>
            </div>
          </div>

          <!-- Question text -->
          <div class="cq-field">
            <input
              v-model="question.questionText"
              type="text"
              class="cq-input cq-input--question"
              :class="{ 'cq-input--error': questionErrors[qi]?.questionText }"
              :placeholder="`Question ${qi + 1}…`"
              maxlength="500"
              :aria-label="`Question ${qi + 1} text`"
              :aria-describedby="`qerr-${qi}`"
              @input="clearQuestionError(qi, 'questionText')"
            />
            <p v-if="questionErrors[qi]?.questionText" :id="`qerr-${qi}`" class="cq-field-error" role="alert">
              {{ questionErrors[qi].questionText }}
            </p>
          </div>

          <!-- Answers 2×2 grid -->
          <div class="cq-answers-grid" role="group" :aria-label="`Answers for question ${qi + 1}`">
            <div
              v-for="(answer, ai) in question.answers"
              :key="ai"
              class="cq-answer"
              :class="[`cq-answer--${answerColors[ai]}`, { 'cq-answer--correct': answer.isCorrect }]"
            >
              <button
                class="cq-correct-toggle"
                type="button"
                :class="{ active: answer.isCorrect }"
                @click="setCorrectAnswer(qi, ai)"
                :title="answer.isCorrect ? 'Correct answer' : 'Mark as correct'"
                :aria-label="`${answer.isCorrect ? 'Correct answer' : 'Mark answer ' + (ai + 1) + ' as correct'}`"
                :aria-pressed="answer.isCorrect"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/></svg>
              </button>
              <input
                v-model="answer.answerText"
                type="text"
                class="cq-answer-input"
                :placeholder="answerPlaceholders[ai]"
                maxlength="500"
                :aria-label="`Answer ${ai + 1} text`"
              />
            </div>
          </div>

          <p v-if="questionErrors[qi]?.answers" class="cq-field-error cq-field-error--card" role="alert">
            {{ questionErrors[qi].answers }}
          </p>
        </div>
      </section>

      <!-- ── Submit ── -->
      <section class="cq-card cq-submit-section" aria-label="Save quiz">
        <transition name="fade-slide">
          <p v-if="errorMsg" class="cq-feedback cq-feedback--error" role="alert">{{ errorMsg }}</p>
        </transition>
        <transition name="fade-slide">
          <p v-if="successMsg" class="cq-feedback cq-feedback--success" role="status">{{ successMsg }}</p>
        </transition>
        <div class="cq-submit-row">
          <button class="cq-btn-secondary" type="button" @click="goBack">Cancel</button>
          <button
            class="cq-btn-primary"
            type="button"
            @click="saveQuiz"
            :disabled="saving"
            :aria-busy="saving"
          >
            <svg v-if="saving" class="cq-spin" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="40 20"/>
            </svg>
            {{ saving ? 'Saving…' : (isEditing ? 'Update Quiz' : 'Publish Quiz') }}
          </button>
        </div>
      </section>

    </div>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api.js'

const router = useRouter()
const route  = useRoute()

// ── State ──────────────────────────────────────────────────────────────────
const isEditing  = computed(() => !!route.params.quizId)
const saving     = ref(false)
const errorMsg   = ref('')
const successMsg = ref('')
const loadError  = ref('')

const confirmDeleteIdx = ref(null)
let confirmDeleteTimer = null

const fieldErrors    = reactive({})
const questionErrors = reactive({})

const colorOptions = [
  '#b11f4b', '#e63946', '#f4a261', '#2a9d8f',
  '#264653', '#6c63ff', '#e76f51', '#457b9d',
]
const answerColors       = ['red', 'blue', 'yellow', 'green']
const answerPlaceholders = ['Answer A', 'Answer B', 'Answer C', 'Answer D']

const quiz = ref({
  title: '',
  description: '',
  courseCode: '',
  coverColor: '#b11f4b',
  timeLimitSeconds: 20,
  questions: [],
})

// ── Progress ───────────────────────────────────────────────────────────────
const progressPct = computed(() => {
  let score = 0
  if (quiz.value.title.trim())       score += 20
  if (quiz.value.courseCode.trim())  score += 10
  if (quiz.value.description.trim()) score += 10
  const qCount = quiz.value.questions.length
  if (qCount > 0) {
    score += Math.min(60, qCount * 10)
    const filled = quiz.value.questions.filter(
      q => q.questionText.trim() && q.answers.some(a => a.isCorrect && a.answerText.trim())
    ).length
    score = Math.min(100, score + filled * 2)
  }
  return Math.min(100, score)
})

const progressLabel = computed(() => {
  const p = progressPct.value
  if (p === 100) return '✓ Ready to publish'
  if (p >= 60)   return 'Looking good — add more questions'
  if (p >= 30)   return 'Good start — keep going'
  return 'Fill in the details above'
})

const questionHasError = (qi) =>
  Boolean(questionErrors[qi]?.questionText || questionErrors[qi]?.answers)

// ── Helpers ────────────────────────────────────────────────────────────────
const createEmptyQuestion = () => ({
  questionText: '',
  timeLimitSeconds: null,
  points: 100,
  answers: [
    { answerText: '', isCorrect: true  },
    { answerText: '', isCorrect: false },
    { answerText: '', isCorrect: false },
    { answerText: '', isCorrect: false },
  ],
})

const clearError         = (field) => { delete fieldErrors[field] }
const clearQuestionError = (qi, field) => { if (questionErrors[qi]) delete questionErrors[qi][field] }

const clampTimeLimit = () => {
  const v = Number(quiz.value.timeLimitSeconds)
  if (isNaN(v) || v < 5)  quiz.value.timeLimitSeconds = 5
  else if (v > 120)        quiz.value.timeLimitSeconds = 120
  delete fieldErrors.timeLimitSeconds
}

// ── Question actions ───────────────────────────────────────────────────────
const addQuestion = () => {
  quiz.value.questions.push(createEmptyQuestion())
  confirmDeleteIdx.value = null
  const newIdx = quiz.value.questions.length - 1
  setTimeout(() => {
    document.getElementById(`question-${newIdx}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 80)
}

const handleDeleteQuestion = (qi) => {
  if (confirmDeleteIdx.value === qi) {
    clearTimeout(confirmDeleteTimer)
    quiz.value.questions.splice(qi, 1)
    delete questionErrors[qi]
    confirmDeleteIdx.value = null
  } else {
    if (confirmDeleteTimer) clearTimeout(confirmDeleteTimer)
    confirmDeleteIdx.value = qi
    confirmDeleteTimer = setTimeout(() => { confirmDeleteIdx.value = null }, 3000)
  }
}

const setCorrectAnswer = (qi, ai) => {
  quiz.value.questions[qi].answers.forEach((a, i) => { a.isCorrect = i === ai })
  clearQuestionError(qi, 'answers')
}

// ── Validation ─────────────────────────────────────────────────────────────
const validateAll = () => {
  Object.keys(fieldErrors).forEach(k => delete fieldErrors[k])
  Object.keys(questionErrors).forEach(k => delete questionErrors[k])
  let valid = true

  if (!quiz.value.title.trim()) {
    fieldErrors.title = 'Title is required.'
    valid = false
  } else if (quiz.value.title.trim().length < 3) {
    fieldErrors.title = 'Title must be at least 3 characters.'
    valid = false
  }

  const tls = Number(quiz.value.timeLimitSeconds)
  if (isNaN(tls) || tls < 5 || tls > 120) {
    fieldErrors.timeLimitSeconds = 'Must be between 5 and 120 seconds.'
    valid = false
  }

  if (quiz.value.questions.length === 0) {
    errorMsg.value = 'Add at least one question before saving.'
    return false
  }

  quiz.value.questions.forEach((q, i) => {
    const errs = {}
    if (!q.questionText.trim()) {
      errs.questionText = 'Question text is required.'
      valid = false
    }
    const filledAnswers = q.answers.filter(a => a.answerText.trim())
    if (filledAnswers.length < 2) {
      errs.answers = 'At least 2 answers are required.'
      valid = false
    } else {
      const hasCorrect = q.answers.some(a => a.isCorrect && a.answerText.trim())
      if (!hasCorrect) {
        errs.answers = 'Mark one answer as correct.'
        valid = false
      }
    }
    if (Object.keys(errs).length) questionErrors[i] = errs
  })

  if (!valid && !errorMsg.value) {
    errorMsg.value = 'Fix the highlighted errors before saving.'
  }

  return valid
}

// ── Save ───────────────────────────────────────────────────────────────────
const saveQuiz = async () => {
  errorMsg.value   = ''
  successMsg.value = ''

  if (!validateAll()) {
    setTimeout(() => {
      document.querySelector('.cq-input--error, .cq-field-error')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 60)
    return
  }

  saving.value = true

  try {
    const payload = {
      title:            quiz.value.title.trim(),
      description:      quiz.value.description.trim(),
      courseCode:       quiz.value.courseCode.trim(),
      coverColor:       quiz.value.coverColor,
      timeLimitSeconds: quiz.value.timeLimitSeconds,
      questions: quiz.value.questions
        .filter(q => q.questionText.trim())
        .map(q => ({
          questionText:     q.questionText.trim(),
          timeLimitSeconds: Number.isFinite(q.timeLimitSeconds) ? q.timeLimitSeconds : null,
          points:           Number.isFinite(q.points) ? q.points : 100,
          answers: q.answers
            .filter(a => a.answerText.trim())
            .map(a => ({ answerText: a.answerText.trim(), isCorrect: Boolean(a.isCorrect) })),
        })),
    }

    if (isEditing.value) {
      await api(`/quizzes/${route.params.quizId}`, 'PUT', payload)
      successMsg.value = '✓ Quiz updated!'
      setTimeout(() => router.push('/quizzes'), 1400)
    } else {
      const resp = await api('/quizzes', 'POST', payload)
      successMsg.value = '🎉 Quiz published! +10 Learning Points'
      const dest = resp?.quizId ? `/quizzes/${resp.quizId}/play` : '/quizzes'
      setTimeout(() => router.push(dest), 1400)
    }
  } catch (err) {
    errorMsg.value = err?.message || 'Failed to save quiz. Please try again.'
  } finally {
    saving.value = false
  }
}

// ── Load (edit mode) ───────────────────────────────────────────────────────
const loadExistingQuiz = async () => {
  try {
    const resp = await api(`/quizzes/${route.params.quizId}`)
    const q = resp?.quiz
    if (!q) { loadError.value = 'Quiz not found.'; return }
    quiz.value.title            = q.title              || ''
    quiz.value.description      = q.description        || ''
    quiz.value.courseCode       = q.course_code        || ''
    quiz.value.coverColor       = q.cover_color        || '#b11f4b'
    quiz.value.timeLimitSeconds = q.time_limit_seconds || 20
    quiz.value.questions = (q.questions || []).map(qq => ({
      questionText:     qq.question_text      || '',
      timeLimitSeconds: qq.time_limit_seconds ?? null,
      points:           qq.points             || 100,
      answers: (qq.answers || []).map(a => ({
        answerText: a.answer_text || '',
        isCorrect:  Boolean(a.is_correct),
      })),
    }))
  } catch (err) {
    loadError.value = err?.message || 'Failed to load quiz.'
    errorMsg.value  = loadError.value
  }
}

const isDirty = computed(() =>
  quiz.value.title.trim() !== '' || quiz.value.questions.length > 0
)

const handleBeforeUnload = (e) => {
  if (isDirty.value && !saving.value && !successMsg.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

const goBack = () => router.back()

// ── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(() => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  if (isEditing.value) loadExistingQuiz()
  else addQuestion()
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  if (confirmDeleteTimer) clearTimeout(confirmDeleteTimer)
})
</script>

<style scoped>
/* ── Page shell ── */
.cq-page {
  min-height: 100vh;
  background: var(--canvas-parchment, #F5F5F5);
}

.cq-view {
  overflow-y: auto;
  padding: 20px 16px 48px;
  max-width: 720px;
  margin: 0 auto;
}

/* ── Load error ── */
.cq-load-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  background: #FFCEE3;
  border: 2px solid #FF85BB;
  border-radius: 12px;
  color: #021A54;
  font-size: 14px;
  font-weight: 700;
}
.cq-load-error svg { width: 18px; height: 18px; flex-shrink: 0; fill: #021A54; }

/* ── Hero ── */
.cq-hero { margin-bottom: 20px; }

.cq-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: #FF85BB;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
  margin-bottom: 14px;
}
.cq-back svg { width: 18px; height: 18px; fill: currentColor; }
.cq-back:hover { opacity: 0.75; }

.cq-kicker {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 800;
  color: #FF85BB;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.cq-title {
  margin: 0 0 6px;
  font-size: 26px;
  font-weight: 800;
  color: #021A54;
}

.cq-subtitle {
  margin: 0 0 16px;
  color: rgba(2,26,84,0.65);
  font-size: 14px;
  font-weight: 500;
}

.cq-progress-track {
  height: 7px;
  border-radius: 999px;
  background: #FFCEE3;
  overflow: hidden;
  margin-bottom: 7px;
  border: 1.5px solid rgba(2,26,84,0.1);
}

.cq-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #FF85BB, #ff6da9);
  transition: width 400ms cubic-bezier(0.4,0,0.2,1);
}

.cq-progress-label {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: rgba(2,26,84,0.55);
}

/* ── Glass cards ── */
.cq-card {
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 2px solid #021A54;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 14px;
  box-shadow: 0 4px 16px rgba(2,26,84,0.06);
}

/* ── Section titles ── */
.cq-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 18px;
  font-size: 16px;
  font-weight: 800;
  color: #021A54;
}

.cq-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.cq-section-header .cq-section-title { margin-bottom: 0; }

.cq-count-badge {
  font-size: 12px;
  font-weight: 800;
  padding: 2px 9px;
  border-radius: 999px;
  background: #FFCEE3;
  color: #021A54;
  border: 1.5px solid #FF85BB;
}

/* ── Form elements ── */
.cq-field { margin-bottom: 14px; }
.cq-field--half { flex: 1; min-width: 0; }

.cq-row {
  display: flex;
  gap: 12px;
}

.cq-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 700;
  color: #021A54;
  margin-bottom: 6px;
}

.cq-label-unit {
  font-size: 11px;
  font-weight: 500;
  color: rgba(2,26,84,0.5);
}

.cq-required { color: #FF85BB; font-weight: 800; }

.cq-input {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid rgba(2,26,84,0.2);
  border-radius: 10px;
  font-size: 14px;
  background: rgba(255,255,255,0.9);
  color: #021A54;
  transition: border-color 150ms ease, box-shadow 150ms ease;
  box-sizing: border-box;
  font: inherit;
}

.cq-input:focus {
  outline: none;
  border-color: #FF85BB;
  box-shadow: 0 0 0 3px rgba(255,133,187,0.18);
}

.cq-input--error {
  border-color: #e53935 !important;
  box-shadow: 0 0 0 3px rgba(229,57,53,0.1) !important;
}

.cq-input--question {
  font-size: 15px;
  font-weight: 700;
}

.cq-input--tiny {
  padding: 5px 8px;
  font-size: 13px;
  border-radius: 8px;
  width: 68px;
  text-align: center;
  flex-shrink: 0;
}

.cq-textarea { resize: vertical; }

.cq-field-error {
  margin: 4px 0 0;
  font-size: 12px;
  color: #c62828;
  font-weight: 600;
}

.cq-field-error--card {
  margin-top: 8px;
  padding: 6px 10px;
  background: rgba(229,57,53,0.06);
  border: 1px solid rgba(229,57,53,0.2);
  border-radius: 8px;
}

.cq-char-count {
  margin: 3px 0 0;
  font-size: 11px;
  color: rgba(2,26,84,0.4);
  text-align: right;
}

/* ── Color picker ── */
.cq-color-row {
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.cq-swatch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  transition: transform 120ms ease, border-color 120ms ease;
  outline: none;
}
.cq-swatch:hover { transform: scale(1.1); }
.cq-swatch--active { border-color: #021A54; transform: scale(1.15); }
.cq-swatch:focus-visible { outline: 2px solid #FF85BB; outline-offset: 2px; }

.cq-cover-preview {
  margin-top: 8px;
  border-radius: 10px;
  padding: 12px 16px;
  border: 2px solid rgba(2,26,84,0.15);
  transition: background 200ms ease;
  display: flex;
  align-items: center;
}

.cq-cover-preview__title {
  font-size: 14px;
  font-weight: 800;
  color: rgba(255,255,255,0.95);
  text-shadow: 0 1px 4px rgba(0,0,0,0.35);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Add question button ── */
.cq-add-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 7px 16px;
  background: #FF85BB;
  color: #021A54;
  border: 2px solid #021A54;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: background 150ms ease, transform 120ms ease;
  white-space: nowrap;
}
.cq-add-btn svg { width: 16px; height: 16px; fill: currentColor; }
.cq-add-btn:hover { background: #ff6da9; }
.cq-add-btn:active { transform: scale(0.96); }

/* ── Empty state ── */
.cq-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 32px 0;
  color: rgba(2,26,84,0.45);
  font-size: 14px;
  font-weight: 600;
  text-align: center;
}
.cq-empty svg { width: 44px; height: 44px; fill: currentColor; opacity: 0.4; }
.cq-empty p { margin: 0; }
.cq-empty__sub { font-size: 13px; opacity: 0.7; }

/* ── Question cards ── */
.cq-question-card {
  border: 2px solid rgba(2,26,84,0.15);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 14px;
  background: rgba(245,245,245,0.6);
  transition: border-color 150ms ease;
}
.cq-question-card:last-of-type { margin-bottom: 0; }
.cq-question-card--error {
  border-color: rgba(229,57,53,0.4);
  background: rgba(255,245,245,0.6);
}

.cq-question-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.cq-question-num {
  font-size: 12px;
  font-weight: 800;
  color: #021A54;
  background: #FFCEE3;
  border: 1.5px solid #FF85BB;
  padding: 3px 10px;
  border-radius: 12px;
  flex-shrink: 0;
}

.cq-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.cq-meta-label {
  font-size: 11px;
  font-weight: 700;
  color: rgba(2,26,84,0.5);
  white-space: nowrap;
}

.cq-question-actions {
  display: flex;
  gap: 4px;
  margin-left: auto;
  flex-shrink: 0;
}

.cq-icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease, transform 120ms ease;
  background: none;
}
.cq-icon-btn svg { width: 16px; height: 16px; fill: currentColor; }
.cq-icon-btn:active { transform: scale(0.92); }

.cq-icon-btn--danger {
  color: rgba(2,26,84,0.4);
  border-color: rgba(2,26,84,0.15);
}
.cq-icon-btn--danger:hover {
  color: #c62828;
  border-color: rgba(198,40,40,0.35);
  background: rgba(229,57,53,0.07);
}

.cq-icon-btn--confirm {
  color: #021A54;
  background: #FF85BB;
  border-color: #021A54;
}

/* ── Answers grid ── */
.cq-answers-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
}

.cq-answer {
  display: flex;
  align-items: center;
  gap: 6px;
  border-radius: 10px;
  padding: 8px 10px;
  border: 2px solid transparent;
  transition: border-color 150ms ease, background 150ms ease;
}

.cq-answer--red    { background: rgba(229,57,53,0.06);  border-color: rgba(229,57,53,0.2); }
.cq-answer--blue   { background: rgba(33,150,243,0.06); border-color: rgba(33,150,243,0.2); }
.cq-answer--yellow { background: rgba(251,192,45,0.08); border-color: rgba(251,192,45,0.25); }
.cq-answer--green  { background: rgba(76,175,80,0.06);  border-color: rgba(76,175,80,0.2); }

.cq-answer--correct { border-width: 2px; filter: brightness(1.03); }
.cq-answer--red.cq-answer--correct    { border-color: rgba(229,57,53,0.6);  }
.cq-answer--blue.cq-answer--correct   { border-color: rgba(33,150,243,0.6); }
.cq-answer--yellow.cq-answer--correct { border-color: rgba(251,192,45,0.7); }
.cq-answer--green.cq-answer--correct  { border-color: rgba(76,175,80,0.6);  }

.cq-correct-toggle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid rgba(2,26,84,0.2);
  background: rgba(255,255,255,0.7);
  color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
  padding: 0;
}
.cq-correct-toggle svg { width: 14px; height: 14px; fill: currentColor; }
.cq-correct-toggle.active {
  background: #021A54;
  border-color: #021A54;
  color: #FF85BB;
}

.cq-answer-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #021A54;
  font-weight: 600;
  font: inherit;
}
.cq-answer-input:focus { outline: none; }
.cq-answer-input::placeholder { color: rgba(2,26,84,0.35); font-weight: 400; }

/* ── Submit section ── */
.cq-submit-section { margin-bottom: 0; }

.cq-feedback {
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 700;
  margin-bottom: 14px;
}

.cq-feedback--error {
  background: rgba(229,57,53,0.08);
  border: 2px solid rgba(229,57,53,0.3);
  color: #c62828;
}

.cq-feedback--success {
  background: #FFCEE3;
  border: 2px solid #FF85BB;
  color: #021A54;
}

.cq-submit-row {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.cq-btn-secondary {
  padding: 10px 22px;
  border-radius: 22px;
  border: 2px solid rgba(2,26,84,0.25);
  background: rgba(255,255,255,0.7);
  color: #021A54;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color 150ms ease, transform 120ms ease;
  font: inherit;
}
.cq-btn-secondary:hover { border-color: #021A54; }
.cq-btn-secondary:active { transform: scale(0.96); }

.cq-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  border-radius: 22px;
  border: 2px solid #021A54;
  background: #FF85BB;
  color: #021A54;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: background 150ms ease, transform 120ms ease;
  font: inherit;
}
.cq-btn-primary:hover:not(:disabled) { background: #ff6da9; }
.cq-btn-primary:active:not(:disabled) { transform: scale(0.96); }
.cq-btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

.cq-spin {
  width: 16px;
  height: 16px;
  animation: cq-spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes cq-spin {
  to { transform: rotate(360deg); }
}

/* ── Transitions ── */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .cq-progress-fill,
  .cq-swatch,
  .cq-btn-primary,
  .cq-btn-secondary,
  .cq-add-btn,
  .cq-icon-btn,
  .cq-input,
  .cq-correct-toggle {
    transition: none !important;
  }
  .cq-spin { animation: none !important; }
  .fade-slide-enter-active,
  .fade-slide-leave-active { transition: none !important; }
}

/* ── Mobile ── */
@media (max-width: 480px) {
  .cq-row { flex-direction: column; gap: 0; }
  .cq-answers-grid { grid-template-columns: 1fr; }
  .cq-title { font-size: 22px; }
  .cq-submit-row { flex-direction: column-reverse; }
  .cq-btn-primary,
  .cq-btn-secondary { width: 100%; justify-content: center; }
}
</style>