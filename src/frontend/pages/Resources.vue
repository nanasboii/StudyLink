<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active">

        <!-- ── HERO ── -->
        <section class="resources-hero glass-card">
          <div class="resources-hero__copy">
            <p class="resources-hero__kicker">Study Smarter</p>
            <h2 id="resourcesHeroTitle">Welcome back, {{ firstName }}</h2>
            <p class="resources-hero__text">Find past papers, lecture notes, slides, and shared links — all in one place.</p>
          </div>
          <div class="resources-hero__stats" aria-label="Resource highlights">
            <div class="hero-stat">
              <span class="hero-stat__label">Available</span>
              <strong>{{ totalResources }}</strong>
            </div>
            <div class="hero-stat">
              <span class="hero-stat__label">Top Picks</span>
              <strong>{{ topPickCount }}</strong>
            </div>
            <div class="hero-stat">
              <span class="hero-stat__label">This Week</span>
              <strong>{{ latestCount }}</strong>
            </div>
          </div>
        </section>

        <!-- ── SUMMARY BAR (NEW) ── -->
        <div class="summary-bar" v-if="!isLoading && resources.length">
          <div class="summary-stat">
            <span class="summary-value">{{ totalResources }}</span>
            <span class="summary-label">Resources</span>
          </div>
          <div class="summary-stat">
            <span class="summary-value">{{ uniqueCourses }}</span>
            <span class="summary-label">Courses</span>
          </div>
          <div class="summary-stat">
            <span class="summary-value">{{ uniqueUploaders }}</span>
            <span class="summary-label">Contributors</span>
          </div>
          <div class="summary-stat">
            <span class="summary-value">{{ avgRatingDisplay }}</span>
            <span class="summary-label">Avg Rating</span>
          </div>
        </div>

        <!-- ── SEARCH + CONTROLS ── -->
        <div class="search-row resource-toolbar" role="search">
          <div class="search-input-wrap">
            <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10.5 4a6.5 6.5 0 1 0 4.14 11.5l4.18 4.18 1.41-1.41-4.18-4.18A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z"/>
            </svg>
            <input
              class="resource-search-input"
              v-model="searchQuery"
              placeholder="Search title, course, type, or uploader…"
              @input="debouncedSearch"
              aria-label="Search resources"
            />
            <button
              v-if="searchQuery"
              class="search-clear-btn"
              type="button"
              aria-label="Clear search"
              @click="searchQuery = ''; visibleCount = pageSize"
            >✕</button>
          </div>

          <div class="search-inline-actions">
            <button
              class="icon-chip"
              type="button"
              aria-label="Toggle filters"
              @click="showFilters = !showFilters"
              :class="{ 'icon-chip--active': hasActiveFilters }"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M3 5h18v2l-7 7v5l-4-2v-3L3 7V5Zm4 2 5 5 5-5H7Z"/>
              </svg>
              <span v-if="activeFilterCount > 0" class="filter-badge">{{ activeFilterCount }}</span>
            </button>
          </div>

          <div class="action-row">
            <select class="sort-select" v-model="selectedSort" aria-label="Sort resources">
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="highest-rated">Top Rated</option>
              <option value="most-reviewed">Most Reviewed</option>
              <option value="az">A → Z</option>
            </select>
            <button v-if="canUpload" class="chip chip-strong" type="button" @click="showUploadModal = true">
              + Upload
            </button>
          </div>
        </div>

        <!-- ── RESULT COUNT ── -->
        <div v-if="searchQuery || hasActiveFilters" class="result-count">
          Showing <strong>{{ filteredResources.length }}</strong> of {{ totalResources }} resource{{ totalResources !== 1 ? 's' : '' }}
          <button class="clear-link" @click="resetFilters">Clear all</button>
        </div>

        <!-- ── QUICK TYPE CHIPS ── -->
        <div class="chip-row" role="group" aria-label="Filter by type">
          <button
            class="chip"
            :class="{ 'chip--active': isQuickFilterActive(null) }"
            @click="toggleQuickFilter(null)"
          >All</button>
          <button
            v-for="type in quickFilterTypes"
            :key="type.value"
            class="chip"
            :class="{ 'chip--active': isQuickFilterActive(type.value) }"
            @click="toggleQuickFilter(type.value)"
          >{{ type.label }}</button>
        </div>

        <!-- ── FILTER PANEL ── -->
        <div v-if="showFilters" class="filter-backdrop" @click="showFilters = false"></div>
        <div v-if="showFilters" class="filter-panel glass-card">

          <div class="filter-section">
            <button type="button" class="filter-header" @click="expandedSections.rating = !expandedSections.rating" :aria-expanded="expandedSections.rating">
              <h4>Star Rating</h4>
              <span>{{ expandedSections.rating ? '−' : '+' }}</span>
            </button>
            <div v-if="expandedSections.rating" class="filter-content">
              <div class="rating-slider-wrap">
                <div class="dual-rating-slider" :style="ratingTrackStyle">
                  <div class="dual-rating-slider__track"></div>
                  <div class="dual-rating-slider__range"></div>
                  <input :value="filterMinRating" type="range" min="0" max="5" step="1" class="rating-slider rating-slider--min" aria-label="Min rating" @input="setMinRating($event.target.value)"/>
                  <input :value="filterMaxRating" type="range" min="0" max="5" step="1" class="rating-slider rating-slider--max" aria-label="Max rating" @input="setMaxRating($event.target.value)"/>
                </div>
                <div class="rating-markers" aria-hidden="true">
                  <span v-for="s in ratingSteps" :key="s">{{ s }}★</span>
                </div>
                <p class="rating-value-label">{{ ratingRangeLabel }}</p>
              </div>
            </div>
          </div>

          <div class="filter-section">
            <button type="button" class="filter-header" @click="expandedSections.type = !expandedSections.type" :aria-expanded="expandedSections.type">
              <h4>Resource Type</h4>
              <span>{{ expandedSections.type ? '−' : '+' }}</span>
            </button>
            <div v-if="expandedSections.type" class="filter-content filter-pills">
              <button
                v-for="type in allTypes"
                :key="type"
                class="filter-pill"
                :class="{ 'filter-pill--active': selectedTypes.includes(type) }"
                @click="toggleResourceType(type)"
              >{{ formatResourceTypeLabel(type) }}</button>
            </div>
          </div>

          <div class="filter-section">
            <button type="button" class="filter-header" @click="expandedSections.course = !expandedSections.course" :aria-expanded="expandedSections.course">
              <h4>Course</h4>
              <span>{{ expandedSections.course ? '−' : '+' }}</span>
            </button>
            <div v-if="expandedSections.course" class="filter-content">
              <select class="filter-select" v-model="selectedCourseCode" aria-label="Filter by course">
                <option value="">All Courses</option>
                <option v-for="code in availableCourseCodes" :key="code" :value="code">{{ code }}</option>
              </select>
            </div>
          </div>

          <div class="filter-section">
            <button type="button" class="filter-header" @click="expandedSections.access = !expandedSections.access" :aria-expanded="expandedSections.access">
              <h4>Access Type</h4>
              <span>{{ expandedSections.access ? '−' : '+' }}</span>
            </button>
            <div v-if="expandedSections.access" class="filter-content filter-pills">
              <button class="filter-pill" :class="{ 'filter-pill--active': selectedAccessType === 'all' }" @click="selectedAccessType = 'all'">All</button>
              <button class="filter-pill" :class="{ 'filter-pill--active': selectedAccessType === 'file' }" @click="selectedAccessType = 'file'">Files Only</button>
              <button class="filter-pill" :class="{ 'filter-pill--active': selectedAccessType === 'link' }" @click="selectedAccessType = 'link'">Links Only</button>
            </div>
          </div>

          <div class="filter-actions">
            <button class="filter-reset-btn" type="button" @click="resetFilters">Reset all</button>
            <button class="filter-apply-btn" type="button" @click="applyFilters">Apply filters</button>
          </div>
        </div>

        <!-- ── SUGGESTED CAROUSEL ── -->
        <section class="suggested-section" v-if="suggestedResources.length && !isLoading">
          <div class="section-header">
            <h3>Suggested for You</h3>
            <span class="meta">Top-rated picks</span>
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
              class="suggested-card glass-card"
              @click="openResource(resource)"
            >
              <div class="suggested-media" :class="resourceCoverClass(resource)">
                <span class="suggested-media__badge">{{ resourceCoverBadge(resource) }}</span>
                <span class="suggested-media__title" aria-hidden="true">{{ resourceCoverMonogram(resource) }}</span>
                <span class="suggested-media__meta">{{ resource.course_code || 'General' }}</span>
              </div>
              <div class="suggested-body">
                <div class="suggested-type">{{ formatResourceTypeLabel(resource.resource_type) }}</div>
                <strong><span v-if="resource.course_code">{{ resource.course_code }} — </span>{{ resource.title || 'Untitled' }}</strong>
                <div class="meta">{{ resource.contributor_name || 'Unknown' }}</div>
                <div class="rating-line">
                  <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true" class="star-icon"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                  <!-- BUG FIX: guard NaN avg_rating -->
                  {{ Number(resource.avg_rating || 0).toFixed(1) }}
                  <span v-if="!resource.avg_rating" class="muted">(unrated)</span>
                </div>
              </div>
            </button>
          </div>
        </section>

        <!-- ── RESOURCE GRID ── -->
        <section class="resources-section">
          <div class="section-header">
            <h3>Newly Uploaded</h3>
            <p class="meta" v-if="filteredResources.length">Fresh from your community</p>
          </div>

          <div role="status" aria-live="polite" class="sr-only">
            {{ filteredResources.length }} resource{{ filteredResources.length !== 1 ? 's' : '' }} found
          </div>

          <!-- SKELETON SHIMMER while loading -->
          <div v-if="isLoading" class="resources-list">
            <div v-for="n in 6" :key="n" class="resource-card skeleton-card">
              <div class="skeleton-cover"></div>
              <div class="skeleton-body">
                <div class="skeleton-line skeleton-line--wide"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line skeleton-line--short"></div>
              </div>
            </div>
          </div>

          <!-- ERROR STATE -->
          <div v-else-if="loadError" class="error-banner" role="alert">
            <svg viewBox="0 0 24 24" aria-hidden="true" width="28" height="28"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            <div>{{ loadError }}</div>
            <button class="chip" @click="loadResources">Retry</button>
          </div>

          <!-- EMPTY STATE -->
          <div v-else-if="filteredResources.length === 0" class="empty-state-card" role="status">
            <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true">
              <path fill="#FFCEE3" d="M6 12h22l4 6h26v32H6z"/>
              <circle cx="44" cy="40" r="8" fill="none" stroke="#FF85BB" stroke-width="2.5"/>
              <path d="M50 46l4 4" stroke="#FF85BB" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
            <strong v-if="searchQuery">No results for "{{ searchQuery }}"</strong>
            <strong v-else-if="hasActiveFilters">No matches for your filters</strong>
            <strong v-else>No resources yet</strong>
            <p class="meta">{{ searchQuery || hasActiveFilters ? 'Try adjusting your search or filters.' : 'Be the first to share a study resource.' }}</p>
            <button v-if="searchQuery || hasActiveFilters" class="chip chip-strong" @click="resetFilters">Clear filters</button>
            <button v-else-if="canUpload" class="chip chip-strong" @click="showUploadModal = true">Upload first resource</button>
          </div>

          <!-- RESOURCE CARDS -->
          <div v-else class="resources-list">
            <button
              v-for="resource in paginatedResources"
              :key="resource.id"
              :class="['resource-card', resource.resource_type ? 'type-' + normalizeResourceType(resource.resource_type) : '']"
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
                <strong>
                  <span v-if="resource.course_code">{{ resource.course_code }} — </span>{{ resource.title || 'Untitled' }}
                </strong>
                <div class="meta">By {{ resource.contributor_name || 'Unknown' }}</div>
                <div class="rating-line">
                  <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true" class="star-icon"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                  <!-- BUG FIX: 0-rating shows 0.0 not NaN -->
                  {{ Number(resource.avg_rating || 0).toFixed(1) }}
                  <span v-if="resource.review_count || resource.rating_count" class="count-badge">({{ resource.review_count || resource.rating_count }})</span>
                  <span v-else class="muted">(unrated)</span>
                </div>
                <!-- BUG FIX: invalid date guard -->
                <div class="meta date-meta">{{ formatDateValue(resource.created_at, '') }}</div>
              </div>
            </button>
          </div>

          <button
            v-if="!isLoading && visibleCount < filteredResources.length"
            class="chip load-more-btn"
            @click="visibleCount += pageSize"
          >
            Load more ({{ filteredResources.length - visibleCount }} left)
          </button>
        </section>

        <!-- ── UPLOAD MODAL ── -->
        <div v-if="showUploadModal" class="modal-backdrop" @click="!isUploading && (showUploadModal = false)" role="dialog" aria-modal="true" aria-label="Upload resource">
          <div class="modal-content glass-card" @click.stop>
            <div class="modal-header">
              <h3>Upload Resource</h3>
              <button class="modal-close" @click="!isUploading && (showUploadModal = false)" :disabled="isUploading" aria-label="Close">✕</button>
            </div>

            <form @submit.prevent="handleUpload" ref="uploadFormRef" novalidate>
              <label class="form-label">
                Title <span aria-hidden="true">*</span>
                <input
                  class="form-input"
                  v-model="uploadForm.title"
                  placeholder="e.g. CS101 Midterm Notes"
                  required
                  :disabled="isUploading"
                  maxlength="200"
                />
              </label>

              <label class="form-label">
                Type <span aria-hidden="true">*</span>
                <select class="form-input" v-model="uploadForm.resourceType" required :disabled="isUploading">
                  <option value="">Select type…</option>
                  <option value="past-year">Past Year Paper</option>
                  <option value="lecture-note">Lecture Note</option>
                  <option value="slides">Slides</option>
                  <option value="assignment">Assignment</option>
                  <option value="pdf">PDF</option>
                  <option value="link">External Link</option>
                  <option value="miscellaneous">Miscellaneous</option>
                </select>
              </label>

              <label class="form-label">
                Course Code
                <input
                  class="form-input"
                  v-model="uploadForm.courseCode"
                  placeholder="e.g. CS101"
                  :disabled="isUploading"
                  maxlength="20"
                />
              </label>

              <label class="form-label">
                Description
                <textarea
                  class="form-input"
                  v-model="uploadForm.description"
                  placeholder="Short description…"
                  rows="2"
                  :disabled="isUploading"
                  maxlength="500"
                ></textarea>
              </label>

              <!-- BUG FIX: link field only shows for link type, but always allow file -->
              <label class="form-label" v-if="uploadForm.resourceType === 'link'">
                URL <span aria-hidden="true">*</span>
                <input
                  class="form-input"
                  v-model="uploadForm.resourceLink"
                  type="url"
                  placeholder="https://example.com/resource"
                  :disabled="isUploading"
                />
              </label>

              <label class="form-label" v-else>
                Resource Link (optional)
                <input
                  class="form-input"
                  v-model="uploadForm.resourceLink"
                  type="url"
                  placeholder="https://example.com (optional)"
                  :disabled="isUploading"
                />
              </label>

              <label class="form-label" v-if="uploadForm.resourceType !== 'link'">
                File
                <input
                  ref="fileInputRef"
                  class="form-input"
                  type="file"
                  :disabled="isUploading"
                  @change="selectedUploadFile = $event.target.files[0] || null"
                />
              </label>

              <p v-if="uploadMessage" class="upload-message" :class="uploadMessageType === 'error' ? 'msg-error' : 'msg-success'">
                {{ uploadMessage }}
              </p>
              <p v-if="uploadMessageDetails && uploadMessageType === 'error'" class="upload-message msg-error msg-details">
                {{ uploadMessageDetails }}
              </p>

              <div class="modal-actions">
                <button type="button" class="chip" @click="showUploadModal = false" :disabled="isUploading">Cancel</button>
                <button type="submit" class="chip chip-strong" :disabled="isUploading">
                  {{ isUploading ? 'Uploading…' : 'Upload' }}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { api, getToken, getUser, setSession, requireSession } from '@/api.js'
