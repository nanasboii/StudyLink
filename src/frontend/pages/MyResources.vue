<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active my-resources-page">

        <!-- Header -->
        <div class="page-header">
          <div>
            <p class="page-kicker">Your contributions</p>
            <h2>My Uploads</h2>
            <p class="page-subtext">Manage the resources you've shared with StudyLink.</p>
          </div>
          <button @click="loadResources" class="chip" type="button" :disabled="isLoading">
            {{ isLoading ? 'Loading…' : 'Refresh' }}
          </button>
        </div>

       <div v-if="resources.length" class="summary-bar" aria-label="Upload summary">
          <div class="summary-stat">
            <span class="summary-value">{{ resources.length }}</span>
            <span class="summary-label">Upload{{ resources.length !== 1 ? 's' : '' }}</span>
          </div>
          <div class="summary-stat">
            <span class="summary-value">{{ totalReviews }}</span>
            <span class="summary-label">Review{{ totalReviews !== 1 ? 's' : '' }}</span>
          </div>
          <div class="summary-stat">
            <span class="summary-value">
              <span style="color:#f0b300; margin-right:2px;">★</span>{{ overallRating }}
            </span>
            <span class="summary-label">Avg rating</span>
          </div>
        </div>

        <p
          v-if="message"
          class="feedback-msg"
          :class="messageType"
          role="status"
          aria-live="polite"
        >{{ message }}</p>

        <!-- Toolbar: search + sort (only when there is something to search) -->
        <div v-if="resources.length" class="toolbar-row">
          <div class="search-field">
            <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 4a6.5 6.5 0 1 0 4.14 11.5l4.18 4.18 1.41-1.41-4.18-4.18A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"/></svg>
            <input
              v-model.trim="searchQuery"
              type="search"
              placeholder="Search your uploads by title, course or type…"
              aria-label="Search your uploads"
            />
          </div>
          <select v-model="sortBy" class="sort-select" aria-label="Sort uploads">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="rating">Highest rated</option>
            <option value="reviews">Most reviewed</option>
            <option value="title">Title (A–Z)</option>
          </select>
        </div>

        <div v-if="!isLoading && resources.length === 0" class="empty-uploads">
          <p style="font-size:2rem; margin:0;">📂</p>
          <p style="font-weight:600; color:var(--ink); margin:8px 0 4px;">No uploads yet</p>
          <p style="color:var(--glass-pink-muted); font-size:0.9rem; margin:0 0 16px;">
            Share lecture notes, past papers or slides with your classmates.
          </p>
          <router-link to="/resources" class="chip chip-strong">
            Go upload on Resources
          </router-link>
        </div>

        <!-- Initial loading skeleton -->
        <div v-else-if="isLoading && resources.length === 0" class="resource-list" aria-hidden="true">
          <div v-for="n in 3" :key="n" class="resource-card skeleton-card">
            <div class="resource-card-main">
              <div class="skeleton-line skeleton-pill"></div>
              <div class="skeleton-line skeleton-title"></div>
              <div class="skeleton-line skeleton-short"></div>
            </div>
          </div>
        </div>

        <!-- No matches for the current search -->
        <div v-else-if="filteredResources.length === 0" class="empty-block">
          <p>No uploads match “{{ searchQuery }}”.</p>
          <button class="chip chip-strong" type="button" @click="searchQuery = ''">Clear search</button>
        </div>

        <!-- Resource list -->
        <div v-else class="resource-list" :class="{ 'is-refreshing': isLoading }">
          <article
            v-for="resource in filteredResources"
            :key="resource.id"
            class="resource-card"
          >
            <div class="resource-card-main">
              <div class="resource-meta-row">
                <span class="type-pill">{{ resourceTypeLabel(resource.resource_type) }}</span>
                <span class="course-pill" v-if="resource.course_code">{{ resource.course_code }}</span>
                <span class="date-text">{{ formatDate(resource.created_at) }}</span>
              </div>

              <h3 class="resource-title" :title="resource.title || 'Untitled Resource'">
                {{ resource.title || 'Untitled Resource' }}
              </h3>

              <div class="resource-stats">
                <span class="stat-chip" v-if="Number(resource.review_count) > 0">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                  {{ Number(resource.avg_rating || 0).toFixed(1) }}
                </span>
                <span class="stat-chip stat-chip-muted" v-else>No ratings yet</span>
                <span class="stat-chip">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                  {{ resource.review_count || 0 }} review{{ Number(resource.review_count) !== 1 ? 's' : '' }}
                </span>
              </div>
            </div>

            <div class="resource-card-actions">
              <router-link
                :to="{ path: `/resources/${resource.id}`, query: { from: 'my-resources' } }"
                class="chip chip-soft"
              >
                <!-- add an eye icon -->
                <svg viewBox="0 0 24 24" width="13" height="13" style="margin-right:4px;" aria-hidden="true">
                  <path d="M12 5C7 5 2.73 8.11 1 12c1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
                        fill="currentColor"/>
                </svg>
                View
              </router-link>
              <button class="chip" type="button" @click="openEdit(resource)">Edit</button>
              <button class="chip chip-danger" type="button" @click="confirmDelete(resource)"
                      style="margin-left: auto;">Delete</button>
            </div>
          </article>
        </div>

        <!-- Edit Modal -->
        <div v-if="editTarget" class="modal-overlay" @click.self="closeEdit">
          <div class="modal-card" role="dialog" aria-modal="true" aria-label="Edit resource">
            <div class="modal-header">
              <h3>Edit Resource</h3>
              <button class="close-btn" type="button" aria-label="Close" @click="closeEdit">&times;</button>
            </div>

            <form @submit.prevent="saveEdit" class="edit-form">
              <div class="field">
                <label for="edit-title">Title</label>
                <input id="edit-title" ref="titleInput" v-model="editForm.title" type="text" required maxlength="200" />
              </div>

              <div class="field">
                <label for="edit-type">Resource Type</label>
                <select id="edit-type" v-model="editForm.resourceType">
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
                <label for="edit-course">Course Code <span class="optional">(optional)</span></label>
                <input id="edit-course" v-model="editForm.courseCode" type="text" maxlength="20" placeholder="e.g. CS101" />
              </div>

              <p v-if="editMessage" class="feedback-msg" :class="editMessageType">{{ editMessage }}</p>

              <div class="modal-actions">
                <button type="button" class="chip" @click="closeEdit">Cancel</button>
                <button type="submit" class="chip chip-strong" :disabled="isSaving">
                  {{ isSaving ? 'Saving…' : 'Save Changes' }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Delete Confirm Modal -->
        <div v-if="deleteTarget" class="modal-overlay" @click.self="cancelDelete">
          <div class="modal-card modal-card-sm" role="dialog" aria-modal="true" aria-label="Delete resource">
            <div class="modal-header">
              <h3>Delete Resource</h3>
              <button class="close-btn" type="button" aria-label="Close" @click="cancelDelete">&times;</button>
            </div>
            <p class="confirm-text">Are you sure you want to delete <strong>{{ deleteTarget.title || 'this resource' }}</strong>? This cannot be undone.</p>
            <div class="modal-actions">
              <button type="button" class="chip" @click="cancelDelete">Cancel</button>
              <button type="button" class="chip chip-danger" :disabled="isDeleting" @click="doDelete">
                {{ isDeleting ? 'Deleting…' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>

      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { api } from '@/api.js'

const resources = ref([])
const isLoading = ref(false)
const message = ref('')
const messageType = ref('success')

// Search + sort
const searchQuery = ref('')
const sortBy = ref('newest')

// Edit state
const editTarget = ref(null)
const editForm = ref({ title: '', resourceType: '', courseCode: '' })
const editMessage = ref('')
const editMessageType = ref('success')
const isSaving = ref(false)
const titleInput = ref(null)

// Delete state
const deleteTarget = ref(null)
const isDeleting = ref(false)

let messageTimer = null

const RESOURCE_TYPE_LABELS = {
  'past-year': 'Past Year Paper',
  'lecture-note': 'Lecture Note',
  'slides': 'Slides',
  'slide': 'Slides',
  'pdf': 'PDF',
  'assignment': 'Assignment',
  'link': 'External Link',
  'miscellaneous': 'Miscellaneous',
}

const resourceTypeLabel = (value) => {
  const key = String(value || '').trim().toLowerCase()
  return RESOURCE_TYPE_LABELS[key] || (key ? key.replace(/[-_]/g, ' ') : 'Misc')
}

const formatDate = (val) => {
  if (!val) return '—'
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// Auto-dismissing feedback so stale toasts don't linger
const setMessage = (text, type = 'success') => {
  message.value = text
  messageType.value = type
  if (messageTimer) clearTimeout(messageTimer)
  if (text && type === 'success') {
    messageTimer = setTimeout(() => { message.value = '' }, 4000)
  }
}

// ── Summary stats ──
const totalReviews = computed(() =>
  resources.value.reduce((sum, r) => sum + (Number(r.review_count) || 0), 0)
)

const overallRating = computed(() => {
  const rated = resources.value.filter((r) => Number(r.review_count) > 0)
  if (!rated.length) return '—'
  const weighted = rated.reduce(
    (sum, r) => sum + (Number(r.avg_rating) || 0) * (Number(r.review_count) || 0),
    0
  )
  const totalCount = rated.reduce((sum, r) => sum + (Number(r.review_count) || 0), 0)
  if (!totalCount) return '—'
  return (weighted / totalCount).toFixed(1)
})

// ── Search + sort ──
const filteredResources = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  let list = resources.value
  if (q) {
    list = list.filter((r) =>
      (r.title || '').toLowerCase().includes(q) ||
      (r.course_code || '').toLowerCase().includes(q) ||
      resourceTypeLabel(r.resource_type).toLowerCase().includes(q)
    )
  }

  const sorted = [...list]
  switch (sortBy.value) {
    case 'oldest':
      sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      break
    case 'rating':
      sorted.sort((a, b) => (Number(b.avg_rating) || 0) - (Number(a.avg_rating) || 0))
      break
    case 'reviews':
      sorted.sort((a, b) => (Number(b.review_count) || 0) - (Number(a.review_count) || 0))
      break
    case 'title':
      sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
      break
    case 'newest':
    default:
      sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }
  return sorted
})

const loadResources = async () => {
  isLoading.value = true
  try {
    const resp = await api('/resources/mine')
    resources.value = Array.isArray(resp?.resources) ? resp.resources : []
  } catch (err) {
    setMessage(`Couldn't load your uploads: ${err.message}`, 'error')
  } finally {
    isLoading.value = false
  }
}

// ── Edit ──
const openEdit = (resource) => {
  editTarget.value = resource
  editForm.value = {
    title: resource.title || '',
    resourceType: resource.resource_type || 'miscellaneous',
    courseCode: resource.course_code || '',
  }
  editMessage.value = ''
  nextTick(() => titleInput.value?.focus())
}

const closeEdit = () => {
  editTarget.value = null
  editMessage.value = ''
}

const saveEdit = async () => {
  if (!editTarget.value?.id) return

  const trimmedTitle = editForm.value.title.trim()
  if (!trimmedTitle) {
    editMessage.value = 'Title cannot be empty.'
    editMessageType.value = 'error'
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

    const updated = resp?.resource || {}
    const idx = resources.value.findIndex((r) => r.id === editTarget.value.id)
    if (idx !== -1) {
      resources.value[idx] = {
        ...resources.value[idx],
        title: updated.title ?? trimmedTitle,
        resource_type: updated.resource_type ?? editForm.value.resourceType,
        course_code: updated.course_code ?? (editForm.value.courseCode.trim() || null),
      }
    }
    closeEdit()
    setMessage('Resource updated.', 'success')
  } catch (err) {
    editMessage.value = `Error: ${err.message}`
    editMessageType.value = 'error'
  } finally {
    isSaving.value = false
  }
}

// ── Delete ──
const confirmDelete = (resource) => {
  deleteTarget.value = resource
}

const cancelDelete = () => {
  deleteTarget.value = null
}

const doDelete = async () => {
  if (!deleteTarget.value?.id) return

  isDeleting.value = true
  try {
    const targetId = deleteTarget.value.id
    await api(`/resources/${targetId}`, 'DELETE')
    resources.value = resources.value.filter((r) => r.id !== targetId)
    cancelDelete()
    setMessage('Resource deleted.', 'success')
  } catch (err) {
    cancelDelete()
    setMessage(`Couldn't delete resource: ${err.message}`, 'error')
  } finally {
    isDeleting.value = false
  }
}

// ── Modal accessibility: Esc to close + body scroll lock ──
const anyModalOpen = computed(() => Boolean(editTarget.value || deleteTarget.value))

const handleKeydown = (event) => {
  if (event.key !== 'Escape') return
  if (deleteTarget.value) cancelDelete()
  else if (editTarget.value) closeEdit()
}

watch(anyModalOpen, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  loadResources()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
  if (messageTimer) clearTimeout(messageTimer)
})
</script>

<style scoped>
.my-resources-page {
  padding-bottom: 3rem;
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
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  margin: 0 0 0.25rem;
}

.page-header h2 {
  font-size: clamp(1.4rem, 2.5vw, 2rem);
  margin: 0 0 0.25rem;
}

.page-subtext {
  font-size: 0.85rem;
  color: var(--glass-pink-muted);
  margin: 0;
}

.summary-bar {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
}

.summary-stat {
  flex: 1 1 0;
  min-width: 96px;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.75rem 1rem;
  border-radius: 14px;
  background: var(--glass-pink-surface-strong);
  border: 1px solid var(--glass-pink-border);
}

.summary-value {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.1;
}

.summary-label {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--glass-pink-muted);
}

