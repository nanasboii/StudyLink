<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active my-resources-page">

        <div class="page-header">
          <div>
            <p class="page-kicker">Your contributions</p>
            <h2>My Uploads</h2>
            <p class="page-subtext">Manage the resources you've shared with StudyLink.</p>
          </div>
          <button @click="loadResources" class="chip" type="button" :disabled="isLoading" aria-label="Refresh uploads">
            <svg v-if="isLoading" class="spin-icon" viewBox="0 0 24 24" aria-hidden="true" width="14" height="14">
              <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8Z"/>
            </svg>
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
              <span class="star-icon" aria-hidden="true">★</span>{{ overallRating }}
            </span>
            <span class="summary-label">Avg rating</span>
          </div>
          <div class="summary-stat">
            <span class="summary-value">{{ uniqueCourses }}</span>
            <span class="summary-label">Course{{ uniqueCourses !== 1 ? 's' : '' }}</span>
          </div>
        </div>

        <transition name="fade">
          <p
            v-if="message"
            class="feedback-msg"
            :class="messageType"
            role="status"
            aria-live="polite"
          >{{ message }}</p>
        </transition>

        <div v-if="resources.length" class="toolbar-row">
          <div class="search-field">
            <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10.5 4a6.5 6.5 0 1 0 4.14 11.5l4.18 4.18 1.41-1.41-4.18-4.18A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"/>
            </svg>
            <input
              v-model.trim="searchQuery"
              type="search"
              placeholder="Search by title, course or type…"
              aria-label="Search your uploads"
            />
            <button
              v-if="searchQuery"
              class="search-clear"
              type="button"
              aria-label="Clear search"
              @click="searchQuery = ''"
            >✕</button>
          </div>
          <select v-model="sortBy" class="sort-select" aria-label="Sort uploads">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="rating">Highest rated</option>
            <option value="reviews">Most reviewed</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>

        <p v-if="resources.length && searchQuery" class="result-hint" aria-live="polite">
          {{ filteredResources.length }} of {{ resources.length }} upload{{ resources.length !== 1 ? 's' : '' }}
        </p>

        <div v-if="!isLoading && resources.length === 0" class="empty-uploads">
          <span class="empty-icon" aria-hidden="true">📂</span>
          <p class="empty-title">No uploads yet</p>
          <p class="empty-sub">Share lecture notes, past papers or slides with classmates.</p>
          <router-link to="/resources" class="chip chip-strong">Upload on Resources →</router-link>
        </div>

        <div v-else-if="isLoading && resources.length === 0" class="resource-list" aria-hidden="true">
          <div v-for="n in 3" :key="n" class="resource-card skeleton-card">
            <div class="resource-card-main">
              <div class="skeleton-line skeleton-pill"></div>
              <div class="skeleton-line skeleton-title"></div>
              <div class="skeleton-line skeleton-short"></div>
            </div>
          </div>
        </div>

        <div v-else-if="filteredResources.length === 0 && searchQuery" class="empty-block">
          <span class="empty-icon" aria-hidden="true">🔍</span>
          <p>No uploads match <strong>"{{ searchQuery }}"</strong></p>
          <button class="chip chip-strong" type="button" @click="searchQuery = ''">Clear search</button>
        </div>

        <div v-else class="resource-list" :class="{ 'is-refreshing': isLoading && resources.length > 0 }">
          <article
            v-for="resource in filteredResources"
            :key="resource.id"
            class="resource-card"
          >
            <div class="resource-card-main">
              <div class="resource-meta-row">
                <span class="type-pill">{{ resourceTypeLabel(resource.resource_type) }}</span>
                <span v-if="resource.course_code" class="course-pill">{{ resource.course_code }}</span>
                <span class="date-text">{{ formatDate(resource.created_at) }}</span>
              </div>

              <h3 class="resource-title" :title="resource.title || 'Untitled Resource'">
                {{ resource.title || 'Untitled Resource' }}
              </h3>

              <div class="resource-stats">
                <span class="stat-chip" v-if="Number(resource.review_count) > 0">
                  <svg viewBox="0 0 24 24" aria-hidden="true" width="12" height="12">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                  </svg>
                  {{ Number(resource.avg_rating || 0).toFixed(1) }}
                </span>
                <span class="stat-chip stat-chip-muted" v-else>No ratings yet</span>

                <span class="stat-chip">
                  <svg viewBox="0 0 24 24" aria-hidden="true" width="12" height="12">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                  </svg>
                  {{ resource.review_count || 0 }} review{{ Number(resource.review_count) !== 1 ? 's' : '' }}
                </span>
              </div>
            </div>

            <div class="resource-card-actions">
              <router-link
                :to="`/resources/${resource.id}`"
                class="chip chip-soft"
              >View</router-link>
              <button class="chip" type="button" @click="openEdit(resource)">Edit</button>
              <button
                class="chip chip-danger"
                type="button"
                @click="confirmDelete(resource)"
                style="margin-left:auto"
              >Delete</button>
            </div>
          </article>
        </div>

        <transition name="modal">
          <div
            v-if="editTarget"
            class="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-modal-title"
            @click.self="!isSaving && closeEdit()"
          >
            <div class="modal-card">
              <div class="modal-header">
                <h3 id="edit-modal-title">Edit Resource</h3>
                <button class="close-btn" type="button" aria-label="Close" @click="!isSaving && closeEdit()">&times;</button>
              </div>

              <form @submit.prevent="saveEdit" novalidate>
                <div class="field-group">
                  <label for="edit-title">Title <span class="required" aria-hidden="true">*</span></label>
                  <input
                    id="edit-title"
                    ref="titleInput"
                    v-model="editForm.title"
                    type="text"
                    placeholder="Resource title"
                    required
                    autocomplete="off"
                    :disabled="isSaving"
                  />
                </div>

                <div class="field-group">
                  <label for="edit-type">Type</label>
                  <select id="edit-type" v-model="editForm.resourceType" :disabled="isSaving">
                    <option value="past-year">Past Year Paper</option>
                    <option value="lecture-note">Lecture Note</option>
                    <option value="slides">Slides</option>
                    <option value="pdf">PDF</option>
                    <option value="assignment">Assignment</option>
                    <option value="link">External Link</option>
                    <option value="miscellaneous">Miscellaneous</option>
                  </select>
                </div>

                <div class="field-group">
                  <label for="edit-course">Course Code</label>
                  <input
                    id="edit-course"
                    v-model="editForm.courseCode"
                    type="text"
                    placeholder="e.g. CS101"
                    :disabled="isSaving"
                    autocomplete="off"
                  />
                </div>

                <transition name="fade">
                  <p v-if="editMessage" class="feedback-msg" :class="editMessageType">{{ editMessage }}</p>
                </transition>

                <div class="modal-actions">
                  <button type="button" class="chip" @click="closeEdit" :disabled="isSaving">Cancel</button>
                  <button type="submit" class="chip chip-strong" :disabled="isSaving">
                    <svg v-if="isSaving" class="spin-icon" viewBox="0 0 24 24" aria-hidden="true" width="13" height="13">
                      <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8Z"/>
                    </svg>
                    {{ isSaving ? 'Saving…' : 'Save Changes' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </transition>

        <transition name="modal">
          <div
            v-if="deleteTarget"
            class="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            @click.self="!isDeleting && cancelDelete()"
          >
            <div class="modal-card modal-card-sm">
              <div class="modal-header">
                <h3 id="delete-modal-title">Delete Resource</h3>
                <button class="close-btn" type="button" aria-label="Close" @click="!isDeleting && cancelDelete()">&times;</button>
              </div>
              <p class="confirm-text">
                Delete <strong>{{ deleteTarget.title || 'this resource' }}</strong>? This cannot be undone.
              </p>
              <div class="modal-actions">
                <button type="button" class="chip" @click="cancelDelete" :disabled="isDeleting">Cancel</button>
                <button
                  type="button"
                  class="chip chip-danger"
                  :disabled="isDeleting"
                  @click="doDelete"
                >
                  <svg v-if="isDeleting" class="spin-icon" viewBox="0 0 24 24" aria-hidden="true" width="13" height="13">
                    <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8Z"/>
                  </svg>
                  {{ isDeleting ? 'Deleting…' : 'Delete' }}
                </button>
              </div>
            </div>
          </div>
        </transition>

      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { api } from '@/api.js'

// ── State ──────────────────────────────────────────────────────────
const resources    = ref([])
const isLoading    = ref(false)
const message      = ref('')
const messageType  = ref('success')

const searchQuery  = ref('')
const sortBy       = ref('newest')

const editTarget      = ref(null)
const editForm        = ref({ title: '', resourceType: '', courseCode: '' })
const editMessage     = ref('')
const editMessageType = ref('success')
const isSaving        = ref(false)
const titleInput      = ref(null)

const deleteTarget = ref(null)
const isDeleting   = ref(false)

let messageTimer = null

// ── Constants ──────────────────────────────────────────────────────
const RESOURCE_TYPE_LABELS = {
  'past-year':    'Past Year Paper',
  'lecture-note': 'Lecture Note',
  'slides':       'Slides',
  'slide':        'Slides',
  'pdf':          'PDF',
  'assignment':   'Assignment',
  'link':         'External Link',
  'miscellaneous':'Miscellaneous',
}

// ── Helpers ────────────────────────────────────────────────────────
const resourceTypeLabel = (value) => {
  if (!value) return 'Resource'
  const key = String(value).trim().toLowerCase()
  return RESOURCE_TYPE_LABELS[key] || (key.charAt(0).toUpperCase() + key.slice(1))
}

const formatDate = (raw) => {
  if (!raw) return ''
  try {
    const d = new Date(raw)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return ''
  }
}

const setMessage = (text, type = 'success') => {
  if (messageTimer) clearTimeout(messageTimer)
  message.value = text
  messageType.value = type
  if (type === 'success') {
    messageTimer = setTimeout(() => { message.value = '' }, 3500)
  }
}

// ── Computed ───────────────────────────────────────────────────────
const totalReviews = computed(() =>
  resources.value.reduce((sum, r) => sum + (Number(r.review_count) || 0), 0)
)

const overallRating = computed(() => {
  const rated = resources.value.filter(r => Number(r.review_count) > 0)
  if (!rated.length) return '—'
  const totalWeight = rated.reduce((s, r) => s + Number(r.review_count), 0)
  const weightedSum = rated.reduce((s, r) => s + Number(r.avg_rating || 0) * Number(r.review_count), 0)
  return totalWeight > 0 ? (weightedSum / totalWeight).toFixed(1) : '—'
})

const uniqueCourses = computed(() =>
  new Set(resources.value.map(r => r.course_code).filter(Boolean)).size
)

const filteredResources = computed(() => {
  let list = [...resources.value]

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(r =>
      (r.title || '').toLowerCase().includes(q) ||
      (r.course_code || '').toLowerCase().includes(q) ||
      resourceTypeLabel(r.resource_type).toLowerCase().includes(q)
    )
  }

  switch (sortBy.value) {
    case 'oldest':
      list.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0
        const db = b.created_at ? new Date(b.created_at).getTime() : 0
        return da - db
      })
      break
    case 'rating':
      list.sort((a, b) => Number(b.avg_rating || 0) - Number(a.avg_rating || 0))
      break
    case 'reviews':
      list.sort((a, b) => Number(b.review_count || 0) - Number(a.review_count || 0))
      break
    case 'title':
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
      break
    default: // newest
      list.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0
        const db = b.created_at ? new Date(b.created_at).getTime() : 0
        return db - da
      })
  }

  return list
})

