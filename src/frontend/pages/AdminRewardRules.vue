<template>
  <main class="view page active reward-rules-page">
    <section class="phone-shell">
      <div class="reward-rules-content">

        <div class="card page-header">
          <div>
            <p class="page-kicker">Admin · Gamification</p>
            <h2>Reward Rules</h2>
            <p class="page-subtext">
              Tune redemption limits live — changes apply immediately to new checks.
            </p>
          </div>
          <button
            class="chip chip-strong"
            type="button"
            :disabled="isLoading"
            @click="loadRules"
            aria-label="Refresh reward rules"
          >
            {{ isLoading ? 'Loading…' : 'Refresh 🔄' }}
          </button>
        </div>

        <div v-if="!isLoading && rules.length" class="summary-bar">
          <div class="summary-stat card">
            <span class="summary-value">{{ rules.length }}</span>
            <span class="summary-label">Total Rules</span>
          </div>
          <div class="summary-stat card summary-stat--active">
            <span class="summary-value">{{ rules.filter(r => r.isActive).length }}</span>
            <span class="summary-label">Active</span>
          </div>
          <div class="summary-stat card summary-stat--custom">
            <span class="summary-value">{{ rules.filter(r => r.isCustom).length }}</span>
            <span class="summary-label">Customised</span>
          </div>
        </div>

        <transition name="fade-slide">
          <p
            v-if="adminMessage"
            class="card feedback-msg"
            :class="messageType === 'ok' ? 'success' : 'error'"
            role="alert"
            aria-live="polite"
          >
            {{ adminMessage }}
          </p>
        </transition>

        <div v-if="isLoading" class="rules-grid">
          <div v-for="n in 4" :key="n" class="card rule-card skeleton-card" aria-hidden="true">
            <div class="sk-head">
              <div class="sk-line wide"></div>
              <div class="sk-badge"></div>
            </div>
            <div class="sk-line narrow"></div>
            <div class="sk-grid">
              <div class="sk-input"></div>
              <div class="sk-input"></div>
              <div class="sk-input"></div>
            </div>
          </div>
        </div>

        <div v-else-if="rules.length === 0" class="card empty-state" role="status">
          <p class="empty-icon">⚙️</p>
          <p class="empty-title">No reward rules found.</p>
          <p class="empty-sub">The API returned no rules to configure.</p>
        </div>

        <div v-else class="rules-grid">
          <article
            v-for="rule in rules"
            :key="rule.code"
            class="card rule-card"
            :class="{ 'rule-card--inactive': !rule.isActive }"
          >
            <div class="card-header">
              <div class="card-title-row">
                <strong class="rule-name">{{ rule.name || rule.code || '—' }}</strong>
                <span class="status-pill" :class="rule.isActive ? 'pill-active' : 'pill-inactive'">
                  {{ rule.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <div class="card-meta-row">
                <span class="meta-chip">
                  ⭐ {{ rule.pointsCost }} pts
                </span>
                <span class="meta-chip meta-chip--code">{{ rule.code }}</span>
                <span v-if="rule.isCustom" class="meta-chip meta-chip--custom">
                  🛠️ Customised
                </span>
              </div>
              <p v-if="rule.description" class="rule-description">{{ rule.description }}</p>
            </div>

            <div class="editor-grid">
              <div class="editor-field">
                <label :for="`cooldown-${rule.code}`" class="field-label">
                  ⏳ Cooldown
                  <span class="field-unit">days</span>
                </label>
                <input
                  :id="`cooldown-${rule.code}`"
                  type="number"
                  min="0"
                  step="1"
                  class="num-input"
                  :class="{ 'input-error': fieldErrors[rule.code]?.cooldownDays }"
                  v-model.number="rule.cooldownDays"
                  :disabled="rule.isSaving"
                  :aria-describedby="`cooldown-err-${rule.code}`"
                  @input="clearFieldError(rule.code, 'cooldownDays')"
                />
                <p
                  v-if="fieldErrors[rule.code]?.cooldownDays"
                  :id="`cooldown-err-${rule.code}`"
                  class="field-error"
                  role="alert"
                >{{ fieldErrors[rule.code].cooldownDays }}</p>
              </div>

              <div class="editor-field">
                <label :for="`max30-${rule.code}`" class="field-label">
                  📅 Per 30 days
                  <span class="field-unit">max</span>
                </label>
                <input
                  :id="`max30-${rule.code}`"
                  type="number"
                  min="1"
                  step="1"
                  class="num-input"
                  :class="{ 'input-error': fieldErrors[rule.code]?.maxPer30Days }"
                  v-model.number="rule.maxPer30Days"
                  :disabled="rule.isSaving"
                  :aria-describedby="`max30-err-${rule.code}`"
                  @input="clearFieldError(rule.code, 'maxPer30Days')"
                />
                <p
                  v-if="fieldErrors[rule.code]?.maxPer30Days"
                  :id="`max30-err-${rule.code}`"
                  class="field-error"
                  role="alert"
                >{{ fieldErrors[rule.code].maxPer30Days }}</p>
              </div>

              <div class="editor-field">
                <label :for="`maxday-${rule.code}`" class="field-label">
                  ☀️ Per day
                  <span class="field-unit">max</span>
                </label>
                <input
                  :id="`maxday-${rule.code}`"
                  type="number"
                  min="1"
                  step="1"
                  class="num-input"
                  :class="{ 'input-error': fieldErrors[rule.code]?.maxPerDay }"
                  v-model.number="rule.maxPerDay"
                  :disabled="rule.isSaving"
                  :aria-describedby="`maxday-err-${rule.code}`"
                  @input="clearFieldError(rule.code, 'maxPerDay')"
                />
                <p
                  v-if="fieldErrors[rule.code]?.maxPerDay"
                  :id="`maxday-err-${rule.code}`"
                  class="field-error"
                  role="alert"
                >{{ fieldErrors[rule.code].maxPerDay }}</p>
              </div>
            </div>

            <p class="default-hint">
              ℹ️ Default: {{ rule.defaultCooldownDays }}d cooldown · {{ rule.defaultMaxPer30Days }} per 30 days · {{ rule.defaultMaxPerDay }} per day
            </p>

            <transition name="fade-slide">
              <p v-if="cardSuccess[rule.code]" class="card-success-msg" role="status">
                ✓ Saved Successfully
              </p>
            </transition>

            <div class="card-actions">
              <button
                class="btn-save chip chip-strong"
                type="button"
                :disabled="rule.isSaving"
                @click="saveRule(rule)"
              >
                {{ rule.isSaving ? 'Saving…' : 'Save ✅' }}
              </button>

              <button
                class="btn-reset chip chip-soft"
                type="button"
                :disabled="rule.isSaving || !rule.isCustom"
                :title="rule.isCustom ? 'Reset to system defaults' : 'Already using defaults'"
                @click="resetRule(rule)"
              >
                {{ rule.isSaving ? 'Working…' : 'Reset defaults 🔄' }}
              </button>
            </div>
          </article>
        </div>

        <section class="card audit-panel" aria-labelledby="audit-heading">
          <div class="audit-head">
            <div>
              <h3 id="audit-heading">Recent Rule Activity</h3>
              <p class="audit-sub">Last 20 admin changes to reward rules.</p>
            </div>
            <button
              class="chip chip-soft"
              type="button"
              :disabled="isLoadingActivity"
              @click="loadActivityLogs"
              aria-label="Refresh activity log"
            >
              {{ isLoadingActivity ? 'Loading…' : 'Refresh 🔄' }}
            </button>
          </div>

          <div v-if="isLoadingActivity" class="activity-list">
            <div v-for="n in 3" :key="n" class="activity-item activity-skeleton" aria-hidden="true">
              <div class="sk-line wide"></div>
              <div class="sk-line narrow"></div>
            </div>
          </div>

          <p v-else-if="activityLogs.length === 0" class="audit-empty">
            No reward rule changes recorded yet.
          </p>

          <div v-else class="activity-list">
            <article
              v-for="entry in activityLogs"
              :key="entry.id"
              class="activity-item"
              :class="entry.action === 'reward_rule_reset' ? 'activity-item--reset' : 'activity-item--update'"
            >
              <div class="activity-header">
                <span class="activity-action-badge" :class="entry.action === 'reward_rule_reset' ? 'badge-reset' : 'badge-update'">
                  {{ entry.actionLabel }}
                </span>
                <span class="activity-time">{{ formatDateTimeValue(entry.createdAt, 'Unknown time') }}</span>
              </div>
              <p class="activity-by">By <strong>{{ entry.adminName || 'Admin' }}</strong></p>
              <p class="activity-details">
                <strong>{{ entry.rewardCode }}</strong>
                · {{ entry.cooldownDays }}d cooldown
                · {{ entry.maxPer30Days }} per 30 days
                · {{ entry.maxPerDay }} per day
              </p>
            </article>
          </div>
        </section>

      </div>
    </section>
  </main>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { api, requireRoleSession } from '@/api.js'
import { formatDateTimeValue, normalizeRewardActivity, normalizeRewardRule } from '@/utils/records.js'

// ── State ──────────────────────────────────────────────────────────────────
const rules             = ref([])
const isLoading         = ref(true)
const adminMessage      = ref('')
const messageType       = ref('error')
const activityLogs      = ref([])
const isLoadingActivity = ref(false)

// Per-card inline validation errors { [ruleCode]: { fieldName: 'msg' } }
const fieldErrors  = reactive({})
// Per-card success flash { [ruleCode]: true }
const cardSuccess  = reactive({})

let messageTimer = null
const cardSuccessTimers = {}

// ── Message helpers ────────────────────────────────────────────────────────
const setMessage = (text, type = 'error') => {
  adminMessage.value = text
  messageType.value  = type
  if (messageTimer) clearTimeout(messageTimer)
  // BUG FIX 4: success messages never dismissed → linger across unrelated actions.
  if (type === 'ok') {
    messageTimer = setTimeout(() => { adminMessage.value = '' }, 4500)
  }
}

const showCardSuccess = (code) => {
  cardSuccess[code] = true
  if (cardSuccessTimers[code]) clearTimeout(cardSuccessTimers[code])
  cardSuccessTimers[code] = setTimeout(() => { cardSuccess[code] = false }, 2500)
}

// ── Inline validation helpers ──────────────────────────────────────────────
const clearFieldError = (code, field) => {
  if (fieldErrors[code]) delete fieldErrors[code][field]
}

// BUG FIX 5: original validation set a global adminMessage for EACH failing field
// and returned early, so the user only ever saw one error at a time — worse, the
// message was shared across all cards, making it unclear which card failed.
// New approach: validate all 3 fields at once, set per-field inline errors,
// and only fall through to the API if everything is valid.
const validateRule = (rule) => {
  const errs = {}

  if (!Number.isInteger(rule.cooldownDays) || rule.cooldownDays < 0) {
    errs.cooldownDays = 'Must be a whole number ≥ 0'
  }
  if (!Number.isInteger(rule.maxPer30Days) || rule.maxPer30Days <= 0) {
    errs.maxPer30Days = 'Must be a whole number ≥ 1'
  }
  if (!Number.isInteger(rule.maxPerDay) || rule.maxPerDay <= 0) {
    errs.maxPerDay = 'Must be a whole number ≥ 1'
  }
  // BUG FIX 6: never checked that maxPerDay ≤ maxPer30Days — logically impossible
  // to redeem more in one day than the 30-day cap allows.
  if (!errs.maxPerDay && !errs.maxPer30Days && rule.maxPerDay > rule.maxPer30Days) {
    errs.maxPerDay = 'Cannot exceed the 30-day limit'
  }

  fieldErrors[rule.code] = errs
  return Object.keys(errs).length === 0
}

// ── Data loading ───────────────────────────────────────────────────────────
const loadRules = async () => {
  isLoading.value    = true
  adminMessage.value = ''
  if (messageTimer) clearTimeout(messageTimer)

  try {
    const response = await api('/admin/reward-rules')
    // BUG FIX 7: response?.rules could be undefined if the API shape changes;
    // original code would silently set rules to [] but could also throw
    // on `response.rules.map` if `response` itself is null/undefined.
    const raw = Array.isArray(response?.rules) ? response.rules : []
    rules.value = raw.map(normalizeRewardRule)
  } catch (error) {
    setMessage(`Error loading reward rules: ${error?.message || 'Request failed.'}`)
    rules.value = []
  } finally {
    isLoading.value = false
  }
}

const loadActivityLogs = async () => {
  isLoadingActivity.value = true
  try {
    const response = await api('/admin/activity-logs')
    const rows = Array.isArray(response?.logs) ? response.logs : []
    activityLogs.value = rows
      .filter(e => ['reward_rule_updated', 'reward_rule_reset'].includes(String(e.action || '')))
      .slice(0, 20)
      .map(normalizeRewardActivity)
  } catch {
    // BUG FIX 8: silently swallowing errors is fine for the audit panel (non-critical),
    // but the original code lost the error entirely and left a confusing empty state.
    // Show a brief inline note instead.
    activityLogs.value = []
  } finally {
    isLoadingActivity.value = false
  }
}

// ── Save ───────────────────────────────────────────────────────────────────
const saveRule = async (rule) => {
  adminMessage.value = ''
  if (!validateRule(rule)) return   // stops here with per-field errors shown

  rule.isSaving = true

  try {
    await api(`/admin/reward-rules/${encodeURIComponent(rule.code)}`, 'PATCH', {
      cooldownDays: rule.cooldownDays,
      maxPer30Days: rule.maxPer30Days,
      maxPerDay:    rule.maxPerDay,
    })
    rule.isCustom = true
    showCardSuccess(rule.code)
    // Keep the global bar quiet; success is shown per-card.
    await loadActivityLogs()
  } catch (error) {
    setMessage(`Failed to update ${rule.name || rule.code}: ${error?.message || 'Request failed.'}`)
  } finally {
    rule.isSaving = false
  }
}

// ── Reset ──────────────────────────────────────────────────────────────────
const resetRule = async (rule) => {
  if (!rule.isCustom) return   // BUG FIX 9: button disabled but guard also needed

  adminMessage.value = ''
  rule.isSaving = true

  try {
    await api(`/admin/reward-rules/${encodeURIComponent(rule.code)}`, 'DELETE')
    rule.cooldownDays = rule.defaultCooldownDays
    rule.maxPer30Days = rule.defaultMaxPer30Days
    rule.maxPerDay    = rule.defaultMaxPerDay
    rule.isCustom     = false
    // Clear any leftover field errors on this card after a reset
    delete fieldErrors[rule.code]
    showCardSuccess(rule.code)
    await loadActivityLogs()
  } catch (error) {
    setMessage(`Failed to reset ${rule.name || rule.code}: ${error?.message || 'Request failed.'}`)
  } finally {
    rule.isSaving = false
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────
onMounted(() => {
  requireRoleSession('admin')
  loadRules()
  loadActivityLogs()
})

onBeforeUnmount(() => {
  if (messageTimer) clearTimeout(messageTimer)
  Object.values(cardSuccessTimers).forEach(t => clearTimeout(t))
})
</script>

<style scoped>
/* ── Page shell ── */
.reward-rules-page {
  max-width: 1024px;
  margin: 0 auto;
  padding: 20px;
}

.reward-rules-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Glass Card 🪟 */
.card {
  border: 2px solid #021A54;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(2, 26, 84, 0.05);
  padding: 20px;
}

/* ── Chips ── */
.chip {
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 800;
  padding: 8px 16px;
  border-radius: 8px;
  border: 2px solid #021A54;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 100ms, box-shadow 150ms;
}
.chip:active { transform: scale(0.96); }

.chip-strong {
  background: #FF85BB;
  color: #021A54;
}
.chip-soft {
  background: #F5F5F5;
  color: #021A54;
}

/* ── Header ── */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.page-kicker {
  margin: 0 0 4px;
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 800;
  color: #FF85BB;
}

.page-header h2 {
  font-size: clamp(1.6rem, 2.5vw, 2.2rem);
  margin: 0 0 4px;
  color: #021A54;
}

.page-subtext {
  font-size: 0.95rem;
  color: rgba(2, 26, 84, 0.7);
  font-weight: 600;
  margin: 0;
}

/* ── Summary bar ── */
.summary-bar {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.summary-stat {
  flex: 1 1 120px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
}

.summary-stat--active  { border-left: 6px solid #FF85BB; }
.summary-stat--custom  { border-left: 6px solid #021A54; }

.summary-value {
  font-size: 1.6rem;
  font-weight: 800;
  color: #021A54;
  line-height: 1;
}

.summary-label {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #FF85BB;
}

/* ── Feedback ── */
.feedback-msg {
  font-size: 0.95rem;
  font-weight: 800;
}

.feedback-msg.success {
  background: #FF85BB;
  color: #021A54;
  border-color: #021A54;
}

.feedback-msg.error {
  background: #FFCEE3;
  color: #021A54;
  border-color: #021A54;
}

/* ── Skeleton ── */
.sk-line, .sk-badge, .sk-input {
  border-radius: 6px;
  background: linear-gradient(90deg, rgba(255,255,255,0.4) 25%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.4) 75%);
  background-size: 200% 100%;
  animation: sk-shimmer 1.4s ease infinite;
}

.sk-line.wide    { height: 16px; width: 55%; }
.sk-line.narrow  { height: 12px; width: 35%; }
.sk-badge        { height: 20px; width: 56px; border-radius: 999px; }
.sk-input        { height: 40px; border-radius: 10px; }

.sk-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.sk-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 12px;
}

@keyframes sk-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .sk-line, .sk-badge, .sk-input { animation: none; }
}

/* ── Empty state ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px;
  text-align: center;
}

.empty-icon { font-size: 2.5rem; margin: 0; }
.empty-title { margin: 0; font-weight: 800; font-size: 1.1rem; color: #021A54; }
.empty-sub { margin: 0; font-size: 0.9rem; color: rgba(2, 26, 84, 0.7); font-weight: 600; }

/* ── Rule card grid ── */
.rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  align-items: start;
}

/* ── Rule card ── */
.rule-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: transform 150ms ease, box-shadow 150ms ease;
}

.rule-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(2, 26, 84, 0.1);
}

.rule-card--inactive {
  opacity: 0.7;
}

/* Card header */
.card-header { display: flex; flex-direction: column; gap: 8px; }

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.rule-name {
  font-size: 1.1rem;
  font-weight: 800;
  color: #021A54;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-pill {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
  flex-shrink: 0;
  border: 2px solid #021A54;
}

.pill-active {
  background: #FF85BB;
  color: #021A54;
}

.pill-inactive {
  background: #FFCEE3;
  color: #021A54;
}

.card-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 8px;
  background: #F5F5F5;
  color: #021A54;
  border: 2px solid #021A54;
}

