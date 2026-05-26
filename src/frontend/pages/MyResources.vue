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

        <p v-if="message" class="feedback-msg" :class="messageType">{{ message }}</p>

        <!-- Empty state -->
        <div v-if="!isLoading && resources.length === 0" class="empty-block">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zM6 4h6v6h6v10H6V4z"/></svg>
          <p>You haven't uploaded any resources yet.</p>
          <router-link to="/resources" class="chip chip-strong">Go to Resources</router-link>
        </div>

        <div v-if="isLoading && resources.length === 0" class="empty-block">
          <p>Loading your uploads…</p>
        </div>

        <!-- Resource list -->
        <div class="resource-list">
          <article
            v-for="resource in resources"
            :key="resource.id"
            class="resource-card"
          >
            <div class="resource-card-main">
              <div class="resource-meta-row">
                <span class="type-pill">{{ resource.resource_type || 'misc' }}</span>
                <span class="course-pill" v-if="resource.course_code">{{ resource.course_code }}</span>
                <span class="date-text">{{ formatDate(resource.created_at) }}</span>
              </div>

              <h3 class="resource-title">{{ resource.title || 'Untitled Resource' }}</h3>

              <div class="resource-stats">
                <span class="stat-chip">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                  {{ Number(resource.avg_rating || 0).toFixed(1) }}
                </span>
                <span class="stat-chip">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
                  {{ resource.review_count || 0 }} review{{ resource.review_count !== 1 ? 's' : '' }}
                </span>
              </div>
            </div>

            <div class="resource-card-actions">
              <router-link
                :to="{ path: `/resources/${resource.id}`, query: { from: 'my-resources' } }"
                class="chip chip-soft"
              >View</router-link>
              <button class="chip" type="button" @click="openEdit(resource)">Edit</button>
              <button class="chip chip-danger" type="button" @click="confirmDelete(resource)">Delete</button>
            </div>
          </article>
        </div>

        <!-- Edit Modal -->
        <div v-if="editTarget" class="modal-overlay" @click.self="closeEdit">
          <div class="modal-card" role="dialog" aria-modal="true" aria-label="Edit resource">
            <div class="modal-header">
              <h3>Edit Resource</h3>
              <button class="close-btn" type="button" @click="closeEdit">&times;</button>
            </div>

            <form @submit.prevent="saveEdit" class="edit-form">
              <div class="field">
                <label>Title</label>
                <input v-model="editForm.title" type="text" required maxlength="200" />
              </div>

              <div class="field">
                <label>Resource Type</label>
                <select v-model="editForm.resourceType">
                  <option value="past-year">Past Year Paper</option>
                  <option value="lecture-note">Lecture Note</option>
                  <option value="slide">Slides</option>
                  <option value="assignment">Assignment</option>
                  <option value="link">External Link</option>
                  <option value="miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div class="field">
                <label>Course Code <span class="optional">(optional)</span></label>
                <input v-model="editForm.courseCode" type="text" maxlength="20" placeholder="e.g. CS101" />
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
          <div class="modal-card modal-card-sm" role="dialog" aria-modal="true">
            <div class="modal-header">
              <h3>Delete Resource</h3>
              <button class="close-btn" type="button" @click="cancelDelete">&times;</button>
            </div>
            <p class="confirm-text">Are you sure you want to delete <strong>{{ deleteTarget.title }}</strong>? This cannot be undone.</p>
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
import { ref, onMounted } from 'vue'
import { api } from '@/api.js'

const resources = ref([])
const isLoading = ref(false)
const message = ref('')
const messageType = ref('success')

// Edit state
const editTarget = ref(null)
const editForm = ref({ title: '', resourceType: '', courseCode: '' })
const editMessage = ref('')
const editMessageType = ref('success')
const isSaving = ref(false)

// Delete state
const deleteTarget = ref(null)
const isDeleting = ref(false)

const formatDate = (val) => {
  if (!val) return '—'
  return new Date(val).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const loadResources = async () => {
  isLoading.value = true
  message.value = ''
  try {
    const resp = await api('/resources/mine')
    resources.value = resp.resources || []
  } catch (err) {
    message.value = `Error loading resources: ${err.message}`
    messageType.value = 'error'
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
}

const closeEdit = () => {
  editTarget.value = null
  editMessage.value = ''
}

const saveEdit = async () => {
  isSaving.value = true
  editMessage.value = ''
  try {
    const resp = await api(`/resources/${editTarget.value.id}`, 'PUT', {
      title: editForm.value.title.trim(),
      resourceType: editForm.value.resourceType,
      courseCode: editForm.value.courseCode.trim() || null,
    })
    // Patch local list
    const idx = resources.value.findIndex(r => r.id === editTarget.value.id)
    if (idx !== -1) {
      resources.value[idx] = {
        ...resources.value[idx],
        title: resp.resource.title,
        resource_type: resp.resource.resource_type,
        course_code: resp.resource.course_code,
      }
    }
    closeEdit()
    message.value = 'Resource updated successfully.'
    messageType.value = 'success'
  } catch (err) {
    editMessage.value = `Error: ${err.message}`
    editMessageType.value = 'error'
  } finally {
    isSaving.value = false
  }
}

const confirmDelete = (resource) => {
  deleteTarget.value = resource
}

const cancelDelete = () => {
  deleteTarget.value = null
}

const doDelete = async () => {
  isDeleting.value = true
  try {
    await api(`/resources/${deleteTarget.value.id}`, 'DELETE')
    resources.value = resources.value.filter(r => r.id !== deleteTarget.value.id)
    cancelDelete()
    message.value = 'Resource deleted.'
    messageType.value = 'success'
  } catch (err) {
    cancelDelete()
    message.value = `Error: ${err.message}`
    messageType.value = 'error'
  } finally {
    isDeleting.value = false
  }
}

onMounted(() => {
  loadResources()
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

/* ── Resource list ── */
.resource-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0 2rem;
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
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.6rem;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  .resource-list {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  .feedback-msg {
    margin-left: 1rem;
    margin-right: 1rem;
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
