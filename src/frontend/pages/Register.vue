<template>
  <main class="page-bg">
    <section class="phone-shell">

      <!-- TOPBAR -->
      <header class="topbar">
        <span class="topbar-logo">🔗</span>
        <h1>StudyLink</h1>
        <span class="topbar-sub">Create Account</span>
      </header>

      <!-- BODY -->
      <div class="view auth-view">
        <div class="auth-block">

          <!-- STEP INDICATOR -->
          <div class="step-bar">
            <div class="step" :class="{ active: true, done: stepDone(1) }">
              <span class="step-num">1</span>
              <span class="step-label">Role</span>
            </div>
            <div class="step-line" :class="{ done: stepDone(1) }"></div>
            <div class="step" :class="{ active: currentStep >= 2, done: stepDone(2) }">
              <span class="step-num">2</span>
              <span class="step-label">Info</span>
            </div>
            <div class="step-line" :class="{ done: stepDone(2) }"></div>
            <div class="step" :class="{ active: currentStep >= 3 }">
              <span class="step-num">3</span>
              <span class="step-label">Security</span>
            </div>
          </div>

          <!-- HEADER -->
          <div class="auth-header">
            <h2>{{ stepTitle }}</h2>
            <p class="required-note"><span class="required">*</span> Required</p>
          </div>

          <!-- FORM -->
          <form @submit.prevent="handleRegister" novalidate>

            <!-- STEP 1: ROLE -->
            <div v-if="currentStep === 1" class="stack">
              <div class="role-selector">
                <p class="role-label">I am registering as: <span class="required">*</span></p>
                <div class="role-pill-row">
                  <button
                    type="button"
                    class="role-pill"
                    :class="{ active: form.role === 'tutee' }"
                    @click="form.role = 'tutee'"
                    aria-pressed="form.role === 'tutee'"
                  >
                    🎓 Tutee
                    <span class="role-pill-sub">I want to learn</span>
                  </button>
                  <button
                    type="button"
                    class="role-pill"
                    :class="{ active: form.role === 'tutor' }"
                    @click="form.role = 'tutor'"
                    aria-pressed="form.role === 'tutor'"
                  >
                    📚 Tutor
                    <span class="role-pill-sub">I want to teach</span>
                  </button>
                </div>
              </div>

              <button
                type="button"
                class="primary step-btn"
                :disabled="!form.role"
                @click="nextStep"
              >
                Continue →
              </button>
            </div>

            <!-- STEP 2: PERSONAL INFO -->
            <div v-if="currentStep === 2" class="stack">
              <div class="row-2">
                <label>
                  <span>First Name <span class="required">*</span></span>
                  <input
                    v-model.trim="form.firstName"
                    autocomplete="given-name"
                    :class="{ 'input-error': fieldErrors.firstName }"
                    @blur="validateField('firstName')"
                    placeholder="Ahmad"
                  />
                  <span v-if="fieldErrors.firstName" class="field-error">{{ fieldErrors.firstName }}</span>
                </label>
                <label>
                  <span>Last Name <span class="required">*</span></span>
                  <input
                    v-model.trim="form.lastName"
                    autocomplete="family-name"
                    :class="{ 'input-error': fieldErrors.lastName }"
                    @blur="validateField('lastName')"
                    placeholder="Bin Ali"
                  />
                  <span v-if="fieldErrors.lastName" class="field-error">{{ fieldErrors.lastName }}</span>
                </label>
              </div>

              <label>
                <span>Student ID <span class="required">*</span></span>
                <input
                  v-model.trim="form.studentId"
                  :class="{ 'input-error': fieldErrors.studentId }"
                  @blur="validateField('studentId')"
                  placeholder="e.g. 65XXXXXX"
                />
                <span v-if="fieldErrors.studentId" class="field-error">{{ fieldErrors.studentId }}</span>
              </label>

              <label>
                <span>Email Address <span class="required">*</span></span>
                <input
                  v-model.trim="form.email"
                  type="email"
                  autocomplete="email"
                  :class="{ 'input-error': fieldErrors.email }"
                  @blur="validateField('email')"
                  placeholder="you@unimas.my"
                />
                <span v-if="fieldErrors.email" class="field-error">{{ fieldErrors.email }}</span>
              </label>

              <label>
                <span>Phone Number</span>
                <input
                  v-model.trim="form.phoneNumber"
                  type="tel"
                  autocomplete="tel"
                  :class="{ 'input-error': fieldErrors.phoneNumber }"
                  @blur="validateField('phoneNumber')"
                  placeholder="+60 1X-XXXXXXX"
                />
                <span v-if="fieldErrors.phoneNumber" class="field-error">{{ fieldErrors.phoneNumber }}</span>
              </label>

              <label>
                <span>Major</span>
                <input
                  v-model.trim="form.major"
                  placeholder="e.g. Computer Science"
                  autocomplete="off"
                />
              </label>

              <label>
                <span>Year of Study</span>
                <input
                  v-model.number="form.yearOfStudy"
                  type="number"
                  min="1"
                  max="7"
                  :class="{ 'input-error': fieldErrors.yearOfStudy }"
                  @blur="validateField('yearOfStudy')"
                  placeholder="1 – 7"
                />
                <span v-if="fieldErrors.yearOfStudy" class="field-error">{{ fieldErrors.yearOfStudy }}</span>
              </label>

              <!-- TUTEE ONLY -->
              <label v-if="form.role === 'tutee'">
                <span>Target Subjects <span class="required">*</span></span>
                <input
                  v-model.trim="form.targetSubjects"
                  :class="{ 'input-error': fieldErrors.targetSubjects }"
                  @blur="validateField('targetSubjects')"
                  placeholder="e.g. Database, Algorithms"
                />
                <span v-if="fieldErrors.targetSubjects" class="field-error">{{ fieldErrors.targetSubjects }}</span>
              </label>

              <!-- TUTOR ONLY -->
              <label v-if="form.role === 'tutor'">
                <span>Expertise <span class="required">*</span></span>
                <input
                  v-model.trim="form.expertise"
                  :class="{ 'input-error': fieldErrors.expertise }"
                  @blur="validateField('expertise')"
                  placeholder="e.g. Java, SQL, Computer Graphics"
                />
                <span v-if="fieldErrors.expertise" class="field-error">{{ fieldErrors.expertise }}</span>
              </label>

              <label>
                <span>Bio <span class="bio-hint">(optional)</span></span>
                <textarea
                  v-model="form.bio"
                  rows="3"
                  placeholder="Short intro about yourself…"
                  maxlength="300"
                ></textarea>
                <span class="char-count">{{ form.bio.length }}/300</span>
              </label>

              <div class="step-nav">
                <button type="button" class="ghost-btn" @click="prevStep">← Back</button>
                <button type="button" class="primary step-btn" @click="nextStep">Continue →</button>
              </div>
            </div>

            <!-- STEP 3: SECURITY -->
            <div v-if="currentStep === 3" class="stack">

              <label>
                <span>Password <span class="required">*</span></span>
                <div class="pw-wrap">
                  <input
                    v-model="form.password"
                    :type="showPassword ? 'text' : 'password'"
                    autocomplete="new-password"
                    :class="{ 'input-error': fieldErrors.password }"
                    @blur="validateField('password')"
                    @input="clearFieldError('password')"
                  />
                  <button
                    type="button"
                    class="pw-toggle"
                    @click="showPassword = !showPassword"
                    :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  >
                    <svg v-if="!showPassword" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 5c5 0 9.27 3.11 11 7-1.73 3.89-6 7-11 7S2.73 15.89 1 12c1.73-3.89 6-7 11-7Zm0 2C8.14 7 4.8 9.32 3.35 12 4.8 14.68 8.14 17 12 17s7.2-2.32 8.65-5C19.2 9.32 15.86 7 12 7Zm0 1.75A3.25 3.25 0 1 1 12 15a3.25 3.25 0 0 1 0-6.5Zm0 2A1.25 1.25 0 1 0 12 13a1.25 1.25 0 0 0 0-2.5Z" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m2.1 3.51 1.42-1.42 18 18-1.42 1.42-3.04-3.04A11.93 11.93 0 0 1 12 19C6.98 19 2.73 15.89 1 12a12.94 12.94 0 0 1 4.33-5.17L2.1 3.51ZM9.5 10.91l3.59 3.59A3.25 3.25 0 0 1 9.5 10.91Zm3.06-3.08L16.95 12A8.1 8.1 0 0 0 12 8.75c.2 0 .39.02.56.08ZM12 5c5 0 9.27 3.11 11 7a13.08 13.08 0 0 1-3.17 4.02l-1.45-1.45A11.07 11.07 0 0 0 21.65 12C20.2 9.32 16.86 7 13 7c-.42 0-.84.04-1.24.1L9.99 5.32C10.62 5.11 11.29 5 12 5Z" />
                    </svg>
                  </button>
                </div>
                <div class="password-strength" v-if="form.password.length > 0">
                  <div class="strength-track">
                    <div class="strength-fill" :class="passwordStrengthClass"></div>
                  </div>
                  <span class="strength-label" :class="passwordStrengthClass">{{ passwordStrengthLabel }}</span>
                </div>
                <ul class="pw-rules" v-if="form.password.length > 0">
                  <li :class="{ pass: form.password.length >= 8 }">✓ At least 8 characters</li>
                  <li :class="{ pass: /[A-Za-z]/.test(form.password) }">✓ Contains a letter</li>
                  <li :class="{ pass: /[0-9]/.test(form.password) }">✓ Contains a number</li>
                </ul>
                <span v-if="fieldErrors.password" class="field-error">{{ fieldErrors.password }}</span>
              </label>

              <label>
                <span>Confirm Password <span class="required">*</span></span>
                <div class="pw-wrap">
                  <input
                    v-model="form.confirmPassword"
                    :type="showConfirm ? 'text' : 'password'"
                    autocomplete="new-password"
                    :class="{
                      'input-error': form.confirmPassword.length > 0 && form.password !== form.confirmPassword
                    }"
                  />
                  <button
                    type="button"
                    class="pw-toggle"
                    @click="showConfirm = !showConfirm"
                    :aria-label="showConfirm ? 'Hide password' : 'Show password'"
                  >
                    <svg v-if="!showConfirm" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 5c5 0 9.27 3.11 11 7-1.73 3.89-6 7-11 7S2.73 15.89 1 12c1.73-3.89 6-7 11-7Zm0 2C8.14 7 4.8 9.32 3.35 12 4.8 14.68 8.14 17 12 17s7.2-2.32 8.65-5C19.2 9.32 15.86 7 12 7Zm0 1.75A3.25 3.25 0 1 1 12 15a3.25 3.25 0 0 1 0-6.5Zm0 2A1.25 1.25 0 1 0 12 13a1.25 1.25 0 0 0 0-2.5Z" />
                    </svg>
                    <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m2.1 3.51 1.42-1.42 18 18-1.42 1.42-3.04-3.04A11.93 11.93 0 0 1 12 19C6.98 19 2.73 15.89 1 12a12.94 12.94 0 0 1 4.33-5.17L2.1 3.51ZM9.5 10.91l3.59 3.59A3.25 3.25 0 0 1 9.5 10.91Zm3.06-3.08L16.95 12A8.1 8.1 0 0 0 12 8.75c.2 0 .39.02.56.08ZM12 5c5 0 9.27 3.11 11 7a13.08 13.08 0 0 1-3.17 4.02l-1.45-1.45A11.07 11.07 0 0 0 21.65 12C20.2 9.32 16.86 7 13 7c-.42 0-.84.04-1.24.1L9.99 5.32C10.62 5.11 11.29 5 12 5Z" />
                    </svg>
                  </button>
                </div>
                <span
                  v-if="form.confirmPassword.length > 0"
                  class="match-hint"
                  :class="form.password === form.confirmPassword ? 'match-ok' : 'match-fail'"
                >
                  {{ form.password === form.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match' }}
                </span>
              </label>

              <div class="step-nav">
                <button type="button" class="ghost-btn" @click="prevStep">← Back</button>
                <button class="primary step-btn" type="submit" :disabled="isLoading">
                  <span v-if="isLoading" class="spinner" aria-hidden="true"></span>
                  {{ isLoading ? 'Creating…' : '🎉 Create Account' }}
                </button>
              </div>
            </div>

          </form>

          <!-- FOOTER -->
          <div class="auth-footer">
            <router-link to="/login" class="link-btn">Already have an account? Sign in</router-link>
          </div>

          <!-- MESSAGE TOAST -->
          <Transition name="toast">
            <div
              v-if="message"
              :class="['message', messageType]"
              role="alert"
              aria-live="polite"
            >
              <span class="msg-icon">{{ messageType === 'success' ? '✅' : '⚠️' }}</span>
              {{ message }}
            </div>
          </Transition>

        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api.js'

// ─── State ──────────────────────────────────────────────────────────────────
const router = useRouter()
const isLoading = ref(false)
const message = ref('')
const messageType = ref('')
const showPassword = ref(false)
const showConfirm = ref(false)
const currentStep = ref(1)
let messageTimer = null

const form = reactive({
  role: '',
  firstName: '',
  lastName: '',
  studentId: '',
  phoneNumber: '',
  email: '',
  major: '',
  yearOfStudy: null,
  targetSubjects: '',
  expertise: '',
  bio: '',
  password: '',
  confirmPassword: ''
})

// FIX: per-field inline errors (was single global message only)
const fieldErrors = reactive({
  firstName: '',
  lastName: '',
  studentId: '',
  email: '',
  phoneNumber: '',
  yearOfStudy: '',
  targetSubjects: '',
  expertise: '',
  password: ''
})

// ─── Step logic ─────────────────────────────────────────────────────────────
const stepTitle = computed(() => {
  if (currentStep.value === 1) return 'Choose your role'
  if (currentStep.value === 2) return 'Personal information'
  return 'Set your password'
})

const stepDone = (n) => currentStep.value > n

const nextStep = () => {
  if (currentStep.value === 1) {
    if (!form.role) { showMessage('Pick a role first.'); return }
  }
  if (currentStep.value === 2) {
    if (!validateStep2()) return
  }
  currentStep.value++
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const prevStep = () => {
  currentStep.value--
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ─── Validation ─────────────────────────────────────────────────────────────
const validateEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
const validatePhone = (v) => !v || /^[0-9+\-\s()]{7,20}$/.test(v)
const validatePassword = (v) => v.length >= 8 && /[0-9]/.test(v) && /[A-Za-z]/.test(v)

// FIX: whitespace bypass — .trim() enforced at model level + check here
const validateStep2 = () => {
  let ok = true
  clearAllFieldErrors()

  if (!form.firstName) { fieldErrors.firstName = 'Required.'; ok = false }
  if (!form.lastName)  { fieldErrors.lastName  = 'Required.'; ok = false }
  if (!form.studentId) { fieldErrors.studentId = 'Required.'; ok = false }
  if (!validateEmail(form.email)) { fieldErrors.email = 'Enter a valid email.'; ok = false }
  if (!validatePhone(form.phoneNumber)) { fieldErrors.phoneNumber = 'Invalid phone number.'; ok = false }
  if (form.yearOfStudy !== null && form.yearOfStudy !== '' && (form.yearOfStudy < 1 || form.yearOfStudy > 7)) {
    fieldErrors.yearOfStudy = 'Must be 1–7.'; ok = false
  }
  if (form.role === 'tutee' && !form.targetSubjects) {
    fieldErrors.targetSubjects = 'Required for tutees.'; ok = false
  }
  if (form.role === 'tutor' && !form.expertise) {
    fieldErrors.expertise = 'Required for tutors.'; ok = false
  }
  return ok
}

const validateField = (field) => {
  fieldErrors[field] = ''
  switch (field) {
    case 'firstName':
    case 'lastName':
      if (!form[field]) fieldErrors[field] = 'Required.'
      break
    case 'studentId':
      if (!form.studentId) fieldErrors.studentId = 'Required.'
      break
    case 'email':
      if (!validateEmail(form.email)) fieldErrors.email = 'Enter a valid email.'
      break
    case 'phoneNumber':
      if (!validatePhone(form.phoneNumber)) fieldErrors.phoneNumber = 'Invalid phone number.'
      break
    case 'yearOfStudy':
      if (form.yearOfStudy && (form.yearOfStudy < 1 || form.yearOfStudy > 7))
        fieldErrors.yearOfStudy = 'Must be 1–7.'
      break
    case 'targetSubjects':
      if (form.role === 'tutee' && !form.targetSubjects) fieldErrors.targetSubjects = 'Required.'
      break
    case 'expertise':
      if (form.role === 'tutor' && !form.expertise) fieldErrors.expertise = 'Required.'
      break
    case 'password':
      if (!validatePassword(form.password)) fieldErrors.password = 'Min 8 chars, 1 letter, 1 number.'
      break
  }
}

const clearFieldError = (field) => { fieldErrors[field] = '' }
const clearAllFieldErrors = () => Object.keys(fieldErrors).forEach(k => { fieldErrors[k] = '' })

// ─── Password strength ──────────────────────────────────────────────────────
const passwordStrengthClass = computed(() => {
  const p = form.password
  if (p.length === 0) return ''
  if (p.length < 8) return 'weak'
  if (/[0-9]/.test(p) && /[A-Za-z]/.test(p) && p.length >= 12) return 'strong'
  if (/[0-9]/.test(p) && /[A-Za-z]/.test(p)) return 'medium'
  return 'weak'
})

const passwordStrengthLabel = computed(() => ({
  weak: 'Weak', medium: 'Good', strong: 'Strong'
}[passwordStrengthClass.value] || ''))

// ─── Messages ────────────────────────────────────────────────────────────────
const showMessage = (text, type = 'error') => {
  message.value = text
  messageType.value = type
  if (messageTimer) clearTimeout(messageTimer)
  messageTimer = setTimeout(() => {
    if (message.value === text) message.value = ''
  }, 5000)
}

// ─── Submit ──────────────────────────────────────────────────────────────────
const handleRegister = async () => {
  message.value = ''

  // FIX: validate password on submit step
  if (!validatePassword(form.password)) {
    fieldErrors.password = 'Min 8 chars, 1 letter, 1 number.'
    showMessage('Password too weak.')
    return
  }

  if (form.password !== form.confirmPassword) {
    showMessage('Passwords do not match.')
    return
  }

  isLoading.value = true

  try {
    const expertise = form.role === 'tutor'
      ? form.expertise.split(',').map(e => e.trim()).filter(Boolean)
      : []

    await api('/auth/register', 'POST', {
      role: form.role,
      // FIX: trim studentId before send
      studentId: form.studentId.trim(),
      fullName: `${form.firstName.trim()} ${form.lastName.trim()}`,
      phoneNumber: form.phoneNumber.trim() || null,
      email: form.email.trim(),
      major: form.major.trim() || null,
      // FIX: guard NaN — yearOfStudy could be empty string after number input cleared
      yearOfStudy: form.yearOfStudy && !isNaN(Number(form.yearOfStudy)) ? Number(form.yearOfStudy) : null,
      targetSubjects: form.role === 'tutee' ? (form.targetSubjects.trim() || null) : null,
      expertise,
      bio: form.bio.trim() || null,
      password: form.password
    })

    showMessage('Account created! Redirecting…', 'success')
    setTimeout(() => router.push('/login'), 1200)
  } catch (error) {
    // FIX: safe error message extraction
    const msg = error?.message || error?.data?.message || 'Registration failed. Try again.'
    showMessage(msg)
  } finally {
    isLoading.value = false
  }
}

onUnmounted(() => {
  if (messageTimer) clearTimeout(messageTimer)
})
</script>

<style scoped>
/* ── Page ─────────────────────────────────────────────────────────────── */
.page-bg {
  min-height: 100vh;
  background: linear-gradient(160deg, #F5F5F5 0%, #FFCEE3 60%, #FF85BB 100%);
}

.phone-shell {
  width: 100%;
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr;
}

/* ── Topbar ───────────────────────────────────────────────────────────── */
.topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 133, 187, 0.25);
  box-shadow: 0 2px 12px rgba(2, 26, 84, 0.08);
  position: sticky;
  top: 0;
  z-index: 30;
}

.topbar-logo {
  font-size: 22px;
  line-height: 1;
}

.topbar h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #021A54;
  letter-spacing: -0.01em;
  font-family: "Josefin Sans", "Trebuchet MS", sans-serif;
}

.topbar-sub {
  font-size: 13px;
  color: #FF85BB;
  font-weight: 600;
  margin-left: 2px;
}

/* ── View ─────────────────────────────────────────────────────────────── */
.view {
  overflow-y: auto;
  padding: 28px 16px 48px;
}

.auth-view {
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.auth-block {
  width: 100%;
  max-width: 500px;
}

/* ── Step bar ─────────────────────────────────────────────────────────── */
.step-bar {
  display: flex;
  align-items: center;
  gap: 0;
  margin-bottom: 24px;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  opacity: 0.35;
  transition: opacity 200ms;
}

.step.active {
  opacity: 1;
}

.step-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  border: 2px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #021A54;
  transition: all 200ms;
}

.step.active .step-num {
  background: #FF85BB;
  border-color: #FF85BB;
  color: #fff;
  box-shadow: 0 0 0 4px rgba(255, 133, 187, 0.22);
}

.step.done .step-num {
  background: #021A54;
  border-color: #021A54;
  color: #fff;
}

.step-label {
  font-size: 10px;
  font-weight: 600;
  color: #021A54;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.step-line {
  flex: 1;
  height: 2px;
  background: #e0e0e0;
  margin: 0 4px;
  margin-top: -12px;
  border-radius: 2px;
  transition: background 300ms;
}

.step-line.done {
  background: #021A54;
}

/* ── Auth header ──────────────────────────────────────────────────────── */
.auth-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 20px;
}

.auth-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #021A54;
  font-family: "Josefin Sans", "Trebuchet MS", sans-serif;
}

