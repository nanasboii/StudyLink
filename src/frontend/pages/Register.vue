<template>
  <main class="page-bg">
    <section class="phone-shell">
      <header class="topbar">
        <h1>StudyLink - Create Account</h1>
      </header>
      <div class="view auth-view">
        <div class="auth-block">
          <h2>Enter personal info</h2>
          <form @submit.prevent="handleRegister" class="stack">
            <label>
              Register as
              <select v-model="form.role" required @change="updateRoleFields">
                <option value="">Select</option>
                <option value="tutee">Tutee</option>
                <option value="tutor">Tutor</option>
              </select>
            </label>

            <div class="row-2">
              <label>
                First Name
                <input v-model="form.firstName" required />
              </label>
              <label>
                Last Name
                <input v-model="form.lastName" required />
              </label>
            </div>

            <label>
              Student ID
              <input v-model="form.studentId" required />
            </label>

            <label>
              Phone Number
              <input v-model="form.phoneNumber" type="tel" />
            </label>

            <label>
              Email Address
              <input v-model="form.email" type="email" required />
            </label>

            <label>
              Major
              <input v-model="form.major" />
            </label>

            <label>
              Year of Study
              <input v-model.number="form.yearOfStudy" type="number" min="1" max="7" />
            </label>

            <label v-if="form.role === 'tutee'">
              Target Subjects (for tutee)
              <input v-model="form.targetSubjects" placeholder="e.g. Database, Algorithms" />
            </label>

            <label v-if="form.role === 'tutor'">
              Expertise (for tutor)
              <input v-model="form.expertise" placeholder="e.g. Java, SQL, Computer Graphics" />
            </label>

            <label>
              Bio
              <textarea v-model="form.bio" rows="3" placeholder="Short intro"></textarea>
            </label>

            <label>
              Password
              <input v-model="form.password" type="password" minlength="8" required />
            </label>

            <label>
              Verify Password
              <input v-model="form.confirmPassword" type="password" minlength="8" required />
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
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/api.js'

const router = useRouter()
const isLoading = ref(false)
const message = ref('')
const messageType = ref('')

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

const updateRoleFields = () => {
  // Just trigger reactivity
}

const validateEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const validatePassword = (password) => {
  return password.length >= 8 && /[0-9]/.test(password)
}

const validatePhoneNumber = (phone) => {
  if (!phone) return true
  return /^[0-9+\-\s()]{7,20}$/.test(phone)
}

const showMessage = (text, type = 'error') => {
  message.value = text
  messageType.value = type
  setTimeout(() => {
    if (message.value === text) {
      message.value = ''
    }
  }, 5000)
}

const handleRegister = async () => {
  message.value = ''
  messageType.value = ''

  // Validation
  if (!form.role) {
    showMessage('Please select a role to register.')
    return
  }

  if (!validateEmail(form.email)) {
    showMessage('Please enter a valid email address.')
    return
  }

  if (!validatePassword(form.password)) {
    showMessage('Password must be at least 8 characters and include a number.')
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

  isLoading.value = true

  try {
    // Parse expertise for tutors
    const expertise = form.role === 'tutor'
      ? form.expertise
          .split(',')
          .map(e => e.trim())
          .filter(Boolean)
      : []

    await api('/auth/register', 'POST', {
      role: form.role,
      studentId: form.studentId,
      fullName: `${form.firstName} ${form.lastName}`,
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
</script>

<style scoped>
.page-bg {
  min-height: 100vh;
  display: block;
  padding: 0;
  background: linear-gradient(180deg, #ffffff, #fff5f8 60%, #ffe7ee);
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
  color: #3f2f38;
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

.auth-block h2 {
  margin: 0 0 20px;
  font-size: 20px;
  font-weight: 600;
  color: #3f2f38;
  font-family: "Josefin Sans", "Trebuchet MS", sans-serif;
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
  color: #3f2f38;
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

button.primary {
  border: 2px solid #c41e3a;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  color: #ffffff;
  border-radius: 10px;
  padding: 14px 24px;
  font-size: 16px;
  font-family: "Josefin Sans", "Trebuchet MS", sans-serif;
  font-weight: 600;
  cursor: pointer;
  transition: all 200ms ease;
  box-shadow: 0 4px 12px rgba(196, 30, 58, 0.3);
  margin-top: 8px;
}

button.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #2d2d2d 0%, #3d3d3d 100%);
  border-color: #e63a52;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(196, 30, 58, 0.4);
}

button.primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.link-btn {
  display: inline-block;
  border: 0;
  background: transparent;
  color: #c41e3a;
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

