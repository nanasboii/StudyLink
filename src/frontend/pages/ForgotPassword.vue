<template>
  <div class="view page active">
    <section class="card forgot-panel">
      <h2>Reset your password</h2>
      <p class="desc">Enter the email address associated with your account and we'll send you a password reset link.</p>

      <form @submit.prevent="handleRequest" class="forgot-form">
        <label class="field">
          <span>Email</span>
          <input type="email" v-model="email" required />
        </label>

        <button class="primary" type="submit" :disabled="loading">{{ loading ? 'Sending...' : 'Send Reset Link' }}</button>
      </form>

      <p v-if="message" :class="['message', messageType]">{{ message }}</p>

      <router-link to="/login" class="alt-link">Back to sign in</router-link>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { api } from '@/api.js';
import { useRouter } from 'vue-router';

const router = useRouter();
const email = ref('');
const loading = ref(false);
const message = ref('');
const messageType = ref('');

const handleRequest = async () => {
  message.value = '';
  loading.value = true;
  try {
    await api('/auth/forgot-password', 'POST', { email: email.value.trim() });
    message.value = 'If an account exists for that email, a reset link has been sent.';
    messageType.value = 'success';
    email.value = '';
  } catch (err) {
    message.value = err.message || 'Failed to send reset email.';
    messageType.value = 'error';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.forgot-panel { max-width: 480px; margin: 40px auto; padding: 24px; }
.desc { color: #666; margin-bottom: 12px; }
.field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.primary { padding: 10px 16px; }
.message.success { background: #e6ffed; padding: 10px; border-radius: 6px; color: #0b6b2d; }
.message.error { background: #fff0f0; padding: 10px; border-radius: 6px; color: #8b1e1e; }
.alt-link { display: inline-block; margin-top: 12px; }
</style>