.required-note {
  font-size: 12px;
  color: #6e6e73;
  margin: 0;
}

.required {
  color: #e63a72;
  margin-left: 2px;
}

/* ── Form stack ───────────────────────────────────────────────────────── */
.stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #021A54;
}

/* ── Inputs ───────────────────────────────────────────────────────────── */
input,
textarea,
select {
  border: 1.5px solid rgba(2, 26, 84, 0.15);
  border-radius: 12px;
  padding: 11px 14px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(8px);
  font-size: 14px;
  color: #021A54;
  transition: border-color 180ms ease, box-shadow 180ms ease;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
}

input::placeholder,
textarea::placeholder {
  color: rgba(2, 26, 84, 0.35);
}

input:hover,
textarea:hover {
  border-color: rgba(255, 133, 187, 0.5);
}

input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: #FF85BB;
  box-shadow: 0 0 0 3px rgba(255, 133, 187, 0.22);
  background: rgba(255, 255, 255, 0.95);
}

/* FIX: error state for inputs */
input.input-error,
textarea.input-error {
  border-color: #e63a72;
  box-shadow: 0 0 0 3px rgba(230, 58, 114, 0.12);
}

textarea {
  resize: vertical;
  border-radius: 12px;
}

.field-error {
  font-size: 11px;
  font-weight: 600;
  color: #e63a72;
  margin-top: 2px;
}

