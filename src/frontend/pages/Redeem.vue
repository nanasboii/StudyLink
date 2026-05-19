<template>
  <main class="view page active redeem-page">
    <section class="card redeem-hero">
      <div class="hero-title-wrap">
        <h2>Redeem Points</h2>
        <p>Exchange your learning points for real rewards.</p>
      </div>
      <div class="points-display" aria-label="Your available points">
        <span class="points-label">Available Points</span>
        <span class="points-value">{{ totalPoints }}</span>
      </div>
    </section>

    <section class="card rewards-section">
      <h3>Available Rewards</h3>
      <div class="rewards-grid">
        <article
          v-for="reward in rewards"
          :key="reward.id"
          class="reward-card"
          :class="{ affordable: totalPoints >= reward.points_cost }"
        >
          <div class="reward-icon">{{ reward.icon }}</div>
          <div class="reward-body">
            <h4 class="reward-name">{{ reward.name }}</h4>
            <p class="reward-desc">{{ reward.description }}</p>
          </div>
          <div class="reward-footer">
            <span class="reward-cost">{{ reward.points_cost }} pts</span>
            <button
              class="redeem-btn"
              :disabled="totalPoints < reward.points_cost || redeeming === reward.id"
              @click="confirmRedeem(reward)"
            >
              {{ redeeming === reward.id ? 'Redeeming…' : totalPoints >= reward.points_cost ? 'Redeem' : 'Need more pts' }}
            </button>
          </div>
        </article>
      </div>
      <p v-if="!rewards.length && !loading" class="empty-msg">No rewards available at this time.</p>
    </section>

    <section class="card history-section" v-if="history.length">
      <h3>Redemption History</h3>
      <ul class="history-list">
        <li v-for="item in history" :key="item.id" class="history-item">
          <span class="history-icon">{{ item.icon }}</span>
          <div class="history-info">
            <p class="history-name">{{ item.name }}</p>
            <p class="history-date">{{ formatDate(item.redeemed_at) }}</p>
          </div>
          <span class="history-cost">-{{ item.points_spent }} pts</span>
        </li>
      </ul>
    </section>

    <!-- Confirm modal -->
    <Transition name="modal-fade">
      <div v-if="pendingReward" class="modal-backdrop" @click.self="pendingReward = null">
        <div class="modal-card" role="dialog" aria-modal="true">
          <button class="modal-close" @click="pendingReward = null" aria-label="Close">&times;</button>
          <div class="modal-reward-icon">{{ pendingReward.icon }}</div>
          <h3 class="modal-title">Redeem "{{ pendingReward.name }}"?</h3>
          <p class="modal-desc">{{ pendingReward.description }}</p>
          <div class="modal-points-row">
            <div class="modal-stat">
              <span class="modal-stat-label">Cost</span>
              <strong class="modal-stat-value">{{ pendingReward.points_cost }} pts</strong>
            </div>
            <div class="modal-stat">
              <span class="modal-stat-label">Balance After</span>
              <strong class="modal-stat-value">{{ totalPoints - pendingReward.points_cost }} pts</strong>
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="pendingReward = null">Cancel</button>
            <button class="btn-confirm" :disabled="redeeming === pendingReward.id" @click="doRedeem(pendingReward)">
              {{ redeeming === pendingReward.id ? 'Processing…' : 'Confirm Redeem' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/api.js'

const rewards = ref([])
const history = ref([])
const totalPoints = ref(0)
const loading = ref(true)
const redeeming = ref(null)
const pendingReward = ref(null)

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

const loadData = async () => {
  loading.value = true
  try {
    const [rewardsData, historyData] = await Promise.all([
      api('/redeem/rewards'),
      api('/redeem/history')
    ])
    rewards.value = rewardsData.rewards || []
    totalPoints.value = Number(rewardsData.totalPoints || 0)
    history.value = historyData.history || []
  } finally {
    loading.value = false
  }
}

const confirmRedeem = (reward) => {
  pendingReward.value = reward
}

const doRedeem = async (reward) => {
  redeeming.value = reward.id
  try {
    await api(`/redeem/${reward.id}`, 'POST')
    pendingReward.value = null
    await loadData()
  } finally {
    redeeming.value = null
  }
}

onMounted(loadData)
</script>

<style scoped>
.redeem-page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card {
  border: 1px solid #f1cdd9;
  border-radius: 16px;
  background: linear-gradient(180deg, #fffefe 0%, #fff7fa 100%);
  box-shadow: 0 12px 28px rgba(141, 28, 66, 0.08);
  padding: 24px;
}

/* Hero */
.redeem-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
}

.hero-title-wrap h2 {
  margin: 0 0 4px;
  font-size: 1.6rem;
  color: #5b1a35;
}

.hero-title-wrap p {
  margin: 0;
  color: #8d6275;
  font-size: 0.95rem;
}

.points-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(135deg, #8d1c42, #b5295a);
  border-radius: 12px;
  padding: 14px 28px;
  color: #fff;
  min-width: 130px;
}

.points-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.85;
}

.points-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.1;
}

