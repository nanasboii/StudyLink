<template>
  <main class="view redeem-page">

    <!-- ── Hero ── -->
    <header class="page-header">
      <div class="header-text">
        <p class="page-kicker">🎁 Rewards</p>
        <h2>Redeem Points</h2>
        <p class="page-subtext">Exchange learning points for real rewards.</p>
      </div>
      <div class="points-badge" aria-label="Available points">
        <span class="points-label">Available</span>
        <span class="points-value">{{ totalPoints.toLocaleString() }}</span>
        <span class="points-unit">pts</span>
      </div>
    </header>

    <!-- ── Limit bar ── -->
    <div class="limit-bar">
      <span class="limit-text">
        Daily redemptions: <strong>{{ redeemedToday }} / {{ maxPerDay }}</strong>
      </span>
      <div class="limit-track" role="progressbar"
           :aria-valuenow="redeemedToday"
           :aria-valuemax="maxPerDay">
        <div class="limit-fill"
             :style="{ width: maxPerDay ? `${Math.min((redeemedToday / maxPerDay) * 100, 100)}%` : '0%' }"
             :class="{ full: redeemedToday >= maxPerDay }">
        </div>
      </div>
    </div>

    <!-- ── Status message ── -->
    <Transition name="fade">
      <p v-if="message"
         class="feedback-msg"
         :class="messageType">
        {{ message }}
      </p>
    </Transition>

    <!-- ── Skeleton ── -->
    <div v-if="loading" class="rewards-grid">
      <div v-for="n in 4" :key="n" class="reward-card skeleton-card">
        <div class="skeleton-line skeleton-icon"></div>
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-short"></div>
        <div class="skeleton-line skeleton-btn"></div>
      </div>
    </div>

    <!-- ── Rewards grid ── -->
    <section v-else class="rewards-section">
      <div v-if="rewards.length" class="rewards-grid">
        <article
          v-for="reward in rewards"
          :key="reward.id"
          class="reward-card"
          :class="{ affordable: reward.isEligible, locked: !reward.isEligible }"
        >
          <div class="reward-icon" aria-hidden="true">{{ reward.icon }}</div>
          <div class="reward-body">
            <h4 class="reward-name">{{ reward.name }}</h4>
            <p class="reward-desc">{{ reward.description }}</p>
            <p class="reward-rules">{{ formatRuleSummary(reward) }}</p>
            <p v-if="reward.ineligibilityReason" class="reward-lock-reason">
              🔒 {{ reward.ineligibilityReason }}
            </p>
          </div>
          <div class="reward-footer">
            <span class="reward-cost">{{ reward.points_cost.toLocaleString() }} pts</span>
            <button
              class="redeem-btn"
              :class="{ processing: redeeming === reward.id }"
              :disabled="!reward.isEligible || redeeming === reward.id"
              @click="confirmRedeem(reward)"
              :aria-label="`Redeem ${reward.name} for ${reward.points_cost} points`"
            >
              <span v-if="redeeming === reward.id" class="spinner" aria-hidden="true"></span>
              {{ redeeming === reward.id ? 'Processing…' : reward.isEligible ? 'Redeem' : 'Locked' }}
            </button>
          </div>
        </article>
      </div>

      <!-- ── Empty ── -->
      <div v-else class="empty-block">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        <p>No rewards available right now.</p>
      </div>
    </section>

    <!-- ── History ── -->
    <section v-if="history.length" class="history-section">
      <h3 class="section-title">History</h3>
      <ul class="history-list">
        <li v-for="item in history" :key="item.id" class="history-item">
          <span class="history-icon" aria-hidden="true">{{ item.icon }}</span>
          <div class="history-info">
            <p class="history-name">{{ item.name }}</p>
            <p class="history-date">{{ formatDate(item.redeemed_at) }}</p>
          </div>
          <span class="history-cost">−{{ Number(item.points_spent).toLocaleString() }} pts</span>
        </li>
      </ul>
    </section>

    <!-- ── Confirm modal ── -->
    <Transition name="modal-fade">
      <div
        v-if="pendingReward"
        class="modal-overlay"
        @click.self="closeModal"
        role="dialog"
        aria-modal="true"
        :aria-label="`Confirm redeem ${pendingReward.name}`"
      >
        <div class="modal-card" ref="modalCard">
          <div class="modal-header">
            <div class="modal-reward-icon" aria-hidden="true">{{ pendingReward.icon }}</div>
            <button class="close-btn" @click="closeModal" aria-label="Close">&times;</button>
          </div>

          <h3 class="modal-title">Redeem "{{ pendingReward.name }}"?</h3>
          <p class="modal-desc">{{ pendingReward.description }}</p>
          <p class="modal-rule">{{ formatRuleSummary(pendingReward) }}</p>

          <p v-if="pendingReward.ineligibilityReason" class="modal-warning">
            ⚠️ {{ pendingReward.ineligibilityReason }}
          </p>

          <div class="modal-points-row">
            <div class="modal-stat">
              <span class="modal-stat-label">Cost</span>
              <strong class="modal-stat-value cost">{{ pendingReward.points_cost.toLocaleString() }} pts</strong>
            </div>
            <div class="modal-stat">
              <span class="modal-stat-label">Balance After</span>
              <strong
                class="modal-stat-value"
                :class="{ negative: (totalPoints - pendingReward.points_cost) < 0 }"
              >
                {{ (totalPoints - pendingReward.points_cost).toLocaleString() }} pts
              </strong>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn-cancel" @click="closeModal">Cancel</button>
            <button
              class="btn-confirm"
              :disabled="redeeming === pendingReward.id || !pendingReward.isEligible"
              @click="doRedeem(pendingReward)"
            >
              <span v-if="redeeming === pendingReward.id" class="spinner" aria-hidden="true"></span>
              {{ redeeming === pendingReward.id ? 'Redeeming…' : 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

  </main>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { api } from '@/api.js'
import { formatDateValue } from '@/utils/records.js'

// ── State ──────────────────────────────────────────────
const rewards       = ref([])
const history       = ref([])
const totalPoints   = ref(0)
const redeemedToday = ref(0)
const maxPerDay     = ref(0)
const loading       = ref(true)
const redeeming     = ref(null)
const pendingReward = ref(null)
const message       = ref('')
const messageType   = ref('success')
const modalCard     = ref(null)

let msgTimer = null

// ── Load ───────────────────────────────────────────────
const loadData = async () => {
  loading.value = true
  try {
    const [rewardsData, historyData] = await Promise.all([
      api('/redeem/rewards'),
      api('/redeem/history')
    ])

    // BUG FIX -> safe array + type coercion
    rewards.value       = Array.isArray(rewardsData?.rewards) ? rewardsData.rewards : []
    totalPoints.value   = Number(rewardsData?.totalPoints ?? rewardsData?.availablePoints ?? 0)
    redeemedToday.value = Number(rewardsData?.redeemedToday ?? 0)
    maxPerDay.value     = Number(rewardsData?.maxPerDay ?? 0)
    history.value       = Array.isArray(historyData?.history) ? historyData.history : []

    clearMsg()
  } catch (err) {
    showMsg(err?.message || 'Failed to load rewards.', 'error')
  } finally {
    loading.value = false
  }
}

// ── Helpers ────────────────────────────────────────────
const showMsg = (text, type = 'success', ms = 5000) => {
  message.value     = text
  messageType.value = type
  clearTimeout(msgTimer)
  // BUG FIX -> auto-dismiss success only
  if (type === 'success') {
    msgTimer = setTimeout(clearMsg, ms)
  }
}

const clearMsg = () => {
  message.value = ''
  clearTimeout(msgTimer)
}

// BUG FIX -> null-safe rule formatting
const formatRuleSummary = (reward) => {
  if (!reward) return ''
  const cooldown = Number(reward.cooldownDays ?? reward.ruleSummary?.cooldownDays ?? 0)
  const max30d   = Number(reward.maxPer30Days ?? reward.ruleSummary?.maxPer30Days ?? 0)
  const maxDaily = Number(reward.maxPerDay    ?? reward.ruleSummary?.maxPerDay    ?? maxPerDay.value ?? 0)

  const parts = []
  if (cooldown) parts.push(`${cooldown}d cooldown`)
  if (max30d)   parts.push(`${max30d}x per 30 days`)
  if (maxDaily) parts.push(`${maxDaily}x daily limit`)

  return parts.length ? `Rules: ${parts.join(' · ')}` : 'Standard redemption rules apply.'
}

// BUG FIX -> guard invalid date
const formatDate = (val) => {
  if (!val) return '—'
  try {
    return formatDateValue(val, '', 'en-MY', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  } catch {
    return String(val)
  }
}

// ── Modal ──────────────────────────────────────────────
const confirmRedeem = (reward) => {
  if (!reward?.isEligible) {
    showMsg(reward?.ineligibilityReason || 'Reward not available.', 'error')
    return
  }
  pendingReward.value = reward
  // IMPROVEMENT -> lock scroll + focus trap
  document.body.style.overflow = 'hidden'
  nextTick(() => modalCard.value?.querySelector('.btn-confirm')?.focus())
}

const closeModal = () => {
  pendingReward.value = null
  document.body.style.overflow = ''
}

// ── Redeem ─────────────────────────────────────────────
const doRedeem = async (reward) => {
  if (!reward?.id) return
  redeeming.value = reward.id
  try {
    const result = await api(`/redeem/${reward.id}`, 'POST')
    closeModal()
    showMsg(result?.message || `Redeemed "${reward.name}" successfully! 🎉`, 'success')
    await loadData()
  } catch (err) {
    showMsg(err?.message || 'Redemption failed.', 'error')
  } finally {
    redeeming.value = null
  }
}

// ── Keyboard ESC ───────────────────────────────────────
const onKeydown = (e) => {
  if (e.key === 'Escape' && pendingReward.value) closeModal()
}

// ── Lifecycle ──────────────────────────────────────────
onMounted(() => {
  loadData()
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  clearTimeout(msgTimer)
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* ── Page ── */
.redeem-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 2rem 2rem 4rem;
  max-width: 1100px;
  margin: 0 auto;
}

/* ── Header ── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-kicker {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent, #FF85BB);
  margin: 0 0 0.25rem;
}

.page-header h2 {
  font-size: clamp(1.4rem, 2.5vw, 2rem);
  font-weight: 700;
  color: var(--ink, #021A54);
  margin: 0 0 0.2rem;
}

.page-subtext {
  font-size: 0.85rem;
  color: var(--glass-pink-muted, #7a5c6e);
  margin: 0;
}

/* ── Points badge ── */
.points-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 120px;
  padding: 1rem 1.5rem;
  border-radius: 16px;
  background: var(--glass-pink-surface-strong, rgba(255, 206, 227, 0.45));
  border: 1px solid var(--glass-pink-border, rgba(255, 133, 187, 0.3));
  box-shadow: 0 4px 16px rgba(2, 26, 84, 0.07);
  backdrop-filter: blur(12px);
  text-align: center;
  flex-shrink: 0;
}

.points-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--glass-pink-muted, #7a5c6e);
  margin-bottom: 0.15rem;
}

.points-value {
  font-size: 2rem;
  font-weight: 800;
  color: var(--ink, #021A54);
  line-height: 1;
}

.points-unit {
  font-size: 0.72rem;
  color: var(--glass-pink-muted, #7a5c6e);
  margin-top: 0.1rem;
}

/* ── Limit bar ── */
.limit-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.limit-text {
  font-size: 0.82rem;
  color: var(--glass-pink-muted, #7a5c6e);
  white-space: nowrap;
}

.limit-text strong {
  color: var(--ink, #021A54);
}

.limit-track {
  flex: 1;
  min-width: 120px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 133, 187, 0.18);
  overflow: hidden;
}

.limit-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #FF85BB, #ff6da9);
  transition: width 500ms ease;
}

.limit-fill.full {
  background: linear-gradient(90deg, #d94070, #b11f4b);
}

/* ── Feedback ── */
.feedback-msg {
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-size: 0.875rem;
  border: 1px solid transparent;
}

.feedback-msg.success {
  background: rgba(34, 134, 82, 0.09);
  border-color: rgba(34, 134, 82, 0.22);
  color: #1b7a4a;
}

.feedback-msg.error {
  background: rgba(191, 47, 69, 0.08);
  border-color: rgba(191, 47, 69, 0.2);
  color: #8f2335;
}

/* ── Rewards grid ── */
.rewards-section { width: 100%; }

.rewards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}

/* ── Reward card ── */
.reward-card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1.25rem;
  border-radius: 18px;
  background: var(--glass-pink-surface-strong, rgba(255, 206, 227, 0.35));
  border: 1px solid var(--glass-pink-border, rgba(255, 133, 187, 0.25));
  box-shadow: 0 2px 12px rgba(2, 26, 84, 0.06);
  backdrop-filter: blur(12px);
  transition: transform 150ms ease, box-shadow 150ms ease, opacity 150ms ease;
}

.reward-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 22px rgba(2, 26, 84, 0.11);
}

/* BUG FIX -> locked cards visually distinct */
.reward-card.locked {
  opacity: 0.65;
  filter: grayscale(0.25);
}

.reward-icon {
  font-size: 2rem;
  line-height: 1;
}

.reward-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.reward-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink, #021A54);
  margin: 0;
}

.reward-desc {
  font-size: 0.82rem;
  color: var(--glass-pink-muted, #7a5c6e);
  margin: 0;
  line-height: 1.45;
}

.reward-rules {
  font-size: 0.75rem;
  color: var(--glass-pink-muted, #7a5c6e);
  margin: 0;
  opacity: 0.85;
}

.reward-lock-reason {
  font-size: 0.76rem;
  color: #8f2335;
  margin: 0;
  font-weight: 600;
}

.reward-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 0.5rem;
  border-top: 1px solid var(--glass-pink-border, rgba(255, 133, 187, 0.2));
}

.reward-cost {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ink, #021A54);
}

/* ── Redeem button ── */
.redeem-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 10px;
  border: none;
  background: var(--accent, #FF85BB);
  color: #ffffff;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 150ms ease, transform 100ms ease;
  white-space: nowrap;
}

.redeem-btn:hover:not(:disabled) {
  background: #ff6da9;
}

.redeem-btn:active:not(:disabled) {
  transform: scale(0.96);
}

.redeem-btn:disabled {
  background: rgba(255, 133, 187, 0.35);
  color: rgba(2, 26, 84, 0.45);
  cursor: not-allowed;
}

/* ── Spinner ── */
.spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Empty ── */
.empty-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 3rem 2rem;
  color: var(--glass-pink-muted, #7a5c6e);
  text-align: center;
}

.empty-block svg {
  width: 40px;
  height: 40px;
  fill: currentColor;
  opacity: 0.45;
}

/* ── Skeleton ── */
.skeleton-card {
  pointer-events: none;
}

.skeleton-line {
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    rgba(255, 206, 227, 0.35) 25%,
    rgba(255, 133, 187, 0.25) 37%,
    rgba(255, 206, 227, 0.35) 63%
  );
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}

.skeleton-icon  { width: 40px;  height: 40px; border-radius: 12px; margin-bottom: 0.5rem; }
.skeleton-title { width: 75%;   height: 18px; margin-bottom: 0.4rem; }
.skeleton-short { width: 55%;   height: 13px; margin-bottom: 1rem; }
.skeleton-btn   { width: 100px; height: 34px; border-radius: 10px; margin-left: auto; }

@keyframes shimmer {
  0%   { background-position: 100% 50%; }
  100% { background-position:   0% 50%; }
}

/* ── History ── */
.history-section {
  padding-top: 0.5rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink, #021A54);
  margin: 0 0 0.75rem;
}

.history-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem 1.1rem;
  border-radius: 14px;
  background: var(--glass-pink-surface-strong, rgba(255, 206, 227, 0.3));
  border: 1px solid var(--glass-pink-border, rgba(255, 133, 187, 0.2));
  backdrop-filter: blur(8px);
}

