<template>
  <div class="view page active">
    <div class="search-row">
      <h2>Server Error Logs</h2>
      <button @click="loadErrors" class="chip" type="button">Refresh</button>
    </div>
    <div class="search-row">
      <input v-model="searchQuery" type="text" placeholder="Filter by path, method, status, or message..." />
    </div>
    <p v-if="message" class="message">{{ message }}</p>
    <div class="list">
      <div v-for="err in filteredErrors" :key="err.id" class="list-item card">
        <div class="error-header">
          <span class="error-status" :class="'status-' + err.status">{{ err.status }}</span>
          <strong>{{ err.method }} {{ err.path }}</strong>
        </div>
        <p class="meta">{{ err.timestamp }}</p>
        <p class="error-message">{{ err.message }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api.js'

const errors = ref([])
const searchQuery = ref('')
const message = ref('')

const filteredErrors = computed(() => {
  if (!searchQuery.value) return errors.value
  const q = searchQuery.value.toLowerCase()
  return errors.value.filter(
    (err) =>
      (err.path || '').toLowerCase().includes(q) ||
      (err.method || '').toLowerCase().includes(q) ||
      String(err.status || '').includes(q) ||
      (err.message || '').toLowerCase().includes(q)
  )
})

const loadErrors = async () => {
  try {
    const resp = await api('/admin/error-logs')
    errors.value = resp.errors || []
  } catch (err) {
    message.value = `Error: ${err.message}`
  }
}

onMounted(() => {
  loadErrors()
})
</script>

<style scoped>
.error-status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-right: 0.5rem;
}
.error-status.status-500 {
  background: #f8d7da;
  color: #721c24;
}
.error-status.status-404 {
  background: #fff3cd;
  color: #856404;
}
</style>
