<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active admin-resources-page">

        <div class="page-header">
          <div>
            <p class="page-kicker">Admin · Content</p>
            <h2>Resource Management</h2>
            <p class="page-subtext">View, edit and remove uploaded resources.</p>
          </div>
          <button @click="loadResources" class="chip" type="button" :disabled="isLoading">
            {{ isLoading ? 'Loading…' : 'Refresh' }}
          </button>
        </div>

        <div class="summary-bar" v-if="!isLoading && allResources.length">
          <div class="summary-stat">
            <span class="summary-value">{{ allResources.length }}</span>
            <span class="summary-label">Total</span>
          </div>
          <div class="summary-stat">
            <span class="summary-value">{{ uniqueUploaders }}</span>
            <span class="summary-label">Uploaders</span>
          </div>
          <div class="summary-stat">
            <span class="summary-value">{{ uniqueCourses }}</span>
            <span class="summary-label">Courses</span>
          </div>
          <div class="summary-stat">
            <span class="summary-value">{{ todayCount }}</span>
            <span class="summary-label">Today</span>
          </div>
        </div>

        <div class="toolbar-row">
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Search by title, uploader or course…"
          />
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
          <span class="result-count" v-if="!isLoading">
            {{ filteredResources.length }} of {{ allResources.length }} resource{{ allResources.length !== 1 ? 's' : '' }}
          </span>
        </div>

        <p v-if="adminMessage" class="feedback-msg" :class="messageType">{{ adminMessage }}</p>

        <div class="resource-list">
          
          <template v-if="isLoading">
            <div v-for="n in 6" :key="n" class="resource-card skeleton-card">
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

          <div v-else-if="filteredResources.length === 0" class="empty-state">No resources found.</div>

          <article
            v-else
            v-for="resource in filteredResources"
            :key="resource.id"
            :id="`resource-card-${resource.id}`"
            class="resource-card"
          >
            <div class="resource-card-main">
              <div class="resource-meta-row">
                <span class="type-pill">{{ resourceTypeLabel(resource.resource_type) }}</span>
                <span class="course-pill" v-if="resource.course_code">{{ resource.course_code }}</span>
                <span class="date-text">{{ formatDateValue(resource.created_at, resource.created_at) }}</span>
              </div>

              <h3 class="resource-title">{{ resource.title || 'Untitled Resource' }}</h3>

              <p class="uploader-line">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4.42 0-8 2.46-8 5.5 0 .55.45 1 1 1h14c.55 0 1-.45 1-1 0-3.04-3.58-5.5-8-5.5z"/></svg>
                {{ resource.uploader_name || 'Unknown' }}
                <span v-if="resource.uploader_email" class="uploader-email">({{ resource.uploader_email }})</span>
              </p>
            </div>

            <div class="resource-card-actions">
              <router-link
                :to="{ path: `/resources/${resource.id}`, query: { from: 'admin-resources' } }"
                class="chip chip-soft"
              >View</router-link>
              <a
                v-if="resource.link_url"
                :href="resource.link_url"
                target="_blank"
                rel="noopener noreferrer"
                class="chip chip-soft"
              >Link</a>
              <button class="chip" type="button" @click="openEdit(resource)">Edit</button>
              
              <button 
                class="chip chip-danger" 
                type="button" 
                @click="confirmDelete(resource)" 
                style="margin-left: auto;"
              >
                Delete
              </button>
            </div>
          </article>
        </div>

        <div v-if="editTarget" class="modal-overlay" @click.self="closeEdit">
          <div class="modal-card" role="dialog" aria-modal="true">
            <div class="modal-header">
              <h3>Edit Resource</h3>
              <button class="close-btn" type="button" @click="closeEdit">&times;</button>
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
              <p v-if="editMessage" class="feedback-msg error">{{ editMessage }}</p>
              <div class="modal-actions">
                <button type="button" class="chip" @click="closeEdit">Cancel</button>
                <button type="submit" class="chip chip-strong" :disabled="isSaving">
                  {{ isSaving ? 'Saving…' : 'Save Changes' }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div v-if="deleteTarget" class="modal-overlay" @click.self="cancelDelete">
          <div class="modal-card modal-card-sm" role="dialog" aria-modal="true" aria-label="Delete resource">
            <div class="modal-header">
              <h3>Delete Resource</h3>
              <button class="close-btn" type="button" aria-label="Close" @click="cancelDelete">&times;</button>
            </div>
            <div class="delete-warning">
              <div class="delete-warning-icon">⚠️</div>
              <div>
                <p class="confirm-text">
                  Delete <strong>{{ deleteTarget?.title }}</strong>?
                </p>
                <p class="confirm-subtext">This will permanently remove the resource and all its reviews. This cannot be undone.</p>
              </div>
            </div>
            <div class="modal-actions">
              <button type="button" class="chip" @click="cancelDelete">Cancel</button>
              <button type="button" class="chip chip-danger" :disabled="isDeleting" @click="doDelete">
                {{ isDeleting ? 'Deleting…' : 'Delete Resource' }}
              </button>
            </div>
          </div>
        </div>

      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, requireRoleSession } from '@/api.js'
