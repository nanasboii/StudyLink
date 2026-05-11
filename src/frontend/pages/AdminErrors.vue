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

<script>
import { api } from '../utils/api.js'
export default {
  name: 'AdminErrors',
  data() {
    return {
      errors: [],
      searchQuery: '',
      message: '',
    }
  },
  computed: {
    filteredErrors() {
      if (!this.searchQuery) return this.errors
      const q = this.searchQuery.toLowerCase()
      return this.errors.filter(
        (err) =>
          err.path.toLowerCase().includes(q) ||
          err.method.toLowerCase().includes(q) ||
          err.status.toString().includes(q) ||
          err.message.toLowerCase().includes(q)
      )
    },
  },
  methods: {
    async loadErrors() {
      try {
        const resp = await api('/admin/error-logs')
        this.errors = resp.errors || []
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
    this.loadErrors()
  },
}
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
