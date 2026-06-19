<template>
  <main class="view page active admin-resources-page">

    <!-- ── Header ── -->
    <div class="page-header">
      <div>
        <p class="page-kicker">Admin · Content</p>
        <h2>Resource Management</h2>
        <p class="page-subtext">View, edit and remove uploaded resources.</p>
      </div>
      <button @click="loadResources" class="chip chip-strong" type="button" :disabled="isLoading">
        {{ isLoading ? 'Loading…' : 'Refresh 🔄' }}
      </button>
    </div>

    <!-- ── Summary bar ── -->
    <div v-if="!isLoading && allResources.length" class="summary-bar">
      <div class="summary-stat card">
        <span class="summary-value">{{ allResources.length }}</span>
        <span class="summary-label">Total</span>
      </div>
      <div class="summary-stat card">
        <span class="summary-value">{{ uniqueUploaders }}</span>
        <span class="summary-label">Uploaders</span>
      </div>
      <div class="summary-stat card">
        <span class="summary-value">{{ uniqueCourses }}</span>
        <span class="summary-label">Courses</span>
      </div>
      <div class="summary-stat card">
        <span class="summary-value">{{ todayCount }}</span>
        <span class="summary-label">Today</span>
      </div>
    </div>

    <!-- ── Toolbar ── -->
    <div class="toolbar-row">
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search title, uploader or course…"
          class="search-input"
          aria-label="Search resources"
        />
        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''" type="button" aria-label="Clear search">×</button>
      </div>
      <select v-model="filterType" class="filter-select" aria-label="Filter by type">
        <option value="">All types</option>
        <option value="pdf">PDF</option>
        <option value="slides">Slides</option>
        <option value="lecture-note">Lecture Note</option>
        <option value="past-year">Past Year Paper</option>
        <option value="assignment">Assignment</option>
        <option value="link">External Link</option>
        <option value="miscellaneous">Miscellaneous</option>
      </select>
      <span v-if="!isLoading" class="result-count">
        {{ filteredResources.length }} / {{ allResources.length }} resource{{ allResources.length !== 1 ? 's' : '' }}
      </span>
    </div>

    <!-- ── Global message ── -->
    <p v-if="adminMessage" class="feedback-msg" :class="messageType" role="alert" aria-live="polite">
      {{ adminMessage }}
    </p>

    <!-- ── Resource list ── -->
    <div class="resource-list">
      <template v-if="isLoading">
        <div v-for="n in 6" :key="n" class="resource-card card skeleton-card">
          <div class="resource-card-main">
            <div class="skeleton-meta-row">
              <div class="skeleton-pill"></div>
              <div class="skeleton-pill narrow"></div>
            </div>
            <div class="skeleton-line title"></div>
            <div class="skeleton-line short"></div>
          </div>
        </div>
      </template>

      <div v-else-if="!filteredResources.length" class="empty-state card">
        <p class="empty-icon">📁</p>
        <p class="empty-text">No resources found.</p>
        <button v-if="searchQuery || filterType" class="chip chip-strong" @click="searchQuery = ''; filterType = ''" type="button">
          Clear filters ❌
        </button>
      </div>

      <article
        v-else
        v-for="resource in filteredResources"
        :key="resource.id"
        :id="`resource-card-${resource.id}`"
        class="resource-card card"
      >
        <div class="resource-card-main">
          <div class="resource-meta-row">
            <span class="type-pill">{{ resourceTypeLabel(resource.resource_type) }}</span>
            <span class="course-pill" v-if="resource.course_code">{{ resource.course_code }}</span>
            <!-- BUG FIX -> guard invalid date before formatting -->
            <span class="date-text">{{ formatDateValue(resource.created_at, resource.created_at) }}</span>
          </div>
          <h3 class="resource-title">{{ resource.title || 'Untitled Resource' }}</h3>
          <p class="uploader-line">
            <span class="uploader-icon">👤</span>
            {{ resource.uploader_name || 'Unknown' }}
            <span v-if="resource.uploader_email" class="uploader-email">({{ resource.uploader_email }})</span>
          </p>
        </div>

        <div class="resource-card-actions">
          <router-link
            :to="{ path: `/resources/${resource.id}`, query: { from: 'admin-resources' } }"
            class="chip chip-soft"
          >View 👀</router-link>
          <a
            v-if="resource.link_url"
            :href="resource.link_url"
            target="_blank"
            rel="noopener noreferrer"
            class="chip chip-soft"
          >Link 🔗</a>
          <button class="chip chip-soft" type="button" @click="openEdit(resource)">Edit ✏️</button>
          <button class="chip chip-danger" type="button" @click="confirmDelete(resource)" style="margin-left:auto">
            Delete 🗑️
          </button>
        </div>
      </article>
    </div>

    <!-- ── Edit Modal ── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="editTarget" class="modal-overlay" @click.self="closeEdit" role="dialog" aria-modal="true" aria-label="Edit resource">
          <div class="modal-card card">
            <div class="modal-header">
              <h3>Edit Resource ✏️</h3>
              <button class="close-btn" type="button" @click="closeEdit" aria-label="Close">×</button>
            </div>
            <form @submit.prevent="saveEdit" class="edit-form">
              <div class="field">
                <label>Title</label>
                <input ref="titleInputRef" v-model="editForm.title" type="text" required maxlength="200" />
              </div>
              <div class="field">
                <label>Resource Type</label>
                <select v-model="editForm.resourceType">
                  <option value="past-year">Past Year Paper</option>
                  <option value="lecture-note">Lecture Note</option>
                  <option value="slides">Slides</option>
                  <option value="pdf">PDF</option>
                  <option value="assignment">Assignment</option>
                  <option value="link">External Link</option>
                  <option value="miscellaneous">Miscellaneous</option>
                </select>
              </div>
              <div class="field">
                <label>Course Code <span class="optional">(optional)</span></label>
                <input v-model="editForm.courseCode" type="text" maxlength="20" placeholder="e.g. CS101" />
              </div>
              <p v-if="editMessage" class="feedback-msg error" role="alert">{{ editMessage }}</p>
              <div class="modal-actions">
                <button type="button" class="chip chip-soft" @click="closeEdit" :disabled="isSaving">Cancel</button>
                <button type="submit" class="chip chip-strong" :disabled="isSaving">
                  {{ isSaving ? 'Saving…' : 'Save Changes ✅' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>

      <!-- ── Delete Modal ── -->
      <Transition name="fade">
        <div v-if="deleteTarget" class="modal-overlay" @click.self="cancelDelete" role="dialog" aria-modal="true" aria-label="Delete resource">
          <div class="modal-card card modal-card-sm">
            <div class="modal-header">
              <h3>Delete Resource 🗑️</h3>
              <button class="close-btn" type="button" @click="cancelDelete" aria-label="Close">×</button>
            </div>
            <div class="delete-warning">
              <div class="delete-warning-icon">⚠️</div>
              <div>
                <p class="confirm-text">Delete <strong>{{ deleteTarget?.title }}</strong>?</p>
                <p class="confirm-subtext">Permanently removes resource and all reviews. Cannot be undone.</p>
              </div>
            </div>
            <div class="modal-actions">
              <button type="button" class="chip chip-soft" @click="cancelDelete" :disabled="isDeleting">Cancel</button>
              <button type="button" class="chip chip-danger" :disabled="isDeleting" @click="doDelete">
                {{ isDeleting ? 'Deleting…' : 'Delete Resource' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </main>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, requireRoleSession } from '@/api.js'
import { formatDateValue } from '@/utils/records.js'

const route = useRoute()
const router = useRouter()

// ── State ──────────────────────────────────────────────────────────────────
const allResources    = ref([])
const searchQuery     = ref('')
const filterType      = ref('')
const adminMessage    = ref('')
const messageType     = ref('success')
const isLoading       = ref(true)
const titleInputRef   = ref(null)
const editTarget      = ref(null)
const editForm        = ref({ title: '', resourceType: '', courseCode: '' })
const editMessage     = ref('')
const isSaving        = ref(false)
const deleteTarget    = ref(null)
const isDeleting      = ref(false)
const deepLinkHandled = ref(false)

let messageTimer = null

// ── Computed ───────────────────────────────────────────────────────────────
const uniqueUploaders = computed(() => new Set(allResources.value.map(r => r.uploader_email).filter(Boolean)).size)
const uniqueCourses   = computed(() => new Set(allResources.value.map(r => r.course_code).filter(Boolean)).size)

const todayCount = computed(() => {
  const today = new Date().toDateString()
  // BUG FIX -> guard invalid date
  return allResources.value.filter(r => {
    const d = new Date(r.created_at)
    return !isNaN(d) && d.toDateString() === today
  }).length
})

const anyModalOpen = computed(() => Boolean(editTarget.value || deleteTarget.value))

const RESOURCE_TYPE_LABELS = {
  'past-year':    'Past Year Paper',
  'lecture-note': 'Lecture Note',
  'slides':       'Slides',
  'slide':        'Slides',
  'pdf':          'PDF',
  'assignment':   'Assignment',
  'link':         'External Link',
  'miscellaneous':'Misc',
}

const resourceTypeLabel = (value) => {
  const key = String(value || '').trim().toLowerCase()
  return RESOURCE_TYPE_LABELS[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Unknown')
}

const filteredResources = computed(() => {
  let list = allResources.value
  if (filterType.value) list = list.filter(r => (r.resource_type || '') === filterType.value)
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return list
  return list.filter(r =>
    (r.title || '').toLowerCase().includes(q) ||
    (r.uploader_name || '').toLowerCase().includes(q) ||
    (r.uploader_email || '').toLowerCase().includes(q) ||
    (r.course_code || '').toLowerCase().includes(q) ||
    (r.resource_type || '').toLowerCase().includes(q)
  )
})

// ── Helpers ────────────────────────────────────────────────────────────────
const setAdminMessage = (text, type = 'success') => {
  adminMessage.value = text
  messageType.value = type
  if (messageTimer) clearTimeout(messageTimer)
  if (type === 'success') messageTimer = setTimeout(() => { adminMessage.value = '' }, 4000)
}

// ── Data load ──────────────────────────────────────────────────────────────
const loadResources = async () => {
  isLoading.value = true
  adminMessage.value = ''
  try {
    const response = await api('/admin/resources')
    allResources.value = response?.resources || []
    await handleDeepLinkedEdit()
  } catch (error) {
    setAdminMessage(`Error loading resources: ${error?.message ?? 'Unknown error'}`, 'error')
  } finally {
    isLoading.value = false
  }
}

// ── Edit ───────────────────────────────────────────────────────────────────
const openEdit = (resource) => {
  editTarget.value = resource
  editForm.value = {
    title: resource.title || '',
    resourceType: resource.resource_type || 'miscellaneous',
    courseCode: resource.course_code || '',
  }
  editMessage.value = ''
  nextTick(() => titleInputRef.value?.focus())
}

const closeEdit = () => {
  if (isSaving.value) return
  editTarget.value = null
}

const saveEdit = async () => {
  const trimmedTitle = editForm.value.title.trim()
  if (!trimmedTitle) {
    editMessage.value = 'Title cannot be empty.'
    return
  }
  isSaving.value = true
  editMessage.value = ''
  try {
    const resp = await api(`/resources/${editTarget.value.id}`, 'PUT', {
      title: trimmedTitle,
      resourceType: editForm.value.resourceType,
      courseCode: editForm.value.courseCode.trim() || null,
    })
    const idx = allResources.value.findIndex(r => r.id === editTarget.value.id)
    if (idx !== -1) {
      allResources.value[idx] = {
        ...allResources.value[idx],
        title: resp.resource.title,
        resource_type: resp.resource.resource_type,
        course_code: resp.resource.course_code,
      }
    }
    closeEdit()
    setAdminMessage('Resource updated. ✅', 'success')
  } catch (err) {
    editMessage.value = `Error: ${err?.message ?? 'Save failed'}`
  } finally {
    isSaving.value = false
  }
}

// ── Delete ─────────────────────────────────────────────────────────────────
const confirmDelete = (resource) => { deleteTarget.value = resource }
const cancelDelete  = () => { if (!isDeleting.value) deleteTarget.value = null }

const doDelete = async () => {
  if (!deleteTarget.value?.id) return
  isDeleting.value = true
  try {
    const targetId = deleteTarget.value.id
    await api(`/resources/${targetId}`, 'DELETE')
    allResources.value = allResources.value.filter(r => r.id !== targetId)
    cancelDelete()
    setAdminMessage('Resource deleted. 🗑️', 'success')
  } catch (error) {
    cancelDelete()
    setAdminMessage(error?.message || 'Failed to delete resource.', 'error')
  } finally {
    isDeleting.value = false
  }
}

// ── Deep link ──────────────────────────────────────────────────────────────
const handleDeepLinkedEdit = async () => {
  if (deepLinkHandled.value) return
  const raw = String(route.query.editResourceId || '').trim()
  if (!/^\d+$/.test(raw)) return
  const targetId = Number(raw)
  const target = allResources.value.find(r => Number(r.id) === targetId)
  if (!target) return
  deepLinkHandled.value = true
  await nextTick()
  document.getElementById(`resource-card-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  openEdit(target)
  router.replace({ path: '/admin/resources' })
}

// ── Keyboard / scroll lock ─────────────────────────────────────────────────
const handleKeydown = (e) => {
  if (e.key !== 'Escape') return
  if (deleteTarget.value) cancelDelete()
  else if (editTarget.value) closeEdit()
}

watch(anyModalOpen, open => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onMounted(() => {
  requireRoleSession('admin')
  window.addEventListener('keydown', handleKeydown)
  loadResources()
})

onBeforeUnmount(() => {
  if (messageTimer) clearTimeout(messageTimer)
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.admin-resources-page { padding-bottom: 3rem; }

/* ── Glass Card ── */
.card {
  border: 2px solid #021A54;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(2, 26, 84, 0.05);
}

/* ── Header ── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 2rem 2rem 1.25rem;
  flex-wrap: wrap;
}

.page-kicker {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #FF85BB;
  margin: 0 0 4px;
}

.page-header h2 { font-size: clamp(1.6rem, 2.5vw, 2.2rem); margin: 0 0 4px; color: #021A54; }
.page-subtext   { font-size: 0.9rem; color: rgba(2,26,84,0.7); font-weight: 600; margin: 0; }

/* ── Chips ── */
.chip {
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 800;
  padding: 8px 16px;
  border-radius: 8px;
  border: 2px solid #021A54;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 100ms;
  white-space: nowrap;
}
.chip:active   { transform: scale(0.96); }
.chip-strong   { background: #FF85BB;  color: #021A54; }
.chip-soft     { background: #F5F5F5;  color: #021A54; }
.chip-danger   { background: #FFCEE3;  color: #021A54; }

/* ── Summary bar ── */
.summary-bar {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0 2rem 1.25rem;
}

.summary-stat {
  flex: 1 1 80px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0.75rem 1rem;
}

.summary-value { font-size: 1.6rem; font-weight: 800; color: #021A54; line-height: 1.2; }
.summary-label { font-size: 0.73rem; font-weight: 800; text-transform: uppercase; color: #FF85BB; }

/* ── Toolbar ── */
.toolbar-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  padding: 0 2rem 1.25rem;
  align-items: center;
}

.search-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  border: 2px solid #021A54;
  border-radius: 999px;
  padding: 0 14px;
  background: #F5F5F5;
  min-width: 0;
}

.search-icon  { font-size: 16px; flex-shrink: 0; }

.search-input {
  border: none;
  background: transparent;
  padding: 10px 8px;
  width: 100%;
  color: #021A54;
  font-weight: 600;
  min-width: 0;
}

.search-input:focus { outline: none; }

.clear-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #021A54;
  line-height: 1;
  flex-shrink: 0;
}

.filter-select {
  border: 2px solid #021A54;
  border-radius: 999px;
  padding: 8px 16px;
  background: #F5F5F5;
  color: #021A54;
  font-weight: 700;
}

.result-count { font-size: 0.85rem; font-weight: 800; color: rgba(2,26,84,0.7); }

/* ── Feedback msg ── */
.feedback-msg {
  margin: 0 2rem 1rem;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 700;
  border: 2px solid;
}

.feedback-msg.success { background: rgba(34,134,82,0.08); border-color: rgba(34,134,82,0.3); color: #1a6b40; }
.feedback-msg.error   { background: #FFCEE3; border-color: #FF85BB; color: #021A54; }

/* ── Resource list ── */
.resource-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0 2rem 2rem;
}

.resource-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  flex-wrap: wrap;
}

.resource-card-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }

.resource-meta-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.type-pill, .course-pill {
  font-size: 12px;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 999px;
  border: 2px solid #021A54;
}

.type-pill   { background: #FFCEE3; color: #021A54; }
.course-pill { background: #F5F5F5; color: #021A54; }

.date-text { font-size: 0.8rem; color: rgba(2,26,84,0.6); font-weight: 600; }

.resource-title { font-size: 1rem; font-weight: 800; color: #021A54; margin: 0; }

.uploader-line { font-size: 0.85rem; color: rgba(2,26,84,0.7); font-weight: 600; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin: 0; }

.uploader-icon  { font-size: 0.9rem; }
.uploader-email { font-size: 0.8rem; }

.resource-card-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; flex-shrink: 0; }

/* ── Skeleton ── */
.skeleton-card {
  height: 100px;
  background: linear-gradient(90deg, rgba(255,255,255,0.4) 25%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.4) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  pointer-events: none;
}

.skeleton-meta-row { display: flex; gap: 8px; margin-bottom: 8px; }
.skeleton-pill { height: 20px; border-radius: 999px; background: rgba(2,26,84,0.08); }
.skeleton-pill       { width: 80px; }
.skeleton-pill.narrow{ width: 50px; }
.skeleton-line { height: 14px; border-radius: 6px; background: rgba(2,26,84,0.07); margin-bottom: 6px; }
.skeleton-line.title { width: 60%; }
.skeleton-line.short { width: 35%; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Empty state ── */
.empty-state { text-align: center; padding: 40px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
.empty-icon  { font-size: 2.5rem; margin: 0; }
.empty-text  { font-weight: 800; color: #021A54; margin: 0; }

/* ── Modals ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 26, 84, 0.45);
  backdrop-filter: blur(6px);
  display: grid;
  place-items: center;
  padding: 20px;
  z-index: 1200;
}

.modal-card {
  width: min(520px, 100%);
  border-radius: 20px;
  padding: 24px;
  max-height: calc(100dvh - 40px);
  overflow-y: auto;
}

.modal-card-sm { width: min(420px, 100%); }

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal-header h3 { font-size: 1.3rem; font-weight: 800; color: #021A54; margin: 0; }

.close-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 2px solid #021A54;
  background: #F5F5F5;
  color: #021A54;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  flex-shrink: 0;
}

.close-btn:hover { background: #FFCEE3; }

.edit-form { display: flex; flex-direction: column; gap: 16px; }

.field { display: flex; flex-direction: column; gap: 6px; }

.field label {
  font-size: 0.8rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #FF85BB;
}

.field .optional { font-weight: 600; text-transform: none; font-size: 0.75rem; color: rgba(2,26,84,0.55); }

.field input,
.field select {
  padding: 10px 14px;
  border: 2px solid #021A54;
  border-radius: 10px;
  background: #F5F5F5;
  font-size: 0.95rem;
  color: #021A54;
  font-weight: 600;
  outline: none;
}

.field input:focus,
.field select:focus { background: #fff; }

.delete-warning {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 16px;
  background: #FFCEE3;
  border: 2px solid #021A54;
  border-radius: 12px;
  margin-bottom: 20px;
}

.delete-warning-icon { font-size: 1.6rem; }
.confirm-text    { font-size: 1rem; margin: 0 0 6px; font-weight: 800; color: #021A54; }
.confirm-subtext { margin: 0; font-size: 0.85rem; font-weight: 600; color: rgba(2,26,84,0.8); }

.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }

/* ── Transitions ── */
.fade-enter-active, .fade-leave-active { transition: opacity 180ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── Responsive ── */
@media (max-width: 600px) {
  .page-header, .toolbar-row, .resource-list, .summary-bar { padding-left: 1rem; padding-right: 1rem; }
  .resource-card { flex-direction: column; }
  .resource-card-actions { width: 100%; }
  .toolbar-row { flex-direction: column; }
  .filter-select, .result-count { width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-card { animation: none; }
}
</style>