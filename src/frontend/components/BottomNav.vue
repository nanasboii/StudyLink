<template>
  <nav class="bottom-nav">
    <router-link 
      v-for="item in navItems" 
      :key="item.key" 
      :to="item.path"
      class="bottom-nav-item"
      :class="{ active: isActive(item.path) }"
    >
      <svg class="nav-icon" :viewBox="item.viewBox" aria-hidden="true">
        <path :d="item.iconPath" />
      </svg>
      <span class="nav-label">{{ item.label }}</span>
    </router-link>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { getUser } from '../utils/auth.js'

const router = useRouter()
const currentUser = computed(() => getUser())

const navItems = computed(() => {
  if (!currentUser.value) return []
  
  const role = currentUser.value.role || 'tutee'
  const baseItems = [
    { 
      key: 'resources', 
      label: 'Resources', 
      path: '/resources',
      viewBox: '0 0 24 24',
      iconPath: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z'
    },
    { 
      key: 'tutors', 
      label: 'Tutors', 
      path: '/tutors',
      viewBox: '0 0 24 24',
      iconPath: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'
    },
    { 
      key: 'leaderboards', 
      label: 'Leaderboard', 
      path: '/leaderboards',
      viewBox: '0 0 24 24',
      iconPath: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 9h-2v4h2v-4zm4-6h-2v10h2V6zm-8 2H8v8h2V8z'
    },
    { 
      key: 'profile', 
      label: 'Profile', 
      path: '/profile',
      viewBox: '0 0 24 24',
      iconPath: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'
    }
  ]
  
  if (role === 'admin') {
    return baseItems.filter(item => item.key !== 'tutors')
  }
  
  return baseItems
})

const isActive = (path) => {
  return router.currentRoute.value.path === path
}
</script>

<style scoped>
.bottom-nav {
  grid-row: 3;
  display: flex;
  justify-content: space-around;
  align-items: center;
  gap: 0;
  padding: 12px 0;
  border-top: 1px solid #f0c4d1;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(255, 245, 248, 0.9));
  backdrop-filter: blur(10px);
  position: relative;
  z-index: 29;
  min-height: 60px;
}

.bottom-nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  color: #666;
  text-decoration: none;
  font-size: 12px;
  font-weight: 500;
  transition: all 150ms ease;
  cursor: pointer;
}

.bottom-nav-item:hover,
.bottom-nav-item.active {
  color: #c41e3a;
}

.nav-icon {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.nav-label {
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
