import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/api.js'

// Pages - Lazy loaded
const Login = () => import('../pages/Login.vue')
const Register = () => import('../pages/Register.vue')
const Resources = () => import('../pages/Resources.vue')
const Tutors = () => import('../pages/Tutors.vue')
const Review = () => import('../pages/Review.vue')
const Leaderboards = () => import('../pages/Leaderboards.vue')
const Session = () => import('../pages/Session.vue')
const Verification = () => import('../pages/Verification.vue')
const AdminVerifications = () => import('../pages/AdminVerifications.vue')
const AdminResources = () => import('../pages/AdminResources.vue')
const AdminAnalytics = () => import('../pages/AdminAnalytics.vue')
const AdminActivity = () => import('../pages/AdminActivity.vue')
const AdminErrors = () => import('../pages/AdminErrors.vue')
const Notifications = () => import('../pages/Notifications.vue')
const Achievements = () => import('../pages/Achievements.vue')
const Profile = () => import('../pages/Profile.vue')
const PublicProfile = () => import('../pages/PublicProfile.vue')
const ResourceDetail = () => import('../pages/ResourceDetail.vue')

const routes = [
  { path: '/login', component: Login, name: 'Login' },
  { path: '/register', component: Register, name: 'Register' },
  { path: '/resources', component: Resources, name: 'Resources', meta: { requiresAuth: true } },
  { path: '/tutors', component: Tutors, name: 'Tutors', meta: { requiresAuth: true } },
  { path: '/review/:resourceId', component: Review, name: 'Review', meta: { requiresAuth: true } },
  { path: '/leaderboards', component: Leaderboards, name: 'Leaderboards', meta: { requiresAuth: true } },
  { path: '/session/:sessionId', component: Session, name: 'Session', meta: { requiresAuth: true } },
  { path: '/verification', component: Verification, name: 'Verification', meta: { requiresAuth: true } },
  { path: '/admin/verifications', component: AdminVerifications, name: 'AdminVerifications', meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/resources', component: AdminResources, name: 'AdminResources', meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/analytics', component: AdminAnalytics, name: 'AdminAnalytics', meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/activity', component: AdminActivity, name: 'AdminActivity', meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/errors', component: AdminErrors, name: 'AdminErrors', meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/notifications', component: Notifications, name: 'Notifications', meta: { requiresAuth: true } },
  { path: '/achievements', component: Achievements, name: 'Achievements', meta: { requiresAuth: true } },
  { path: '/profile', component: Profile, name: 'Profile', meta: { requiresAuth: true } },
  { path: '/users/:userId', component: PublicProfile, name: 'PublicProfile', meta: { requiresAuth: true } },
  { path: '/resources/:resourceId', component: ResourceDetail, name: 'ResourceDetail', meta: { requiresAuth: true } },
  { path: '/', redirect: '/resources' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = getToken()
  
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router
