<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active">
        <section class="resources-hero">
          <div class="resources-hero__copy">
            <p class="resources-hero__kicker">Study Smarter</p>
            <h2 id="resourcesHeroTitle">Welcome back, {{ firstName }}</h2>
            <p class="resources-hero__text">Find past papers, lecture notes, slides, and shared links in a glassy workspace built to help you move faster.</p>
          </div>
          <div class="resources-hero__stats" aria-label="Resource highlights">
            <div class="hero-stat">
              <span class="hero-stat__label">Available Now</span>
              <strong>{{ totalResources }}</strong>
            </div>
            <div class="hero-stat">
              <span class="hero-stat__label">Top Picks</span>
              <strong>{{ topPickCount }}</strong>
            </div>
            <div class="hero-stat">
              <span class="hero-stat__label">Latest Uploads</span>
              <strong>{{ latestCount }}</strong>
            </div>
          </div>
        </section>

        <div class="search-row resource-toolbar">
          <div class="resource-search-shell" role="search">
            <input 
              v-model="searchQuery" 
              placeholder="Search by course code, title, type, or uploader" 
              @input="debouncedSearch"
            />
            <div class="search-inline-actions" aria-label="Search controls">
              <button class="icon-chip" type="button" aria-label="Search" title="Search" @click="visibleCount = pageSize">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M10.5 4a6.5 6.5 0 1 0 4.14 11.5l4.18 4.18 1.41-1.41-4.18-4.18A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" />
                </svg>
              </button>
              <button class="icon-chip" type="button" aria-label="Open filters" @click="showFilters = !showFilters" title="Toggle filters">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M3 5h18v2l-7 7v5l-4-2v-3L3 7V5Zm4 2 5 5 5-5H7Z" />
                </svg>
              </button>
            </div>
          </div>
          <div class="action-row">
            <button class="chip chip-strong" type="button" @click="showUploadModal = true">Upload Resource</button>
          </div>
        </div>

        <!-- Filter Panel Backdrop -->
        <div v-if="showFilters" class="filter-backdrop" @click="showFilters = false"></div>

        <!-- Filter Panel (Shopee Style) -->
        <div v-if="showFilters" class="filter-panel">
          <!-- Star Rating Slider -->
          <div class="filter-section">
            <div class="filter-header">
              <h4>Star Rating</h4>
              <button type="button" class="expand-btn" @click="expandedSections.rating = !expandedSections.rating">
                {{ expandedSections.rating ? '−' : '+' }}
              </button>
            </div>
            <div v-if="expandedSections.rating" class="filter-content">
              <div class="rating-slider-wrap">
                <input 
                  v-model.number="filterMinRating" 
                  type="range" 
                  min="0" 
                  max="5" 
                  step="0.5" 
                  class="rating-slider"
                />
                <div class="rating-value">{{ filterMinRating.toFixed(1) }} ⭐ and above</div>
              </div>
            </div>
          </div>

          <!-- Resource Type Checkbox -->
          <div class="filter-section">
            <div class="filter-header">
              <h4>Resource Type</h4>
              <button type="button" class="expand-btn" @click="expandedSections.type = !expandedSections.type">
                {{ expandedSections.type ? '−' : '+' }}
              </button>
            </div>
            <div v-if="expandedSections.type" class="filter-content">
              <label v-for="rt in resourceTypes.filter(r => r.value)" :key="rt.value" class="filter-checkbox">
                <input 
                  type="checkbox" 
                  :checked="selectedType === rt.value"
                  @change="selectedType = selectedType === rt.value ? '' : rt.value"
                />
                <span>{{ rt.label }}</span>
              </label>
            </div>
          </div>

          <!-- Price/Points Range -->
          <div class="filter-section">
            <div class="filter-header">
              <h4>Price Range</h4>
              <button type="button" class="expand-btn" @click="expandedSections.price = !expandedSections.price">
                {{ expandedSections.price ? '−' : '+' }}
              </button>
            </div>
            <div v-if="expandedSections.price" class="filter-content">
              <div class="price-inputs">
                <input v-model="filterMinPrice" type="number" placeholder="MIN" class="price-input" />
                <span class="price-divider">−</span>
                <input v-model="filterMaxPrice" type="number" placeholder="MAX" class="price-input" />
              </div>
            </div>
          </div>

          <!-- Apply Button -->
          <button class="filter-apply-btn" @click="applyFilters">APPLY</button>
        </div>

        <!-- Resource Type Chips (Quick Filter) -->
        <div class="chip-row" id="typeChips">
          <button 
            v-for="resourceType in resourceTypes" 
            :key="resourceType.value"
            class="chip"
            :class="{ 'chip-active': selectedType === resourceType.value }"
            @click="selectedType = selectedType === resourceType.value ? '' : resourceType.value"
          >
            {{ resourceType.label }}
          </button>
        </div>

        <!-- Suggested Resources -->
        <section class="suggested-section">
          <div class="search-row compact">
            <h3>Suggested for You</h3>
            <span class="meta">Scroll through resources people are using right now.</span>
          </div>
          <div class="suggested-carousel">
            <button 
              v-for="resource in suggestedResources" 
              :key="resource.id"
              class="suggested-card"
              @click="openResource(resource)"
            >
              <div class="suggested-media">
                <span aria-hidden="true">📚</span>
              </div>
              <div class="suggested-body">
                <div class="suggested-type">{{ resource.resource_type }}</div>
                <strong>{{ resource.title }}</strong>
                <div class="meta">{{ resource.course_code }} · {{ resource.contributor_name }}</div>
                <div class="meta rating-line">⭐ {{ Number(resource.avg_rating || 0).toFixed(1) }}</div>
              </div>
            </button>
          </div>
        </section>

        <!-- Main Resources List -->
        <section class="resources-section">
          <div class="search-row compact">
            <h3>Newly Uploaded</h3>
            <p class="meta" v-if="filteredResources.length">
              Fresh uploads from your community.
            </p>
          </div>
          <div id="resourceList" class="resources-list">
            <div v-if="isLoading" class="loading">Loading resources...</div>
            <div v-else-if="filteredResources.length === 0" class="empty-state">
              No resources found. Try another filter, or upload your first resource.
            </div>
            <button 
              v-for="resource in paginatedResources" 
              :key="resource.id"
              class="resource-card"
              @click="openResource(resource)"
            >
              <div class="resource-cover">
                <div class="resource-cover-icon">📄</div>
                <div class="resource-cover-meta">
                  <div class="resource-cover-tag">{{ resource.resource_type }}</div>
                </div>
              </div>
              <div class="resource-card-body">
                <strong>{{ resource.course_code }} - {{ resource.title }}</strong>
                <div class="meta">By {{ resource.contributor_name }}</div>
                <div class="meta">⭐ {{ Number(resource.avg_rating || 0).toFixed(1) }}</div>
              </div>
            </button>
          </div>
          <button 
            v-if="visibleCount < filteredResources.length"
            class="chip"
            @click="visibleCount += pageSize"
          >
            Load more resources
          </button>
        </section>

        <!-- Upload Modal -->
        <div v-if="showUploadModal" class="modal-backdrop" @click="showUploadModal = false">
          <div class="modal-content" @click.stop>
            <button class="modal-close" @click="showUploadModal = false">×</button>
            <h3>Upload Resource</h3>
            <form @submit.prevent="handleUpload" class="stack">
              <label>
                Title
                <input v-model="uploadForm.title" placeholder="Week 3 Lecture Slides" required />
              </label>
              <label>
                Course Code
                <input v-model="uploadForm.courseCode" placeholder="TMF3953" />
              </label>
              <label>
                Resource Type
                <select v-model="uploadForm.resourceType" required>
                  <option value="">Select a type</option>
                  <option value="past-year">Past Year Paper</option>
                  <option value="lecture-note">Lecture Notes</option>
                  <option value="slides">Slides</option>
                  <option value="pdf">PDF</option>
                  <option value="link">Link</option>
                </select>
              </label>
              <label>
                Description
                <textarea v-model="uploadForm.description" rows="3" placeholder="What's this resource about?"></textarea>
              </label>
              <label>
                Upload File (optional)
                <input type="file" @change="onUploadFileChange" />
              </label>
              <label>
                Resource Link (optional)
                <input v-model="uploadForm.resourceLink" placeholder="https://example.com/resource" />
              </label>
              <button class="primary" type="submit" :disabled="isUploading">
                {{ isUploading ? 'Uploading...' : 'Upload' }}
              </button>
            </form>
            <p v-if="uploadMessage" :class="['message', uploadMessageType]">{{ uploadMessage }}</p>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api, getToken, getUser } from '@/api.js'