import { formatDateValue } from '@/utils/records.js'

const router = useRouter()
const currentUser = getUser()

// ── Role gate ──────────────────────────────────────────────────────────────
const canUpload = computed(() => {
  const role = String(currentUser?.role || '').toLowerCase().trim()
  return role === 'tutor' || role === 'admin'
})

// ── State ──────────────────────────────────────────────────────────────────
const resources     = ref([])
const isLoading     = ref(true)
const loadError     = ref('')
const searchQuery   = ref('')
const selectedTypes = ref([])
const selectedCourseCode   = ref('')
const selectedAccessType   = ref('all')
const selectedSort  = ref('newest')
const showUploadModal = ref(false)
const showFilters   = ref(false)
const visibleCount  = ref(12)
const pageSize      = 12
const isUploading   = ref(false)
const uploadMessage = ref('')
const uploadMessageType    = ref('')
const uploadMessageDetails = ref('')
const selectedUploadFile   = ref(null)
const fileInputRef  = ref(null)
const uploadFormRef = ref(null)
const suggestedCarouselRef = ref(null)
let   suggestedCarouselTimer = null

const expandedSections = ref({ rating: true, type: true, course: false, access: true })
const filterMinRating  = ref(0)
const filterMaxRating  = ref(5)
const ratingSteps      = [1, 2, 3, 4, 5]

