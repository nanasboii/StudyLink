<template>
  <main class="page-bg">
    <div class="view">
      <!-- Header -->
      <div class="card page-header">
        <div>
          <p class="page-kicker">Contributor Dashboard</p>
          <h2>My Resources</h2>
          <p class="page-subtext">Manage your uploaded study materials</p>
        </div>
        <div class="header-stats" v-if="resources.length">
          <div class="stat-pill">
            <span class="stat-val">{{ resources.length }}</span>
            <span class="stat-lbl">Resources</span>
          </div>
          <div class="stat-pill">
            <span class="stat-val">{{ totalReviews }}</span>
            <span class="stat-lbl">Reviews</span>
          </div>
          <div class="stat-pill">
            <span class="stat-val">{{ overallRating }}</span>
            <span class="stat-lbl">Avg Rating</span>
          </div>
        </div>
      </div>

      <!-- Feedback -->
      <Transition name="msg-fade">
        <p v-if="message" class="feedback-msg" :class="messageType" role="alert" aria-live="polite">{{ message }}</p>
      </Transition>

      <!-- Toolbar -->
      <div class="card toolbar-card">
        <div class="search-wrap">
          <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" stroke-width="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="2"/></svg>
          <input v-model="searchQuery" class="search-input" placeholder="Search resources…" aria-label="Search your resources"/>
        </div>
        <div class="sort-wrap">
          <label class="sort-label" for="sort-select">Sort</label>
          <select id="sort-select" v-model="sortBy" class="sort-select" aria-label="Sort resources">
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="rating">Rating</option>
            <option value="reviews">Reviews</option>
          </select>
        </div>
      </div>

      <!-- Loading skeleton -->
      <div v-if="isLoading" class="card skeleton-list" aria-label="Loading resources">
        <div v-for="i in 4" :key="i" class="skeleton-resource">
          <div class="skel-type"></div>
          <div class="skel-body">
            <div class="skel-title"></div>
            <div class="skel-meta"></div>
          </div>
          <div class="skel-actions"></div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="!filteredResources.length" class="card empty-state" aria-live="polite">
        <span class="empty-icon" aria-hidden="true">📂</span>
        <p v-if="searchQuery">No resources match "{{ searchQuery }}"</p>
        <p v-else>You haven't uploaded any resources yet.</p>
        <button v-if="searchQuery" class="chip-soft" @click="searchQuery = ''">Clear search</button>
      </div>

      <!-- Resource list -->
      <div v-else class="resources-list">
        <TransitionGroup name="list-fade">
          <div
            v-for="resource in filteredResources"
            :key="resource.id"
            class="card resource-card"
          >
            <!-- View / non-edit mode -->
            <template v-if="editTarget?.id !== resource.id">
              <div class="resource-top">
                <div class="resource-type-badge" :class="resource.resource_type">
                  {{ resourceTypeLabel(resource.resource_type) }}
                </div>
                <div class="resource-actions-row">
                  <button class="chip-soft" @click="startEdit(resource)" :aria-label="`Edit ${resource.title}`">Edit</button>
                  <button
                    class="chip-danger"
                    @click="confirmDelete(resource)"
                    :aria-label="`Delete ${resource.title}`"
                    :class="{ 'chip-danger--confirm': deleteTarget?.id === resource.id }"
                  >
                    {{ deleteTarget?.id === resource.id ? '⚠ Confirm?' : 'Delete' }}
                  </button>
                </div>
              </div>
              <h3 class="resource-title">{{ resource.title || 'Untitled' }}</h3>
              <p class="resource-meta">
                <span>{{ resource.course_code || '—' }}</span>
                <span class="meta-dot">·</span>
                <!-- FIX: guard .toFixed() on null avg_rating -->
                <span>⭐ {{ resource.avg_rating != null ? Number(resource.avg_rating).toFixed(1) : '—' }}</span>
                <span class="meta-dot">·</span>
                <span>{{ resource.review_count ?? 0 }} reviews</span>
                <span class="meta-dot">·</span>
                <!-- FIX: guard invalid date -->
                <span>{{ formatDate(resource.created_at) }}</span>
              </p>
            </template>

            <!-- Edit mode -->
            <template v-else>
              <p class="edit-label">Editing resource</p>

              <Transition name="msg-fade">
                <p v-if="editMessage" class="feedback-msg" :class="editMessageType" role="alert">{{ editMessage }}</p>
              </Transition>

              <div class="edit-form">
                <div class="field-group">
                  <label class="field-label" :for="`title-${resource.id}`">Title</label>
                  <input
                    :id="`title-${resource.id}`"
                    ref="titleInput"
                    v-model="editForm.title"
                    class="edit-input"
                    maxlength="200"
                    placeholder="Resource title"
                    :aria-describedby="`title-err-${resource.id}`"
                  />
                </div>
                <div class="edit-row">
                  <div class="field-group">
                    <label class="field-label" :for="`type-${resource.id}`">Type</label>
                    <select :id="`type-${resource.id}`" v-model="editForm.resourceType" class="edit-input">
                      <option value="">— Select —</option>
                      <option value="lecture-note">Lecture Note</option>
                      <option value="slides">Slides</option>
                      <option value="past-year">Past Year Paper</option>
                      <option value="assignment">Assignment</option>
                      <option value="pdf">PDF</option>
                      <option value="link">External Link</option>
                      <option value="miscellaneous">Miscellaneous</option>
                    </select>
                  </div>
                  <div class="field-group">
                    <label class="field-label" :for="`code-${resource.id}`">Course Code</label>
                    <input
                      :id="`code-${resource.id}`"
                      v-model="editForm.courseCode"
                      class="edit-input"
                      placeholder="e.g. TMC1024"
                      maxlength="20"
                    />
                  </div>
                </div>
              </div>

              <div class="edit-actions">
                <button class="chip-soft" @click="cancelEdit">Cancel</button>
                <button class="chip-primary" @click="saveEdit(resource)" :disabled="isSaving" :aria-busy="isSaving">
                  {{ isSaving ? 'Saving…' : 'Save' }}
                </button>
              </div>
            </template>
          </div>
        </TransitionGroup>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { api } from '@/api.js'

