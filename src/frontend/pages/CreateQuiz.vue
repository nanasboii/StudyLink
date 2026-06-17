<template>
  <main class="page-bg">
    <div class="view">
      <!-- Header -->
      <section class="create-hero">
        <button class="back-btn" @click="goBack">
          <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" fill="currentColor"/></svg>
          Back
        </button>
        <p class="create-hero__kicker">{{ isEditing ? 'EDIT QUIZ' : 'CREATE QUIZ' }}</p>
        <h2>{{ isEditing ? 'Edit Your Quiz' : 'Build a New Quiz' }}</h2>
        <p class="create-hero__text">Create interactive questions for your peers. Earn 10 Learning Points when you publish!</p>
      </section>

      <!-- Quiz Info -->
      <section class="form-section">
        <h3 class="section-title">Quiz Details</h3>
        <div class="form-group">
          <label class="form-label">Title *</label>
          <input v-model="quiz.title" type="text" class="form-input" placeholder="e.g. Data Structures Fundamentals" maxlength="250" />
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea v-model="quiz.description" class="form-textarea" placeholder="What will this quiz cover?" rows="2" maxlength="500"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group form-group--half">
            <label class="form-label">Course Code</label>
            <input v-model="quiz.courseCode" type="text" class="form-input" placeholder="e.g. TMC1024" maxlength="30" />
          </div>
          <div class="form-group form-group--half">
            <label class="form-label">Default Time (sec/question)</label>
            <input v-model.number="quiz.timeLimitSeconds" type="number" class="form-input" min="5" max="120" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Cover Color</label>
          <div class="color-picker-row">
            <button
              v-for="color in colorOptions"
              :key="color"
              class="color-swatch"
              :class="{ active: quiz.coverColor === color }"
              :style="{ background: color }"
              @click="quiz.coverColor = color"
            ></button>
          </div>
        </div>
      </section>

      <!-- Questions -->
      <section class="form-section">
        <div class="section-header">
          <h3 class="section-title">Questions ({{ quiz.questions.length }})</h3>
          <button class="add-question-btn" @click="addQuestion">
            <svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/></svg>
            Add Question
          </button>
        </div>

        <div
          v-for="(question, qi) in quiz.questions"
          :key="qi"
          class="question-card"
        >
          <div class="question-card__header">
            <span class="question-number">Q{{ qi + 1 }}</span>
            <div class="question-actions">
              <button class="icon-action" @click="moveQuestion(qi, -1)" :disabled="qi === 0" title="Move up">
                <svg viewBox="0 0 24 24"><path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" fill="currentColor"/></svg>
              </button>
              <button class="icon-action" @click="moveQuestion(qi, 1)" :disabled="qi === quiz.questions.length - 1" title="Move down">
                <svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" fill="currentColor"/></svg>
              </button>
              <button class="icon-action icon-action--danger" @click="removeQuestion(qi)" title="Delete">
                <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/></svg>
              </button>
            </div>
          </div>

          <div class="form-group">
            <input
              v-model="question.questionText"
              type="text"
              class="form-input form-input--question"
              :placeholder="`Question ${qi + 1}…`"
              maxlength="500"
            />
          </div>

          <div class="form-row">
            <div class="form-group form-group--half">
              <label class="form-label form-label--small">Points</label>
              <input v-model.number="question.points" type="number" class="form-input form-input--small" min="10" max="1000" />
            </div>
            <div class="form-group form-group--half">
              <label class="form-label form-label--small">Time (sec)</label>
              <input v-model.number="question.timeLimitSeconds" type="number" class="form-input form-input--small" min="5" max="120" :placeholder="String(quiz.timeLimitSeconds)" />
            </div>
          </div>

          <!-- Answers -->
          <div class="answers-grid">
            <div
              v-for="(answer, ai) in question.answers"
              :key="ai"
              class="answer-item"
              :class="[`answer-item--${answerColors[ai]}`, { 'answer-item--correct': answer.isCorrect }]"
            >
              <button
                class="correct-toggle"
                :class="{ active: answer.isCorrect }"
                @click="setCorrectAnswer(qi, ai)"
                :title="answer.isCorrect ? 'Correct answer' : 'Mark as correct'"
              >
                <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/></svg>
              </button>
              <input
                v-model="answer.answerText"
                type="text"
                class="answer-input"
                :placeholder="answerPlaceholders[ai]"
                maxlength="500"
              />
            </div>
          </div>
        </div>

        <!-- Empty questions hint -->
        <div v-if="!quiz.questions.length" class="empty-questions">
          <p>No questions yet. Click "Add Question" to start building your quiz.</p>
        </div>
      </section>

      <!-- Submit -->
      <section class="form-section submit-section">
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        <p v-if="successMsg" class="success-msg">{{ successMsg }}</p>
        <div class="submit-row">
          <button class="btn-secondary" @click="goBack">Cancel</button>
          <button class="btn-primary" @click="saveQuiz" :disabled="saving">
            {{ saving ? 'Saving…' : (isEditing ? 'Update Quiz' : 'Publish Quiz') }}
          </button>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api, getUser } from '@/api.js'