const router = useRouter()
const currentUser = getUser()

const resources = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
const selectedType = ref('')
const showUploadModal = ref(false)
const showFilters = ref(false)
const visibleCount = ref(12)
const pageSize = 12
const isUploading = ref(false)
const uploadMessage = ref('')
const uploadMessageType = ref('')
const selectedUploadFile = ref(null)
const expandedSections = ref({
  rating: true,
  type: true,
  price: false
})
const filterMinRating = ref(0)
const filterMinPrice = ref('')
const filterMaxPrice = ref('')

const uploadForm = ref({
  title: '',
  courseCode: '',
  resourceType: '',
  description: '',
  resourceLink: ''
})

const resourceTypes = [
  { value: '', label: 'Popular' },
  { value: 'past-year', label: 'Past Year Papers' },
  { value: 'lecture-note', label: 'Lecture Notes' }
]

const firstName = computed(() => {
  if (!currentUser) return 'there'
  const name = currentUser.fullName || currentUser.full_name || currentUser.username || ''
  return name.split(/\s+/)[0] || 'there'
})

const suggestedResources = computed(() => resources.value.slice(0, 5))
const totalResources = computed(() => resources.value.length)
const topPickCount = computed(() => resources.value.filter(r => r.avg_rating >= 4).length)
const latestCount = computed(() => resources.value.slice(0, 5).length)