.history-icon {
  font-size: 1.4rem;
  flex-shrink: 0;
}

.history-info {
  flex: 1;
  min-width: 0;
}

.history-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--ink, #021A54);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-date {
  font-size: 0.75rem;
  color: var(--glass-pink-muted, #7a5c6e);
  margin: 2px 0 0;
}

.history-cost {
  font-size: 0.85rem;
  font-weight: 700;
  color: #8f2335;
  flex-shrink: 0;
}

/* ── Modal overlay ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 26, 84, 0.4);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 1rem;
}

.modal-card {
  background: var(--glass-pink-surface-strong, rgba(255, 206, 227, 0.55));
  border: 1px solid var(--glass-pink-border, rgba(255, 133, 187, 0.35));
  border-radius: 22px;
  box-shadow: 0 20px 60px rgba(2, 26, 84, 0.18);
  backdrop-filter: blur(24px);
  width: min(100%, 420px);
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.modal-reward-icon {
  font-size: 2.4rem;
  line-height: 1;
}

.close-btn {
  background: none !important;
  border: none !important;
  box-shadow: none !important;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: var(--glass-pink-muted, #7a5c6e);
  padding: 0 4px;
  border-radius: 50%;
  transition: color 120ms ease;
}

.close-btn:hover {
  color: var(--ink, #021A54);
}

.modal-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--ink, #021A54);
  margin: 0;
}

.modal-desc {
  font-size: 0.875rem;
  color: var(--glass-pink-muted, #7a5c6e);
  margin: 0;
  line-height: 1.5;
}

.modal-rule {
  font-size: 0.78rem;
  color: var(--glass-pink-muted, #7a5c6e);
  margin: 0;
  opacity: 0.85;
}

.modal-warning {
  font-size: 0.82rem;
  font-weight: 600;
  color: #8f2335;
  background: rgba(191, 47, 69, 0.08);
  border: 1px solid rgba(191, 47, 69, 0.2);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  margin: 0;
}

/* ── Modal stats ── */
.modal-points-row {
  display: flex;
  gap: 1rem;
  margin: 0.5rem 0;
}