const resources    = ref([])
const isLoading    = ref(false)
const message      = ref('')
const messageType  = ref('success')
const searchQuery  = ref('')
const sortBy       = ref('newest')
const editTarget   = ref(null)
const editForm     = ref({ title: '', resourceType: '', courseCode: '' })
const editMessage  = ref('')
const editMessageType = ref('success')
const isSaving     = ref(false)
const titleInput   = ref(null)
const deleteTarget = ref(null)
const isDeleting   = ref(false)
let messageTimer   = null
let deleteConfirmTimer = null

const RESOURCE_TYPE_LABELS = {
  'past-year':     'Past Year Paper',
  'lecture-note':  'Lecture Note',
  'slides':        'Slides',
  'slide':         'Slides',
  'pdf':           'PDF',
  'assignment':    'Assignment',
  'link':          'External Link',
  'miscellaneous': 'Miscellaneous',
}

const resourceTypeLabel = (value) => {
  if (!value) return 'Resource'
  const key = String(value).trim().toLowerCase()
  return RESOURCE_TYPE_LABELS[key] || (key.charAt(0).toUpperCase() + key.slice(1))
}

// FIX: guard invalid date
const formatDate = (raw) => {
  if (!raw) return ''
  try {
    const d = new Date(raw)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return '' }
}

const setMessage = (text, type = 'success') => {
  if (messageTimer) clearTimeout(messageTimer)
  message.value    = text
  messageType.value = type
  if (type === 'success') messageTimer = setTimeout(() => { message.value = '' }, 3500)
}

// ── Computed stats ──
const totalReviews = computed(() =>
  resources.value.reduce((sum, r) => sum + (Number(r.review_count) || 0), 0)
)

const overallRating = computed(() => {
  const rated = resources.value.filter(r => Number(r.review_count) > 0)
  if (!rated.length) return '—'
  const totalW = rated.reduce((s, r) => s + Number(r.review_count), 0)
  const weightedSum = rated.reduce((s, r) => s + (Number(r.avg_rating || 0) * Number(r.review_count)), 0)
  return totalW > 0 ? (weightedSum / totalW).toFixed(1) : '—'
})

// FIX: filter + sort with null guards
const filteredResources = computed(() => {
  let list = [...resources.value]
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(r =>
      (r.title || '').toLowerCase().includes(q) ||
      (r.course_code || '').toLowerCase().includes(q) ||
      (r.resource_type || '').toLowerCase().includes(q)
    )
  }
  list.sort((a, b) => {
    if (sortBy.value === 'newest') return new Date(b.created_at || 0) - new Date(a.created_at || 0)
    if (sortBy.value === 'oldest') return new Date(a.created_at || 0) - new Date(b.created_at || 0)
    if (sortBy.value === 'rating') return (Number(b.avg_rating) || 0) - (Number(a.avg_rating) || 0)
    if (sortBy.value === 'reviews') return (Number(b.review_count) || 0) - (Number(a.review_count) || 0)
    return 0
  })
  return list
})

// ── API ──
const loadResources = async () => {
  isLoading.value = true
  try {
    const data = await api('/resources/mine')   // was: api('/my-resources')
    resources.value = Array.isArray(data?.resources) ? data.resources : []
  } catch (err) {
    setMessage(err?.message || 'Failed to load resources.', 'error')
  } finally {
    isLoading.value = false
  }
}

