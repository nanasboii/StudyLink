<template>
  <div class="auth-page">
    <section class="auth-card">
      <h1>Reset password</h1>
      <p class="subtitle">Set a new password for your account.</p>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <label class="field">
          <span>New password</span>
          <input v-model="newPassword" type="password" autocomplete="new-password" required />
        </label>

        <label class="field">
          <span>Confirm new password</span>
          <input v-model="confirmPassword" type="password" autocomplete="new-password" required />
        </label>

        <button class="primary" type="submit" :disabled="submitting">
          {{ submitting ? 'Updating...' : 'Update password' }}
        </button>
      </form>

      <p v-if="message" class="message" :class="{ error: isError }">{{ message }}</p>
      <router-link class="alt-link" to="/login">Back to sign in</router-link>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/api.js'

const route = useRoute()
const router = useRouter()

const newPassword = ref('')
const confirmPassword = ref('')
const submitting = ref(false)
const message = ref('')
const isError = ref(false)

const handleSubmit = async () => {
  message.value = ''
  isError.value = false

  const token = route.query.token
  if (!token) {
    isError.value = true
    message.value = 'Invalid reset link: missing token.'
    return
  }

  if (newPassword.value.length < 8) {
    isError.value = true
    message.value = 'Password must be at least 8 characters.'
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    isError.value = true
    message.value = 'Passwords do not match.'
    return
  }

  submitting.value = true

  try {
    const response = await api('/auth/reset-password', 'POST', {
      token,
      newPassword: newPassword.value
    })

    message.value = response.message || 'Password updated successfully. Redirecting to login...'
    setTimeout(() => router.push('/login'), 1200)
  } catch (error) {
    isError.value = true
    message.value = error.message || 'Failed to reset password.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: linear-gradient(180deg, #f8fbff 0%, #edf5ff 100%);
}

.auth-card {
  width: min(100%, 460px);
  border: 1px solid #d7e4f5;
  border-radius: 16px;
  background: #fff;
  padding: 24px;
  box-shadow: 0 10px 30px rgba(30, 61, 98, 0.12);
}

h1 {
  margin: 0;
  font-size: 28px;
  color: #1c3554;
}

.subtitle {
  margin: 8px 0 20px;
  color: #4e627c;
}

.auth-form {
  display: grid;
  gap: 14px;
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  font-weight: 600;
  color: #2b3f5b;
}

.field input {
  height: 42px;
  border: 1px solid #b8cae0;
  border-radius: 10px;
  padding: 0 12px;
}

.primary {
  height: 44px;
  border: 0;
  border-radius: 999px;
  background: #1f5ea8;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.primary:disabled {
  opacity: 0.7;
  cursor: wait;
}

.message {
  margin: 12px 0 0;
  color: #256029;
}

.message.error {
  color: #b02a37;
}

.alt-link {
  display: inline-block;
  margin-top: 12px;
  color: #1f5ea8;
}
</style>
