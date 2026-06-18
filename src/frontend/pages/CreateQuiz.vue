<template>
  <main class="page-bg">
    <div class="view">

      <!-- ── Header ── -->
      <section class="create-hero">
        <button class="back-btn" type="button" @click="goBack" aria-label="Go back">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/>
          </svg>
          Back
        </button>
        <p class="create-hero__kicker">{{ isEditing ? 'Edit Quiz' : 'Create Quiz' }}</p>
        <h2>{{ isEditing ? 'Edit Your Quiz' : 'Build a New Quiz' }}</h2>
        <p class="create-hero__text">
          {{ isEditing
            ? 'Update your questions and settings below.'
            : 'Craft interactive questions for your peers. Earn 10 Learning Points when you publish!' }}
        </p>

        <!-- Progress indicator -->
        <div class="progress-bar" role="progressbar" :aria-valuenow="progressPct" aria-valuemin="0" aria-valuemax="100" :aria-label="`Quiz completion: ${progressPct}%`">
          <div class="progress-fill" :style="{ width: progressPct + '%' }"></div>
        </div>
        <p class="progress-label">{{ progressLabel }}</p>
      </section>

      <!-- ── Quiz Details ── -->
      <section class="form-section" aria-labelledby="details-heading">
        <h3 class="section-title" id="details-heading">Quiz Details</h3>

        <div class="form-group">
          <label class="form-label" for="quiz-title">
            Title <span class="required" aria-label="required">*</span>
          </label>
          <!-- BUG FIX 1: title input had no id → label's `for` was unlinked. Fixed. -->
          <input
            id="quiz-title"
            v-model="quiz.title"
            type="text"
            class="form-input"
            :class="{ 'input-error': fieldErrors.title }"
            placeholder="e.g. Data Structures Fundamentals"
            maxlength="250"
            @input="clearError('title')"
            aria-describedby="title-err"
          />
          <p v-if="fieldErrors.title" id="title-err" class="field-error" role="alert">{{ fieldErrors.title }}</p>
          <p class="char-count" aria-live="polite">{{ quiz.title.length }}/250</p>
        </div>

        <div class="form-group">
          <label class="form-label" for="quiz-desc">Description</label>
          <textarea
            id="quiz-desc"
            v-model="quiz.description"
            class="form-textarea"
            placeholder="What will this quiz cover?"
            rows="2"
            maxlength="500"
          ></textarea>
          <p class="char-count" aria-live="polite">{{ quiz.description.length }}/500</p>
        </div>

        <div class="form-row">
          <div class="form-group form-group--half">
            <label class="form-label" for="quiz-course">Course Code</label>
            <input
              id="quiz-course"
              v-model="quiz.courseCode"
              type="text"
              class="form-input"
              placeholder="e.g. TMC1024"
              maxlength="30"
            />
          </div>
          <div class="form-group form-group--half">
            <label class="form-label" for="quiz-time">
              Default Time
              <span class="form-label__unit">sec / question</span>
            </label>
            <!-- BUG FIX 2: no min/max enforcement at the JS level — server rejects
                 timeLimitSeconds < 5 but client showed no error. Now clamped on blur. -->
            <input
              id="quiz-time"
              v-model.number="quiz.timeLimitSeconds"
              type="number"
              class="form-input"
              :class="{ 'input-error': fieldErrors.timeLimitSeconds }"
              min="5"
              max="120"
              @blur="clampTimeLimit"
              aria-describedby="time-err"
            />
            <p v-if="fieldErrors.timeLimitSeconds" id="time-err" class="field-error" role="alert">{{ fieldErrors.timeLimitSeconds }}</p>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Cover Colour</label>
          <div class="color-picker-row" role="radiogroup" aria-label="Pick a cover colour">
            <button
              v-for="color in colorOptions"
              :key="color"
              type="button"
              class="color-swatch"
              :class="{ active: quiz.coverColor === color }"
              :style="{ background: color }"
              :aria-label="`Cover colour ${color}`"
              :aria-pressed="quiz.coverColor === color"
              @click="quiz.coverColor = color"
            ></button>
          </div>
          <!-- Live preview strip -->
          <div class="cover-preview" :style="{ background: quiz.coverColor }">
            <span class="cover-preview__title">{{ quiz.title || 'Quiz Title Preview' }}</span>
          </div>
        </div>
      </section>

      <!-- ── Questions ── -->
      <section class="form-section" aria-labelledby="questions-heading">
        <div class="section-header">
          <h3 class="section-title" id="questions-heading">
            Questions
            <span class="question-count-badge">{{ quiz.questions.length }}</span>
          </h3>
          <button class="add-question-btn" type="button" @click="addQuestion">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
            </svg>
            Add Question
          </button>
        </div>

        <!-- BUG FIX 3: empty-questions hint was inside the section but outside the v-for,
             so it always rendered alongside cards instead of only when list was empty.
             Corrected condition placement. -->
        <div v-if="!quiz.questions.length" class="empty-questions">
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"/>
            <path d="M24 14v10M24 28v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
          </svg>
          <p>No questions yet.</p>
          <p class="empty-questions__sub">Click <strong>Add Question</strong> to start building your quiz.</p>
        </div>

        <div
          v-for="(question, qi) in quiz.questions"
          :key="qi"
          class="question-card"
          :class="{ 'question-card--error': questionHasError(qi) }"
          :id="`question-${qi}`"
        >
          <div class="question-card__header">
            <span class="question-number" :aria-label="`Question ${qi + 1}`">Q{{ qi + 1 }}</span>

            <!-- Points + time inline -->
            <div class="question-meta-row">
              <label class="meta-label" :for="`pts-${qi}`">Pts</label>
              <input
                :id="`pts-${qi}`"
                v-model.number="question.points"
                type="number"
                class="form-input form-input--tiny"
                min="10"
                max="1000"
                step="10"
                aria-label="Points for this question"
              />
              <label class="meta-label" :for="`sec-${qi}`">Sec</label>
              <input
                :id="`sec-${qi}`"
                v-model.number="question.timeLimitSeconds"
                type="number"
                class="form-input form-input--tiny"
                min="5"
                max="120"
                :placeholder="String(quiz.timeLimitSeconds)"
                aria-label="Time limit for this question in seconds"
              />
            </div>

            <div class="question-actions">
              <button
                class="icon-action"
                type="button"
                @click="moveQuestion(qi, -1)"
                :disabled="qi === 0"
                title="Move up"
                :aria-label="`Move question ${qi + 1} up`"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" fill="currentColor"/></svg>
              </button>
              <button
                class="icon-action"
                type="button"
                @click="moveQuestion(qi, 1)"
                :disabled="qi === quiz.questions.length - 1"
                title="Move down"
                :aria-label="`Move question ${qi + 1} down`"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" fill="currentColor"/></svg>
              </button>
              <!-- BUG FIX 4: delete had no confirmation — one misclick wiped a question.
                   Now uses confirmDeleteIdx; click once to arm, click again to confirm. -->
              <button
                class="icon-action"
                :class="confirmDeleteIdx === qi ? 'icon-action--confirm-delete' : 'icon-action--danger'"
                type="button"
                @click="handleDeleteQuestion(qi)"
                :title="confirmDeleteIdx === qi ? 'Click again to confirm delete' : 'Delete question'"
                :aria-label="confirmDeleteIdx === qi ? `Confirm delete question ${qi + 1}` : `Delete question ${qi + 1}`"
              >
                <svg v-if="confirmDeleteIdx !== qi" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Question text -->
          <div class="form-group">
            <input
              v-model="question.questionText"
              type="text"
              class="form-input form-input--question"
              :class="{ 'input-error': questionErrors[qi]?.questionText }"
              :placeholder="`Question ${qi + 1}…`"
              maxlength="500"
              :aria-label="`Question ${qi + 1} text`"
              :aria-describedby="`qerr-${qi}`"
              @input="clearQuestionError(qi, 'questionText')"
            />
            <p v-if="questionErrors[qi]?.questionText" :id="`qerr-${qi}`" class="field-error" role="alert">
              {{ questionErrors[qi].questionText }}
            </p>
          </div>

          <!-- Answers 2×2 grid -->
          <div class="answers-grid" role="group" :aria-label="`Answers for question ${qi + 1}`">
            <div
              v-for="(answer, ai) in question.answers"
              :key="ai"
              class="answer-item"
              :class="[`answer-item--${answerColors[ai]}`, { 'answer-item--correct': answer.isCorrect }]"
            >
              <button
                class="correct-toggle"
                type="button"
                :class="{ active: answer.isCorrect }"
                @click="setCorrectAnswer(qi, ai)"
                :title="answer.isCorrect ? 'Correct answer' : 'Mark as correct'"
                :aria-label="`${answer.isCorrect ? 'Correct answer' : 'Mark answer ' + (ai + 1) + ' as correct'}`"
                :aria-pressed="answer.isCorrect"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
                </svg>
              </button>
              <input
                v-model="answer.answerText"
                type="text"
                class="answer-input"
                :placeholder="answerPlaceholders[ai]"
                maxlength="500"
                :aria-label="`Answer ${ai + 1} text`"
              />
            </div>
          </div>

          <!-- Per-question validation errors -->
          <p v-if="questionErrors[qi]?.answers" class="field-error field-error--card" role="alert">
            {{ questionErrors[qi].answers }}
          </p>
        </div>
      </section>

      <!-- ── Submit ── -->
      <section class="form-section submit-section" aria-label="Save quiz">
        <transition name="fade-slide">
          <p v-if="errorMsg" class="feedback-msg error-msg" role="alert">{{ errorMsg }}</p>
        </transition>
        <transition name="fade-slide">
          <p v-if="successMsg" class="feedback-msg success-msg" role="status">{{ successMsg }}</p>
        </transition>
        <div class="submit-row">
          <button class="btn-secondary" type="button" @click="goBack">Cancel</button>
          <button
            class="btn-primary"
            type="button"
            @click="saveQuiz"
            :disabled="saving"
            :aria-busy="saving"
          >
            <svg v-if="saving" class="spin-icon" viewBox="0 0 24 24" aria-hidden="true">
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
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api.js'