const uploadForm = ref({
  title: '',
  courseCode: '',
  resourceType: '',
  description: '',
  resourceLink: ''
})

// ── Quick filter chip definitions ──────────────────────────────────────────
const quickFilterTypes = [
  { value: 'past-year',     label: 'Past Year'   },
  { value: 'lecture-note',  label: 'Notes'       },
  { value: 'slides',        label: 'Slides'      },
  { value: 'assignment',    label: 'Assignments' },
  { value: 'link',          label: 'Links'       },
]

// ── Helpers ────────────────────────────────────────────────────────────────
const normalizeResourceType = (value) => String(value || '').trim().toLowerCase()

const formatResourceTypeLabel = (value) => {
  const n = normalizeResourceType(value)
  const map = {
    'past-year':    'Past Year Papers',
    'past paper':   'Past Year Papers',
    'past-paper':   'Past Year Papers',
    'exam':         'Past Year Papers',
    'lecture-note': 'Lecture Notes',
    'lecture note': 'Lecture Notes',
    'notes':        'Lecture Notes',
    'slides':       'Slides',
    'slide':        'Slides',
    'assignment':   'Assignments',
    'pdf':          'PDFs',
    'link':         'External Links',
    'miscellaneous':'Misc',
  }
  return map[n] || n.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Other'
}

