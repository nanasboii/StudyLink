<template>
  <div class="phone-shell">
    <Topbar v-if="isAuthenticated && currentPage !== 'login' && currentPage !== 'register'" ref="topbarRef" />
    <router-view />
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Topbar from './components/Topbar.vue'
import { getToken, getUser } from '@/api.js'

const router = useRouter()
const isAuthenticated = computed(() => !!getToken())
const currentUser = computed(() => getUser())
const currentPage = computed(() => router.currentRoute.value.name?.toLowerCase() || '')
const showStreakModalOnMount = ref(false)
const topbarRef = ref(null)

onMounted(async () => {
  // If not authenticated, redirect to login
  if (!isAuthenticated.value && router.currentRoute.value.name !== 'Login' && router.currentRoute.value.name !== 'Register') {
    router.push('/login')
    return
  }

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