// ── API ────────────────────────────────────────────────────────────
const loadResources = async () => {
  isLoading.value = true
  try {
    // FIX 1: Change to hit `/resources/mine` to align with the server backend properly
    const resp = await api('/resources/mine', 'GET')
    
    if (Array.isArray(resp)) {
      resources.value = resp
    } else if (resp && Array.isArray(resp.resources)) {
      resources.value = resp.resources
    } else if (resp && Array.isArray(resp.data)) {
      resources.value = resp.data
    } else {
      resources.value = []
    }
  } catch (err) {
    // FIX 2: Do not echo raw API errors here—prevents double messages with api.js's global toast
    setMessage('Couldn\'t load your uploads. Please try again.', 'error')
  } finally {
    isLoading.value = false
  }
}

// ── Edit ───────────────────────────────────────────────────────────
const openEdit = (resource) => {
  editTarget.value = resource
  editForm.value = {
    title:        resource.title || '',
    resourceType: resource.resource_type || 'miscellaneous',
    courseCode:   resource.course_code || '',
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
      title:        trimmedTitle,
      resourceType: editForm.value.resourceType,
      courseCode:   editForm.value.courseCode.trim() || null,
    })

    const updated = resp?.resource || {}
    const idx = resources.value.findIndex(r => r.id === editTarget.value.id)
    if (idx !== -1) {
      resources.value[idx] = {
        ...resources.value[idx],
        title:         updated.title         ?? trimmedTitle,
        resource_type: updated.resource_type ?? editForm.value.resourceType,
        course_code:   updated.course_code   ?? (editForm.value.courseCode.trim() || null),
      }
    }
    closeEdit()
    setMessage('Resource updated.', 'success')
  } catch (err) {
    editMessage.value = `Error: ${err?.message || 'Save failed'}`
    editMessageType.value = 'error'
  } finally {
    isSaving.value = false
  }
}

