<template>
  <div class="view page active">
    <section class="card settings-header">
      <h2>Account Settings</h2>
      <p>Manage your account security and preferences</p>
    </section>

    <section class="card settings-panel">
      <div class="settings-section">
        <h3>Security</h3>
        
        <div class="settings-item">
          <div class="settings-item-info">
            <label>Two-Factor Authentication (2FA)</label>
            <p class="settings-hint">Add an extra layer of security to your account</p>
          </div>
          <div class="settings-item-action">
            <button 
              @click="toggle2FA" 
              class="chip"
              :class="{ active: twoFactorEnabled }"
            >
              {{ twoFactorEnabled ? 'Enabled' : 'Disabled' }}
            </button>
          </div>
        </div>

        <div class="settings-item">
          <div class="settings-item-info">
            <label>Change Password</label>
            <p class="settings-hint">Update your password regularly for security</p>
          </div>
          <div class="settings-item-action">
            <button @click="showPasswordModal = true" class="chip">Change</button>
          </div>
        </div>
      </div>

      <div class="settings-divider"></div>

      <div class="settings-section">
        <h3>Danger Zone</h3>
        
        <div class="settings-item danger">
          <div class="settings-item-info">
            <label>Delete Account</label>
            <p class="settings-hint">Permanently delete your account and all associated data</p>
          </div>
          <div class="settings-item-action">
            <button @click="showDeleteModal = true" class="chip danger">Delete Account</button>
          </div>
        </div>
      </div>
    </section>

    <p v-if="message" class="message" :class="{ error: messageType === 'error' }">{{ message }}</p>

    <!-- Change Password Modal -->
    <div v-if="showPasswordModal" class="modal-overlay" @click="showPasswordModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>Change Password</h2>
          <button class="close-btn" @click="showPasswordModal = false">&times;</button>
        </div>
        
        <form @submit.prevent="changePassword" class="modal-form">
          <label class="field">
            <span>Current Password</span>
            <input v-model="passwordForm.current" type="password" required />
          </label>

          <label class="field">
            <span>New Password</span>
            <input v-model="passwordForm.new" type="password" required />
          </label>

          <label class="field">
            <span>Confirm Password</span>
            <input v-model="passwordForm.confirm" type="password" required />
          </label>

          <div class="modal-actions">
            <button type="button" @click="showPasswordModal = false" class="secondary">Cancel</button>
            <button type="submit" class="primary">Change Password</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Account Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="showDeleteModal = false">
      <div class="modal-content danger" @click.stop>
        <div class="modal-header">
          <h2>Delete Account</h2>
          <button class="close-btn" @click="showDeleteModal = false">&times;</button>
        </div>
        
        <p class="danger-text">This action cannot be undone. All your data will be permanently deleted.</p>
        
        <form @submit.prevent="deleteAccount" class="modal-form">
          <label class="field">
            <span>Enter your email to confirm</span>
            <input v-model="deleteForm.confirmEmail" type="email" placeholder="your@email.com" required />
          </label>

          <label class="field">
            <span>Enter your password to confirm</span>
            <input v-model="deleteForm.password" type="password" required />
          </label>

          <div class="modal-actions">
            <button type="button" @click="showDeleteModal = false" class="secondary">Cancel</button>
            <button type="submit" class="danger">Delete My Account</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script>
import { api, getUser, clearSession } from '@/api.js'
import { useRouter } from 'vue-router'