const resourceCoverBadge = (resource) => {
  const n = normalizeResourceType(resource?.resource_type)
  if (['past-year','past paper','past-paper','exam'].includes(n)) return 'Past Year'
  if (['lecture-note','lecture note','notes'].includes(n))        return 'Notes'
  if (['slide','slides'].includes(n))                             return 'Slides'
  if (n === 'assignment') return 'Task'
  if (n === 'pdf')        return 'PDF'
  if (n === 'link')       return 'Link'
  return 'Doc'
}

const resourceCoverMonogram = (resource) => {
  const title = String(resource?.title || resource?.course_code || 'R').trim()
  return title.slice(0, 2).toUpperCase()
}

// BUG FIX: guard null resource_type in class binding
const resourceCoverClass = (resource) => {
  const n = normalizeResourceType(resource?.resource_type)
  if (['past-year','past paper','past-paper','exam'].includes(n)) return 'cover-past-year'
  if (['lecture-note','lecture note','notes'].includes(n))        return 'cover-notes'
  if (['slide','slides'].includes(n))                             return 'cover-slides'
  if (n === 'assignment') return 'cover-assignment'
  if (n === 'pdf')        return 'cover-pdf'
  if (n === 'link')       return 'cover-link'
  return 'cover-misc'
}

// ── Computed ───────────────────────────────────────────────────────────────
const firstName = computed(() => {
  if (!currentUser) return 'there'
  const name = currentUser.fullName || currentUser.full_name || currentUser.username || ''
  return name.split(/\s+/)[0] || 'there'
})

const totalResources = computed(() => resources.value.length)
const topPickCount   = computed(() => resources.value.filter(r => Number(r.avg_rating || 0) >= 4).length)
const latestCount    = computed(() => {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  return resources.value.filter(r => {
    const t = new Date(r.created_at).getTime()
    return !isNaN(t) && t > cutoff
  }).length
})

// NEW: summary bar stats
const uniqueCourses   = computed(() => new Set(resources.value.map(r => r.course_code).filter(Boolean)).size)
const uniqueUploaders = computed(() => new Set(resources.value.map(r => r.contributor_name || r.uploader_email).filter(Boolean)).size)
const avgRatingDisplay = computed(() => {
  const rated = resources.value.filter(r => Number(r.avg_rating || 0) > 0)
  if (!rated.length) return '—'
  const sum = rated.reduce((acc, r) => acc + Number(r.avg_rating), 0)
  return (sum / rated.length).toFixed(1)
})

const suggestedResources = computed(() =>
  [...resources.value]
    .filter(r => Number(r.avg_rating || 0) > 0)        // BUG FIX: only actually-rated
    .sort((a, b) => Number(b.avg_rating) - Number(a.avg_rating))
    .slice(0, 8)
)

const availableCourseCodes = computed(() =>
  [...new Set(resources.value.map(r => String(r.course_code || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
)

const allTypes = computed(() =>
  [...new Set(resources.value.map(r => normalizeResourceType(r.resource_type)).filter(Boolean))]
)

const activeFilterCount = computed(() => {
  let count = 0
  if (selectedTypes.value.length)                               count += selectedTypes.value.length
  if (selectedCourseCode.value)                                 count++
  if (selectedAccessType.value !== 'all')                       count++
  if (filterMinRating.value !== 0 || filterMaxRating.value !== 5) count++
  return count
})

const hasActiveFilters = computed(() =>
  activeFilterCount.value > 0 || searchQuery.value.trim() !== '' || selectedSort.value !== 'newest'
)

const ratingRangeLabel = computed(() => {
  if (filterMinRating.value === 0 && filterMaxRating.value === 5) return 'Any rating'
  if (filterMinRating.value === filterMaxRating.value)
    return `${filterMinRating.value} star${filterMinRating.value === 1 ? '' : 's'} only`
  return `${filterMinRating.value} – ${filterMaxRating.value} stars`
})

const ratingTrackStyle = computed(() => ({
  '--range-start': `${(filterMinRating.value / 5) * 100}%`,
  '--range-end':   `${(filterMaxRating.value / 5) * 100}%`,
}))

const filteredResources = computed(() => {
  let list = [...resources.value]

  // type filter
  if (selectedTypes.value.length) {
    list = list.filter(r => selectedTypes.value.includes(normalizeResourceType(r.resource_type)))
  }

  // rating filter — BUG FIX: unrated resources (0) excluded when min > 0
  if (filterMinRating.value !== 0 || filterMaxRating.value !== 5) {
    list = list.filter(r => {
      const rating = Number(r.avg_rating || 0)
      return rating >= filterMinRating.value && rating <= filterMaxRating.value
    })
  }

  // course filter
  if (selectedCourseCode.value) {
    list = list.filter(r => String(r.course_code || '').trim() === selectedCourseCode.value)
  }

  // access type filter
  if (selectedAccessType.value !== 'all') {
    list = list.filter(r => {
      const url = String(r.file_url || '').trim()
      const isLink = /^https?:\/\//i.test(url)
      return selectedAccessType.value === 'link' ? isLink : !isLink
    })
  }

  // search — BUG FIX: guard null fields before calling toLowerCase
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(r =>
      String(r.title || '').toLowerCase().includes(q) ||
      String(r.course_code || '').toLowerCase().includes(q) ||
      String(r.resource_type || '').toLowerCase().includes(q) ||
      String(r.contributor_name || '').toLowerCase().includes(q)
    )
  }

  // sort
  switch (selectedSort.value) {
    case 'oldest':        list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break
    case 'highest-rated': list.sort((a, b) => Number(b.avg_rating || 0) - Number(a.avg_rating || 0)); break
    case 'most-reviewed': list.sort((a, b) => Number(b.review_count || b.rating_count || 0) - Number(a.review_count || a.rating_count || 0)); break
    case 'az':            list.sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''))); break
    default:              list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break
  }

  return list
})

