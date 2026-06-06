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

        <div class="search-row resource-toolbar" role="search">
          <input
            class="resource-search-input"
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
                {{ expandedSections.rating ? '-' : '+' }}
              </button>
            </div>
            <div v-if="expandedSections.rating" class="filter-content">
              <div class="rating-slider-wrap">
                <div
                  class="dual-rating-slider"
                  :style="ratingTrackStyle"
                  aria-label="Star rating range"
                >
                  <div class="dual-rating-slider__track"></div>
                  <div class="dual-rating-slider__range"></div>
                  <input
                    :value="filterMinRating"
                    type="range"
                    min="0"
                    max="5"
                    step="1"
                    class="rating-slider rating-slider--min"
                    aria-label="Minimum star rating"
                    @input="setMinRating($event.target.value)"
                  />
                  <input
                    :value="filterMaxRating"
                    type="range"
                    min="0"
                    max="5"
                    step="1"
                    class="rating-slider rating-slider--max"
                    aria-label="Maximum star rating"
                    @input="setMaxRating($event.target.value)"
                  />
                </div>
                <div class="rating-markers" aria-hidden="true">
                  <span v-for="star in ratingSteps" :key="star">{{ star }} star</span>
                </div>
                <div class="rating-value">{{ ratingRangeLabel }}</div>
              </div>
            </div>
          </div>

          <!-- Resource Type Checkbox -->
          <div class="filter-section">
            <div class="filter-header">
              <h4>Resource Type</h4>
              <button type="button" class="expand-btn" @click="expandedSections.type = !expandedSections.type">
                {{ expandedSections.type ? '-' : '+' }}
              </button>
            </div>
            <div v-if="expandedSections.type" class="filter-content">
              <label v-for="rt in resourceTypeOptions" :key="rt.value" class="filter-checkbox">
                <input 
                  type="checkbox" 
                  :checked="selectedTypes.includes(rt.value)"
                  @change="toggleResourceType(rt.value)"
                />
                <span>{{ rt.label }}</span>
              </label>
            </div>
          </div>

          <!-- Course Code -->
          <div class="filter-section">
            <div class="filter-header">
              <h4>Course Code</h4>
              <button type="button" class="expand-btn" @click="expandedSections.course = !expandedSections.course">
                {{ expandedSections.course ? '-' : '+' }}
              </button>
            </div>
            <div v-if="expandedSections.course" class="filter-content">
              <select v-model="selectedCourseCode" class="filter-select">
                <option value="">All courses</option>
                <option v-for="course in courseOptions" :key="course" :value="course">{{ course }}</option>
              </select>
            </div>
          </div>

          <!-- Access Type -->
          <div class="filter-section">
            <div class="filter-header">
              <h4>Access Type</h4>
              <button type="button" class="expand-btn" @click="expandedSections.access = !expandedSections.access">
                {{ expandedSections.access ? '-' : '+' }}
              </button>
            </div>
            <div v-if="expandedSections.access" class="filter-content">
              <div class="filter-pill-row">
                <button type="button" class="filter-pill" :class="{ active: selectedAccessType === 'all' }" @click="selectedAccessType = 'all'">All</button>
                <button type="button" class="filter-pill" :class="{ active: selectedAccessType === 'file' }" @click="selectedAccessType = 'file'">Uploaded Files</button>
                <button type="button" class="filter-pill" :class="{ active: selectedAccessType === 'link' }" @click="selectedAccessType = 'link'">External Links</button>
              </div>
            </div>
          </div>

          <!-- Sort -->
          <div class="filter-section">
            <div class="filter-header">
              <h4>Sort By</h4>
              <button type="button" class="expand-btn" @click="expandedSections.sort = !expandedSections.sort">
                {{ expandedSections.sort ? '-' : '+' }}
              </button>
            </div>
            <div v-if="expandedSections.sort" class="filter-content">
              <select v-model="selectedSort" class="filter-select">
                <option value="newest">Newest uploads</option>
                <option value="highest-rated">Highest rated</option>
                <option value="course-asc">Course code A-Z</option>
                <option value="title-asc">Title A-Z</option>
              </select>
            </div>
          </div>

          <!-- Apply Button -->
          <div class="filter-action-row">
            <button class="filter-reset-btn" type="button" @click="resetFilters">Reset</button>
            <button class="filter-apply-btn" type="button" @click="applyFilters">Apply</button>
          </div>
        </div>

        <!-- Resource Type Chips (Quick Filter) -->
        <div class="chip-row" id="typeChips">
          <button 
            v-for="resourceType in quickFilterTypes" 
            :key="resourceType.value"
            class="chip"
            :class="{ 'chip-active': isQuickFilterActive(resourceType.value) }"
            @click="toggleQuickFilter(resourceType.value)"
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
          <div
            ref="suggestedCarouselRef"
            class="suggested-carousel"
            @mouseenter="stopSuggestedCarousel"
            @mouseleave="startSuggestedCarousel"
          >
            <button 
              v-for="resource in suggestedResources" 
              :key="resource.id"
              class="suggested-card"
              @click="openResource(resource)"
            >
              <div class="suggested-media" :class="resourceCoverClass(resource)">
                <span class="suggested-media__badge">{{ resourceCoverBadge(resource) }}</span>
                <span class="suggested-media__title" aria-hidden="true">{{ resourceCoverMonogram(resource) }}</span>
                <span class="suggested-media__meta">{{ resource.course_code || 'General' }}</span>
              </div>
              <div class="suggested-body">
                <div class="suggested-type">{{ formatResourceTypeLabel(resource.resource_type) }}</div>
                <strong>{{ resource.title }}</strong>
                <div class="meta">{{ resource.course_code }} - {{ resource.contributor_name }}</div>
                <div class="meta rating-line">Rating {{ Number(resource.avg_rating || 0).toFixed(1) }}</div>
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
              <div class="resource-cover" :class="resourceCoverClass(resource)">
                <div class="resource-cover-icon">{{ resourceCoverMonogram(resource) }}</div>
                <div class="resource-cover-meta">
                  <div class="resource-cover-tag">{{ resourceCoverBadge(resource) }}</div>
                  <div class="resource-cover-course">{{ resource.course_code || 'General' }}</div>
                </div>
              </div>
              <div class="resource-card-body">
                <strong>{{ resource.course_code }} - {{ resource.title }}</strong>
                <div class="meta">By {{ resource.contributor_name }}</div>
                <div class="meta">Rating {{ Number(resource.avg_rating || 0).toFixed(1) }}</div>
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
            <button class="modal-close" @click="showUploadModal = false">x</button>
            <h3>Upload Resource</h3>
            <form ref="uploadFormRef" @submit.prevent="handleUpload" class="stack">
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
                <input ref="fileInputRef" type="file" @change="onUploadFileChange" />
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
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { api, getToken, getUser, setSession } from '@/api.js'