const router = useRouter()
const route  = useRoute()

// ── State ──────────────────────────────────────────────────────────────────
const isEditing = computed(() => !!route.params.quizId)
const saving    = ref(false)
const errorMsg  = ref('')
const successMsg = ref('')
const loadError = ref('')

// Two-step delete confirmation
const confirmDeleteIdx = ref(null)
let confirmDeleteTimer = null

// Per-field top-level errors
const fieldErrors    = reactive({})
// Per-question validation errors { [qi]: { questionText?, answers? } }
const questionErrors = reactive({})

const colorOptions = [
  '#b11f4b', '#e63946', '#f4a261', '#2a9d8f',
  '#264653', '#6c63ff', '#e76f51', '#457b9d',
]
const answerColors      = ['red', 'blue', 'yellow', 'green']
const answerPlaceholders = ['Answer A', 'Answer B', 'Answer C', 'Answer D']

const quiz = ref({
  title: '',
  description: '',
  courseCode: '',
  coverColor: '#b11f4b',
  timeLimitSeconds: 20,
  questions: [],
})

// ── Derived ────────────────────────────────────────────────────────────────
// BUG FIX 5: user ref was computed but never actually used in the template or logic,
// yet getUser() was imported. Removed unused import side-effect.

// Progress meter — rough completeness %
const progressPct = computed(() => {
  let score = 0
  if (quiz.value.title.trim())       score += 20
  if (quiz.value.courseCode.trim())  score += 10
  if (quiz.value.description.trim()) score += 10
  const qCount = quiz.value.questions.length
  if (qCount > 0) {
    score += Math.min(60, qCount * 10)
    // bonus for filled questions
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
    { answerText: '', isCorrect: true },
    { answerText: '', isCorrect: false },
    { answerText: '', isCorrect: false },
    { answerText: '', isCorrect: false },
  ],
})