export default {
  name: 'Settings',
  setup() {
    const router = useRouter()
    const user = getUser() || {}

    return {
      router,
      userEmail: user.email || '',
      twoFactorEnabled: user.two_factor_enabled || false,
      showPasswordModal: false,
      showDeleteModal: false,
      passwordForm: {
        current: '',
        new: '',
        confirm: ''
      },
      deleteForm: {
        confirmEmail: '',
        password: ''
      },
      message: '',
      messageType: 'success'
    }
  },
  methods: {
    async toggle2FA() {
      try {
        await api('/auth/2fa/toggle', 'POST', {
          enable: !this.twoFactorEnabled
        })
        this.twoFactorEnabled = !this.twoFactorEnabled
        this.message = `2FA ${this.twoFactorEnabled ? 'enabled' : 'disabled'}`
        this.messageType = 'success'
      } catch (error) {
        this.message = error.message || 'Failed to update 2FA'
        this.messageType = 'error'
      }
    },

    async changePassword() {
      if (this.passwordForm.new !== this.passwordForm.confirm) {
        this.message = 'Passwords do not match'
        this.messageType = 'error'
        return
      }

      if (this.passwordForm.new.length < 8) {
        this.message = 'Password must be at least 8 characters'
        this.messageType = 'error'
        return
      }

      try {
        await api('/auth/change-password', 'POST', {
          currentPassword: this.passwordForm.current,
          newPassword: this.passwordForm.new
        })
        this.message = 'Password changed successfully'
        this.messageType = 'success'
        this.showPasswordModal = false
        this.passwordForm = { current: '', new: '', confirm: '' }
      } catch (error) {
        this.message = error.message || 'Failed to change password'
        this.messageType = 'error'
      }
    },

    async deleteAccount() {
      if (this.deleteForm.confirmEmail !== this.userEmail) {
        this.message = 'Email does not match'
        this.messageType = 'error'
        return
      }

      try {
        await api('/auth/delete-account', 'POST', {
          password: this.deleteForm.password
        })
        clearSession()
        this.router.push('/login')
      } catch (error) {
        this.message = error.message || 'Failed to delete account'
        this.messageType = 'error'
      }
    }
  }
}
</script>

<style scoped>
.settings-header {
  background: linear-gradient(135deg, #214c8f 0%, #c41e3a 100%);
  color: white;
  padding: 24px;
  border-radius: 8px;
  margin-bottom: 24px;
}

.settings-header h2 {
  margin: 0 0 8px;
  font-size: 24px;
}

.settings-header p {
  margin: 0;
  opacity: 0.9;
}

.settings-panel {
  padding: 24px;
}

.settings-section {
  margin-bottom: 24px;
}

.settings-section h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #333;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.settings-section:last-child h3 {
  color: #d92f3a;
}

.settings-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 12px;
  gap: 16px;
}

.settings-item.danger {
  background: #fff5f5;
  border: 1px solid #ffc4ce;
}

.settings-item-info {
  flex: 1;
}

.settings-item-info label {
  display: block;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.settings-hint {
  margin: 0;
  font-size: 12px;
  color: #666;
}

.settings-item-action {
  flex-shrink: 0;
}

.settings-divider {
  height: 1px;
  background: #e0e0e0;
  margin: 24px 0;
}

.chip {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 20px;
  background: white;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 150ms ease;
}

.chip:hover {
  border-color: #c41e3a;
  color: #c41e3a;
}

.chip.active {
  background: #c41e3a;
  color: white;
  border-color: #c41e3a;
}

.chip.danger {
  border-color: #d92f3a;
  color: #d92f3a;
}

.chip.danger:hover {
  background: #d92f3a;
  color: white;
}

.message {
  margin-top: 16px;
  padding: 12px;
  border-radius: 8px;
  background: #e8f5e9;
  color: #2e7d32;
  font-size: 13px;
}

.message.error {
  background: #ffebee;
  color: #d92f3a;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 420px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-content.danger {
  border: 1px solid #ffb7c5;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.field {
  display: flex;
  flex-direction: column;
}

.field span {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #333;
}

.field input {
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
}

.field input:focus {
  outline: none;
  border-color: #c41e3a;
  box-shadow: 0 0 0 3px rgba(196, 30, 58, 0.1);
}

.danger-text {
  background: #ffebee;
  padding: 12px;
  border-radius: 6px;
  color: #d92f3a;
  font-size: 13px;
  margin-bottom: 20px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.primary,
.secondary,
.danger {
  padding: 10px 20px;
  border-radius: 6px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 150ms ease;
}

.primary {
  background: #c41e3a;
  color: white;
}

.primary:hover {
  background: #b01830;
}

.secondary {
  background: #f0f0f0;
  color: #333;
  border: 1px solid #ddd;
}

.secondary:hover {
  background: #e0e0e0;
}

.danger {
  background: #d92f3a;
  color: white;
}

.danger:hover {
  background: #c01830;
}

.view {
  padding: 20px;
}

.card {
  background: white;
  border-radius: 12px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 20px;
}

.page {
  animation: fadeIn 200ms ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (max-width: 640px) {
  .settings-item {
    flex-direction: column;
    align-items: flex-start;
  }

  .settings-item-action {
    width: 100%;
  }

  .settings-item-action .chip {
    width: 100%;
    text-align: center;
  }

  .modal-content {
    width: 95%;
  }
}
</style>