const paginatedResources = computed(() => filteredResources.value.slice(0, visibleCount.value))

// ── Debounce search ────────────────────────────────────────────────────────
let searchTimer = null
const debouncedSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { visibleCount.value = pageSize }, 300)
}

// ── Filter actions ─────────────────────────────────────────────────────────
const setMinRating = (value) => {
  const next = Math.min(Number(value), filterMaxRating.value)
  filterMinRating.value = isNaN(next) ? 0 : next
}
const setMaxRating = (value) => {
  const next = Math.max(Number(value), filterMinRating.value)
  filterMaxRating.value = isNaN(next) ? 5 : next
}

const toggleResourceType = (value) => {
  const n = normalizeResourceType(value)
  if (!n) return
  if (selectedTypes.value.includes(n)) {
    selectedTypes.value = selectedTypes.value.filter(t => t !== n)
  } else {
    selectedTypes.value = [...selectedTypes.value, n]
  }
}

const isQuickFilterActive = (value) => {
  if (!value) return selectedTypes.value.length === 0
  return selectedTypes.value.includes(value)
}

const toggleQuickFilter = (value) => {
  if (!value) { selectedTypes.value = []; return }
  toggleResourceType(value)
}

const applyFilters = () => { visibleCount.value = pageSize; showFilters.value = false }

const resetFilters = () => {
  selectedTypes.value    = []
  selectedCourseCode.value = ''
  selectedAccessType.value = 'all'
  selectedSort.value     = 'newest'
  filterMinRating.value  = 0
  filterMaxRating.value  = 5
  searchQuery.value      = ''
  visibleCount.value     = pageSize
}

// ── Load ───────────────────────────────────────────────────────────────────
const loadResources = async () => {
  loadError.value = ''
  isLoading.value = true
  try {
    // BUG FIX: validate API response is array
    const resp = await api('/resources')
    resources.value = Array.isArray(resp?.resources) ? resp.resources : Array.isArray(resp) ? resp : []
  } catch (err) {
    loadError.value = `Couldn't load resources: ${err?.message || 'Unknown error'}`
    resources.value = []
  } finally {
    isLoading.value = false
    // start carousel after data loads
    await nextTick()
    startSuggestedCarousel()
  }
}

// ── Upload ─────────────────────────────────────────────────────────────────
const handleUpload = async () => {
  // BUG FIX: whitespace-only title bypass
  const trimmedTitle = String(uploadForm.value.title || '').trim()
  if (!trimmedTitle) {
    uploadMessage.value = 'Title is required.'
    uploadMessageType.value = 'error'
    return
  }
  if (!uploadForm.value.resourceType) {
    uploadMessage.value = 'Resource type is required.'
    uploadMessageType.value = 'error'
    return
  }

  const trimmedLink = String(uploadForm.value.resourceLink || '').trim()

  if (uploadForm.value.resourceType === 'link') {
    if (!trimmedLink) {
      uploadMessage.value = 'A URL is required for link-type resources.'
      uploadMessageType.value = 'error'
      return
    }
    try {
      const url = new URL(trimmedLink)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error()
    } catch {
      uploadMessage.value = 'Enter a valid URL (http:// or https://).'
      uploadMessageType.value = 'error'
      return
    }
  } else if (!selectedUploadFile.value && !trimmedLink) {
    uploadMessage.value = 'Upload a file or paste a resource link.'
    uploadMessageType.value = 'error'
    return
  }

  isUploading.value   = true
  uploadMessage.value = ''
  uploadMessageDetails.value = ''

  try {
    const formData = new FormData()
    formData.append('title',        trimmedTitle)
    formData.append('courseCode',   uploadForm.value.courseCode || '')
    formData.append('resourceType', uploadForm.value.resourceType)
    formData.append('description',  uploadForm.value.description || '')
    if (trimmedLink)                formData.append('resourceLink', trimmedLink)
    if (selectedUploadFile.value)   formData.append('resourceFile', selectedUploadFile.value)

    const token = getToken()
    const response = await fetch('/api/resources/upload', {
      method:  'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body:    formData
    })

    const responseText = await response.text()
    let result = null
    if (responseText) {
      try { result = JSON.parse(responseText) } catch {}
    }

    if (!response.ok) {
      const msg = result?.message || responseText?.trim() || `Upload failed (HTTP ${response.status})`
      uploadMessageDetails.value = msg
      throw new Error(msg)
    }

    // BUG FIX: check resource ID exists in response
    if (!result?.resource?.id) {
      throw new Error('Upload response missing resource data')
    }

    uploadMessage.value     = 'Resource uploaded!'
    uploadMessageType.value = 'success'

    // refresh session
    const me = await api('/me').catch(() => null)
    if (token && me?.user) setSession(token, me.user)

    // reset form
    uploadForm.value = { title: '', courseCode: '', resourceType: '', description: '', resourceLink: '' }
    selectedUploadFile.value = null
    if (fileInputRef.value) fileInputRef.value.value = ''

    // BUG FIX: close modal THEN reload so user sees success briefly
    setTimeout(() => { showUploadModal.value = false }, 800)
    await loadResources()
  } catch (err) {
    uploadMessage.value     = 'Upload failed.'
    uploadMessageType.value = 'error'
    uploadMessageDetails.value = err?.message || 'Unknown error'
  } finally {
    isUploading.value = false
  }
}