import { formatDateValue } from '@/utils/records.js'

const route = useRoute()
const router = useRouter()

const allResources = ref([])
const searchQuery = ref('')
const filterType = ref('')
const adminMessage = ref('')
const messageType = ref('success')
const isLoading = ref(true)

let messageTimer = null // BUG 6: Timer for auto-clearing messages

const titleInputRef = ref(null)

// Edit state
const editTarget = ref(null)
const editForm = ref({ title: '', resourceType: '', courseCode: '' })
const editMessage = ref('')
const isSaving = ref(false)

// Delete state
const deleteTarget = ref(null)
const isDeleting = ref(false)
const deepLinkHandled = ref(false)

// IMPROVEMENT 1: Summary Bar Computed Props
const uniqueUploaders = computed(() => new Set(allResources.value.map(r => r.uploader_email).filter(Boolean)).size)
const uniqueCourses = computed(() => new Set(allResources.value.map(r => r.course_code).filter(Boolean)).size)
const todayCount = computed(() => {
  const today = new Date().toDateString()
  return allResources.value.filter(r => new Date(r.created_at).toDateString() === today).length
})

// BUG 4: Modal state tracker for keyboard shortcuts and scroll lock
const anyModalOpen = computed(() => Boolean(editTarget.value || deleteTarget.value))

// IMPROVEMENT 4: Human-readable type mapping
const RESOURCE_TYPE_LABELS = {
  'past-year': 'Past Year Paper',
  'lecture-note': 'Lecture Note',
  'slides': 'Slides',
  'slide': 'Slides',
  'pdf': 'PDF',
  'assignment': 'Assignment',
  'link': 'External Link',
  'miscellaneous': 'Misc',
}

const resourceTypeLabel = (value) => {
  const key = String(value || '').trim().toLowerCase()
  return RESOURCE_TYPE_LABELS[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : 'Unknown')
}

// BUG 6 Fix: Auto-clearing messages
const setAdminMessage = (text, type = 'success') => {
  adminMessage.value = text
  messageType.value = type
  if (messageTimer) clearTimeout(messageTimer)
  messageTimer = setTimeout(() => { adminMessage.value = '' }, 4000)
}