const startEdit = (resource) => {
  editTarget.value = resource
  editForm.value   = {
    title:        resource.title || '',
    resourceType: resource.resource_type || '',
    courseCode:   resource.course_code || '',
  }
  editMessage.value = ''
  nextTick(() => titleInput.value?.focus())
}

const cancelEdit = () => {
  editTarget.value  = null
  editMessage.value = ''
}

const saveEdit = async (resource) => {
  // FIX: trim whitespace, check empty
  const title = editForm.value.title.trim()
  if (!title) {
    editMessage.value     = 'Title is required.'
    editMessageType.value = 'error'
    return
  }
  isSaving.value = true
  editMessage.value = ''
  try {
    await api(`/resources/${resource.id}`, 'PATCH', {
      title,
      resourceType: editForm.value.resourceType,
      courseCode:   editForm.value.courseCode.trim(),
    })
    const idx = resources.value.findIndex(r => r.id === resource.id)
    if (idx !== -1) {
      resources.value[idx] = {
        ...resources.value[idx],
        title,
        resource_type: editForm.value.resourceType,
        course_code:   editForm.value.courseCode.trim(),
      }
    }
    editTarget.value = null
    setMessage('Resource updated.', 'success')
  } catch (err) {
    editMessage.value     = err?.message || 'Save failed.'
    editMessageType.value = 'error'
  } finally {
    // FIX: always reset saving flag
    isSaving.value = false
  }
}

// FIX: 2-step confirm delete
const confirmDelete = async (resource) => {
  if (deleteTarget.value?.id !== resource.id) {
    deleteTarget.value = resource
    clearTimeout(deleteConfirmTimer)
    deleteConfirmTimer = setTimeout(() => { deleteTarget.value = null }, 3000)
    return
  }
  // Second click — actually delete
  clearTimeout(deleteConfirmTimer)
  isDeleting.value = true
  try {
    await api(`/resources/${resource.id}`, 'DELETE')
    resources.value = resources.value.filter(r => r.id !== resource.id)
    setMessage('Resource deleted.', 'success')
  } catch (err) {
    setMessage(err?.message || 'Delete failed.', 'error')
  } finally {
    deleteTarget.value = null
    isDeleting.value   = false
  }
}

onMounted(() => { loadResources() })
onBeforeUnmount(() => {
  clearTimeout(messageTimer)
  clearTimeout(deleteConfirmTimer)
})
</script>