// ── Navigation ─────────────────────────────────────────────────────────────
const openResource = (resource) => {
  if (!resource?.id) return  // BUG FIX: guard missing id
  router.push({ path: `/resources/${resource.id}`, query: { from: 'resources' } })
}

// ── Carousel ───────────────────────────────────────────────────────────────
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
  const step = firstCard.getBoundingClientRect().width + 12
  const maxScroll = carousel.scrollWidth - carousel.clientWidth
  if (maxScroll <= 0) return
  const nextLeft = carousel.scrollLeft + step
  carousel.scrollTo({ left: nextLeft >= maxScroll - 4 ? 0 : nextLeft, behavior: 'smooth' })
}

const startSuggestedCarousel = () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  stopSuggestedCarousel()
  if (suggestedResources.value.length < 2) return
  const carousel = suggestedCarouselRef.value
  if (!carousel || carousel.scrollWidth <= carousel.clientWidth) return
  suggestedCarouselTimer = window.setInterval(advanceSuggestedCarousel, 2800)
}

// ── Keyboard + scroll lock ─────────────────────────────────────────────────
const handleKeydown = (e) => {
  if (e.key === 'Escape' && showUploadModal.value && !isUploading.value) {
    showUploadModal.value = false
  }
}

watch(showUploadModal, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
  if (open) window.addEventListener('keydown', handleKeydown)
  else       window.removeEventListener('keydown', handleKeydown)
})

// ── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(() => {
  requireSession()
  const viewEl = document.querySelector('.view')
  if (viewEl) viewEl.scrollTop = 0
  loadResources()
})

onBeforeUnmount(() => {
  stopSuggestedCarousel()
  window.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* ── Base Layout ──────────────────────────────────────────────────────────── */
.page-bg {
  min-height: 100vh;
  background: var(--canvas-parchment, #F5F5F5);
  display: block;
  padding: 0;
}

.phone-shell {
  width: 100%;
  max-width: 100%;
  margin: 0;
  min-height: 100vh;
  display: grid;
  grid-template-rows: 1fr;
  overflow: hidden;
}

.view {
  overflow-y: auto;
  padding: 20px 16px 40px;
  min-width: 0;
}

.view > * { min-width: 0; max-width: 100%; }

.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border: 0;
}

/* ── Glass Card ───────────────────────────────────────────────────────────── */
.glass-card {
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(16px) saturate(1.4);
  -webkit-backdrop-filter: blur(16px) saturate(1.4);
  border: 1px solid rgba(255, 133, 187, 0.18);
  border-radius: 18px;
  box-shadow: 0 2px 16px rgba(2, 26, 84, 0.06);
}

/* ── Hero ─────────────────────────────────────────────────────────────────── */
.resources-hero {
  margin-bottom: 16px;
  padding: 20px;
  background: linear-gradient(135deg,
    rgba(255,255,255,0.82) 0%,
    rgba(255,206,227,0.38) 100%);
  border: 1px solid rgba(255,133,187,0.22);
}

.resources-hero__kicker {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 700;
  color: #FF85BB;
  letter-spacing: 0.6px;
  text-transform: uppercase;
}

.resources-hero__copy h2 {
  margin: 0 0 10px;
  font-size: 22px;
  font-weight: 700;
  color: #021A54;
  font-family: "Josefin Sans", "Trebuchet MS", sans-serif;
  line-height: 1.2;
}

.resources-hero__text {
  margin: 0 0 16px;
  color: #6e6e73;
  font-size: 13px;
  line-height: 1.5;
}

.resources-hero__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.hero-stat {
  padding: 10px 8px;
  background: rgba(255, 206, 227, 0.35);
  border: 1px solid rgba(255,133,187,0.2);
  border-radius: 12px;
  text-align: center;
}

.hero-stat__label {
  display: block;
  font-size: 10px;
  color: #FF85BB;
  margin-bottom: 3px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.hero-stat strong {
  display: block;
  font-size: 20px;
  font-weight: 800;
  color: #021A54;
  line-height: 1;
}

/* ── Summary Bar ──────────────────────────────────────────────────────────── */
.summary-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.summary-stat {
  flex: 1 1 64px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255,133,187,0.2);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.summary-value {
  font-size: 1.25rem;
  font-weight: 800;
  color: #021A54;
  line-height: 1;
}

.summary-label {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #FF85BB;
}

/* ── Search Row ───────────────────────────────────────────────────────────── */
.search-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.resource-toolbar {
  width: 100%;
  flex-wrap: wrap;
}

.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.82);
  border: 1px solid rgba(255,133,187,0.25);
  border-radius: 12px;
  padding: 0 10px;
  min-width: 160px;
}

.search-icon {
  width: 16px;
  height: 16px;
  fill: #FF85BB;
  flex-shrink: 0;
}

.resource-search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 10px 0;
  font-size: 14px;
  background: transparent;
  color: #021A54;
  min-width: 0;
}