// ── Delete ─────────────────────────────────────────────────────────
const confirmDelete = (resource) => { deleteTarget.value = resource }
const cancelDelete  = () => { deleteTarget.value = null }

const doDelete = async () => {
  if (!deleteTarget.value?.id) return
  isDeleting.value = true
  try {
    const targetId = deleteTarget.value.id
    await api(`/resources/${targetId}`, 'DELETE')
    resources.value = resources.value.filter(r => r.id !== targetId)
    cancelDelete()
    setMessage('Resource deleted.', 'success')
  } catch (err) {
    cancelDelete()
    setMessage(`Couldn't delete: ${err?.message || 'Unknown error'}`, 'error')
  } finally {
    isDeleting.value = false
  }
}

// ── Modal Accessibility ─────────────────────────────────────────────
const anyModalOpen = computed(() => Boolean(editTarget.value || deleteTarget.value))

const handleKeydown = (e) => {
  if (e.key !== 'Escape') return
  if (isSaving.value || isDeleting.value) return
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
/* ── Page ──────────────────────────────────────────────── */
.my-resources-page {
  padding-bottom: 3rem;
}

/* ── Header ────────────────────────────────────────────── */
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
  color: var(--primary);
  margin: 0 0 0.25rem;
}

.page-header h2 {
  font-size: clamp(1.4rem, 2.5vw, 2rem);
  color: var(--ink);
  margin: 0 0 0.25rem;
  letter-spacing: -0.02em;
}