const filteredResources = computed(() => {
  let filtered = [...resources.value]

  if (selectedType.value) {
    filtered = filtered.filter(r => r.resource_type === selectedType.value)
  }

  if (filterMinRating.value > 0) {
    filtered = filtered.filter(r => Number(r.avg_rating || 0) >= filterMinRating.value)
  }

  if (filterMinPrice.value) {
    const minPrice = Number(filterMinPrice.value)
    filtered = filtered.filter(r => Number(r.total_points || 0) >= minPrice)
  }

  if (filterMaxPrice.value) {
    const maxPrice = Number(filterMaxPrice.value)
    filtered = filtered.filter(r => Number(r.total_points || 0) <= maxPrice)
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    filtered = filtered.filter(r =>
      (r.title?.toLowerCase().includes(q) ||
       r.course_code?.toLowerCase().includes(q) ||
       r.contributor_name?.toLowerCase().includes(q) ||
       r.resource_type?.toLowerCase().includes(q))
    )
  }

  return filtered
})

const paginatedResources = computed(() => 
  filteredResources.value.slice(0, visibleCount.value)
)

const debouncedSearch = (() => {
  let timeout
  return () => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      visibleCount.value = pageSize
    }, 300)
  }
})()

const loadResources = async () => {
  try {
    isLoading.value = true
    const data = await api('/resources')
    resources.value = data.resources || []
  } catch (error) {
    console.error('Failed to load resources:', error)
  } finally {
    isLoading.value = false
  }
}

const onUploadFileChange = (event) => {
  selectedUploadFile.value = event?.target?.files?.[0] || null
}

const applyFilters = () => {
  visibleCount.value = pageSize
  showFilters.value = false
}