// BUG 7 Fix & IMPROVEMENT 2: Search now includes resource_type and filterType
const filteredResources = computed(() => {
  let list = allResources.value
  if (filterType.value) {
    list = list.filter(r => (r.resource_type || '') === filterType.value)
  }
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

const loadResources = async () => {
  isLoading.value = true
  adminMessage.value = ''
  try {
    const response = await api('/admin/resources')
    allResources.value = response.resources || []
    await handleDeepLinkedEdit()
  } catch (error) {
    setAdminMessage(`Error loading resources: ${error.message}`, 'error')
  } finally {
    isLoading.value = false
  }
}

const openEdit = (resource) => {
  editTarget.value = resource
  editForm.value = {
    title: resource.title || '',
    resourceType: resource.resource_type || 'miscellaneous',
    courseCode: resource.course_code || '',
  }
  editMessage.value = ''
  // BUG 5 Fix: Auto-focus the title input when modal opens
  nextTick(() => titleInputRef.value?.focus())
}

const closeEdit = () => { editTarget.value = null }

const saveEdit = async () => {
  const trimmedTitle = editForm.value.title.trim()
  
  // BUG 2 Fix: Client-side guard against empty whitespace titles
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
    
    // Update local state instead of full reload
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
    setAdminMessage('Resource updated.', 'success')
  } catch (err) {
    editMessage.value = `Error: ${err.message}`
  } finally {
    isSaving.value = false
  }
}

const confirmDelete = (resource) => { deleteTarget.value = resource }
const cancelDelete = () => { deleteTarget.value = null }

const doDelete = async () => {
  if (!deleteTarget.value?.id) return

  isDeleting.value = true
  try {
    const targetId = deleteTarget.value.id
    await api(`/resources/${targetId}`, 'DELETE')
    
    // BUG 3 Fix: Local array removal prevents a full API reload and flashing
    allResources.value = allResources.value.filter(r => r.id !== targetId)
    
    cancelDelete()
    setAdminMessage('Resource deleted.', 'success')
  } catch (error) {
    cancelDelete()
    setAdminMessage(error.message || 'Failed to delete resource.', 'error')
  } finally {
    isDeleting.value = false
  }
}

const handleDeepLinkedEdit = async () => {
  if (deepLinkHandled.value) return

  const raw = String(route.query.editResourceId || '').trim()
  if (!/^\d+$/.test(raw)) return

  const targetId = Number(raw)
  const target = allResources.value.find((resource) => Number(resource.id) === targetId)
  if (!target) return

  deepLinkHandled.value = true
  await nextTick()

  const card = document.getElementById(`resource-card-${targetId}`)
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  openEdit(target)
  router.replace({ path: '/admin/resources' })
}

// BUG 4 Fix: Global Keydown handler for Escape to close modals
const handleKeydown = (e) => {
  if (e.key !== 'Escape') return
  if (deleteTarget.value) cancelDelete()
  else if (editTarget.value) closeEdit()
}

// BUG 4 Fix: Body scroll lock to prevent scrolling background while modal is open
watch(anyModalOpen, (open) => {
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
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  margin: 0 0 0.25rem;
}
.page-header h2 { font-size: clamp(1.4rem, 2.5vw, 2rem); margin: 0 0 0.25rem; }
.page-subtext { font-size: 0.85rem; color: var(--glass-pink-muted); margin: 0; }

/* ── Summary Bar ── */
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
  border-radius: 14px;
  background: var(--glass-pink-surface-strong);
  border: 1px solid var(--glass-pink-border);
}
.summary-value { font-size: 1.4rem; font-weight: 700; color: var(--ink); line-height: 1; }
.summary-label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--glass-pink-muted); }

/* ── Toolbar ── */
.toolbar-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 2rem 1.25rem;
  flex-wrap: wrap;
}
.toolbar-row input {
  flex: 1;
  min-width: 200px;
  padding: 0.6rem 1rem;
  border: 1px solid var(--glass-pink-border);
  border-radius: 12px;
  background: rgba(255,255,255,0.8);
  font-size: 0.9rem;
  color: var(--ink);
  outline: none;
  transition: border-color 150ms;
}
.toolbar-row input:focus { border-color: var(--accent); }

.filter-select {
  padding: 0.6rem 1rem;
  border: 1px solid var(--glass-pink-border);
  border-radius: 12px;
  background: rgba(255,255,255,0.8);
  font-size: 0.9rem;
  color: var(--ink);
  outline: none;
  min-width: 140px;
}
.filter-select:focus { border-color: var(--accent); }

.result-count {
  font-size: 0.8rem;
  color: var(--glass-pink-muted);
  white-space: nowrap;
}

/* ── Feedback ── */
.feedback-msg {
  margin: 0 2rem 1rem;
  padding: 0.7rem 1rem;
  border-radius: 10px;
  font-size: 0.875rem;
}
.feedback-msg.success {
  background: rgba(34,134,82,0.1);
  border: 1px solid rgba(34,134,82,0.22);
  color: #1b7a4a;
}
.feedback-msg.error {
  background: rgba(191,47,69,0.08);
  border: 1px solid rgba(191,47,69,0.2);
  color: var(--danger);
}

/* ── Empty state ── */
.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--glass-pink-muted);
  font-size: 0.9rem;
}

/* ── Resource list ── */
.resource-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0 2rem 2rem;
}
.resource-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-radius: 16px;
  background: var(--glass-pink-surface-strong);
  border: 1px solid var(--glass-pink-border);
  box-shadow: 0 2px 12px rgba(74,20,41,0.06);
  transition: box-shadow 150ms ease, transform 150ms ease;
  flex-wrap: wrap;
}
.resource-card:hover {
  box-shadow: 0 6px 20px rgba(74,20,41,0.11);
  transform: translateY(-1px);
}