.page-subtext {
  font-size: 0.85rem;
  color: var(--ink-muted);
  margin: 0;
}

/* ── Refresh spinner ────────────────────────────────────── */
.spin-icon {
  display: inline-block;
  fill: currentColor;
  vertical-align: middle;
  margin-right: 4px;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Summary Bar ────────────────────────────────────────── */
.summary-bar {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0 2rem 1.25rem;
}

.summary-stat {
  flex: 1 1 80px;
  min-width: 80px;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0.75rem 1rem;
  border-radius: 14px;
  background: rgba(255, 206, 227, 0.35);
  border: 1px solid rgba(255, 133, 187, 0.25);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.summary-value {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.1;
}

.star-icon {
  color: #f0b300;
  margin-right: 2px;
}

.summary-label {
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

/* ── Feedback ───────────────────────────────────────────── */
.feedback-msg {
  margin: 0 2rem 1rem;
  padding: 0.6rem 1rem;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 500;
}
.feedback-msg.success {
  background: rgba(255, 206, 227, 0.4);
  border: 1px solid rgba(255, 133, 187, 0.35);
  color: var(--ink);
}
.feedback-msg.error {
  background: rgba(220, 38, 38, 0.08);
  border: 1px solid rgba(220, 38, 38, 0.2);
  color: #b91c1c;
}

/* ── Toolbar ────────────────────────────────────────────── */
.toolbar-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0 2rem 0.75rem;
  flex-wrap: wrap;
}

.search-field {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.search-icon {
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  width: 15px;
  height: 15px;
  fill: var(--ink-muted);
  pointer-events: none;
}

.search-field input {
  width: 100%;
  padding: 0.6rem 2.2rem 0.6rem 2.3rem;
  border: 1px solid rgba(255, 133, 187, 0.3);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  font-size: 0.875rem;
  color: var(--ink);
  outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
  box-sizing: border-box;
}
.search-field input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(255, 133, 187, 0.18);
}

.search-clear {
  position: absolute;
  right: 0.65rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--ink-muted);
  font-size: 0.8rem;
  padding: 2px 4px;
  line-height: 1;
}
.search-clear:hover { color: var(--ink); }

.sort-select {
  padding: 0.6rem 0.9rem;
  border: 1px solid rgba(255, 133, 187, 0.3);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  font-size: 0.875rem;
  color: var(--ink);
  outline: none;
  cursor: pointer;
  transition: border-color 150ms ease;
  flex-shrink: 0;
}
.sort-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(255, 133, 187, 0.18);
}