const router = useRouter()
const currentUser = getUser()

const resources = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
const selectedTypes = ref([])
const selectedCourseCode = ref('')
const selectedAccessType = ref('all')
const selectedSort = ref('newest')
const showUploadModal = ref(false)
const showFilters = ref(false)
const visibleCount = ref(12)
const pageSize = 12
const isUploading = ref(false)
const uploadMessage = ref('')
const uploadMessageType = ref('')
const selectedUploadFile = ref(null)
const fileInputRef = ref(null)
const uploadFormRef = ref(null)
const suggestedCarouselRef = ref(null)
let suggestedCarouselTimer = null
const expandedSections = ref({
  rating: true,
  type: true,
  course: false,
  access: true,
  sort: false
})
const filterMinRating = ref(0)
const filterMaxRating = ref(5)
const ratingSteps = [1, 2, 3, 4, 5]

const uploadForm = ref({
  title: '',
  courseCode: '',
  resourceType: '',
  description: '',
  resourceLink: ''
})

const normalizeResourceType = (value) => String(value || '').trim().toLowerCase()

const formatResourceTypeLabel = (value) => {
  const normalized = normalizeResourceType(value)
  if (!normalized) return 'Other Resources'

  const aliases = {
    'past-year': 'Past Year Papers',
    'past paper': 'Past Year Papers',
    'past-paper': 'Past Year Papers',
    exam: 'Past Year Papers',
    'exam paper': 'Past Year Papers',
    'lecture-note': 'Lecture Notes',
    'lecture note': 'Lecture Notes',
    'lecture notes': 'Lecture Notes',
    notes: 'Lecture Notes',
    slides: 'Slides',
    slide: 'Slides',
    assignment: 'Assignments',
    pdf: 'PDFs',
    link: 'External Links'
  }

  return aliases[normalized] || normalized.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

const resourceCoverBadge = (resource) => {
  const normalized = normalizeResourceType(resource?.resource_type)
  if (['past-year', 'past paper', 'past-paper', 'exam', 'exam paper'].includes(normalized)) return 'Past Year'
  if (['lecture-note', 'lecture note', 'lecture notes', 'notes'].includes(normalized)) return 'Notes'
  if (['slide', 'slides'].includes(normalized)) return 'Slides'
  if (normalized === 'assignment') return 'Task'
  if (normalized === 'pdf') return 'PDF'
  if (normalized === 'link') return 'Link'
  return 'Resource'
}

const resourceCoverMonogram = (resource) => {
  const courseCode = String(resource?.course_code || '').trim()
  if (courseCode) return courseCode.toUpperCase()

  const title = String(resource?.title || '').trim()
  if (title) return title.slice(0, 12)

  return formatResourceTypeLabel(resource?.resource_type || 'Resource')
}

const resourceCoverClass = (resource) => {
  const normalized = normalizeResourceType(resource?.resource_type)
  if (['past-year', 'past paper', 'past-paper', 'exam', 'exam paper'].includes(normalized)) return 'cover-past-year'
  if (['lecture-note', 'lecture note', 'lecture notes', 'notes'].includes(normalized)) return 'cover-notes'
  if (['slide', 'slides'].includes(normalized)) return 'cover-slides'
  if (normalized === 'assignment') return 'cover-assignment'
  if (normalized === 'pdf') return 'cover-pdf'
  if (normalized === 'link') return 'cover-link'
  return 'cover-generic'
}

const resourceTypeOptions = computed(() => {
  const seen = new Set()

  return resources.value.reduce((options, resource) => {
    const value = normalizeResourceType(resource.resource_type)
    if (!value || seen.has(value)) return options
    seen.add(value)
    options.push({ value, label: formatResourceTypeLabel(value) })
    return options
  }, []).sort((left, right) => left.label.localeCompare(right.label))
})

const quickFilterTypes = computed(() => [
  { value: '', label: 'All Resources' },
  ...resourceTypeOptions.value.slice(0, 6)
])

const courseOptions = computed(() => {
  return [...new Set(
    resources.value
      .map((resource) => String(resource.course_code || '').trim())
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right))
})

const firstName = computed(() => {
  if (!currentUser) return 'there'
  const name = currentUser.fullName || currentUser.full_name || currentUser.username || ''
  return name.split(/\s+/)[0] || 'there'
})

const suggestedResources = computed(() => resources.value.slice(0, 5))
const totalResources = computed(() => resources.value.length)
const topPickCount = computed(() => resources.value.filter(r => r.avg_rating >= 4).length)
const latestCount = computed(() => resources.value.slice(0, 5).length)
const ratingRangeLabel = computed(() => {
  if (filterMinRating.value === 0 && filterMaxRating.value === 5) {
    return 'Any rating from unrated to 5 stars'
  }

  if (filterMinRating.value === filterMaxRating.value) {
    return `${filterMinRating.value || 0} star${filterMinRating.value === 1 ? '' : 's'} only`
  }

  return `${filterMinRating.value || 0} to ${filterMaxRating.value} stars`
})

const ratingTrackStyle = computed(() => {
  const minPercent = (filterMinRating.value / 5) * 100
  const maxPercent = (filterMaxRating.value / 5) * 100

  return {
    '--range-start': `${minPercent}%`,
    '--range-end': `${maxPercent}%`
  }
})

const filteredResources = computed(() => {
  let filtered = [...resources.value]

  if (selectedTypes.value.length) {
    filtered = filtered.filter((resource) => selectedTypes.value.includes(normalizeResourceType(resource.resource_type)))
  }

  if (!(filterMinRating.value === 0 && filterMaxRating.value === 5)) {
    filtered = filtered.filter((resource) => {
      const rating = Number(resource.avg_rating || 0)
      return rating >= filterMinRating.value && rating <= filterMaxRating.value
    })
  }

  if (selectedCourseCode.value) {
    filtered = filtered.filter((resource) => String(resource.course_code || '').trim() === selectedCourseCode.value)
  }

  if (selectedAccessType.value !== 'all') {
    filtered = filtered.filter((resource) => {
      const fileUrl = String(resource.file_url || '').trim()
      const isExternalLink = /^https?:\/\//i.test(fileUrl)
      return selectedAccessType.value === 'link' ? isExternalLink : Boolean(fileUrl) && !isExternalLink
    })
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    filtered = filtered.filter(r =>
      (r.title?.toLowerCase().includes(q) ||
       r.course_code?.toLowerCase().includes(q) ||
       r.contributor_name?.toLowerCase().includes(q) ||
       r.resource_type?.toLowerCase().includes(q) ||
       r.course_name?.toLowerCase().includes(q))
    )
  }

  if (selectedSort.value === 'highest-rated') {
    filtered.sort((left, right) => Number(right.avg_rating || 0) - Number(left.avg_rating || 0))
  } else if (selectedSort.value === 'course-asc') {
    filtered.sort((left, right) => String(left.course_code || '').localeCompare(String(right.course_code || '')))
  } else if (selectedSort.value === 'title-asc') {
    filtered.sort((left, right) => String(left.title || '').localeCompare(String(right.title || '')))
  } else {
    filtered.sort((left, right) => new Date(right.created_at || 0) - new Date(left.created_at || 0))
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
    await nextTick()
    startSuggestedCarousel()
  } catch (error) {
    console.error('Failed to load resources:', error)
  } finally {
    isLoading.value = false
  }
}

const onUploadFileChange = (event) => {
  selectedUploadFile.value = event?.target?.files?.[0] || null
  uploadMessage.value = ''
  
  console.log('[FILE-CHANGE] File selected:', {
    hasFile: Boolean(selectedUploadFile.value),
    fileName: selectedUploadFile.value?.name,
    fileSize: selectedUploadFile.value?.size,
    fileType: selectedUploadFile.value?.type
  })
  
  if (selectedUploadFile.value) {
    const maxSizeMB = 25
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    
    if (selectedUploadFile.value.size > maxSizeBytes) {
      uploadMessage.value = `File is too large. Maximum size is ${maxSizeMB}MB. Selected: ${(selectedUploadFile.value.size / 1024 / 1024).toFixed(2)}MB`
      uploadMessageType.value = 'error'
      selectedUploadFile.value = null
      if (event?.target) {
        event.target.value = ''
      }
      return
    }
    
    uploadMessage.value = `Selected: ${selectedUploadFile.value.name}`
    uploadMessageType.value = ''
  }
}

const setMinRating = (value) => {
  const next = Math.min(Number(value), filterMaxRating.value)
  filterMinRating.value = Number.isNaN(next) ? 0 : next
}

const setMaxRating = (value) => {
  const next = Math.max(Number(value), filterMinRating.value)
  filterMaxRating.value = Number.isNaN(next) ? 5 : next
}

const toggleResourceType = (value) => {
  const normalized = normalizeResourceType(value)
  if (!normalized) return

  if (selectedTypes.value.includes(normalized)) {
    selectedTypes.value = selectedTypes.value.filter((item) => item !== normalized)
    return
  }

  selectedTypes.value = [...selectedTypes.value, normalized]
}

const isQuickFilterActive = (value) => {
  if (!value) return selectedTypes.value.length === 0
  return selectedTypes.value.includes(value)
}

const toggleQuickFilter = (value) => {
  if (!value) {
    selectedTypes.value = []
    return
  }

  toggleResourceType(value)
}

const applyFilters = () => {
  visibleCount.value = pageSize
  showFilters.value = false
}

const resetFilters = () => {
  selectedTypes.value = []
  selectedCourseCode.value = ''
  selectedAccessType.value = 'all'
  selectedSort.value = 'newest'
  filterMinRating.value = 0
  filterMaxRating.value = 5
  visibleCount.value = pageSize
}

const handleUpload = async () => {
  console.log('[HANDLEUPLOAD] Called, checking form validation')
  if (!uploadForm.value.title) {
    uploadMessage.value = 'Please enter a title'
    uploadMessageType.value = 'error'
    console.warn('[HANDLEUPLOAD] Validation failed: missing title')
    return
  }

  if (!uploadForm.value.resourceType) {
    uploadMessage.value = 'Please select a resource type'
    uploadMessageType.value = 'error'
    console.warn('[HANDLEUPLOAD] Validation failed: missing resourceType')
    return
  }

  const trimmedLink = String(uploadForm.value.resourceLink || '').trim()
  if (!selectedUploadFile.value && !trimmedLink) {
    uploadMessage.value = 'Upload a file or paste a resource link'
    uploadMessageType.value = 'error'
    console.warn('[HANDLEUPLOAD] Validation failed: no file and no link', { 
      selectedUploadFile: Boolean(selectedUploadFile.value),
      trimmedLink: Boolean(trimmedLink)
    })
    return
  }

  isUploading.value = true
  uploadMessage.value = ''
  console.log('[UPLOAD] Starting upload', { 
    title: uploadForm.value.title,
    resourceType: uploadForm.value.resourceType,
    hasFile: Boolean(selectedUploadFile.value),
    fileName: selectedUploadFile.value?.name,
    fileSize: selectedUploadFile.value?.size,
    hasLink: Boolean(trimmedLink)
  })
  
  try {
    const formData = new FormData()
    formData.append('title', uploadForm.value.title)
    formData.append('courseCode', uploadForm.value.courseCode || '')
    formData.append('resourceType', uploadForm.value.resourceType)
    formData.append('description', uploadForm.value.description || '')

    if (trimmedLink) {
      formData.append('resourceLink', trimmedLink)
    }

    if (selectedUploadFile.value) {
      formData.append('resourceFile', selectedUploadFile.value)
    }

    console.log('[UPLOAD] FormData prepared, sending request')
    const token = getToken()
    const response = await fetch('/api/resources/upload', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    })

    console.log('[UPLOAD] Response received', { status: response.status, statusText: response.statusText })

    if (!response.ok) {
      let errorMessage = `Upload failed (HTTP ${response.status})`
      try {
        const errorData = await response.json()
        if (errorData?.message) {
          errorMessage = errorData.message
        }
      } catch (parseError) {
        const errorText = await response.text()
        if (errorText) {
          errorMessage = errorText
        } else if (response.statusText) {
          errorMessage = response.statusText
        }
      }
      console.error('[UPLOAD] Error response:', errorMessage)
      throw new Error(errorMessage)
    }

    const result = await response.json()
    console.log('[UPLOAD] Success response:', result)
    if (!result?.resource?.id) {
      throw new Error('Upload response missing resource data')
    }

    uploadMessage.value = 'Resource uploaded successfully!'
    uploadMessageType.value = 'success'

    const me = await api('/me')
    if (token && me?.user) {
      setSession(token, me.user)
    }

    uploadForm.value = { title: '', courseCode: '', resourceType: '', description: '', resourceLink: '' }
    selectedUploadFile.value = null
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
    showUploadModal.value = false
    await loadResources()
  } catch (error) {
    const message = error?.message || 'Upload failed'
    uploadMessage.value = message
    uploadMessageType.value = 'error'
    console.error('[UPLOAD] Error caught:', message, error)
  } finally {
    isUploading.value = false
  }
}

const openResource = (resource) => {
  router.push({ path: `/resources/${resource.id}`, query: { from: 'resources' } })
}

const stopSuggestedCarousel = () => {
  if (suggestedCarouselTimer) {
    window.clearInterval(suggestedCarouselTimer)
    suggestedCarouselTimer = null
  }
}

const advanceSuggestedCarousel = () => {
  const carousel = suggestedCarouselRef.value
  if (!carousel) return

  const firstCard = carousel.querySelector('.suggested-card')
  if (!firstCard) return

  const cardWidth = firstCard.getBoundingClientRect().width
  const gap = 12
  const step = cardWidth + gap
  const maxScrollLeft = carousel.scrollWidth - carousel.clientWidth

  if (maxScrollLeft <= 0) return

  const nextLeft = carousel.scrollLeft + step
  carousel.scrollTo({
    left: nextLeft >= maxScrollLeft - 4 ? 0 : nextLeft,
    behavior: 'smooth'
  })
}

const startSuggestedCarousel = () => {
  stopSuggestedCarousel()
  if (!suggestedResources.value.length || suggestedResources.value.length < 2) return

  const carousel = suggestedCarouselRef.value
  if (!carousel || carousel.scrollWidth <= carousel.clientWidth) return

  suggestedCarouselTimer = window.setInterval(advanceSuggestedCarousel, 2800)
}

onMounted(() => {
  const viewEl = document.querySelector('.view')
  const topbar = document.querySelector('.topbar')
  if (viewEl) {
    viewEl.scrollTop = topbar ? topbar.offsetHeight : 80
  }
  loadResources()
})

onBeforeUnmount(() => {
  stopSuggestedCarousel()
})
</script>

<style scoped>
.page-bg {
  min-height: 100vh;
  display: block;
  padding: 0;
  background: linear-gradient(180deg, #ffffff, #f5f5f7);
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
  min-width: 0;
}

.view > * {
  min-width: 0;
  max-width: 100%;
}

.resources-hero {
  margin-bottom: 24px;
}

.resources-hero__kicker {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 600;
  color: #b11f4b;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.resources-hero__copy h2 {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 700;
  color: #1d1d1f;
  font-family: "Josefin Sans", "Trebuchet MS", sans-serif;
}

.resources-hero__text {
  margin: 0;
  color: #6e6e73;
  font-size: 14px;
  line-height: 1.5;
}

.resources-hero__stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
  color: #b11f4b;
  margin-bottom: 4px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  overflow-wrap: anywhere;
}

.hero-stat strong {
  display: block;
  font-size: 20px;
  color: #1d1d1f;
}

.search-row {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  width: 100%;
  box-sizing: border-box;
    align-items: center;
  }

  .search-row input.resource-search-input {
    flex: 1;
    min-width: 0;
    border: none;
    outline: none;
    padding: 10px 0;
    font-size: 14px;
    background: transparent;
  }

  .search-inline-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
    align-items: center;
  }