<style scoped>
.page-bg { min-height: 100vh; background: #F5F5F5 }
.view { padding: 20px 16px 80px; max-width: 768px; margin: 0 auto }

/* Glass card */
.card {
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 2px solid #021A54;
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
}

/* Header */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}
.page-kicker { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #FF85BB; margin: 0 0 4px }
.page-header h2 { margin: 0 0 4px; font-size: clamp(1.4rem, 3vw, 2rem); font-weight: 800; color: #021A54 }
.page-subtext { margin: 0; font-size: 12px; color: #6e6e73; font-weight: 600 }

.header-stats { display: flex; gap: 12px; flex-wrap: wrap }
.stat-pill {
  display: flex; flex-direction: column; align-items: center;
  padding: 8px 16px; background: rgba(255,133,187,0.1);
  border: 1.5px solid #FF85BB; border-radius: 10px;
  min-width: 60px;
}
.stat-val { font-size: 20px; font-weight: 800; color: #021A54 }
.stat-lbl { font-size: 10px; font-weight: 700; color: #FF85BB; text-transform: uppercase; letter-spacing: 0.05em }

/* Feedback */
.feedback-msg {
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
}
.feedback-msg.success { background: rgba(34,134,82,0.08); border: 1.5px solid rgba(34,134,82,0.3); color: #1a6b40 }
.feedback-msg.error   { background: rgba(255,133,187,0.12); border: 1.5px solid #FF85BB; color: #021A54 }

/* Toolbar */
.toolbar-card { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 14px 20px }
.search-wrap { flex: 1; min-width: 180px; display: flex; align-items: center; gap: 8px; border: 1.5px solid #FFCEE3; border-radius: 10px; padding: 8px 12px; background: #fff }
.search-icon { width: 14px; height: 14px; color: #FF85BB; flex-shrink: 0 }
.search-input { flex: 1; border: none; outline: none; font-size: 13px; color: #021A54; background: transparent; min-width: 0 }
.search-input::placeholder { color: #aaa }
.sort-wrap { display: flex; align-items: center; gap: 6px }
.sort-label { font-size: 12px; font-weight: 700; color: #6e6e73; white-space: nowrap }
.sort-select { border: 1.5px solid #FFCEE3; border-radius: 8px; padding: 7px 10px; font-size: 13px; font-weight: 600; color: #021A54; background: #fff; cursor: pointer }

/* Skeleton */
.skeleton-list { display: flex; flex-direction: column; gap: 12px }
.skeleton-resource { display: flex; align-items: center; gap: 12px; animation: shimmer 1.4s infinite }
.skel-type  { width: 80px; height: 20px; border-radius: 6px; background: #e0e0e0; flex-shrink: 0 }
.skel-body  { flex: 1; display: flex; flex-direction: column; gap: 6px }
.skel-title { height: 14px; border-radius: 4px; background: #e0e0e0; width: 70% }
.skel-meta  { height: 10px; border-radius: 4px; background: #ebebeb; width: 50% }
.skel-actions { width: 80px; height: 28px; border-radius: 8px; background: #e0e0e0 }
@keyframes shimmer { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }

/* Empty */
.empty-state { text-align: center; padding: 40px 20px }
.empty-icon { font-size: 3rem; display: block; margin-bottom: 12px }

/* Resource cards */
.resources-list { display: flex; flex-direction: column; gap: 12px }

.resource-card { padding: 16px 20px }

.resource-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 10px }

.resource-type-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: #FFCEE3;
  color: #021A54;
  flex-shrink: 0;
}
.resource-type-badge.slides,
.resource-type-badge.slide,
.resource-type-badge.pdf { background: #021A54; color: #FFCEE3 }
.resource-type-badge.past-year { background: #FF85BB; color: #021A54 }

.resource-actions-row { display: flex; gap: 8px; flex-shrink: 0 }

.resource-title { margin: 0 0 6px; font-size: 15px; font-weight: 700; color: #021A54 }
.resource-meta { margin: 0; font-size: 12px; color: #6e6e73; display: flex; align-items: center; gap: 6px; flex-wrap: wrap }
.meta-dot { color: #FFCEE3 }

/* Edit form */
.edit-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #FF85BB; margin: 0 0 12px }
.edit-form { display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px }
.field-group { display: flex; flex-direction: column; gap: 5px; flex: 1 }
.field-label { font-size: 11px; font-weight: 700; color: #6e6e73; text-transform: uppercase; letter-spacing: 0.05em }
.edit-input {
  border: 1.5px solid #FFCEE3;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 13px;
  color: #021A54;
  background: #fff;
  transition: border-color 150ms;
  width: 100%;
  box-sizing: border-box;
}
.edit-input:focus { outline: none; border-color: #FF85BB; box-shadow: 0 0 0 3px rgba(255,133,187,0.15) }
.edit-row { display: flex; gap: 12px; flex-wrap: wrap }
.edit-actions { display: flex; gap: 8px; justify-content: flex-end }

/* Chips */
.chip-soft {
  padding: 6px 14px; border: 1.5px solid #FFCEE3; border-radius: 8px;
  background: #F5F5F5; color: #021A54; font-size: 12px; font-weight: 700;
  cursor: pointer; transition: all 120ms; white-space: nowrap;
}
.chip-soft:hover { border-color: #FF85BB; background: #fff }
.chip-primary {
  padding: 7px 16px; border: 1.5px solid #021A54; border-radius: 8px;
  background: #FF85BB; color: #021A54; font-size: 12px; font-weight: 800;
  cursor: pointer; transition: background 120ms; white-space: nowrap;
}
.chip-primary:hover:not(:disabled) { background: #ff6da9 }
.chip-primary:disabled { opacity: 0.6; cursor: not-allowed }
.chip-danger {
  padding: 6px 14px; border: 1.5px solid #FF85BB; border-radius: 8px;
  background: transparent; color: #FF85BB; font-size: 12px; font-weight: 700;
  cursor: pointer; transition: all 120ms; white-space: nowrap;
}
.chip-danger:hover { background: rgba(255,133,187,0.12) }
.chip-danger--confirm {
  background: #FF85BB; color: #021A54; border-color: #021A54; font-weight: 800;
}

/* Transitions */
.msg-fade-enter-active, .msg-fade-leave-active { transition: opacity 0.25s }
.msg-fade-enter-from, .msg-fade-leave-to { opacity: 0 }
.list-fade-enter-active { transition: opacity 0.2s, transform 0.2s }
.list-fade-leave-active { transition: opacity 0.15s }
.list-fade-enter-from { opacity: 0; transform: translateY(8px) }
.list-fade-leave-to { opacity: 0 }

@media (prefers-reduced-motion: reduce) {
  .skeleton-resource { animation: none }
  .msg-fade-enter-active, .msg-fade-leave-active,
  .list-fade-enter-active, .list-fade-leave-active { transition: none }
}
</style>