.result-hint {
  margin: 0 2rem 0.75rem;
  font-size: 0.8rem;
  color: var(--ink-muted);
}

/* ── Empty States ───────────────────────────────────────── */
.empty-uploads,
.empty-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  text-align: center;
  padding: 3rem 2rem;
}

.empty-icon {
  font-size: 2.2rem;
  line-height: 1;
}

.empty-title {
  font-weight: 600;
  color: var(--ink);
  margin: 0.25rem 0 0.1rem;
  font-size: 1rem;
}

.empty-sub {
  color: var(--ink-muted);
  font-size: 0.875rem;
  margin: 0 0 0.75rem;
  max-width: 280px;
}

/* ── Resource List ──────────────────────────────────────── */
.resource-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0 2rem;
  transition: opacity 200ms ease;
}

.resource-list.is-refreshing {
  opacity: 0.55;
  pointer-events: none;
}

/* ── Resource Card ──────────────────────────────────────── */
.resource-card {
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(255, 133, 187, 0.2);
  border-radius: 16px;
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: box-shadow 150ms ease, border-color 150ms ease, transform 150ms ease;
}
.resource-card:hover {
  box-shadow: 0 4px 20px rgba(255, 133, 187, 0.18);
  border-color: rgba(255, 133, 187, 0.4);
  transform: translateY(-1px);
}

.resource-card-main { display: flex; flex-direction: column; gap: 0.45rem; }

.resource-meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.type-pill {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  background: var(--primary-soft);
  border: 1px solid rgba(255, 133, 187, 0.3);
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink);
}

.course-pill {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  background: rgba(2, 26, 84, 0.07);
  border: 1px solid rgba(2, 26, 84, 0.12);
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink);
}

.date-text {
  margin-left: auto;
  font-size: 0.72rem;
  color: var(--ink-muted);
  white-space: nowrap;
}

.resource-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
  line-height: 1.35;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

