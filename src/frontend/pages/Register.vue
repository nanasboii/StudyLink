<template>
  <main class="page-bg">
    <section class="phone-shell">
      <header class="topbar">
        <h1>StudyLink - Create Account</h1>
      </header>
      <div class="view auth-view">
        <div class="auth-block">
          
          <div class="auth-header">
            <h2>Enter personal info</h2>
            <p class="required-note"><span class="required">*</span> Required fields</p>
          </div>
          
          <form @submit.prevent="handleRegister" class="stack">
            
            <div class="role-selector">
              <p class="role-label">I am registering as a: <span class="required">*</span></p>
              <div class="role-pill-row">
                <button type="button" class="role-pill" :class="{ active: form.role === 'tutee' }" @click="form.role = 'tutee'">
                  🎓 Tutee
                </button>
                <button type="button" class="role-pill" :class="{ active: form.role === 'tutor' }" @click="form.role = 'tutor'">
                  📚 Tutor
                </button>
              </div>
            </div>

            <div class="row-2">
              <label>
                <span>First Name <span class="required">*</span></span>
                <input v-model="form.firstName" required />
              </label>
              <label>
                <span>Last Name <span class="required">*</span></span>
                <input v-model="form.lastName" required />
              </label>
            </div>

            <label>
              <span>Student ID <span class="required">*</span></span>
              <input v-model="form.studentId" required />
            </label>

            <label>
              <span>Phone Number</span>
              <input v-model="form.phoneNumber" type="tel" />
            </label>

            <label>
              <span>Email Address <span class="required">*</span></span>
              <input v-model="form.email" type="email" required />
            </label>

            <label>
              <span>Major</span>
              <input v-model="form.major" />
            </label>

            <label>
              <span>Year of Study</span>
              <input v-model.number="form.yearOfStudy" type="number" min="1" max="7" />
            </label>

            <label v-if="form.role === 'tutee'">
              <span>Target Subjects (for tutee) <span class="required">*</span></span>
              <input v-model="form.targetSubjects" placeholder="e.g. Database, Algorithms" />
            </label>

            <label v-if="form.role === 'tutor'">
              <span>Expertise (for tutor) <span class="required">*</span></span>
              <input v-model="form.expertise" placeholder="e.g. Java, SQL, Computer Graphics" />
            </label>

            <label>
              <span>Bio</span>
              <textarea v-model="form.bio" rows="3" placeholder="Short intro"></textarea>
            </label>

            <label>
              <span>Password <span class="required">*</span></span>
              <input v-model="form.password" type="password" required />
              <div class="password-strength" v-if="form.password.length > 0">
                <div class="strength-bar" :class="passwordStrengthClass"></div>
                <span class="strength-label">{{ passwordStrengthLabel }}</span>
              </div>
            </label>

            <label>
              <span>Verify Password <span class="required">*</span></span>
              <input v-model="form.confirmPassword" type="password" required />
              <span v-if="form.confirmPassword.length > 0" class="match-hint"
                    :class="form.password === form.confirmPassword ? 'match-ok' : 'match-fail'">
                {{ form.password === form.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match' }}
              </span>
            </label>

            <button class="primary" type="submit" :disabled="isLoading">
              {{ isLoading ? 'Creating Account...' : 'Create Account' }}
            </button>
          </form>

          <router-link to="/login" class="link-btn">Back to login</router-link>
          <p v-if="message" :class="['message', messageType]">{{ message }}</p>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api.js'

const router = useRouter()
const isLoading = ref(false)
const message = ref('')
const messageType = ref('')
let messageTimer = null;

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

const passwordStrengthClass = computed(() => {
  const p = form.password;
  if (p.length < 8) return 'weak';
  if (p.length >= 8 && /[0-9]/.test(p) && /[A-Za-z]/.test(p)) return 'strong';
  return 'medium';
});

const passwordStrengthLabel = computed(() => {
  return { weak: 'Too short', medium: 'Good', strong: 'Strong' }[passwordStrengthClass.value];
});

const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const validatePassword = (password) => {
  return (
    password.length >= 8 &&
    /[0-9]/.test(password) &&
    /[a-zA-Z]/.test(password)
  );
}

const validatePhoneNumber = (phone) => {
  if (!phone) return true
  return /^[0-9+\-\s()]{7,20}$/.test(phone)
}

const showMessage = (text, type = 'error') => {
  message.value = text;
  messageType.value = type;
  if (messageTimer) clearTimeout(messageTimer);
  messageTimer = setTimeout(() => {
    if (message.value === text) {
      message.value = '';
    }
  }, 5000);
}

const handleRegister = async () => {
  message.value = ''
  messageType.value = ''

  if (!form.role) {
    showMessage('Please select a role to register.')
    return
  }

  if (!form.firstName.trim() || !form.lastName.trim()) {
    showMessage('Please enter your first and last name.');
    return;
  }

  if (!form.studentId.trim()) {
    showMessage('Please enter your Student ID.');
    return;
  }

  if (!validateEmail(form.email)) {
    showMessage('Please enter a valid email address.')
    return
  }

  if (!validatePassword(form.password)) {
    showMessage('Password must be at least 8 characters with a letter and a number.')
    return
  }

  if (form.phoneNumber && !validatePhoneNumber(form.phoneNumber)) {
    showMessage('Please enter a valid phone number.')
    return
  }

  if (form.password !== form.confirmPassword) {
    showMessage('Passwords do not match.')
    return
  }

  if (form.yearOfStudy && (form.yearOfStudy < 1 || form.yearOfStudy > 7)) {
    showMessage('Year of study must be between 1 and 7.');
    return;
  }

  isLoading.value = true

  try {
    const expertise = form.role === 'tutor'
      ? form.expertise
          .split(',')
          .map(e => e.trim())
          .filter(Boolean)
      : []

    await api('/auth/register', 'POST', {
      role: form.role,
      studentId: form.studentId.trim(),
      fullName: `${form.firstName.trim()} ${form.lastName.trim()}`,
      phoneNumber: form.phoneNumber || null,
      email: form.email,
      major: form.major || null,
      yearOfStudy: form.yearOfStudy ? Number(form.yearOfStudy) : null,
      targetSubjects: form.role === 'tutee' ? form.targetSubjects || null : null,
      expertise,
      bio: form.bio || null,
      password: form.password
    })

    showMessage('Registration successful. Redirecting to login...', 'success')
    setTimeout(() => {
      router.push('/login')
    }, 700)
  } catch (error) {
    showMessage(error.message || 'Registration failed. Please try again.')
  } finally {
    isLoading.value = false
  }
}

onUnmounted(() => {
  if (messageTimer) clearTimeout(messageTimer);
});
</script>

<style scoped>
.page-bg {
  min-height: 100vh;
  display: block;
  padding: 0;
  background: linear-gradient(180deg, #ffffff, #f5f5f7);
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
  grid-template-rows: auto 1fr;
  overflow: hidden;
}

.topbar {
  grid-row: 1;
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  padding: 16px 32px;
  border-bottom: 1px solid #ffd4e0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 241, 246, 0.9));
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 8px rgba(9, 27, 44, 0.08);
  position: relative;
  z-index: 30;
}

.topbar h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1d1d1f;
  text-align: center;
}

.view {
  grid-row: 2;
  overflow-y: auto;
  padding: 24px 16px;
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

/* Header container that aligns the H2 and the Required note */
.auth-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 20px;
}

.auth-block h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1d1d1f;
  font-family: "Josefin Sans", "Trebuchet MS", sans-serif;
}

.required {
  color: #b11f4b;
  margin-left: 2px;
}

.required-note {
  font-size: 12px;
  color: #6e6e73;
  margin: 0;
}

.role-selector {
  margin-bottom: 8px;
}
.role-label {
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 8px;
  color: #1d1d1f;
}
.role-pill-row {
  display: flex;
  gap: 10px;
}
.role-pill {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: 2px solid #e0e0e0;
  background: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
  color: #1d1d1f;
}
.role-pill.active {
  border-color: #b11f4b;
  background: rgba(177, 31, 75, 0.06);
  color: #b11f4b;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #1d1d1f;
}

input,
textarea,
select {
  border: 2px solid #d1dadf;
  border-radius: 10px;
  padding: 12px 14px;
  background: #fff;
  font-size: 14px;
  transition: all 200ms ease;
  font-family: inherit;
}

input:hover,
textarea:hover,
select:hover {
  border-color: #ffc3d0;
}

input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: #ffb7c5;
  box-shadow: 0 0 0 3px rgba(255, 183, 197, 0.28);
}

