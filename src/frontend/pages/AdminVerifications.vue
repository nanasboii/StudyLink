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
          <button v-if="app.status === 'PENDING'" @click="approveApplication(app.id)" class="chip" type="button">Approve</button>
          <button v-if="app.status === 'PENDING'" @click="rejectApplication(app.id)" class="chip" type="button">Reject</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { api } from '@/api.js'
export default {
  name: 'AdminVerifications',
  data() {
    return {
      applications: [],
      message: '',
    }
  },
  methods: {
    async loadApplications() {
      try {
        const resp = await api('/admin/verifications')
        this.applications = resp.applications || []
      } catch (err) {
        this.message = `Error: ${err.message}`
      }
    },
    async approveApplication(appId) {
      try {
        await api(`/admin/verifications/${appId}/approve`, 'PATCH')
        this.message = 'Application approved!'
        await this.loadApplications()
      } catch (err) {
        this.message = `Error: ${err.message}`
      }
    },
    async rejectApplication(appId) {
      try {
        await api(`/admin/verifications/${appId}/reject`, 'PATCH')
        this.message = 'Application rejected.'
        await this.loadApplications()
      } catch (err) {
        this.message = `Error: ${err.message}`
      }
    },
  },
  mounted() {
    const viewEl = document.querySelector('.view')
    const topbar = document.querySelector('.topbar')
    if (viewEl) {
      viewEl.scrollTop = topbar ? topbar.offsetHeight : 80
    }
    this.loadApplications()
  },
}
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
  background: #fff3cd;
  color: #856404;
}
.status-badge.approved {
  background: #d4edda;
  color: #155724;
}
.status-badge.rejected {
  background: #f8d7da;
  color: #721c24;
}
</style>