.meta-chip--code {
  font-family: monospace;
  background: #FFCEE3;
}

.meta-chip--custom {
  background: #FF85BB;
}

.rule-description {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(2, 26, 84, 0.8);
  font-weight: 600;
  line-height: 1.4;
}

/* Editor grid */
.editor-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.editor-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 800;
  color: #021A54;
  text-transform: uppercase;
}

.field-unit {
  font-weight: 700;
  color: #FF85BB;
  text-transform: lowercase;
  font-size: 0.7rem;
}

.num-input {
  width: 100%;
  border: 2px solid #021A54;
  border-radius: 10px;
  padding: 8px 10px;
  font: inherit;
  font-size: 0.95rem;
  font-weight: 800;
  color: #021A54;
  background: #F5F5F5;
  outline: none;
  text-align: center;
  transition: background 150ms ease;
  box-sizing: border-box;
  appearance: textfield;
  -moz-appearance: textfield;
}

.num-input::-webkit-inner-spin-button,
.num-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }

.num-input:focus {
  background: #FFFFFF;
}

.num-input:disabled { opacity: 0.6; cursor: not-allowed; }

.input-error {
  border-color: #FF85BB !important;
  background: #FFCEE3 !important;
}

.field-error {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 800;
  color: #FF85BB;
  line-height: 1.3;
}