const handleUpload = async () => {
  if (!uploadForm.value.title) {
    uploadMessage.value = 'Please enter a title'
    uploadMessageType.value = 'error'
    return
  }

  if (!uploadForm.value.resourceType) {
    uploadMessage.value = 'Please select a resource type'
    uploadMessageType.value = 'error'
    return
  }

  const trimmedLink = String(uploadForm.value.resourceLink || '').trim()
  if (!selectedUploadFile.value && !trimmedLink) {
    uploadMessage.value = 'Upload a file or paste a resource link'
    uploadMessageType.value = 'error'
    return
  }

  isUploading.value = true
  uploadMessage.value = ''
  try {
    const formData = new FormData()
    formData.append('title', uploadForm.value.title)
    formData.append('courseCode', uploadForm.value.courseCode || '')
    formData.append('resourceType', uploadForm.value.resourceType)
    if (trimmedLink) {
      formData.append('resourceLink', trimmedLink)
    }
    if (selectedUploadFile.value) {
      formData.append('resourceFile', selectedUploadFile.value)
    }

    const token = getToken()
    const response = await fetch('/api/resources/upload', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    uploadMessage.value = 'Resource uploaded successfully!'
    uploadMessageType.value = 'success'
    uploadForm.value = { title: '', courseCode: '', resourceType: '', description: '', resourceLink: '' }
    selectedUploadFile.value = null
    showUploadModal.value = false
    await loadResources()
  } catch (error) {
    uploadMessage.value = error.message || 'Upload failed'
    uploadMessageType.value = 'error'
  } finally {
    isUploading.value = false
  }
}

const openResource = (resource) => {
  router.push(`/resources/${resource.id}`)
}

onMounted(() => {
  const viewEl = document.querySelector('.view')
  const topbar = document.querySelector('.topbar')
  if (viewEl) {
    viewEl.scrollTop = topbar ? topbar.offsetHeight : 80
  }
  loadResources()
})
</script>

<style scoped>
.page-bg {
  min-height: 100vh;
  display: block;
  padding: 0;
  background: linear-gradient(180deg, #ffffff, #fff5f8 60%, #ffe7ee);
}

.phone-shell {
  width: 100%;
  max-width: 100%;
  margin: 0;
  min-height: 100vh;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  display: grid;
  grid-template-rows: 1fr;
  overflow: hidden;
}

.view {
  overflow-y: auto;
  padding: 20px 16px;
}

.resources-hero {
  margin-bottom: 24px;
}

.resources-hero__kicker {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: #c41e3a;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.resources-hero__copy h2 {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 700;
  color: #3f2f38;
  font-family: "Josefin Sans", "Trebuchet MS", sans-serif;
}

.resources-hero__text {
  margin: 0;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.resources-hero__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.hero-stat {
  padding: 12px;
  background: rgba(255, 183, 197, 0.1);
  border-radius: 10px;
  text-align: center;
}

.hero-stat__label {
  display: block;
  font-size: 11px;
  color: #c41e3a;
  margin-bottom: 4px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.hero-stat strong {
  display: block;
  font-size: 20px;
  color: #3f2f38;
}

.search-row {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.resource-search-shell {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  background: white;
  border-radius: 10px;
  border: 1px solid #e0e0e0;
  padding: 0 12px;
}

.resource-search-shell input {
  flex: 1;
  border: none;
  outline: none;
  padding: 10px 0;
  font-size: 14px;
}

.search-inline-actions {
  display: flex;
  gap: 4px;
}

.icon-chip {
  background: none;
  border: none;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #666;
  transition: color 150ms ease;
}

.icon-chip:hover {
  color: #3f2f38;
}

.icon-chip svg {
  width: 20px;
  height: 20px;
}

.action-row {
  display: flex;
  gap: 8px;
}

.filter-panel {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  backdrop-filter: blur(5px);
}

.filter-section {
  margin-bottom: 12px;
}

.filter-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #3f2f38;
}

.filter-section:last-child {
  margin-bottom: 0;
}

.chip-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  margin-bottom: 20px;
  padding-bottom: 8px;
}

.chip {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.suggested-section {
  margin-bottom: 32px;
}

.search-row.compact {
  margin-bottom: 12px;
}

.search-row h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #3f2f38;
}

.meta {
  margin: 0;
  font-size: 12px;
  color: #999;
}

.suggested-carousel {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.suggested-card {
  flex-shrink: 0;
  width: 180px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  transition: all 150ms ease;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.suggested-card:hover {
  border-color: #c41e3a;
  box-shadow: 0 4px 12px rgba(196, 30, 58, 0.15);
  transform: translateY(-2px);
}

.suggested-media {
  height: 60px;
  background: rgba(255, 183, 197, 0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.suggested-body strong {
  display: block;
  font-size: 13px;
  color: #3f2f38;
  margin-bottom: 4px;
  line-height: 1.4;
}

.suggested-type {
  font-size: 11px;
  color: #c41e3a;
  font-weight: 600;
  text-transform: uppercase;
}

.resources-section {
  margin-top: 24px;
}

.resources-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.resource-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 150ms ease;
  text-align: left;
}

.resource-card:hover {
  border-color: #c41e3a;
  box-shadow: 0 4px 12px rgba(196, 30, 58, 0.15);
  transform: translateY(-2px);
}

.resource-cover {
  height: 100px;
  background: rgba(255, 183, 197, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  position: relative;
}

.resource-cover-icon {
  font-size: 36px;
}

.resource-card-body {
  padding: 12px;
}

.resource-card-body strong {
  display: block;
  font-size: 13px;
  color: #3f2f38;
  margin-bottom: 6px;
  line-height: 1.4;
}

.loading,
.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #999;
  grid-column: 1 / -1;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 500px;
  width: 100%;
  position: relative;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #999;
}

.modal-content h3 {
  margin: 0 0 20px;
  font-size: 18px;
  font-weight: 600;
  color: #3f2f38;
}

.stack {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #3f2f38;
}

input,
select,
textarea {
  border: 2px solid #d1dadf;
  border-radius: 8px;
  padding: 10px;
  font-size: 14px;
  font-family: inherit;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #ffb7c5;
  box-shadow: 0 0 0 3px rgba(255, 183, 197, 0.28);
}

button.primary {
  padding: 12px;
  font-weight: 600;
}

button.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.message {
  padding: 10px;
  border-radius: 8px;
  font-size: 13px;
}

.message.error {
  background: #fff5f5;
  border: 1px solid #ffd6d6;
  color: #bc2f2f;
}

.message.success {
  background: #f5fff5;
  border: 1px solid #d6ffd6;
  color: #3f6f57;
}

/* New Filter Panel Styles */
.filter-panel {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 100%;
  max-width: 400px;
  background: white;
  border-left: 1px solid #e0e0e0;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
  padding: 24px;
  overflow-y: auto;
  z-index: 999;
  animation: slideInRight 300ms ease;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.filter-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 998;
  animation: fadeIn 300ms ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.filter-section {
  margin-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 12px;
}

.filter-section:last-child {
  margin-bottom: 0;
  border-bottom: none;
  padding-bottom: 0;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  cursor: pointer;
}

.filter-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #3f2f38;
  flex: 1;
}

.expand-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 150ms ease;
}

.expand-btn:hover {
  color: #c41e3a;
}

.filter-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: slideDown 150ms ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    max-height: 0;
  }
  to {
    opacity: 1;
    max-height: 500px;
  }
}

.filter-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #666;
  user-select: none;
  transition: color 150ms ease;
}

.filter-checkbox:hover {
  color: #3f2f38;
}

.filter-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #c41e3a;
  border: 2px solid #d1dadf;
  border-radius: 4px;
}

.rating-slider-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rating-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(to right, #ffb7c5, #ff8fa3);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.rating-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #c41e3a;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(196, 30, 58, 0.3);
  transition: all 150ms ease;
}

.rating-slider::-webkit-slider-thumb:hover {
  width: 22px;
  height: 22px;
  box-shadow: 0 4px 12px rgba(196, 30, 58, 0.4);
}

.rating-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #c41e3a;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 6px rgba(196, 30, 58, 0.3);
  transition: all 150ms ease;
}