.resource-search-input::placeholder { color: #b0b0b5; }

.search-clear-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #b0b0b5;
  font-size: 13px;
  padding: 2px 4px;
  flex-shrink: 0;
  transition: color 120ms;
}
.search-clear-btn:hover { color: #021A54; }

.search-inline-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.action-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.sort-select {
  padding: 8px 10px;
  border: 1px solid rgba(255,133,187,0.25);
  border-radius: 12px;
  background: rgba(255,255,255,0.82);
  font-size: 13px;
  color: #021A54;
  outline: none;
  cursor: pointer;
}
.sort-select:focus { border-color: #FF85BB; }

/* ── Result count ─────────────────────────────────────────────────────────── */
.result-count {
  margin: -4px 0 12px;
  font-size: 13px;
  color: #6e6e73;
  display: flex;
  align-items: center;
  gap: 8px;
}
.result-count strong { color: #021A54; }
.clear-link {
  background: none;
  border: none;
  cursor: pointer;
  color: #FF85BB;
  font-size: 13px;
  padding: 0;
  text-decoration: underline;
}

/* ── Chips ────────────────────────────────────────────────────────────────── */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 7px 14px;
  border: 1px solid rgba(255,133,187,0.3);
  border-radius: 20px;
  background: rgba(255,255,255,0.8);
  color: #021A54;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 120ms ease;
  white-space: nowrap;
}
.chip:hover { border-color: #FF85BB; background: #FFCEE3; color: #021A54; }

.chip--active,
.chip.chip--active {
  background: #FF85BB;
  border-color: #FF85BB;
  color: #ffffff;
}

.chip-strong {
  background: #FF85BB;
  border-color: #FF85BB;
  color: #ffffff;
  font-weight: 600;
}
.chip-strong:hover { background: #ff6da9; border-color: #ff6da9; }

.chip-row {
  display: flex;
  gap: 6px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.icon-chip {
  width: 38px;
  height: 38px;
  border: 1px solid rgba(255,133,187,0.25);
  border-radius: 50%;
  background: rgba(255,255,255,0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 120ms;
  position: relative;
  flex-shrink: 0;
}
.icon-chip svg { width: 16px; height: 16px; fill: #021A54; }
.icon-chip:hover { border-color: #FF85BB; background: #FFCEE3; }
.icon-chip--active { background: #FFCEE3; border-color: #FF85BB; }
.icon-chip--active svg { fill: #FF85BB; }

.filter-badge {
  position: absolute;
  top: -3px; right: -3px;
  width: 16px; height: 16px;
  background: #FF85BB;
  color: white;
  border-radius: 50%;
  font-size: 9px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Filter Panel ─────────────────────────────────────────────────────────── */
.filter-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 26, 84, 0.25);
  z-index: 40;
}

.filter-panel {
  position: relative;
  z-index: 41;
  margin-bottom: 16px;
  padding: 16px;
}

.filter-section { border-bottom: 1px solid rgba(255,133,187,0.15); padding-bottom: 12px; margin-bottom: 12px; }
.filter-section:last-of-type { border-bottom: none; }

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: #021A54;
}
.filter-header h4 { margin: 0; font-size: 13px; font-weight: 600; }

.filter-content { margin-top: 10px; }

.filter-pills { display: flex; flex-wrap: wrap; gap: 6px; }

.filter-pill {
  padding: 5px 12px;
  border: 1px solid rgba(255,133,187,0.3);
  border-radius: 16px;
  background: rgba(255,255,255,0.7);
  font-size: 12px;
  color: #021A54;
  cursor: pointer;
  transition: all 120ms;
}
.filter-pill:hover { border-color: #FF85BB; }
.filter-pill--active { background: #FF85BB; border-color: #FF85BB; color: white; }

.filter-select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid rgba(255,133,187,0.25);
  border-radius: 10px;
  background: rgba(255,255,255,0.82);
  font-size: 13px;
  color: #021A54;
  outline: none;
}

.filter-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }

.filter-reset-btn {
  background: none;
  border: 1px solid rgba(255,133,187,0.3);
  border-radius: 20px;
  padding: 7px 14px;
  font-size: 13px;
  color: #6e6e73;
  cursor: pointer;
  transition: all 120ms;
}
.filter-reset-btn:hover { border-color: #FF85BB; color: #FF85BB; }

.filter-apply-btn {
  background: #FF85BB;
  border: 1px solid #FF85BB;
  border-radius: 20px;
  padding: 7px 18px;
  font-size: 13px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 120ms;
}
.filter-apply-btn:hover { background: #ff6da9; }

/* Rating slider */
.rating-slider-wrap { position: relative; }
.dual-rating-slider {
  position: relative;
  height: 32px;
  display: flex;
  align-items: center;
}
.dual-rating-slider__track {
  position: absolute;
  left: 0; right: 0;
  height: 4px;
  background: #e0e0e0;
  border-radius: 2px;
}
.dual-rating-slider__range {
  position: absolute;
  height: 4px;
  background: #FF85BB;
  border-radius: 2px;
  left: var(--range-start);
  right: calc(100% - var(--range-end));
}
.rating-slider {
  position: absolute;
  width: 100%;
  height: 4px;
  background: transparent;
  appearance: none;
  pointer-events: none;
  outline: none;
}
.rating-slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: #FF85BB;
  border: 2px solid white;
  box-shadow: 0 1px 4px rgba(255,133,187,0.4);
  pointer-events: all;
  cursor: pointer;
}
.rating-markers {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #6e6e73;
  margin-top: 4px;
}
.rating-value-label {
  font-size: 11px;
  color: #FF85BB;
  font-weight: 600;
  margin: 4px 0 0;
}

/* ── Section Header ───────────────────────────────────────────────────────── */
.section-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}
.section-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #021A54;
}

/* ── Suggested Carousel ───────────────────────────────────────────────────── */
.suggested-section { margin-bottom: 24px; }

.suggested-carousel {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 6px;
  scrollbar-width: none;
}
.suggested-carousel::-webkit-scrollbar { display: none; }

.suggested-card {
  flex-shrink: 0;
  width: min(200px, 74vw);
  padding: 12px;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
  scroll-snap-align: center;
  transition: transform 150ms, box-shadow 150ms;
  background: rgba(255,255,255,0.78);
  border: 1px solid rgba(255,133,187,0.2);
}
.suggested-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(255,133,187,0.2);
  border-color: #FF85BB;
}

.suggested-media {
  height: 80px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  padding: 10px;
  border: 1px solid rgba(255,255,255,0.5);
}

.suggested-media__badge, .resource-cover-tag {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(2, 26, 84, 0.8);
}

.suggested-media__title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #021A54;
  letter-spacing: -0.03em;
}

.suggested-media__meta, .resource-cover-course {
  font-size: 0.7rem;
  color: rgba(2, 26, 84, 0.6);
}

.suggested-body strong {
  display: block;
  font-size: 12px;
  color: #021A54;
  line-height: 1.4;
  margin-bottom: 3px;
}
.suggested-type {
  font-size: 10px;
  font-weight: 700;
  color: #FF85BB;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ── Cover colour themes ──────────────────────────────────────────────────── */
.cover-past-year  { background: linear-gradient(135deg, #FFCEE3 0%, #FF85BB 100%); }
.cover-notes      { background: linear-gradient(135deg, #dce8ff 0%, #93c5fd 100%); }
.cover-slides     { background: linear-gradient(135deg, #e8d5ff 0%, #c084fc 100%); }
.cover-assignment { background: linear-gradient(135deg, #fef3c7 0%, #f59e0b 100%); }
.cover-pdf        { background: linear-gradient(135deg, #fee2e2 0%, #f87171 100%); }
.cover-link       { background: linear-gradient(135deg, #d1fae5 0%, #34d399 100%); }
.cover-misc       { background: linear-gradient(135deg, #F5F5F5 0%, #cbd5e1 100%); }

/* ── Resource Grid ────────────────────────────────────────────────────────── */
.resources-section { margin-top: 8px; }

.resources-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.resource-card {
  background: rgba(255,255,255,0.82);
  border: 1px solid rgba(255,133,187,0.18);
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  text-align: left;
  transition: transform 150ms, box-shadow 150ms, border-color 150ms;
  border-left: 3px solid transparent;
}
.resource-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(255,133,187,0.18);
  border-color: #FF85BB;
}

/* Type accent borders */
.resource-card.type-past-year  { border-left-color: #FF85BB; }
.resource-card.type-lecture-note { border-left-color: #93c5fd; }
.resource-card.type-slides     { border-left-color: #c084fc; }
.resource-card.type-assignment { border-left-color: #f59e0b; }
.resource-card.type-pdf        { border-left-color: #f87171; }
.resource-card.type-link       { border-left-color: #34d399; }

.resource-cover {
  height: 110px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid rgba(255,133,187,0.1);
}

.resource-cover-icon {
  font-size: 1.1rem;
  font-weight: 800;
  color: rgba(2, 26, 84, 0.75);
  letter-spacing: -0.02em;
}

.resource-card-body {
  padding: 10px 12px;
}
.resource-card-body strong {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #021A54;
  line-height: 1.4;
  margin-bottom: 4px;
  /* BUG FIX: clamp long titles */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.meta { font-size: 11px; color: #6e6e73; }
.muted { font-size: 11px; color: #b0b0b5; }
.date-meta { margin-top: 4px; font-size: 10px; }

.rating-line {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 3px;
  font-size: 11px;
  color: #6e6e73;
}
.star-icon { fill: #f4b400; flex-shrink: 0; }
.count-badge { color: #b0b0b5; font-size: 10px; }

.load-more-btn {
  display: block;
  margin: 8px auto 0;
}

/* ── Skeleton shimmer ─────────────────────────────────────────────────────── */
.skeleton-card {
  pointer-events: none;
}
.skeleton-cover {
  height: 110px;
  background: linear-gradient(90deg, #FFCEE3 25%, #F5F5F5 50%, #FFCEE3 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 14px 14px 0 0;
}
.skeleton-body {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.skeleton-line {
  height: 10px;
  border-radius: 6px;
  background: linear-gradient(90deg, #FFCEE3 25%, #F5F5F5 50%, #FFCEE3 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
  width: 80%;
}
.skeleton-line--wide  { width: 100%; }
.skeleton-line--short { width: 50%; }

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Error / Empty ────────────────────────────────────────────────────────── */
.error-banner {
  text-align: center;
  padding: 40px 20px;
  grid-column: 1 / -1;
  color: #021A54;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.error-banner svg { fill: #FF85BB; }

.empty-state-card {
  text-align: center;
  padding: 50px 20px;
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #021A54;
}

/* ── Upload Modal ─────────────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 26, 84, 0.38);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.modal-content {
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 20px;
  background: rgba(255,255,255,0.94);
  border: 1px solid rgba(255,133,187,0.25);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.modal-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: #021A54;
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #6e6e73;
  font-size: 16px;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 120ms;
}
.modal-close:hover { background: #FFCEE3; color: #021A54; }
.modal-close:disabled { opacity: 0.4; cursor: not-allowed; }

.form-label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #021A54;
}

.form-input {
  padding: 9px 12px;
  border: 1px solid rgba(255,133,187,0.3);
  border-radius: 10px;
  background: rgba(255,255,255,0.9);
  font-size: 14px;
  color: #021A54;
  outline: none;
  transition: border-color 120ms;
  width: 100%;
  box-sizing: border-box;
}
.form-input:focus { border-color: #FF85BB; }
.form-input:disabled { opacity: 0.55; }

textarea.form-input { resize: vertical; min-height: 60px; font-family: inherit; }

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}

.upload-message {
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  margin: 8px 0 0;
}
.msg-success { background: rgba(52,211,153,0.15); color: #065f46; border: 1px solid rgba(52,211,153,0.3); }
.msg-error   { background: rgba(248,113,113,0.12); color: #991b1b; border: 1px solid rgba(248,113,113,0.25); }
.msg-details { font-size: 11px; margin-top: 4px; }

/* ── Responsive ───────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .view { padding: 14px 12px 40px; }
  .resource-toolbar { flex-direction: column; }
  .action-row { width: 100%; }
  .action-row .chip-strong { flex: 1; justify-content: center; }
  .resources-list { grid-template-columns: repeat(2, 1fr); }
  .resources-hero__stats { grid-template-columns: repeat(3, 1fr); }
  .summary-bar { gap: 6px; }
}

@media (max-width: 420px) {
  .resources-list { grid-template-columns: 1fr; }
  .resources-hero__stats { grid-template-columns: 1fr 1fr; }
}
</style>