const router = useRouter()
const route = useRoute()
const user = computed(() => getUser())

const isEditing = computed(() => !!route.params.quizId)
const saving = ref(false)
const errorMsg = ref('')
const successMsg = ref('')

const colorOptions = ['#b11f4b', '#e63946', '#f4a261', '#2a9d8f', '#264653', '#6c63ff', '#e76f51', '#457b9d']
const answerColors = ['red', 'blue', 'yellow', 'green']
const answerPlaceholders = ['Answer A', 'Answer B', 'Answer C', 'Answer D']

const quiz = ref({
  title: '',
  description: '',
  courseCode: '',
  coverColor: '#b11f4b',
  timeLimitSeconds: 20,
  questions: []
})

const createEmptyQuestion = () => ({
  questionText: '',
  timeLimitSeconds: null,
  points: 100,
  answers: [
    { answerText: '', isCorrect: true },
    { answerText: '', isCorrect: false },
    { answerText: '', isCorrect: false },
    { answerText: '', isCorrect: false }
  ]
})

const addQuestion = () => {
  quiz.value.questions.push(createEmptyQuestion())
}

const removeQuestion = (index) => {
  quiz.value.questions.splice(index, 1)
}

const moveQuestion = (index, direction) => {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= quiz.value.questions.length) return
  const q = quiz.value.questions
  ;[q[index], q[newIndex]] = [q[newIndex], q[index]]
  quiz.value.questions = [...q]
}

const setCorrectAnswer = (qi, ai) => {
  quiz.value.questions[qi].answers.forEach((a, i) => {
    a.isCorrect = i === ai
  })
}

const validate = () => {
  if (!quiz.value.title.trim()) return 'Quiz title is required.'
  if (quiz.value.questions.length < 1) return 'Add at least one question.'
  for (let i = 0; i < quiz.value.questions.length; i++) {
    const q = quiz.value.questions[i]
    if (!q.questionText.trim()) return `Question ${i + 1} text is empty.`
    const filledAnswers = q.answers.filter(a => a.answerText.trim())
    if (filledAnswers.length < 2) return `Question ${i + 1} needs at least 2 answers.`
    const hasCorrect = q.answers.some(a => a.isCorrect && a.answerText.trim())
    if (!hasCorrect) return `Question ${i + 1} must have a correct answer.`
  }
  return null
}