.icon-chip:hover {
  color: #1d1d1f;
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
  color: #1d1d1f;
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
  max-width: 1040px;
  margin: 0 auto 32px;
}

.suggested-section .search-row.compact {
  justify-content: center;
  align-items: center;
  text-align: center;
  margin-bottom: 32px;
}

.search-row.compact {
  margin-bottom: 12px;
}

.search-row h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1d1d1f;
}

.meta {
  margin: 0;
  font-size: 12px;
  color: #6e6e73;
}

.suggested-carousel {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 4px 6px 12px;
  justify-content: center;
  scroll-snap-type: x proximity;
  scroll-padding-inline: 24px;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.suggested-carousel::-webkit-scrollbar {
  display: none;
}

.suggested-card {
  flex-shrink: 0;
  width: min(220px, 78vw);
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
  scroll-snap-align: center;
}

.suggested-card:hover {
  border-color: #b11f4b;
  box-shadow: 0 4px 12px rgba(196, 30, 58, 0.15);
  transform: translateY(-2px);
}

.suggested-media {
  height: 84px;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  padding: 12px;
  color: #1d1d1f;
  border: 1px solid rgba(255, 255, 255, 0.55);
}

.suggested-media__badge,
.resource-cover-tag {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(177, 31, 75, 0.9);
}

.suggested-media__title {
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1.1;
}

.suggested-media__meta,
.resource-cover-course {
  font-size: 0.75rem;
  color: rgba(29, 29, 31, 0.72);
}

.suggested-body strong {
  display: block;
  font-size: 13px;
  color: #1d1d1f;
  margin-bottom: 4px;
  line-height: 1.4;
}

.suggested-type {
  font-size: 11px;
  color: #b11f4b;
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
  border-color: #b11f4b;
  box-shadow: 0 4px 12px rgba(196, 30, 58, 0.15);
  transform: translateY(-2px);
}

.resource-cover {
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  padding: 14px;
  position: relative;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

.resource-cover-icon {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.05em;
  line-height: 1.1;
  color: #1d1d1f;
}

.resource-cover-meta {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
}

.cover-past-year {
  background: linear-gradient(135deg, rgba(255, 231, 235, 0.95), rgba(255, 204, 214, 0.9));
}

.cover-notes {
  background: linear-gradient(135deg, rgba(255, 245, 228, 0.96), rgba(255, 226, 184, 0.9));
}

.cover-slides {
  background: linear-gradient(135deg, rgba(236, 248, 255, 0.96), rgba(190, 226, 255, 0.92));
}

.cover-assignment {
  background: linear-gradient(135deg, rgba(246, 237, 255, 0.96), rgba(220, 201, 255, 0.92));
}

.cover-pdf {
  background: linear-gradient(135deg, rgba(255, 239, 241, 0.96), rgba(255, 210, 217, 0.92));
}

.cover-link {
  background: linear-gradient(135deg, rgba(236, 255, 247, 0.96), rgba(191, 241, 220, 0.92));
}

.cover-generic {
  background: linear-gradient(135deg, rgba(243, 243, 246, 0.96), rgba(225, 226, 232, 0.92));
}

.resource-card-body {
  padding: 12px;
}

.resource-card-body strong {
  display: block;
  font-size: 13px;
  color: #1d1d1f;
  margin-bottom: 6px;
  line-height: 1.4;
}

.loading,
.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #6e6e73;
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
  color: #6e6e73;
}

.modal-content h3 {
  margin: 0 0 20px;
  font-size: 18px;
  font-weight: 600;
  color: #1d1d1f;
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
  color: #1d1d1f;
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
  color: #1d1d1f;
  flex: 1;
}

.expand-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: #6e6e73;
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
  color: #b11f4b;
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
  color: #6e6e73;
  user-select: none;
  transition: color 150ms ease;
}