/* Skeleton Loaders */
.skeleton-card { pointer-events: none; }
.skeleton-meta-row { display: flex; gap: 8px; margin-bottom: 10px; }
.skeleton-pill {
  height: 20px; width: 60px; border-radius: 999px;
  background: linear-gradient(90deg, #f0e6ea 25%, #e8d8de 50%, #f0e6ea 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
.skeleton-pill.narrow { width: 40px; }
.skeleton-line {
  height: 13px; border-radius: 6px; margin-bottom: 8px;
  background: linear-gradient(90deg, #f0e6ea 25%, #e8d8de 50%, #f0e6ea 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
.skeleton-line.title { width: 70%; height: 18px; }
.skeleton-line.short { width: 40%; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }


.resource-card-main { flex: 1; min-width: 0; }
.resource-meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.4rem;
}
.type-pill {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(177,31,75,0.1);
  color: var(--accent);
}
.course-pill {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(74,20,41,0.07);
  color: var(--glass-pink-muted);
}
.date-text {
  font-size: 0.75rem;
  color: var(--glass-pink-muted);
  margin-left: auto;
}
.resource-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.45rem;
  color: var(--ink);
  overflow-wrap: anywhere;
}
.uploader-line {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.82rem;
  color: var(--glass-pink-muted);
  margin: 0;
}
.uploader-line svg {
  width: 13px; height: 13px;
  fill: currentColor;
  flex-shrink: 0;
}
.uploader-email { opacity: 0.75; }

.resource-card-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  flex-shrink: 0;
}

/* ── Danger chip ── */
.chip-danger {
  background: linear-gradient(180deg, rgba(255,255,255,0.74), rgba(255,255,255,0.3)),
              linear-gradient(165deg, rgba(255,235,235,0.78), rgba(255,210,210,0.72)) !important;
  color: var(--danger) !important;
  border-color: rgba(191,47,69,0.25) !important;
}
.chip-danger:hover { border-color: rgba(191,47,69,0.5) !important; }

/* ── Modals ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(47,35,44,0.45);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 1rem;
}
.modal-card {
  background: var(--glass-pink-surface-strong);
  border: 1px solid var(--glass-pink-border);
  border-radius: 20px;
  box-shadow: var(--glass-shadow);
  width: 100%;
  max-width: 480px;
  padding: 1.75rem;
  backdrop-filter: blur(20px);
}
.modal-card-sm { max-width: 360px; }
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}
.modal-header h3 { margin: 0; font-size: 1.15rem; }
.close-btn {
  background: none !important;
  border: none !important;
  box-shadow: none !important;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: var(--glass-pink-muted);
  padding: 0 4px;
}
.close-btn:hover { color: var(--ink); transform: none !important; }

.edit-form { display: flex; flex-direction: column; gap: 1rem; }
.field { display: flex; flex-direction: column; gap: 0.35rem; }
.field label {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--glass-pink-muted);
}
.field .optional { font-weight: 400; text-transform: none; font-size: 0.75rem; }
.field input, .field select {
  padding: 0.6rem 0.9rem;
  border: 1px solid var(--glass-pink-border);
  border-radius: 10px;
  background: rgba(255,255,255,0.7);
  font-size: 0.9rem;
  color: var(--ink);
  outline: none;
  transition: border-color 150ms ease;
}
.field input:focus, .field select:focus { border-color: var(--accent); }

/* Delete Warning Modal specific */
.delete-warning {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px;
  background: rgba(191,47,69,0.08); /* var(--danger-bg) equivalent */
  border-radius: 10px;
  margin-bottom: 16px;
}
.delete-warning-icon { font-size: 1.4rem; flex-shrink: 0; }
.confirm-text { font-size: 0.9rem; margin: 0 0 4px; font-weight: 600; color: var(--ink); }
.confirm-subtext { margin: 0; font-size: 0.82rem; color: var(--danger); /* var(--danger-ink) equivalent */ }

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

@media (max-width: 600px) {
  .page-header, .toolbar-row, .resource-list, .summary-bar { padding-left: 1rem; padding-right: 1rem; }
  .feedback-msg { margin-left: 1rem; margin-right: 1rem; }
  .resource-card { flex-direction: column; }
  .resource-card-actions { width: 100%; justify-content: flex-end; }
  .date-text { margin-left: 0; }

  .toolbar-row input {
    min-width: 0;
    width: 100%;
  }
  
  .filter-select {
    width: 100%;
  }

  .result-count {
    width: 100%;
  }

  .modal-card {
    padding: 1.2rem;
  }
}

@media (max-width: 420px) {
  .resource-card-actions {
    justify-content: stretch;
  }

  .resource-card-actions .chip {
    flex: 1 1 100%;
    justify-content: center;
  }
}
</style>
