<template>
  <div class="view page active">
    <h2>Upload Documents for Verification</h2>
    <form @submit.prevent="submitVerification" class="stack card">
      <label>Course Code
        <input v-model="verification.courseCode" placeholder="TMF3953" />
      </label>
      <p class="meta">Tip: enter any course code you teach (e.g., TMF3953, CS101, MATH2020).</p>
      <label>Verification File
        <input
          @change="handleFileChange"
          type="file"
          accept=".pdf,.doc,.docx,image/png,image/jpeg"
          required
        />
      </label>
      <p class="meta">Allowed: PDF, DOC, DOCX, PNG, JPEG. Max size: 10MB.</p>
      <button class="primary" type="submit">Submit for Verification</button>
    </form>
    <p v-if="message" class="message">{{ message }}</p>

    <section class="card app-section">
      <div class="search-row">
        <h3>My Latest Applications</h3>
        <button @click="loadApplications" class="chip" type="button">Refresh</button>
      </div>
      <div class="list">
        <div v-for="app in applications" :key="app.id" class="list-item">
          <p><strong>{{ app.courseCode }}</strong></p>
          <p class="meta">Status: {{ app.status }} • {{ app.createdAt }}</p>
        </div>
      </div>
    </section>

    <section class="card app-section">
      <div class="search-row">
        <h3>Recent Verification Notifications</h3>
        <button @click="loadNotifications" class="chip" type="button">Refresh</button>
      </div>
      <div class="list">
        <div v-for="notif in verificationNotifications" :key="notif.id" class="list-item">
          <p>{{ notif.message }}</p>
          <p class="meta">{{ notif.createdAt }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { api } from '@/api.js'

export default {
  name: 'Verification',
  data() {
    return {
      verification: { courseCode: '' },
      verificationFile: null,
      applications: [],
      verificationNotifications: [],
      message: '',
    }
  },
  methods: {
    handleFileChange(event) {
      this.verificationFile = event.target.files[0]
    },
    async submitVerification() {
      if (!this.verificationFile) {
        this.message = 'Please select a file'
        return
      }
      try {
        const formData = new FormData()
        formData.append('courseCode', this.verification.courseCode)
        formData.append('document', this.verificationFile)
        await api('/tutor-verifications', 'POST', formData)
        this.message = 'Verification submitted!'
        this.verification = { courseCode: '' }
        this.verificationFile = null
        await this.loadApplications()
      } catch (err) {
        this.message = `Error: ${err.message}`
      }
    },
    async loadApplications() {
      try {
        const resp = await api('/tutor-verifications/me')
        this.applications = resp.applications || []
      } catch (err) {
        console.error('Failed to load applications:', err)
      }
    },
    async loadNotifications() {
      try {
        const resp = await api('/tutor-verifications/me')
        // Display verification status as notification
        this.verificationNotifications = resp.applications || []
      } catch (err) {
        console.error('Failed to load notifications:', err)
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
    this.loadNotifications()
  },
}
</script>