.filter-checkbox:hover {
  color: #1d1d1f;
}

.filter-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #b11f4b;
  border: 2px solid #d1dadf;
  border-radius: 4px;
}

.rating-slider-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dual-rating-slider {
  position: relative;
  height: 28px;
  --slider-track-height: 8px;
  --slider-thumb-width: 14px;
  --slider-thumb-height: 18px;
  --range-start: 0%;
  --range-end: 100%;
}

.dual-rating-slider__track,
.dual-rating-slider__range {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: var(--slider-track-height);
  transform: translateY(-50%);
  border-radius: 999px;
}

.dual-rating-slider__track {
  background: #ececec;
}

.dual-rating-slider__range {
  left: var(--range-start);
  right: calc(100% - var(--range-end));
  background: #b11f4b;
}

.rating-slider {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 0;
  background: transparent;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
  margin: 0;
  padding: 0;
  border: none;
  pointer-events: none;
}

.rating-slider:focus {
  border: none;
  box-shadow: none;
}

.rating-slider--min,
.rating-slider--max {
  z-index: 2;
}

.rating-slider--min {
  z-index: 3;
}

.rating-slider::-webkit-slider-runnable-track {
  height: var(--slider-track-height);
  background: transparent;
  border: none;
}

.rating-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: var(--slider-thumb-width);
  height: var(--slider-thumb-height);
  margin-top: calc((var(--slider-track-height) - var(--slider-thumb-height)) / 2);
  border-radius: 4px;
  background: #b11f4b;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(196, 30, 58, 0.3);
  transition: transform 150ms ease, box-shadow 150ms ease;
  pointer-events: auto;
}

