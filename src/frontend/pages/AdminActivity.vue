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

<script>
import { api } from '../utils/api.js'
export default {
  name: 'AdminActivity',
  data() {
    return {
      activityLogs: [],
      searchQuery: '',
      message: '',
    }
  },
  computed: {
    filteredActivity() {
      if (!this.searchQuery) return this.activityLogs
      const q = this.searchQuery.toLowerCase()
      return this.activityLogs.filter(
        (log) =>
          log.action.toLowerCase().includes(q) ||
          log.adminName.toLowerCase().includes(q) ||
          log.targetId.toString().includes(q)
      )
    },
  },
  methods: {
    async loadActivity() {
      try {
        const resp = await api('/admin/activity-logs')
        this.activityLogs = resp.logs || []
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
    this.loadActivity()
  },
}
</script>