/* ── Toolbar ── */
.toolbar-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 2rem 1.25rem;
  flex-wrap: wrap;
}

.search-field {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.search-field .search-icon {
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  fill: var(--glass-pink-muted);
  pointer-events: none;
}

.search-field input {
  width: 100%;
  padding: 0.6rem 1rem 0.6rem 2.4rem;
  border: 1px solid var(--glass-pink-border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  color: var(--ink);
  outline: none;
  transition: border-color 150ms ease;
}

.search-field input:focus {
  border-color: var(--accent);
}

.sort-select {
  padding: 0.6rem 0.9rem;
  border: 1px solid var(--glass-pink-border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  color: var(--ink);
  outline: none;
  cursor: pointer;
  transition: border-color 150ms ease;
}

.sort-select:focus {
  border-color: var(--accent);
}

/* ── Feedback messages ── */
.feedback-msg {
  margin: 0 2rem 1rem;
  padding: 0.7rem 1rem;
  border-radius: 10px;
  font-size: 0.875rem;
}

.feedback-msg.success {
  background: rgba(34, 134, 82, 0.1);
  border: 1px solid rgba(34, 134, 82, 0.22);
  color: #1b7a4a;
}

.feedback-msg.error {
  background: rgba(191, 47, 69, 0.08);
  border: 1px solid rgba(191, 47, 69, 0.2);
  color: var(--danger);
}

/* ── Empty state ── */
.empty-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 2rem;
  color: var(--glass-pink-muted);
  text-align: center;
}

.empty-block svg {
  width: 48px;
  height: 48px;
  fill: var(--glass-pink-muted);
  opacity: 0.5;
}

.empty-uploads {
  text-align: center;
  padding: 2.5rem 1rem;
  border: 1px dashed var(--glass-pink-border);
  border-radius: 16px;
  margin-top: 1rem;
}

/* ── Resource list ── */
.resource-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0 2rem;
  transition: opacity 150ms ease;
}

.resource-list.is-refreshing {
  opacity: 0.55;
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
  box-shadow: 0 2px 12px rgba(74, 20, 41, 0.06);
  transition: box-shadow 150ms ease, transform 150ms ease;
  flex-wrap: wrap;
}

.resource-card:hover {
  box-shadow: 0 6px 20px rgba(74, 20, 41, 0.11);
  transform: translateY(-1px);
}

.resource-card-main {
  flex: 1;
  min-width: 0;
}

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
  background: rgba(177, 31, 75, 0.1);
  color: var(--accent);
}