textarea {
  resize: vertical;
}

.password-strength {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}
.strength-bar {
  height: 4px;
  flex: 1;
  border-radius: 2px;
  transition: background 200ms, width 200ms;
  background: #e0e0e0;
}
.strength-bar.weak { background: #e53935; width: 33%; }
.strength-bar.medium { background: #f4b400; width: 66%; }
.strength-bar.strong { background: #43a047; width: 100%; }
.strength-label {
  font-size: 11px;
  font-weight: 600;
  color: #6e6e73;
  min-width: 50px;
}

.match-hint {
  font-size: 12px;
  font-weight: 600;
  margin-top: 4px;
  display: block;
}
.match-ok { color: #43a047; }
.match-fail { color: #e53935; }

button.primary {
  padding: 14px 24px;
  font-size: 16px;
  font-family: "Josefin Sans", "Trebuchet MS", sans-serif;
  font-weight: 600;
  margin-top: 8px;
}

button.primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.link-btn {
  display: inline-block;
  border: 0;
  background: transparent;
  color: #b11f4b;
  text-decoration: underline;
  cursor: pointer;
  transition: color 200ms ease;
  font-size: 13px;
  padding: 0;
  margin-bottom: 12px;
}

.link-btn:hover {
  color: #e63a52;
}

.message {
  margin: 0;
  font-size: 13px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #ffd6d6;
}

.message.error {
  color: #bc2f2f;
  background: #fff5f5;
}

.message.success {
  color: #3f6f57;
  background: #f5fff5;
  border-color: #d6ffd6;
}

@media (max-width: 640px) {
  .topbar {
    padding: 12px 16px;
  }

  .view {
    padding: 16px;
  }

  .auth-block {
    width: 100%;
  }

  .row-2 {
    grid-template-columns: 1fr;
  }
}
</style>
