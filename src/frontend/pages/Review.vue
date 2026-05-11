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

<script>
import { api } from '../utils/api.js'
export default {
  name: 'Review',
  data() {
    return {
      completedBookings: [],
      reviewData: { bookingId: 0, comment: '', rating: 0 },
      message: '',
    }
  },
  methods: {
    selectBooking(booking) {
      this.reviewData.bookingId = booking.id
    },
    async loadCompletedBookings() {
      try {
        const resp = await api('/bookings/inbox')
        // Filter for completed bookings
        this.completedBookings = (resp.bookings || []).filter(b => b.status === 'completed')
      } catch (err) {
        this.message = `Error: ${err.message}`
      }
    },
    async submitReview() {
      if (!this.reviewData.bookingId) {
        this.message = 'Please select or enter a Booking ID'
        return
      }
      try {
        await api(`/bookings/${this.reviewData.bookingId}/review`, 'POST', {
          comment: this.reviewData.comment,
          rating: this.reviewData.rating
        })
        this.message = 'Review submitted!'
        this.reviewData = { bookingId: 0, comment: '', rating: 0 }
        await this.loadCompletedBookings()
      } catch (err) {
        this.message = `Error: ${err.message}`
      }
    },
  },
  mounted() {
    const viewEl = document.querySelector('.view')
    const topbar = document.querySelector('.topbar')
    if (viewEl) {
      viewEl.scrollTop = topbar ? topbar.offsetHeight : 80
    }
    this.loadCompletedBookings()
  },
}
</script>