.modal-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid var(--glass-pink-border, rgba(255, 133, 187, 0.22));
}

.modal-stat-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--glass-pink-muted, #7a5c6e);
}

.modal-stat-value {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--ink, #021A54);
}

/* BUG FIX -> negative balance indicator */
.modal-stat-value.negative {
  color: #8f2335;
}

.modal-stat-value.cost {
  color: #b11f4b;
}

/* ── Modal actions ── */
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.btn-cancel {
  padding: 9px 20px;
  border-radius: 10px;
  border: 1px solid var(--glass-pink-border, rgba(255, 133, 187, 0.3));
  background: rgba(255, 255, 255, 0.55);
  color: var(--ink, #021A54);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 130ms ease;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.8);
}

.btn-confirm {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 22px;
  border-radius: 10px;
  border: none;
  background: var(--accent, #FF85BB);
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 130ms ease, transform 100ms ease;
}

.btn-confirm:hover:not(:disabled) {
  background: #ff6da9;
}

.btn-confirm:active:not(:disabled) {
  transform: scale(0.97);
}

.btn-confirm:disabled {
  background: rgba(255, 133, 187, 0.4);
  cursor: not-allowed;
}

/* ── Transitions ── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 220ms ease, transform 220ms ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 200ms ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-card,
.modal-fade-leave-active .modal-card {
  transition: transform 200ms ease;
}
.modal-fade-enter-from .modal-card {
  transform: scale(0.96) translateY(8px);
}
.modal-fade-leave-to .modal-card {
  transform: scale(0.96) translateY(8px);
}

/* ── Responsive ── */
@media (max-width: 820px) {
  .redeem-page {
    padding: 1.25rem 1.25rem 3rem;
  }

  .rewards-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }

  .points-badge {
    min-width: 100px;
    padding: 0.75rem 1rem;
  }

  .points-value {
    font-size: 1.6rem;
  }
}

@media (max-width: 640px) {
  .redeem-page {
    padding: 1rem 1rem 3rem;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .points-badge {
    flex-direction: row;
    gap: 0.5rem;
    justify-content: flex-start;
    padding: 0.75rem 1rem;
  }

  .points-value {
    font-size: 1.4rem;
  }

  .rewards-grid {
    grid-template-columns: 1fr;
  }

  .modal-card {
    padding: 1.25rem 1rem;
  }

  .modal-points-row {
    gap: 0.5rem;
  }

  .modal-actions {
    flex-direction: column;
  }

  .modal-actions button {
    width: 100%;
    justify-content: center;
  }

  .history-item {
    flex-wrap: wrap;
  }

  .history-cost {
    margin-left: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner,
  .skeleton-line,
  .reward-card,
  .modal-card {
    animation: none !important;
    transition: none !important;
  }
}
</style>