const saveQuiz = async () => {
  errorMsg.value = ''
  successMsg.value = ''
  const err = validate()
  if (err) { errorMsg.value = err; return }

  saving.value = true
  try {
    const payload = {
      title: quiz.value.title.trim(),
      description: quiz.value.description.trim(),
      courseCode: quiz.value.courseCode.trim(),
      coverColor: quiz.value.coverColor,
      timeLimitSeconds: quiz.value.timeLimitSeconds,
      questions: quiz.value.questions
        .filter(q => q.questionText.trim())
        .map(q => ({
          questionText: q.questionText,
          timeLimitSeconds: q.timeLimitSeconds || null,
          points: q.points || 100,
          answers: q.answers.filter(a => a.answerText.trim())
        }))
    }

    if (isEditing.value) {
      await api(`/quizzes/${route.params.quizId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      })
      successMsg.value = 'Quiz updated successfully!'
    } else {
      const resp = await api('/quizzes', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      successMsg.value = 'Quiz published! +10 Learning Points'
      setTimeout(() => router.push(`/quizzes/${resp.quizId}/play`), 1200)
    }
  } catch (err) {
    errorMsg.value = err.message || 'Failed to save quiz.'
  } finally {
    saving.value = false
  }
}

const loadExistingQuiz = async () => {
  if (!isEditing.value) return
  try {
    const resp = await api(`/quizzes/${route.params.quizId}`)
    const q = resp.quiz
    quiz.value.title = q.title || ''
    quiz.value.description = q.description || ''
    quiz.value.courseCode = q.course_code || ''
    quiz.value.coverColor = q.cover_color || '#b11f4b'
    quiz.value.timeLimitSeconds = q.time_limit_seconds || 20
    quiz.value.questions = (q.questions || []).map(qq => ({
      questionText: qq.question_text,
      timeLimitSeconds: qq.time_limit_seconds,
      points: qq.points || 100,
      answers: (qq.answers || []).map(a => ({
        answerText: a.answer_text,
        isCorrect: a.is_correct
      }))
    }))
  } catch (err) {
    errorMsg.value = 'Failed to load quiz.'
  }
}

const goBack = () => {
  router.back()
}

onMounted(() => {
  // Add initial empty question if creating new
  if (!isEditing.value) {
    addQuestion()
  } else {
    loadExistingQuiz()
  }
})
</script>

<style scoped>
.page-bg {
  min-height: 100vh;
  background: linear-gradient(180deg, #ffffff, #f5f5f7);
}
.view {
  overflow-y: auto;
  padding: 20px 16px;
  max-width: 720px;
  margin: 0 auto;
}

/* Hero */
.create-hero {
  margin-bottom: 24px;
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
.back-btn svg {
  width: 18px;
  height: 18px;
}
.create-hero__kicker {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: #b11f4b;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.create-hero h2 {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
  color: #1d1d1f;
}
.create-hero__text {
  margin: 0;
  color: #6e6e73;
  font-size: 14px;
}

/* Form */
.form-section {
  background: rgba(255,255,255,0.7);
  border: 1px solid #e0e0e0;
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 16px;
  backdrop-filter: blur(8px);
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.section-title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: #1d1d1f;
}
.section-header .section-title {
  margin-bottom: 0;
}
.form-group {
  margin-bottom: 14px;
}
.form-group--half {
  flex: 1;
  min-width: 0;
}
.form-row {
  display: flex;
  gap: 12px;
}
.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 6px;
}
.form-label--small {
  font-size: 11px;
  color: #6e6e73;
}
.form-input,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  background: #fafafa;
  color: #1d1d1f;
  transition: border-color 150ms ease;
  box-sizing: border-box;
}
.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: #b11f4b;
}
.form-input--question {
  font-size: 15px;
  font-weight: 600;
}
.form-input--small {
  padding: 6px 10px;
  font-size: 13px;
}
.form-textarea {
  resize: vertical;
}

/* Color picker */
.color-picker-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  transition: transform 120ms ease, border-color 120ms ease;
}
.color-swatch:hover {
  transform: scale(1.1);
}
.color-swatch.active {
  border-color: #1d1d1f;
  transform: scale(1.15);
}

/* Add question button */
.add-question-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  background: #b11f4b;
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.add-question-btn svg {
  width: 16px;
  height: 16px;
}
.add-question-btn:hover {
  background: #8d1630;
}

/* Question card */
.question-card {
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 14px;
  background: rgba(255,255,255,0.5);
}
.question-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.question-number {
  font-size: 13px;
  font-weight: 700;
  color: #b11f4b;
  background: rgba(177, 31, 75, 0.08);
  padding: 2px 10px;
  border-radius: 12px;
}
.question-actions {
  display: flex;
  gap: 4px;
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
.icon-action svg {
  width: 16px;
  height: 16px;
  color: #6e6e73;
}
.icon-action:hover {
  border-color: #c7c7cc;
}
.icon-action:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.icon-action--danger:hover {
  background: #fff1f4;
  border-color: #b11f4b;
}
.icon-action--danger:hover svg {
  color: #b11f4b;
}

/* Answer grid (4 answers, Kahoot-style colored) */
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
  transition: all 150ms ease;
}
.answer-item--red { background: rgba(229, 57, 53, 0.08); border-color: rgba(229, 57, 53, 0.2); }
.answer-item--blue { background: rgba(30, 136, 229, 0.08); border-color: rgba(30, 136, 229, 0.2); }
.answer-item--yellow { background: rgba(255, 179, 0, 0.08); border-color: rgba(255, 179, 0, 0.2); }
.answer-item--green { background: rgba(67, 160, 71, 0.08); border-color: rgba(67, 160, 71, 0.2); }

.answer-item--correct { border-color: #34c759 !important; background: rgba(52, 199, 89, 0.1) !important; }

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
.correct-toggle svg {
  width: 14px;
  height: 14px;
  color: transparent;
}
.correct-toggle.active {
  background: #34c759;
  border-color: #34c759;
}
.correct-toggle.active svg {
  color: white;
}
.answer-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #1d1d1f;
  outline: none;
  min-width: 0;
}

/* Empty questions */
.empty-questions {
  text-align: center;
  padding: 32px 0;
  color: #6e6e73;
  font-size: 14px;
}

/* Submit */
.submit-section {
  background: transparent;
  border: none;
  padding: 0;
}
.submit-row {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
.btn-primary {
  padding: 10px 24px;
  background: #b11f4b;
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 150ms ease;
}
.btn-primary:hover { background: #8d1630; }
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
}
.btn-secondary:hover { background: #e8e8ed; }

.error-msg {
  color: #e53935;
  font-size: 13px;
  text-align: center;
  margin-bottom: 12px;
}
.success-msg {
  color: #34c759;
  font-size: 13px;
  text-align: center;
  margin-bottom: 12px;
}

@media (max-width: 640px) {
  .answers-grid {
    grid-template-columns: 1fr !important;
  }
  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>
