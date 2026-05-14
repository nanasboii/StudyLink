<template>
  <div class="view page active">
    <section class="card settings-panel">
      <div class="settings-header">
        <h2>Settings</h2>
      </div>

      <!-- Change Password Section -->
      <div class="settings-section">
        <h3>Change Password</h3>
        <form @submit.prevent="handleChangePassword" class="password-form">
          <div class="field">
            <label class="field-label">Current Password</label>
            <input 
              v-model="passwordForm.currentPassword" 
              type="password" 
              required 
              placeholder="Enter your current password"
            />
          </div>

          <div class="field">
            <label class="field-label">New Password</label>
            <input 
              v-model="passwordForm.newPassword" 
              type="password" 
              required 
              placeholder="Enter your new password"
            />
          </div>

          <div class="field">
            <label class="field-label">Confirm New Password</label>
            <input 
              v-model="passwordForm.confirmPassword" 
              type="password" 
              required 
              placeholder="Confirm your new password"
            />
          </div>

          <button class="primary" type="submit" :disabled="isUpdatingPassword">
            {{ isUpdatingPassword ? 'Updating...' : 'Update Password' }}
          </button>
        </form>

        <div v-if="passwordMessage" :class="['message', passwordMessageType]">
          {{ passwordMessage }}
        </div>
      </div>

      <!-- Two-Factor Authentication Section -->
      <div class="settings-section">
        <h3>Two-Factor Authentication</h3>
        <p class="settings-description">
          Enhance your account security by enabling email-based two-factor authentication (OTP).
        </p>
        <div class="setting-row">
          <span>Enable Email OTP</span>
          <label class="toggle-switch">
            <input 
              v-model="twoFactorSettings.enabled" 
              type="checkbox" 
              @change="handleToggle2FA"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div v-if="twoFactorMessage" :class="['message', twoFactorMessageType]">
          {{ twoFactorMessage }}
        </div>
      </div>

      <!-- Danger Zone Section -->
      <div class="settings-section danger-zone">
        <h3>Delete Account</h3>
        <p class="settings-description danger-text">
          ⚠️ This action is permanent and cannot be undone. All your data will be permanently deleted.
        </p>
        <button 
          class="danger-btn" 
          type="button" 
          @click="handleDeleteAccount"
        >
          Delete Account
        </button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { api } from '@/api.js';

// Password form state
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});
const isUpdatingPassword = ref(false);
const passwordMessage = ref('');
const passwordMessageType = ref('');

// 2FA state
const twoFactorSettings = ref({
  enabled: false
});
const twoFactorMessage = ref('');
const twoFactorMessageType = ref('');

// Handle password change
const handleChangePassword = async () => {
  passwordMessage.value = '';

  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    passwordMessage.value = 'New passwords do not match.';
    passwordMessageType.value = 'error';
    return;
  }

  if (passwordForm.value.newPassword.length < 6) {
    passwordMessage.value = 'New password must be at least 6 characters.';
    passwordMessageType.value = 'error';
    return;
  }

  isUpdatingPassword.value = true;
  try {
    await api('/me/password', 'PUT', {
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword
    });

    passwordMessage.value = 'Password updated successfully!';
    passwordMessageType.value = 'success';

    // Clear form
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
  } catch (error) {
    passwordMessage.value = error.message || 'Failed to update password.';
    passwordMessageType.value = 'error';
  } finally {
    isUpdatingPassword.value = false;
  }
};

// Handle 2FA toggle
const handleToggle2FA = async () => {
  twoFactorMessage.value = '';
  try {
    await api('/me/profile', 'PUT', {
      twoFactorEnabled: twoFactorSettings.value.enabled
    });

    const action = twoFactorSettings.value.enabled ? 'enabled' : 'disabled';
    twoFactorMessage.value = `Two-factor authentication ${action} successfully!`;
    twoFactorMessageType.value = 'success';
  } catch (error) {
    twoFactorSettings.value.enabled = !twoFactorSettings.value.enabled;
    twoFactorMessage.value = error.message || 'Failed to update 2FA setting.';
    twoFactorMessageType.value = 'error';
  }
};

// Handle account deletion
const handleDeleteAccount = async () => {
  const confirmMessage = 'Are you sure you want to permanently delete your account? This cannot be undone. Type DELETE to confirm.';
  const userInput = prompt(confirmMessage);

  if (userInput === 'DELETE') {
    try {
      await api('/me', 'DELETE');
      // Redirect to login or home
      window.location.href = '/login';
    } catch (error) {
      alert(error.message || 'Failed to delete account.');
    }
  }
};
</script>

<style scoped>
.view {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.settings-panel {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.settings-header {
  margin-bottom: 30px;
  border-bottom: 2px solid #f0f0f0;
  padding-bottom: 15px;
}

.settings-header h2 {
  margin: 0;
  color: #333;
  font-size: 28px;
}

.settings-section {
  margin-bottom: 30px;
  padding-bottom: 30px;
  border-bottom: 1px solid #f0f0f0;
}

.settings-section:last-child {
  border-bottom: none;
}

.settings-section h3 {
  color: #333;
  font-size: 18px;
  margin-top: 0;
  margin-bottom: 15px;
}

.settings-description {
  color: #666;
  font-size: 14px;
  margin-bottom: 15px;
  line-height: 1.5;
}

.password-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  color: #333;
  font-weight: 500;
  font-size: 14px;
}

.field input {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.field input:focus {
  outline: none;
  border-color: #1773cb;
  box-shadow: 0 0 0 3px rgba(23, 115, 203, 0.1);
}

.primary {
  padding: 10px 20px;
  background: linear-gradient(135deg, #1773cb 0%, #1565b8 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.primary:hover:not(:disabled) {
  opacity: 0.9;
}

.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.message {
  padding: 12px 15px;
  border-radius: 6px;
  font-size: 14px;
  margin-top: 10px;
}

.message.success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.message.error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 6px;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 28px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.3s;
  border-radius: 28px;
}

.toggle-slider::before {
  position: absolute;
  content: '';
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: #1773cb;
}

input:checked + .toggle-slider::before {
  transform: translateX(22px);
}

.danger-zone {
  background-color: #fff5f5;
  border: 1px solid #ffb7c5;
  border-radius: 6px;
  padding: 20px;
  margin-top: 20px;
}

.danger-zone h3 {
  color: #c41e3a;
}

.danger-text {
  color: #c41e3a;
}

.danger-btn {
  padding: 10px 20px;
  background-color: #c41e3a;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.danger-btn:hover {
  opacity: 0.9;
}

@media (max-width: 600px) {
  .settings-panel {
    padding: 20px;
  }

  .settings-header h2 {
    font-size: 24px;
  }

  .setting-row {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
}
</style>