/* Rewards grid */
.rewards-section h3,
.history-section h3 {
  margin: 0 0 18px;
  font-size: 1.1rem;
  color: #5b1a35;
}

.rewards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.reward-card {
  border: 1px solid #ecd5de;
  border-radius: 12px;
  background: #fff;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  opacity: 0.6;
  transition: opacity 0.2s, box-shadow 0.2s;
}

.reward-card.affordable {
  opacity: 1;
  box-shadow: 0 4px 14px rgba(141, 28, 66, 0.1);
}

.reward-icon {
  font-size: 2.2rem;
  line-height: 1;
}

.reward-body {
  flex: 1;
}

.reward-name {
  margin: 0 0 6px;
  font-size: 1rem;
  font-weight: 600;
  color: #3a0f22;
}

.reward-desc {
  margin: 0;
  font-size: 0.85rem;
  color: #7a4d60;
  line-height: 1.5;
}

.reward-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.reward-cost {
  font-size: 0.95rem;
  font-weight: 700;
  color: #8d1c42;
}

.redeem-btn {
  padding: 7px 16px;
  border-radius: 8px;
  border: none;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  background: #8d1c42;
  color: #fff;
  transition: background 0.15s;
  white-space: nowrap;
}

.redeem-btn:hover:not(:disabled) {
  background: #6e1534;
}

.redeem-btn:disabled {
  background: #d4a0b0;
  cursor: not-allowed;
}

/* History */
.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #fdf4f7;
  border: 1px solid #f1cdd9;
}

.history-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.history-info {
  flex: 1;
}

.history-name {
  margin: 0 0 2px;
  font-weight: 600;
  color: #3a0f22;
  font-size: 0.9rem;
}

.history-date {
  margin: 0;
  font-size: 0.78rem;
  color: #9e7080;
}

.history-cost {
  font-size: 0.9rem;
  font-weight: 700;
  color: #c0304f;
  white-space: nowrap;
}

.empty-msg {
  color: #9e7080;
  font-size: 0.9rem;
  margin: 0;
}

/* Confirm modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(60, 10, 30, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.modal-card {
  background: #fff;
  border-radius: 18px;
  padding: 32px 28px 24px;
  max-width: 400px;
  width: 90%;
  position: relative;
  box-shadow: 0 20px 50px rgba(141, 28, 66, 0.2);
  text-align: center;
}

.modal-close {
  position: absolute;
  top: 14px;
  right: 16px;
  background: none;
  border: none;
  font-size: 1.4rem;
  cursor: pointer;
  color: #9e7080;
}

.modal-reward-icon {
  font-size: 3rem;
  margin-bottom: 12px;
}

.modal-title {
  margin: 0 0 8px;
  font-size: 1.1rem;
  color: #3a0f22;
}

.modal-desc {
  margin: 0 0 20px;
  font-size: 0.87rem;
  color: #7a4d60;
  line-height: 1.5;
}

.modal-points-row {
  display: flex;
  justify-content: center;
  gap: 32px;
  margin-bottom: 24px;
}

.modal-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.modal-stat-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #9e7080;
}

.modal-stat-value {
  font-size: 1.1rem;
  color: #3a0f22;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn-cancel {
  padding: 9px 22px;
  border-radius: 8px;
  border: 1px solid #d4a0b0;
  background: #fff;
  color: #7a4d60;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-cancel:hover {
  background: #fdf4f7;
}

.btn-confirm {
  padding: 9px 22px;
  border-radius: 8px;
  border: none;
  background: #8d1c42;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-confirm:hover:not(:disabled) {
  background: #6e1534;
}

.btn-confirm:disabled {
  background: #d4a0b0;
  cursor: not-allowed;
}

/* Modal transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
