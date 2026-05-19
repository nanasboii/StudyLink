<template>
  <div class="view page active">
    <h2>Leave Review</h2>
    <div class="card">
      <div class="search-row">
        <h3>Completed Sessions Ready for Review</h3>
        <button @click="loadCompletedBookings" class="chip" type="button">Refresh</button>
      </div>
      <div class="list">
        <div v-for="booking in completedBookings" :key="booking.id" class="list-item" @click="selectBooking(booking)" style="cursor: pointer;">
          <p><strong>{{ booking.tutorName }}</strong></p>
          <p class="meta">{{ booking.courseCode }} • {{ booking.sessionTime }}</p>
        </div>
      </div>
    </div>
    <form @submit.prevent="submitReview" class="stack card">
      <p class="meta">Tip: Select a completed booking below so the Booking ID is correct.</p>
      <label>Booking ID
        <input v-model.number="reviewData.bookingId" type="number" required />
      </label>
      <label>Comment
        <textarea v-model="reviewData.comment" rows="4" maxlength="250"></textarea>
      </label>
      <label>Rating (1-5)
        <input v-model.number="reviewData.rating" type="number" min="1" max="5" required />
      </label>
      <button class="primary" type="submit">Submit</button>
    </form>
    <p v-if="message" class="message">{{ message }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api.js'

const route = useRoute()

const completedBookings = ref([])
const reviewData = ref({ bookingId: 0, comment: '', rating: 0 })
const message = ref('')

// Pre-fill bookingId from route if coming from ResourceDetail
onMounted(async () => {
  if (route.params.resourceId) {
    reviewData.value.bookingId = Number(route.params.resourceId) || 0
  }
  await loadCompletedBookings()
})

const selectBooking = (booking) => {
  reviewData.value.bookingId = booking.id
}

const loadCompletedBookings = async () => {
  try {
    const resp = await api('/bookings/inbox')
    completedBookings.value = (resp.bookings || []).filter((b) => b.status === 'completed')
  } catch (err) {
    message.value = `Error: ${err.message}`
  }
}

const submitReview = async () => {
  if (!reviewData.value.bookingId) {
    message.value = 'Please select or enter a Booking ID'
    return
  }
  try {
    await api(`/bookings/${reviewData.value.bookingId}/review`, 'POST', {
      comment: reviewData.value.comment,
      rating: reviewData.value.rating,
    })
    message.value = 'Review submitted!'
    reviewData.value = { bookingId: 0, comment: '', rating: 0 }
    await loadCompletedBookings()
  } catch (err) {
    message.value = `Error: ${err.message}`
  }
}
</script>