/* ── Stats ──────────────────────────────────────────────── */
.resource-stats {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  background: rgba(245, 245, 245, 0.8);
  border: 1px solid var(--theme-border);
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--ink);
}
.stat-chip svg { fill: #f4b400; }
.stat-chip:nth-child(2) svg { fill: var(--ink-muted); }

.stat-chip-muted {
  color: var(--ink-muted);
  background: transparent;
  border-color: transparent;
  padding-left: 0;
}

/* ── Card Actions ───────────────────────────────────────── */
.resource-card-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(255, 133, 187, 0.12);
}

/* ── Skeleton ───────────────────────────────────────────── */
.skeleton-card {
  pointer-events: none;
  background: rgba(255, 255, 255, 0.55) !important;
  border-color: rgba(224, 224, 224, 0.5) !important;
}

.skeleton-line {
  border-radius: 8px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.skeleton-pill  { width: 80px;  height: 20px; border-radius: 20px; }
.skeleton-title { width: 65%;   height: 16px; margin-top: 6px; }
.skeleton-short { width: 40%;   height: 12px; margin-top: 4px; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Modal ──────────────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 26, 84, 0.35);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 999;
}

.modal-card {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 133, 187, 0.3);
  border-radius: 20px;
  width: 100%;
  max-width: 440px;
  padding: 1.5rem;
  box-shadow: 0 20px 60px rgba(2, 26, 84, 0.18);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.modal-card-sm { max-width: 360px; }

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}
.modal-header h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--ink);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.3rem;
  line-height: 1;
  cursor: pointer;
  color: var(--ink-muted);
  padding: 2px 6px;
  border-radius: 6px;
  transition: background 120ms ease, color 120ms ease;
}
.close-btn:hover {
  background: var(--primary-soft);
  color: var(--ink);
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
}
.field-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: 0.02em;
}
.field-group input,
.field-group select {
  padding: 0.6rem 0.85rem;
  border: 1px solid rgba(255, 133, 187, 0.35);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  font-size: 0.875rem;
  color: var(--ink);
  outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.field-group input:focus,
.field-group select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(255, 133, 187, 0.18);
}
.field-group input:disabled,
.field-group select:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.required { color: var(--primary); }

.confirm-text {
  font-size: 0.9rem;
  color: var(--ink);
  margin: 0 0 1.25rem;
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

/* ── Chip overrides (danger) ────────────────────────────── */
.chip-danger {
  background: rgba(220, 38, 38, 0.1) !important;
  border-color: rgba(220, 38, 38, 0.3) !important;
  color: #b91c1c !important;
}
.chip-danger:hover:not(:disabled) {
  background: rgba(220, 38, 38, 0.18) !important;
  border-color: rgba(220, 38, 38, 0.5) !important;
}

/* ── Transitions ────────────────────────────────────────── */
.fade-enter-active,
.fade-leave-active { transition: opacity 200ms ease; }
.fade-enter-from,
.fade-leave-to     { opacity: 0; }

.modal-enter-active,
.modal-leave-active { transition: opacity 220ms ease; }
.modal-enter-from,
.modal-leave-to     { opacity: 0; }
.modal-enter-active .modal-card,
.modal-leave-active .modal-card { transition: transform 220ms ease; }
.modal-enter-from .modal-card   { transform: translateY(10px) scale(0.98); }
.modal-leave-to .modal-card     { transform: translateY(6px) scale(0.98); }

/* ── Responsive ─────────────────────────────────────────── */
@media (max-width: 640px) {
  .page-header  { padding: 1.25rem 1rem 1rem; }
  .summary-bar  { padding: 0 1rem 1rem; }
  .toolbar-row  { padding: 0 1rem 0.75rem; flex-direction: column; }
  .search-field { min-width: 0; }
  .result-hint  { margin-left: 1rem; }
  .resource-list { padding: 0 1rem; }
  .feedback-msg  { margin-left: 1rem; margin-right: 1rem; }
}
</style>