.rating-slider::-webkit-slider-thumb:hover {
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(196, 30, 58, 0.4);
}

.rating-slider::-moz-range-track,
.rating-slider::-moz-range-progress {
  height: var(--slider-track-height);
  background: transparent;
  border: none;
}

.rating-slider::-moz-range-thumb {
  width: var(--slider-thumb-width);
  height: var(--slider-thumb-height);
  border-radius: 4px;
  background: #b11f4b;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 6px rgba(196, 30, 58, 0.3);
  transition: transform 150ms ease, box-shadow 150ms ease;
  pointer-events: auto;
}
.rating-slider::-moz-range-progress {
  height: var(--slider-track-height);
  background: transparent;
  border: none;
}

.rating-slider::-moz-range-thumb:hover {
  transform: scale(1.08);
  box-shadow: 0 4px 12px rgba(196, 30, 58, 0.4);
}

.rating-value {
  font-size: 12px;
  color: #b11f4b;
  font-weight: 600;
  text-align: center;
}

.rating-markers {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
  color: #6e6e73;
}

.filter-select {
  width: 100%;
  border: 2px solid #d1dadf;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  background: #fff;
}

.filter-select:focus {
  border-color: #ffb7c5;
  box-shadow: 0 0 0 3px rgba(255, 183, 197, 0.28);
}