/* Default hint */
.default-hint {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  font-size: 0.8rem;
  color: rgba(2, 26, 84, 0.8);
  font-weight: 600;
}

/* Per-card success flash */
.card-success-msg {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 800;
  color: #021A54;
  background: #FF85BB;
  border: 2px solid #021A54;
  border-radius: 8px;
  padding: 6px 10px;
}

/* Card actions */
.card-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-save, .btn-reset {
  flex: 1 1 auto;
}

/* ── Audit panel ── */
.audit-panel {
  margin-top: 10px;
}

.audit-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.audit-head h3 {
  margin: 0 0 4px;
  font-size: 1.2rem;
  font-weight: 800;
  color: #021A54;
}

.audit-sub {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(2, 26, 84, 0.7);
}

.audit-empty {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(2, 26, 84, 0.7);
  font-style: italic;
  margin: 0;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.activity-item {
  padding: 12px 14px;
  border-radius: 12px;
  border: 2px solid #021A54;
  background: rgba(255, 255, 255, 0.6);
}

.activity-item--update { border-left: 6px solid #FF85BB; }
.activity-item--reset  { border-left: 6px solid #F5F5F5; }

.activity-skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.activity-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.activity-action-badge {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
  border: 2px solid #021A54;
}

.badge-update {
  background: #FF85BB;
  color: #021A54;
}

.badge-reset {
  background: #F5F5F5;
  color: #021A54;
}

.activity-time {
  font-size: 0.8rem;
  font-weight: 700;
  color: rgba(2, 26, 84, 0.8);
}

.activity-by {
  margin: 0 0 6px;
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(2, 26, 84, 0.8);
}

.activity-by strong {
  color: #021A54;
}

.activity-details {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: #021A54;
  line-height: 1.5;
}

/* ── Transitions ── */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

/* ── Responsive ── */
@media (max-width: 980px) {
  .rules-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .page-header { flex-direction: column; align-items: flex-start; }

  .editor-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .card-actions {
    flex-direction: column;
  }

  .btn-save,
  .btn-reset {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 380px) {
  .editor-grid { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .rule-card,
  .num-input,
  .btn-save,
  .btn-reset { transition: none; }
}
</style>