.rating-slider::-moz-range-thumb:hover {
  width: 22px;
  height: 22px;
  box-shadow: 0 4px 12px rgba(196, 30, 58, 0.4);
}

.rating-value {
  font-size: 12px;
  color: #c41e3a;
  font-weight: 600;
  text-align: center;
}

.price-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
}

.price-input {
  flex: 1;
  border: 2px solid #d1dadf;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  text-align: center;
}

.price-input::placeholder {
  color: #ccc;
}

.price-input:focus {
  border-color: #ffb7c5;
  box-shadow: 0 0 0 3px rgba(255, 183, 197, 0.28);
}

.price-divider {
  color: #999;
  font-size: 12px;
}

.filter-apply-btn {
  width: 100%;
  background: linear-gradient(135deg, #c41e3a 0%, #e63a52 100%);
  color: white;
  border: none;
  padding: 12px 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  margin-top: 12px;
  transition: all 150ms ease;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.filter-apply-btn:hover {
  box-shadow: 0 4px 12px rgba(196, 30, 58, 0.3);
  transform: translateY(-2px);
}

.filter-apply-btn:active {
  transform: translateY(0);
}

@media (max-width: 640px) {
  .resources-list {
    grid-template-columns: repeat(2, 1fr);
  }

  .resources-hero__stats {
    grid-template-columns: 1fr;
  }
}
</style>

