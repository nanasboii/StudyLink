<template>
  <div class="view page active">
    <section class="card forgot-panel">
      <h2>Set a new password</h2>
      <p class="desc">Enter a new password for your account.</p>

      <form @submit.prevent="handleReset" class="forgot-form">
        <label class="field">
          <span>New Password</span>
          <input type="password" v-model="newPassword" required />
        </label>

        <label class="field">
          <span>Confirm Password</span>
          <input type="password" v-model="confirmPassword" required />
        </label>

        <button class="primary" type="submit" :disabled="loading">{{ loading ? 'Saving...' : 'Save New Password' }}</button>
      </form>

      <p v-if="message" :class="['message', messageType]">{{ message }}</p>

      <router-link to="/login" class="alt-link">Back to sign in</router-link>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/api.js';

const route = useRoute();
const router = useRouter();
const token = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const message = ref('');
const messageType = ref('');

onMounted(() => {
  token.value = route.query.token || '';
});

const handleReset = async () => {
  message.value = '';
  if (!token.value) {
    message.value = 'Missing reset token.';
    messageType.value = 'error';
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    message.value = 'Passwords do not match.';
    messageType.value = 'error';
    return;
  }

  loading.value = true;
  try {
    await api('/auth/reset-password', 'POST', { token: token.value, newPassword: newPassword.value });
    message.value = 'Password updated. You can now sign in.';
    messageType.value = 'success';
    setTimeout(() => router.push('/login'), 1500);
  } catch (err) {
    message.value = err.message || 'Failed to reset password.';
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