.char-count {
  font-size: 11px;
  color: #6e6e73;
  text-align: right;
  font-weight: 400;
}

.bio-hint {
  font-weight: 400;
  color: #6e6e73;
  font-size: 12px;
}

/* ── Role pills ───────────────────────────────────────────────────────── */
.role-selector {
  margin-bottom: 4px;
}

.role-label {
  font-size: 13px;
  font-weight: 600;
  color: #021A54;
  margin: 0 0 10px;
}

.role-pill-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.role-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 12px;
  border-radius: 14px;
  border: 2px solid rgba(2, 26, 84, 0.12);
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(8px);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 160ms ease;
  color: #021A54;
  line-height: 1.2;
  font-family: inherit;
}

.role-pill:hover {
  border-color: #FFCEE3;
  background: rgba(255, 206, 227, 0.3);
}

.role-pill.active {
  border-color: #FF85BB;
  background: rgba(255, 133, 187, 0.12);
  color: #021A54;
  box-shadow: 0 0 0 3px rgba(255, 133, 187, 0.18);
}

.role-pill-sub {
  font-size: 11px;
  font-weight: 500;
  color: #6e6e73;
}

/* ── Password ─────────────────────────────────────────────────────────── */
.pw-wrap {
  position: relative;
}

.pw-wrap input {
  padding-right: 44px;
}