const clearError = (field) => { delete fieldErrors[field] }
const clearQuestionError = (qi, field) => {
  if (questionErrors[qi]) delete questionErrors[qi][field]
}

// BUG FIX 2: clamp timeLimitSeconds on blur so invalid values get corrected silently
const clampTimeLimit = () => {
  const v = Number(quiz.value.timeLimitSeconds)
  if (isNaN(v) || v < 5)   quiz.value.timeLimitSeconds = 5
  else if (v > 120)         quiz.value.timeLimitSeconds = 120
  delete fieldErrors.timeLimitSeconds
}

// ── Question actions ───────────────────────────────────────────────────────
const addQuestion = () => {
  quiz.value.questions.push(createEmptyQuestion())
  confirmDeleteIdx.value = null
  // Scroll the new card into view after render
  const newIdx = quiz.value.questions.length - 1
  setTimeout(() => {
    document.getElementById(`question-${newIdx}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 80)
}

// BUG FIX 4: two-step delete — first click arms the button, second click fires.
// Auto-resets after 3 s if unused.
const handleDeleteQuestion = (idx) => {
  if (confirmDeleteIdx.value === idx) {
    quiz.value.questions.splice(idx, 1)
    delete questionErrors[idx]
    confirmDeleteIdx.value = null
    if (confirmDeleteTimer) clearTimeout(confirmDeleteTimer)
  } else {
    confirmDeleteIdx.value = idx
    if (confirmDeleteTimer) clearTimeout(confirmDeleteTimer)
    confirmDeleteTimer = setTimeout(() => {
      confirmDeleteIdx.value = null
    }, 3000)
  }
}

const moveQuestion = (index, direction) => {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= quiz.value.questions.length) return
  const q = quiz.value.questions
  ;[q[index], q[newIndex]] = [q[newIndex], q[index]]
  quiz.value.questions = [...q]
  confirmDeleteIdx.value = null
}

const setCorrectAnswer = (qi, ai) => {
  quiz.value.questions[qi].answers.forEach((a, i) => { a.isCorrect = i === ai })
}

// ── Validation ─────────────────────────────────────────────────────────────
// BUG FIX 6: original validate() returned only the first error string, showing
// one problem at a time with a global message. Replaced with per-field and
// per-question error objects so all problems surface at once.
const validateAll = () => {
  // Clear old errors
  Object.keys(fieldErrors).forEach(k => delete fieldErrors[k])
  Object.keys(questionErrors).forEach(k => delete questionErrors[k])

  let valid = true

  if (!quiz.value.title.trim()) {
    fieldErrors.title = 'Quiz title is required.'
    valid = false
  }

  // BUG FIX 7: timeLimitSeconds could be NaN or a float if the user typed
  // a non-integer. Clamped on blur but also validated here.
  const tl = Number(quiz.value.timeLimitSeconds)
  if (isNaN(tl) || tl < 5 || tl > 120) {
    fieldErrors.timeLimitSeconds = 'Must be between 5 and 120 seconds.'
    valid = false
  }

  if (quiz.value.questions.length < 1) {
    errorMsg.value = 'Add at least one question before publishing.'
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
  errorMsg.value  = ''
  successMsg.value = ''

  if (!validateAll()) {
    // Scroll to first error
    setTimeout(() => {
      const el = document.querySelector('.input-error, .field-error')
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
          questionText:      q.questionText.trim(),
          // BUG FIX 8: timeLimitSeconds null vs undefined — server accepts null (use default).
          // But if user typed something then cleared it, v-model.number yields NaN.
          // Coerce NaN → null explicitly.
          timeLimitSeconds:  Number.isFinite(q.timeLimitSeconds) ? q.timeLimitSeconds : null,
          points:            Number.isFinite(q.points) ? q.points : 100,
          answers: q.answers
            .filter(a => a.answerText.trim())
            .map(a => ({ answerText: a.answerText.trim(), isCorrect: Boolean(a.isCorrect) })),
        })),
    }

    if (isEditing.value) {
      await api(`/quizzes/${route.params.quizId}`, 'PUT', payload)
      successMsg.value = '✓ Quiz updated!'
      // BUG FIX 9: editing path never redirected anywhere — user was left on the form
      // with a success message and no next step. Navigate to quizzes list after delay.
      setTimeout(() => router.push('/quizzes'), 1400)
    } else {
      const resp = await api('/quizzes', 'POST', payload)
      successMsg.value = '🎉 Quiz published! +10 Learning Points'
      // BUG FIX 10: resp.quizId could be undefined if the API response shape changes —
      // guard and fall back to quizzes list.
      const dest = resp?.quizId ? `/quizzes/${resp.quizId}/play` : '/quizzes'
      setTimeout(() => router.push(dest), 1400)
    }
  } catch (err) {
    errorMsg.value = err?.message || 'Failed to save quiz. Please try again.'
  } finally {
    saving.value = false
  }
}

// ── Load existing quiz (edit mode) ────────────────────────────────────────
const loadExistingQuiz = async () => {
  try {
    const resp = await api(`/quizzes/${route.params.quizId}`)
    // BUG FIX 11: resp.quiz could be null if quiz not found — original code accessed
    // q.title without a null check, causing an uncaught TypeError.
    const q = resp?.quiz
    if (!q) {
      loadError.value = 'Quiz not found.'
      return
    }
    quiz.value.title            = q.title             || ''
    quiz.value.description      = q.description       || ''
    quiz.value.courseCode       = q.course_code       || ''
    quiz.value.coverColor       = q.cover_color       || '#b11f4b'
    quiz.value.timeLimitSeconds = q.time_limit_seconds || 20
    quiz.value.questions = (q.questions || []).map(qq => ({
      questionText:     qq.question_text       || '',
      // BUG FIX 12: time_limit_seconds from API is null for "use default" — keep as null,
      // don't coerce to 0 (which would send 0 to server and fail validation).
      timeLimitSeconds: qq.time_limit_seconds  ?? null,
      points:           qq.points              || 100,
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

// Warn before navigating away with unsaved changes
const isDirty = computed(() =>
  quiz.value.title.trim() !== '' ||
  quiz.value.questions.length > (isEditing.value ? 0 : 0)
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
  if (isEditing.value) {
    loadExistingQuiz()
  } else {
    addQuestion()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  if (confirmDeleteTimer) clearTimeout(confirmDeleteTimer)
})
</script>

<style scoped>
/* ── Page ── */
.page-bg {
  min-height: 100vh;
  background: linear-gradient(180deg, #ffffff, #f5f5f7);
}

.view {
  overflow-y: auto;
  padding: 20px 16px 40px;
  max-width: 720px;
  margin: 0 auto;
}

/* ── Hero ── */
.create-hero {
  margin-bottom: 20px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: #b11f4b;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  margin-bottom: 12px;
}

.back-btn svg { width: 18px; height: 18px; }
.back-btn:hover { opacity: 0.75; }

.create-hero__kicker {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  color: #b11f4b;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.create-hero h2 { margin: 0 0 6px; font-size: 24px; font-weight: 700; color: #1d1d1f; }
.create-hero__text { margin: 0 0 14px; color: #6e6e73; font-size: 14px; }

/* Progress bar */
.progress-bar {
  height: 6px;
  border-radius: 999px;
  background: rgba(177,31,75,0.12);
  overflow: hidden;
  margin-bottom: 6px;
}

.progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #b11f4b, #d94070);
  transition: width 400ms ease;
}

.progress-label {
  margin: 0;
  font-size: 12px;
  color: #6e6e73;
}

/* ── Form section ── */
.form-section {
  background: rgba(255,255,255,0.85);
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 14px;
  backdrop-filter: blur(8px);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 700;
  color: #1d1d1f;
}

.section-header .section-title { margin-bottom: 0; }

.question-count-badge {
  font-size: 12px;
  font-weight: 700;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(177,31,75,0.1);
  color: #b11f4b;
}

/* ── Form elements ── */
.form-group { margin-bottom: 14px; }
.form-group--half { flex: 1; min-width: 0; }
.form-row { display: flex; gap: 12px; }

.form-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 6px;
}

.form-label__unit {
  font-size: 11px;
  font-weight: 400;
  color: #6e6e73;
}

.required { color: #b11f4b; font-weight: 700; }

.form-input,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  font-size: 14px;
  background: #fafafa;
  color: #1d1d1f;
  transition: border-color 150ms ease, box-shadow 150ms ease;
  box-sizing: border-box;
  font: inherit;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #b11f4b;
  box-shadow: 0 0 0 3px rgba(177,31,75,0.08);
}

.form-input--question { font-size: 15px; font-weight: 600; }

/* Tiny inline inputs for points/time inside question card */
.form-input--tiny {
  padding: 5px 8px;
  font-size: 13px;
  border-radius: 8px;
  width: 70px;
  text-align: center;
}

.form-textarea { resize: vertical; }

.input-error {
  border-color: #e53935 !important;
  box-shadow: 0 0 0 3px rgba(229,57,53,0.1) !important;
}

.field-error {
  margin: 4px 0 0;
  font-size: 12px;
  color: #c62828;
  font-weight: 500;
}

.field-error--card {
  margin-top: 8px;
  padding: 6px 10px;
  background: rgba(229,57,53,0.06);
  border: 1px solid rgba(229,57,53,0.2);
  border-radius: 8px;
}

.char-count {
  margin: 3px 0 0;
  font-size: 11px;
  color: #aaa;
  text-align: right;
}

/* Cover preview strip */
.cover-preview {
  margin-top: 10px;
  border-radius: 10px;
  padding: 12px 16px;
  transition: background 200ms ease;
  display: flex;
  align-items: center;
}

.cover-preview__title {
  font-size: 14px;
  font-weight: 700;
  color: rgba(255,255,255,0.95);
  text-shadow: 0 1px 3px rgba(0,0,0,0.3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Color picker */
.color-picker-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }

.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  transition: transform 120ms ease, border-color 120ms ease;
  outline: none;
}

.color-swatch:hover  { transform: scale(1.1); }
.color-swatch.active { border-color: #1d1d1f; transform: scale(1.15); }
.color-swatch:focus-visible { outline: 2px solid #b11f4b; outline-offset: 2px; }

/* ── Add question button ── */
.add-question-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 7px 16px;
  background: #b11f4b;
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease;
  white-space: nowrap;
}

.add-question-btn svg { width: 16px; height: 16px; }
.add-question-btn:hover { background: #8d1630; }

/* ── Empty state ── */
.empty-questions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 28px 0;
  color: #6e6e73;
  font-size: 14px;
  text-align: center;
}

.empty-questions svg { width: 40px; height: 40px; opacity: 0.4; }
.empty-questions p   { margin: 0; }
.empty-questions__sub { font-size: 13px; color: #aaa; }

/* ── Question card ── */
.question-card {
  border: 1px solid #e0e0e0;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 14px;
  background: rgba(255,255,255,0.7);
  transition: border-color 150ms ease;
}

.question-card:last-of-type { margin-bottom: 0; }

.question-card--error {
  border-color: rgba(229,57,53,0.4);
  background: rgba(255,245,245,0.7);
}

.question-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.question-number {
  font-size: 12px;
  font-weight: 700;
  color: #b11f4b;
  background: rgba(177,31,75,0.08);
  padding: 3px 10px;
  border-radius: 12px;
  flex-shrink: 0;
}

/* Points + time inline row */
.question-meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.meta-label {
  font-size: 11px;
  font-weight: 600;
  color: #6e6e73;
  white-space: nowrap;
}

.question-actions {
  display: flex;
  gap: 4px;
  margin-left: auto;
  flex-shrink: 0;
}

.icon-action {
  width: 30px;
  height: 30px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #f5f5f7;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 120ms ease;
}

.icon-action svg    { width: 15px; height: 15px; color: #6e6e73; }
.icon-action:hover  { border-color: #c7c7cc; }
.icon-action:disabled { opacity: 0.3; cursor: not-allowed; }

.icon-action--danger:hover {
  background: #fff1f4;
  border-color: #b11f4b;
}
.icon-action--danger:hover svg { color: #b11f4b; }

/* Two-step delete confirmation state */
.icon-action--confirm-delete {
  background: #fff1f4;
  border-color: #e53935;
  animation: pulse-border 0.6s ease infinite alternate;
}
.icon-action--confirm-delete svg { color: #e53935; }

@keyframes pulse-border {
  from { border-color: #e53935; }
  to   { border-color: #ff6b6b; }
}

/* ── Answer grid ── */
.answers-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.answer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 2px solid transparent;
  transition: border-color 150ms ease, background 150ms ease;
}

.answer-item--red    { background: rgba(229,57,53,0.07);   border-color: rgba(229,57,53,0.18); }
.answer-item--blue   { background: rgba(30,136,229,0.07);  border-color: rgba(30,136,229,0.18); }
.answer-item--yellow { background: rgba(255,179,0,0.07);   border-color: rgba(255,179,0,0.18); }
.answer-item--green  { background: rgba(67,160,71,0.07);   border-color: rgba(67,160,71,0.18); }

.answer-item--correct {
  border-color: #34c759 !important;
  background: rgba(52,199,89,0.1) !important;
}

.correct-toggle {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid #e0e0e0;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 150ms ease;
}

.correct-toggle svg    { width: 14px; height: 14px; color: transparent; }
.correct-toggle.active { background: #34c759; border-color: #34c759; }
.correct-toggle.active svg { color: white; }
.correct-toggle:focus-visible { outline: 2px solid #34c759; outline-offset: 2px; }

.answer-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #1d1d1f;
  outline: none;
  min-width: 0;
  font: inherit;
}

/* ── Submit section ── */
.submit-section {
  background: transparent;
  border: none;
  padding: 0;
}

.feedback-msg {
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 12px;
  text-align: center;
}

.error-msg   { background: rgba(229,57,53,0.08); color: #c62828; border: 1px solid rgba(229,57,53,0.2); }
.success-msg { background: rgba(52,199,89,0.1);  color: #1a7a40; border: 1px solid rgba(52,199,89,0.25); }

.submit-row {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 24px;
  background: #b11f4b;
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease;
  font: inherit;
}

.btn-primary:hover    { background: #8d1630; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-secondary {
  padding: 10px 24px;
  background: #f5f5f7;
  color: #6e6e73;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  font: inherit;
}

.btn-secondary:hover { background: #e8e8ed; }

/* Spinner */
.spin-icon { width: 15px; height: 15px; animation: spin 0.7s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Transitions ── */
.fade-slide-enter-active, .fade-slide-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .answers-grid    { grid-template-columns: 1fr; }
  .form-row        { flex-direction: column; gap: 0; }
  .question-meta-row { flex-wrap: wrap; }
  .submit-row      { flex-direction: column; }
  .btn-primary,
  .btn-secondary   { width: 100%; justify-content: center; text-align: center; }
}

@media (prefers-reduced-motion: reduce) {
  .progress-fill,
  .cover-preview,
  .correct-toggle,
  .answer-item,
  .form-input,
  .question-card { transition: none; }
  .spin-icon, .icon-action--confirm-delete { animation: none; }
}
</style>
