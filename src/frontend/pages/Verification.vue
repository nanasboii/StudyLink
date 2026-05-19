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

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api, getUser } from '@/api.js'

const router = useRouter()
const currentUser = getUser()
if (!currentUser || currentUser.role !== 'tutor') {
  router.replace('/resources')
}

const verification = ref({ courseCode: '' })
const verificationFile = ref(null)
const applications = ref([])
const verificationNotifications = ref([])
const message = ref('')

const handleFileChange = (event) => {
  verificationFile.value = event.target.files[0] || null
}

const submitVerification = async () => {
  if (!verificationFile.value) {
    message.value = 'Please select a file'
    return
  }
  try {
    const formData = new FormData()
    formData.append('courseCode', verification.value.courseCode)
    formData.append('document', verificationFile.value)
    await api('/tutor-verifications', 'POST', formData)
    message.value = 'Verification submitted!'
    verification.value = { courseCode: '' }
    verificationFile.value = null
    await loadApplications()
  } catch (err) {
    message.value = `Error: ${err.message}`
  }
}

const loadApplications = async () => {
  try {
    const resp = await api('/tutor-verifications/me')
    applications.value = (resp.applications || []).map((item) => ({
      id: item.id,
      courseCode: item.course_code || item.courseCode || '',
      status: item.status || 'PENDING',
      createdAt: item.created_at ? new Date(item.created_at).toLocaleDateString() : '',
    }))
  } catch (err) {
    console.error('Failed to load applications:', err)
  }
}

const loadNotifications = async () => {
  try {
    const resp = await api('/tutor-verifications/me')
    verificationNotifications.value = (resp.applications || []).map((item) => ({
      id: item.id,
      message: `${item.course_code || item.courseCode}: ${item.status || 'PENDING'}`,
      createdAt: item.created_at ? new Date(item.created_at).toLocaleDateString() : '',
    }))
  } catch (err) {
    console.error('Failed to load notifications:', err)
  }
}

onMounted(() => {
  loadApplications()
  loadNotifications()
})
</script>