.filter-pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-pill {
  border: 1px solid #d9d9dd;
  border-radius: 999px;
  background: #fff;
  color: #6e6e73;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 12px;
  cursor: pointer;
  transition: border-color 150ms ease, color 150ms ease, background-color 150ms ease;
}

.filter-pill.active {
  border-color: #b11f4b;
  background: rgba(177, 31, 75, 0.08);
  color: #b11f4b;
}

.filter-action-row {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 10px;
  margin-top: 12px;
}

.filter-reset-btn {
  border: 1px solid #d9d9dd;
  background: #fff;
  color: #6e6e73;
  border-radius: 999px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.filter-apply-btn {
  background: linear-gradient(135deg, #b11f4b 0%, #e63a52 100%);
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
  .view {
    padding: 14px 12px;
  }

  .search-row {
    align-items: stretch;
    width: 100%;
    min-width: 0;
  }

  .resource-toolbar {
    width: 100%;
    flex-direction: column;
    min-width: 0;
  }

  .action-row {
    width: 100%;
    min-width: 0;
  }

  .resources-hero__stats,
  .resources-list,
  .chip-row,
  .suggested-carousel {
    width: 100%;
    max-width: 100%;
  }

  .hero-stat,
  .resource-card-body,
  .resource-cover {
    min-width: 0;
  }

  .action-row .chip-strong {
    width: 100%;
    justify-content: center;
  }

  .suggested-section {
    width: 100%;
    max-width: 100%;
    margin-bottom: 28px;
  }

  .suggested-section .search-row.compact {
    width: 100%;
    max-width: 100%;
    justify-content: flex-start;
    text-align: left;
  }

  .suggested-section .suggested-carousel {
    max-width: 100%;
  }

  .suggested-carousel {
    justify-content: flex-start;
    padding-inline: 0;
  }

  .resources-list {
    grid-template-columns: repeat(2, 1fr);
  }

  .resources-hero__stats {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 420px) {
  .resources-list {
    grid-template-columns: 1fr;
  }

  .search-row input.resource-search-input {
    font-size: 13px;
  }

  .chip-row {
    padding-bottom: 4px;
  }
}

/* Final polish overrides for cleaner Apple-like visual language */
.resources-hero__text,
.meta,
.loading,
.empty-state {
  color: #6e6e73;
}

.hero-stat {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 18px;
}

.suggested-card,
.resource-card,
.filter-panel,
.modal-content {
  border-color: #e0e0e0;
  box-shadow: none;
}

.suggested-card:hover,
.resource-card:hover,
.filter-apply-btn:hover {
  transform: none;
  box-shadow: none;
}

.suggested-media,
.resource-cover {
  background: #f5f5f7;
}

.resource-cover-icon {
  font-size: 14px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #6e6e73;
}

.filter-panel {
  backdrop-filter: none;
}

.rating-slider::-webkit-slider-thumb,
.rating-slider::-moz-range-thumb {
  background: #b11f4b;
  box-shadow: none;
}

.filter-apply-btn {
  border-radius: 9999px;
  text-transform: none;
  letter-spacing: normal;
  background: #b11f4b;
}

.filter-reset-btn:hover,
.filter-pill:hover {
  border-color: #b11f4b;
  color: #b11f4b;
}

.modal-backdrop,
.filter-backdrop {
  background: rgba(0, 0, 0, 0.44);
}
</style>