.pw-toggle {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #021A54;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border-radius: 50%;
  transition: background 150ms;
  opacity: 0.5;
}

.pw-toggle:hover {
  background: rgba(255, 133, 187, 0.15);
  opacity: 1;
}

.pw-toggle svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}

/* Strength bar */
.password-strength {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
}

.strength-track {
  flex: 1;
  height: 4px;
  background: rgba(2, 26, 84, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 250ms ease, background 250ms ease;
}

.strength-fill.weak   { width: 33%; background: #e63a72; }
.strength-fill.medium { width: 66%; background: #f59e0b; }
.strength-fill.strong { width: 100%; background: #22c55e; }

.strength-label {
  font-size: 11px;
  font-weight: 700;
  min-width: 44px;
}

.strength-label.weak   { color: #e63a72; }
.strength-label.medium { color: #f59e0b; }
.strength-label.strong { color: #22c55e; }

/* Password rules checklist */
.pw-rules {
  list-style: none;
  padding: 0;
  margin: 6px 0 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.pw-rules li {
  font-size: 11px;
  font-weight: 500;
  color: rgba(2, 26, 84, 0.4);
  transition: color 200ms;
}

.pw-rules li.pass {
  color: #22c55e;
}

.match-hint {
  font-size: 12px;
  font-weight: 600;
  display: block;
}

.match-ok   { color: #22c55e; }
.match-fail { color: #e63a72; }

/* ── Buttons ──────────────────────────────────────────────────────────── */
button.primary,
.primary {
  border: none;
  border-radius: 99px;
  background: linear-gradient(135deg, #FF85BB 0%, #ff6da9 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  font-family: "Josefin Sans", "Trebuchet MS", sans-serif;
  padding: 13px 24px;
  cursor: pointer;
  transition: opacity 150ms, transform 100ms, box-shadow 150ms;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 14px rgba(255, 133, 187, 0.38);
}

button.primary:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(255, 133, 187, 0.45);
}

button.primary:active:not(:disabled) {
  transform: translateY(0);
}

button.primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: none;
}

.step-btn {
  width: 100%;
  margin-top: 4px;
}

.ghost-btn {
  border: 1.5px solid rgba(2, 26, 84, 0.2);
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
  color: #021A54;
  font-size: 14px;
  font-weight: 600;
  padding: 12px 20px;
  cursor: pointer;
  transition: border-color 150ms, background 150ms;
  font-family: inherit;
}

.ghost-btn:hover {
  border-color: #FF85BB;
  background: rgba(255, 206, 227, 0.25);
}

.step-nav {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.step-nav .step-btn {
  flex: 1;
  margin-top: 0;
}

/* ── Footer ───────────────────────────────────────────────────────────── */
.auth-footer {
  margin-top: 6px;
  margin-bottom: 12px;
}

.link-btn {
  display: inline-block;
  background: transparent;
  border: 0;
  color: #FF85BB;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  padding: 0;
  transition: color 150ms;
  font-family: inherit;
}

.link-btn:hover {
  color: #021A54;
}

/* ── Message toast ────────────────────────────────────────────────────── */
.message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid transparent;
}

.message.error {
  color: #7f1d3c;
  background: rgba(255, 206, 227, 0.55);
  border-color: rgba(230, 58, 114, 0.2);
  backdrop-filter: blur(6px);
}

.message.success {
  color: #14532d;
  background: rgba(220, 252, 231, 0.7);
  border-color: rgba(34, 197, 94, 0.25);
  backdrop-filter: blur(6px);
}

.msg-icon {
  font-size: 15px;
  flex-shrink: 0;
}

/* ── Spinner ──────────────────────────────────────────────────────────── */
.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Toast transition ─────────────────────────────────────────────────── */
.toast-enter-active,
.toast-leave-active {
  transition: opacity 250ms ease, transform 250ms ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

/* ── Responsive ───────────────────────────────────────────────────────── */
@media (max-width: 480px) {
  .topbar {
    padding: 12px 16px;
  }

  .view {
    padding: 20px 12px 40px;
  }

  .row-2 {
    grid-template-columns: 1fr;
  }
}
</style>