.course-pill {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(74, 20, 41, 0.07);
  color: var(--glass-pink-muted);
}

.date-text {
  font-size: 0.75rem;
  color: var(--glass-pink-muted);
  margin-left: auto;
}

.resource-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
}
.resource-stats {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.78rem;
  color: var(--glass-pink-muted);
}

.stat-chip svg {
  width: 14px;
  height: 14px;
  fill: currentColor;
}

.stat-chip-muted {
  opacity: 0.8;
  font-style: italic;
}

.resource-card-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  flex-shrink: 0;
}

/* ── Skeleton loading ── */
.skeleton-card {
  pointer-events: none;
}

.skeleton-line {
  border-radius: 8px;
  background: linear-gradient(90deg, rgba(74, 20, 41, 0.06) 25%, rgba(74, 20, 41, 0.12) 37%, rgba(74, 20, 41, 0.06) 63%);
  background-size: 400% 100%;
  animation: skeleton-shimmer 1.4s ease infinite;
}

.skeleton-pill { width: 80px; height: 14px; margin-bottom: 0.6rem; }
.skeleton-title { width: 70%; height: 18px; margin-bottom: 0.6rem; }
.skeleton-short { width: 40%; height: 14px; }

@keyframes skeleton-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-line { animation: none; }
}

/* ── Danger chip ── */
.chip-danger {
  background: linear-gradient(180deg, rgba(255,255,255,0.74), rgba(255,255,255,0.3)),
              linear-gradient(165deg, rgba(255,235,235,0.78), rgba(255,210,210,0.72)) !important;
  color: var(--danger) !important;
  border-color: rgba(191, 47, 69, 0.25) !important;
}

