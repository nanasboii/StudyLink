<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active">
        
        <header class="sessions-header">
          <p class="kicker">Your Inbox</p>
          <h1>Tutoring Sessions</h1>
          <p class="subtitle">Manage your upcoming classes, pending requests, and history.</p>
        </header>

        <div v-if="isLoading" class="state-container">
          <div class="spinner"></div>
          <p>Loading your dashboard...</p>
        </div>

        <div v-else class="dashboard-content">
          
          <section class="session-group" v-if="pendingSessions.length > 0 || isTutor">
            <div class="section-header">
              <h2>{{ isTutor ? 'My Requests' : 'Pending Requests' }}</h2>
              <span v-if="pendingSessions.length > 0" class="badge-count">{{ pendingSessions.length }}</span>
            </div>
            
            <div v-if="pendingSessions.length === 0" class="empty-block">
              <p>You have no pending requests.</p>
            </div>
            
            <div v-else class="cards-list">
              <div v-for="session in pendingSessions" :key="session.id" class="session-card">
                <div class="card-top">
                  <span class="course-pill">{{ session.course_code }}</span>
                  <div class="status-indicator pending">
                    <span class="dot"></span> Pending
                  </div>
                </div>
                
                <div class="card-middle">
                  <h3 class="user-name">
                    {{ isTutor ? session.tutee_name : session.tutor_name }}
                    <span class="role-tag">{{ isTutor ? 'Tutee' : 'Tutor' }}</span>
                  </h3>
                  
                  <div class="info-row time">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{{ formatTime(session.session_time) }}</span>
                  </div>

                  <div v-if="session.notes" class="info-row notes">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p>{{ session.notes }}</p>
                  </div>
                </div>

                <div class="card-bottom">
                  <template v-if="isTutor">
                    <button class="btn btn-primary" @click="updateStatus(session.id, 'accepted')">Accept</button>
                    <button class="btn btn-outline-danger" @click="updateStatus(session.id, 'rejected')">Reject</button>
                  </template>
                  <template v-else>
                    <button class="btn btn-ghost" @click="cancelSession(session.id)">Cancel Request</button>
                  </template>
                </div>
              </div>
            </div>
          </section>

          <section class="session-group">
            <div class="section-header">
              <h2>Upcoming Classes</h2>
              <span v-if="upcomingSessions.length > 0" class="badge-count green">{{ upcomingSessions.length }}</span>
            </div>
            
            <div v-if="upcomingSessions.length === 0" class="empty-block">
              <p>No upcoming classes scheduled.</p>
            </div>
            
            <div v-else class="cards-list">
              <div v-for="session in upcomingSessions" :key="session.id" class="session-card">
                <div class="card-top">
                  <span class="course-pill">{{ session.course_code }}</span>
                  <div class="status-indicator accepted">
                    <span class="dot"></span> Accepted
                  </div>
                </div>
                
                <div class="card-middle">
                  <h3 class="user-name">
                    {{ isTutor ? session.tutee_name : session.tutor_name }}
                    <span class="role-tag">{{ isTutor ? 'Tutee' : 'Tutor' }}</span>
                  </h3>
                  
                  <div class="info-row time">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{{ formatTime(session.session_time) }}</span>
                  </div>
                </div>

                <div class="card-bottom">
                  <template v-if="isTutor">
                    <button class="btn btn-success" @click="completeSession(session.id)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                      Mark Complete
                    </button>
                  </template>
                  <button class="btn btn-ghost" @click="cancelSession(session.id)">Cancel</button>
                </div>
              </div>
            </div>
          </section>

          <section class="session-group" v-if="historySessions.length > 0">
            <div class="section-header">
              <h2>History</h2>
            </div>
            <div class="cards-list">
              <div v-for="session in historySessions" :key="session.id" class="session-card opacity-muted">
                <div class="card-top">
                  <span class="course-pill">{{ session.course_code }}</span>
                  <div class="status-indicator" :class="session.status">
                    <span class="dot"></span> {{ session.status }}
                  </div>
                </div>
                
                <div class="card-middle" style="margin-bottom: 0;">
                  <h3 class="user-name">
                    {{ isTutor ? session.tutee_name : session.tutor_name }}
                    <span class="role-tag">{{ isTutor ? 'Tutee' : 'Tutor' }}</span>
                  </h3>
                  <div class="info-row time">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{{ formatTime(session.session_time) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api, getUser, showToast } from '@/api.js'

const currentUser = getUser() || {}
const isTutor = currentUser.role === 'tutor'

const sessions = ref([])
const isLoading = ref(true)

const loadSessions = async () => {
  isLoading.value = true
  try {
    const data = await api('/bookings/inbox')
    sessions.value = data.bookings || []
  } catch (err) {
    showToast('Failed to load sessions', 'error')
    console.error(err)
  } finally {
    isLoading.value = false
  }
}

// Compute the different categories for the dashboard
const pendingSessions = computed(() => sessions.value.filter(s => s.status === 'pending'))
const upcomingSessions = computed(() => sessions.value.filter(s => s.status === 'accepted'))
const historySessions = computed(() => sessions.value.filter(s => ['completed', 'rejected', 'cancelled'].includes(s.status)))

const formatTime = (isoString) => {
  const date = new Date(isoString)
  return date.toLocaleString('en-US', { 
    weekday: 'short', month: 'short', day: 'numeric', 
    hour: 'numeric', minute: '2-digit' 
  })
}

const updateStatus = async (id, decision) => {
  try {
    await api(`/bookings/${id}/decision`, 'POST', { decision })
    showToast(`Session ${decision}!`, 'success')
    await loadSessions()
  } catch (err) {
    showToast(err.message, 'error')
  }
}

const completeSession = async (id) => {
  try {
    await api(`/bookings/${id}/complete`, 'POST')
    showToast('Session marked as completed!', 'success')
    await loadSessions()
  } catch (err) {
    showToast(err.message, 'error')
  }
}

const cancelSession = async (id) => {
  if (!confirm('Are you sure you want to cancel this session?')) return
  try {
    await api(`/bookings/${id}/cancel`, 'POST')
    showToast('Session cancelled.', 'info')
    await loadSessions()
  } catch (err) {
    showToast(err.message, 'error')
  }
}

onMounted(() => {
  loadSessions()
})
</script>

<style scoped>
/* Page Layout */
.page-bg {
  min-height: 100vh;
  background: linear-gradient(180deg, #fafafa 0%, #fff5f8 100%);
  display: block;
}

.view {
  padding: 24px 16px;
  max-width: 800px;
  margin: 0 auto;
}

/* Header */
.sessions-header {
  margin-bottom: 24px;
}

.kicker {
  color: #c41e3a;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin: 0 0 8px;
}

.sessions-header h1 {
  font-size: 28px;
  font-weight: 800;
  color: #2d3748;
  margin: 0 0 8px;
  letter-spacing: -0.5px;
}

.subtitle {
  color: #718096;
  font-size: 15px;
  margin: 0;
}

/* Dashboard Sections */
.session-group {
  margin-bottom: 36px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.section-header h2 {
  font-size: 20px;
  font-weight: 800;
  color: #1a202c;
  margin: 0;
}

.badge-count {
  background: #c41e3a;
  color: white;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  font-weight: 700;
}

.badge-count.green {
  background: #38a169;
}

.empty-block {
  background: white;
  border: 1px dashed #cbd5e0;
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  color: #a0aec0;
  font-size: 14px;
}

/* States */
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #a0aec0;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #c41e3a;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* Session Cards */
.cards-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.session-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.session-card.opacity-muted {
  opacity: 0.75;
}

.session-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(196, 30, 58, 0.08);
  border-color: #ffb7c5;
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.course-pill {
  background: #2d3748;
  color: white;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 6px;
  letter-spacing: 0.5px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  text-transform: capitalize;
  padding: 4px 10px;
  border-radius: 999px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

/* Status Colors */
.status-indicator.pending { background: #fffaf0; color: #dd6b20; }
.status-indicator.pending .dot { background: #ed8936; }

.status-indicator.accepted { background: #f0fff4; color: #2f855a; }
.status-indicator.accepted .dot { background: #48bb78; }

.status-indicator.rejected, .status-indicator.cancelled { background: #fff5f5; color: #c53030; }
.status-indicator.rejected .dot, .status-indicator.cancelled .dot { background: #f56565; }

.status-indicator.completed { background: #ebf8ff; color: #2b6cb0; }
.status-indicator.completed .dot { background: #4299e1; }

.card-middle {
  margin-bottom: 20px;
}

.user-name {
  font-size: 18px;
  font-weight: 700;
  color: #1a202c;
  margin: 0 0 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-tag {
  font-size: 11px;
  font-weight: 600;
  background: #edf2f7;
  color: #4a5568;
  padding: 2px 8px;
  border-radius: 4px;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: #4a5568;
  font-size: 14px;
  margin-bottom: 8px;
}

.info-row svg {
  width: 18px;
  height: 18px;
  color: #c41e3a;
  flex-shrink: 0;
  margin-top: 2px;
}

.info-row.notes p {
  margin: 0;
  background: #fff5f7;
  padding: 10px 14px;
  border-radius: 8px;
  border-left: 3px solid #c41e3a;
  font-style: italic;
  width: 100%;
}

.card-bottom {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid #edf2f7;
}

/* Buttons */
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn svg {
  width: 16px;
  height: 16px;
}

.btn-primary { background: #c41e3a; color: white; flex: 1; }
.btn-primary:hover { background: #a01830; }

.btn-success { background: #38a169; color: white; flex: 1; }
.btn-success:hover { background: #2f855a; }

.btn-outline-danger { background: transparent; color: #e53e3e; border: 1px solid #e53e3e; flex: 1;}
.btn-outline-danger:hover { background: #fff5f5; }

.btn-ghost { background: #edf2f7; color: #4a5568; width: 100%;}
.btn-ghost:hover { background: #e2e8f0; }
</style>
