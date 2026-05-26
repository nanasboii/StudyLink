<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active admin-reviews-page">
        <div class="page-header">
          <div>
            <p class="page-kicker">Admin moderation</p>
            <h2>Review Moderation</h2>
            <p class="page-subtext">Scan both session and resource reviews in one place.</p>
          </div>
          <button @click="loadReviews" class="chip" type="button" :disabled="isLoading">
            {{ isLoading ? 'Loading...' : 'Refresh' }}
          </button>
        </div>

        <div class="toolbar-row">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search reviewer, subject, comment, or course..."
          />
          <div class="chip-row">
            <button
              v-for="filter in filters"
              :key="filter.key"
              class="chip"
              :class="{ 'chip-active': activeFilter === filter.key }"
              type="button"
              @click="activeFilter = filter.key"
            >
              {{ filter.label }}
            </button>
          </div>
        </div>

        <p v-if="message" class="message">{{ message }}</p>

        <div class="list">
          <div v-if="isLoading" class="empty-state">Loading reviews...</div>
          <div v-else-if="filteredReviews.length === 0" class="empty-state">No reviews found.</div>

          <article v-else v-for="review in filteredReviews" :key="`${review.reviewType}-${review.id}`" class="item review-item">
            <div class="review-head">
              <div>
                <p class="review-kicker">{{ review.sourceLabel }}</p>
                <strong>{{ review.subjectTitle || 'Untitled' }}</strong>
                <p class="meta">{{ review.subjectMeta || 'N/A' }}</p>
              </div>
              <span class="review-type-pill" :class="review.reviewType">{{ review.reviewType }}</span>
            </div>

            <div class="review-rating" :aria-label="`${review.rating} out of 5 stars`">
              <span v-for="star in 5" :key="star" :class="{ active: star <= review.rating }">★</span>
            </div>

            <p class="review-comment">{{ review.comment || 'No comment provided.' }}</p>

            <div class="review-meta-grid">
              <div>
                <span>Reviewer</span>
                <strong>{{ review.reviewerName }}</strong>
              </div>
              <div>
                <span>Role</span>
                <strong>{{ review.reviewerRole || 'Unknown' }}</strong>
              </div>
              <div>
                <span>Created</span>
                <strong>{{ formatDateTimeValue(review.createdAt, 'Unknown time') }}</strong>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api.js'
import { formatDateTimeValue, normalizeAdminReview } from '@/utils/records.js'

const reviews = ref([])
const searchQuery = ref('')
const activeFilter = ref('all')
const isLoading = ref(true)
const message = ref('')

const filters = [
  { key: 'all', label: 'All reviews' },
  { key: 'session', label: 'Session reviews' },
  { key: 'resource', label: 'Resource reviews' }
]

const filteredReviews = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return reviews.value.filter((review) => {
    if (activeFilter.value !== 'all' && review.reviewType !== activeFilter.value) {
      return false
    }

    if (!query) {
      return true
    }

    return [
      review.reviewerName,
      review.reviewerRole,
      review.subjectTitle,
      review.subjectMeta,
      review.comment,
      review.sourceLabel
    ]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(query))
  })
})

const loadReviews = async () => {
  isLoading.value = true
  message.value = ''

  try {
    const resp = await api('/admin/reviews')
    reviews.value = Array.isArray(resp.reviews) ? resp.reviews.map(normalizeAdminReview) : []
  } catch (err) {
    message.value = `Error: ${err.message}`
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadReviews()
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  margin-bottom: 16px;
}

.page-kicker {
  margin: 0 0 6px;
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-weight: 700;
  color: #8a5a6a;
}

.page-subtext {
  margin: 6px 0 0;
  color: #735a66;
}

.toolbar-row {
  display: grid;
  gap: 12px;
  margin-bottom: 14px;
}

.toolbar-row input {
  width: 100%;
}

.review-item {
  gap: 12px;
}

.review-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.review-kicker {
  margin: 0 0 4px;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 700;
  color: #8a5a6a;
}

.review-type-pill {
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 0.72rem;
  text-transform: uppercase;
  font-weight: 700;
  border: 1px solid rgba(177, 31, 75, 0.14);
  color: #65172f;
  background: linear-gradient(180deg, #fff, #fff5f8);
}

.review-type-pill.session {
  color: #24536e;
}

.review-type-pill.resource {
  color: #6d4a15;
}

.review-rating {
  display: flex;
  gap: 2px;
  font-size: 1rem;
  letter-spacing: 0.06em;
  color: rgba(177, 31, 75, 0.22);
}

.review-rating .active {
  color: #b11f4b;
}

.review-comment {
  margin: 0;
  color: #3f2f38;
  line-height: 1.55;
}

.review-meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
}

.review-meta-grid span {
  display: block;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 700;
  color: #8a5a6a;
}

.review-meta-grid strong {
  display: block;
  margin-top: 4px;
  color: #271d25;
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .chip {
    width: 100%;
  }
}
</style>