.chip-danger:hover {
  border-color: rgba(191, 47, 69, 0.5) !important;
}

/* ── Modals ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(47, 35, 44, 0.45);
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

.modal-card-sm {
  max-width: 360px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.15rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: var(--glass-pink-muted);
  padding: 0 4px;
  box-shadow: none !important;
}

.close-btn:hover {
  color: var(--ink);
  transform: none !important;
}

/* ── Edit form ── */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field label {
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--glass-pink-muted);
}

.field .optional {
  font-weight: 400;
  text-transform: none;
  font-size: 0.75rem;
}

.field input,
.field select {
  padding: 0.6rem 0.9rem;
  border: 1px solid var(--glass-pink-border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  color: var(--ink);
  outline: none;
  transition: border-color 150ms ease;
}

.field input:focus,
.field select:focus {
  border-color: var(--accent);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

/* ── Delete confirm ── */
.confirm-text {
  font-size: 0.9rem;
  color: var(--ink);
  margin: 0 0 1.25rem;
  line-height: 1.5;
}

/* ── Responsive ── */
@media (max-width: 600px) {
  .page-header,
  .resource-list,
  .summary-bar,
  .toolbar-row {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .feedback-msg {
    margin-left: 1rem;
    margin-right: 1rem;
  }

  .toolbar-row {
    flex-direction: column;
    align-items: stretch;
  }

  .sort-select {
    width: auto;
    min-width: 160px;
  }

  .resource-card {
    flex-direction: column;
  }

  .resource-card-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .date-text {
    margin-left: 0;
  }
}
</style>
