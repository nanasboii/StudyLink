<template>
  <div class="view page active">
    <div class="search-row">
      <h2>Admin Activity Logs</h2>
      <button @click="loadActivity" class="chip" type="button">Refresh</button>
    </div>
    <div class="search-row">
      <input v-model="searchQuery" type="text" placeholder="Filter by action, admin, or target..." />
    </div>
    <p v-if="message" class="message">{{ message }}</p>
    <div class="list">
      <div v-for="log in filteredActivity" :key="log.id" class="list-item">
        <p><strong>{{ log.action }}</strong></p>
        <p class="meta">By {{ log.adminName }} • Target: {{ log.targetId }} • {{ log.timestamp }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api.js'

const activityLogs = ref([])
const searchQuery = ref('')
const message = ref('')

const filteredActivity = computed(() => {
  if (!searchQuery.value) return activityLogs.value
  const q = searchQuery.value.toLowerCase()
  return activityLogs.value.filter(
    (log) =>
      (log.action || '').toLowerCase().includes(q) ||
      (log.adminName || '').toLowerCase().includes(q) ||
      String(log.targetId || '').includes(q)
  )
})

const loadActivity = async () => {
  try {
    const resp = await api('/admin/activity-logs')
    activityLogs.value = resp.logs || []
  } catch (err) {
    message.value = `Error: ${err.message}`
  }
}

onMounted(() => {
  loadActivity()
})
</script>
