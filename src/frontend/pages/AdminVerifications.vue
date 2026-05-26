<template>
  <div class="view page active">
    <div class="search-row">
      <h2>Tutor Verification Review</h2>
      <button @click="loadApplications" class="chip" type="button">Refresh</button>
    </div>
    <p v-if="message" class="message">{{ message }}</p>
    <div class="list">
      <div v-for="app in applications" :key="app.id" class="list-item card">
        <div class="admin-app-header">
          <div>
            <strong>{{ app.userName }}</strong>
            <p class="meta">{{ app.courseCode }} • {{ app.createdAt }}</p>
          </div>
          <span class="status-badge" :class="app.status.toLowerCase()">{{ app.status }}</span>
        </div>
        <p class="meta">{{ app.documentUrl }}</p>
        <div class="admin-app-actions">
          <button v-if="app.status === 'PENDING'" @click="decide(app.id, 'approved')" class="chip" type="button">Approve</button>
          <button v-if="app.status === 'PENDING'" @click="decide(app.id, 'rejected')" class="chip" type="button">Reject</button>
          <button v-if="app.status === 'PENDING'" @click="requestReupload(app.id)" class="chip" type="button">Request Re-upload</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/api.js'
import { normalizeAdminVerification } from '@/utils/records.js'

const applications = ref([])
const message = ref('')

const loadApplications = async () => {
  try {
    const resp = await api('/admin/tutor-verifications')
    applications.value = (resp.verifications || resp.applications || []).map(normalizeAdminVerification)
  } catch (err) {
    message.value = `Error: ${err.message}`
  }
}

const decide = async (appId, decision) => {
  try {
    await api(`/admin/tutor-verifications/${appId}/decision`, 'POST', { decision })
    message.value = decision === 'approved' ? 'Application approved!' : 'Application rejected.'
    await loadApplications()
  } catch (err) {
    message.value = `Error: ${err.message}`
  }
}

const requestReupload = async (appId) => {
  try {
    await api(`/admin/tutor-verifications/${appId}/request-reupload`, 'POST', {})
    message.value = 'Re-upload requested.'
    await loadApplications()
  } catch (err) {
    message.value = `Error: ${err.message}`
  }
}

onMounted(() => {
  loadApplications()
})
</script>

<style scoped>
.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}
.status-badge.pending {
  background: var(--warning-bg);
  color: var(--warning-ink);
}
.status-badge.approved {
  background: var(--success-bg);
  color: var(--success-ink);
}
.status-badge.rejected {
  background: var(--danger-bg);
  color: var(--danger-ink);
}
</style>
