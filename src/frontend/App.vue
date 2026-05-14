<template>
  <div class="phone-shell">
    <Topbar v-if="isAuthenticated && currentPage !== 'login' && currentPage !== 'register'" ref="topbarRef" />
    <router-view />
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import Topbar from './components/Topbar.vue'
import { getToken, getUser } from '@/api.js'

const router = useRouter()
const sessionToken = ref(getToken())
const isAuthenticated = computed(() => !!sessionToken.value)
const currentUser = computed(() => getUser())
const currentPage = computed(() => router.currentRoute.value.name?.toLowerCase() || '')
const showStreakModalOnMount = ref(false)
const topbarRef = ref(null)

const syncSessionState = () => {
  sessionToken.value = getToken()
}

onMounted(async () => {
  window.addEventListener('studylink-session-changed', syncSessionState)
  window.addEventListener('storage', syncSessionState)

  // Check if user just logged in (hasn't seen streak modal yet)
  if (isAuthenticated.value) {
    const hasSeenStreakModal = sessionStorage.getItem('hasSeenStreakModal')
    if (!hasSeenStreakModal) {
      showStreakModalOnMount.value = true
      sessionStorage.setItem('hasSeenStreakModal', 'true')
      
      // Wait for Topbar to mount, then trigger modal
      await new Promise(resolve => setTimeout(resolve, 100))
      if (topbarRef.value?.showStreakModalAuto) {
        topbarRef.value.showStreakModalAuto()
      }
    }
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('studylink-session-changed', syncSessionState)
  window.removeEventListener('storage', syncSessionState)
})
</script>

<style scoped>
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
  grid-template-rows: auto 1fr;
  overflow: hidden;
}
</style>
