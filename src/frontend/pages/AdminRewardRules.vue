<template>
  <main class="view page active reward-rules-page">
    <div class="reward-rules-content">

      <!-- ── Header ── -->
      <section class="card page-header-card">
        <div>
          <p class="page-kicker">Admin · Gamification</p>
          <h2>Reward Rules</h2>
          <p class="page-subtext">Configure point limits and cooldowns per activity.</p>
        </div>
        <button @click="loadRules" class="chip chip-strong" type="button" :disabled="isLoading">
          {{ isLoading ? 'Loading…' : 'Refresh 🔄' }}
        </button>
      </section>

      <!-- ── Summary bar ── -->
      <section v-if="!isLoading && rules.length" class="card summary-bar">
        <div class="summary-stat">
          <span class="summary-value">{{ rules.length }}</span>
          <span class="summary-label">Total Rules</span>
        </div>
        <div class="summary-stat">
          <span class="summary-value">{{ customCount }}</span>
          <span class="summary-label">Customised</span>
        </div>
        <div class="summary-stat">
          <span class="summary-value">{{ defaultCount }}</span>
          <span class="summary-label">Using Defaults</span>
        </div>
      </section>

      <!-- ── Global message ── -->
      <Transition name="fade-slide">
        <p
          v-if="adminMessage"
          class="feedback-msg"
          :class="messageType"
          role="alert"
          aria-live="polite"
        >{{ adminMessage }}</p>
      </Transition>

      <!-- ── Skeletons ── -->
      <div v-if="isLoading" class="rules-grid">
        <div v-for="n in 6" :key="n" class="card skeleton-card" aria-hidden="true"></div>
      </div>

      <!-- ── Empty ── -->
      <div v-else-if="!rules.length" class="card empty-state">
        <p class="empty-icon">⚙️</p>
        <p class="empty-text">No reward rules found.</p>
      </div>

      <!-- ── Rules grid ── -->
      <div v-else class="rules-grid">
        <article
          v-for="rule in rules"
          :key="rule.code"
          class="card rule-card"
          :class="rule.isCustom ? 'rule-card--custom' : 'rule-card--default'"
        >
          <div class="rule-card-head">
            <div>
              <p class="rule-code-badge">{{ rule.code }}</p>
              <h3 class="rule-name">{{ rule.name || rule.code }}</h3>
              <p class="rule-desc" v-if="rule.description">{{ rule.description }}</p>
            </div>
            <span class="status-chip" :class="rule.isCustom ? 'custom' : 'default'">
              {{ rule.isCustom ? 'Custom' : 'Default' }}
            </span>
          </div>

          <div class="editor-grid">
            <!-- Cooldown days -->
            <div class="field">
              <label :for="`cd-${rule.code}`">Cooldown (days)</label>
              <input
                :id="`cd-${rule.code}`"
                v-model.number="rule.cooldownDays"
                type="number"
                min="0"
                step="1"
                class="num-input"
                :class="{ 'input-error': fieldErrors[rule.code]?.cooldownDays }"
                :disabled="rule.isSaving"
                @input="clearFieldError(rule.code, 'cooldownDays')"
                aria-describedby="`cd-err-${rule.code}`"
              />
              <p v-if="fieldErrors[rule.code]?.cooldownDays" :id="`cd-err-${rule.code}`" class="field-error">
                {{ fieldErrors[rule.code].cooldownDays }}
              </p>
            </div>

            <!-- Max per 30 days -->
            <div class="field">
              <label :for="`m30-${rule.code}`">Max / 30 days</label>
              <input
                :id="`m30-${rule.code}`"
                v-model.number="rule.maxPer30Days"
                type="number"
                min="1"
                step="1"
                class="num-input"
                :class="{ 'input-error': fieldErrors[rule.code]?.maxPer30Days }"
                :disabled="rule.isSaving"
                @input="clearFieldError(rule.code, 'maxPer30Days')"
              />
              <p v-if="fieldErrors[rule.code]?.maxPer30Days" class="field-error">
                {{ fieldErrors[rule.code].maxPer30Days }}
              </p>
            </div>

            <!-- Max per day -->
            <div class="field">
              <label :for="`mpd-${rule.code}`">Max / day</label>
              <input
                :id="`mpd-${rule.code}`"
                v-model.number="rule.maxPerDay"
                type="number"
                min="1"
                step="1"
                class="num-input"
                :class="{ 'input-error': fieldErrors[rule.code]?.maxPerDay }"
                :disabled="rule.isSaving"
                @input="clearFieldError(rule.code, 'maxPerDay')"
              />
              <p v-if="fieldErrors[rule.code]?.maxPerDay" class="field-error">
                {{ fieldErrors[rule.code].maxPerDay }}
              </p>
            </div>
          </div>

          <p v-if="rule.isCustom" class="default-hint">
            ℹ️ Defaults: {{ rule.defaultCooldownDays }}d cooldown · {{ rule.defaultMaxPer30Days }}/30d · {{ rule.defaultMaxPerDay }}/day
          </p>

          <Transition name="fade-slide">
            <p v-if="cardSuccess[rule.code]" class="card-success-msg" role="status">✅ Saved!</p>
          </Transition>

          <div class="card-actions">
            <button
              class="chip chip-strong btn-save"
              type="button"
              :disabled="rule.isSaving"
              @click="saveRule(rule)"
            >
              {{ rule.isSaving ? 'Saving…' : 'Save ✅' }}
            </button>
            <button
              class="chip chip-soft btn-reset"
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

      <!-- ── Audit panel ── -->
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

        <p v-else-if="!activityLogs.length" class="audit-empty">
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
  </main>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref, computed } from 'vue'
import { api, requireRoleSession } from '@/api.js'
import { formatDateTimeValue, normalizeRewardActivity, normalizeRewardRule } from '@/utils/records.js'

// ── State ──────────────────────────────────────────────────────────────────
const rules             = ref([])
const isLoading         = ref(true)
const adminMessage      = ref('')
const messageType       = ref('error')
const activityLogs      = ref([])
const isLoadingActivity = ref(false)

const fieldErrors      = reactive({})
const cardSuccess      = reactive({})

let messageTimer = null
const cardSuccessTimers = {}

// ── Computed ───────────────────────────────────────────────────────────────
const customCount  = computed(() => rules.value.filter(r => r.isCustom).length)
const defaultCount = computed(() => rules.value.filter(r => !r.isCustom).length)

// ── Message helpers ────────────────────────────────────────────────────────
const setMessage = (text, type = 'error') => {
  adminMessage.value = text
  messageType.value  = type
  if (messageTimer) clearTimeout(messageTimer)
  if (type === 'ok') messageTimer = setTimeout(() => { adminMessage.value = '' }, 4500)
}

const showCardSuccess = (code) => {
  cardSuccess[code] = true
  if (cardSuccessTimers[code]) clearTimeout(cardSuccessTimers[code])
  cardSuccessTimers[code] = setTimeout(() => { cardSuccess[code] = false }, 2500)
}

const clearFieldError = (code, field) => {
  if (fieldErrors[code]) delete fieldErrors[code][field]
}

// ── Validation ─────────────────────────────────────────────────────────────
const validateRule = (rule) => {
  const errs = {}
  if (!Number.isInteger(rule.cooldownDays) || rule.cooldownDays < 0)   errs.cooldownDays = 'Must be a whole number ≥ 0'
  if (!Number.isInteger(rule.maxPer30Days) || rule.maxPer30Days <= 0)  errs.maxPer30Days = 'Must be a whole number ≥ 1'
  if (!Number.isInteger(rule.maxPerDay)    || rule.maxPerDay <= 0)     errs.maxPerDay    = 'Must be a whole number ≥ 1'
  // BUG FIX -> maxPerDay cannot exceed maxPer30Days
  if (!errs.maxPerDay && !errs.maxPer30Days && rule.maxPerDay > rule.maxPer30Days)
    errs.maxPerDay = 'Cannot exceed the 30-day limit'
  fieldErrors[rule.code] = errs
  return Object.keys(errs).length === 0
}

// ── Data load ──────────────────────────────────────────────────────────────
const loadRules = async () => {
  isLoading.value    = true
  adminMessage.value = ''
  if (messageTimer) clearTimeout(messageTimer)
  try {
    const response = await api('/admin/reward-rules')
    // BUG FIX -> guard null/undefined response
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
    activityLogs.value = []
  } finally {
    isLoadingActivity.value = false
  }
}

// ── Save ───────────────────────────────────────────────────────────────────
const saveRule = async (rule) => {
  adminMessage.value = ''
  if (!validateRule(rule)) return
  rule.isSaving = true
  try {
    await api(`/admin/reward-rules/${encodeURIComponent(rule.code)}`, 'PATCH', {
      cooldownDays: rule.cooldownDays,
      maxPer30Days: rule.maxPer30Days,
      maxPerDay:    rule.maxPerDay,
    })
    rule.isCustom = true
    showCardSuccess(rule.code)
    await loadActivityLogs()
  } catch (error) {
    setMessage(`Failed to update ${rule.name || rule.code}: ${error?.message || 'Request failed.'}`)
  } finally {
    rule.isSaving = false
  }
}

// ── Reset ──────────────────────────────────────────────────────────────────
const resetRule = async (rule) => {
  if (!rule.isCustom) return
  adminMessage.value = ''
  rule.isSaving = true
  try {
    await api(`/admin/reward-rules/${encodeURIComponent(rule.code)}`, 'DELETE')
    rule.cooldownDays = rule.defaultCooldownDays
    rule.maxPer30Days = rule.defaultMaxPer30Days
    rule.maxPerDay    = rule.defaultMaxPerDay
    rule.isCustom     = false
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
.reward-rules-page { max-width: 1024px; margin: 0 auto; padding: 20px; }

.reward-rules-content { display: flex; flex-direction: column; gap: 16px; }

/* ── Glass Card ── */
.card {
  border: 2px solid #021A54;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(2, 26, 84, 0.05);
  padding: 20px;
}

/* ── Header ── */
.page-header-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.page-kicker {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #FF85BB;
  margin: 0 0 4px;
}

.page-header-card h2 { font-size: clamp(1.6rem, 2.5vw, 2.2rem); margin: 0 0 4px; color: #021A54; }
.page-subtext { font-size: 0.9rem; color: rgba(2,26,84,0.7); font-weight: 600; margin: 0; }

/* ── Chips ── */
.chip {
  font-size: 0.88rem;
  font-weight: 800;
  padding: 8px 16px;
  border-radius: 8px;
  border: 2px solid #021A54;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 100ms;
}
.chip:active { transform: scale(0.95); }
.chip-strong { background: #FF85BB; color: #021A54; }
.chip-soft   { background: #F5F5F5; color: #021A54; }

/* ── Summary bar ── */
.summary-bar { display: flex; gap: 24px; flex-wrap: wrap; }
.summary-stat { display: flex; flex-direction: column; }
.summary-value { font-size: 1.8rem; font-weight: 800; color: #021A54; }
.summary-label { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #FF85BB; }

/* ── Global feedback ── */
.feedback-msg {
  margin: 0;
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 700;
  border: 2px solid;
}

.feedback-msg.error { background: #FFCEE3; border-color: #FF85BB; color: #021A54; }
.feedback-msg.ok    { background: rgba(34,134,82,0.08); border-color: rgba(34,134,82,0.3); color: #1a6b40; }

/* ── Skeleton ── */
.skeleton-card {
  height: 220px;
  background: linear-gradient(90deg, rgba(255,255,255,0.4) 25%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.4) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Empty state ── */
.empty-state { text-align: center; padding: 40px; }
.empty-icon  { font-size: 2.5rem; margin: 0 0 10px; }
.empty-text  { font-weight: 800; color: #021A54; margin: 0; }

/* ── Rules grid ── */
.rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
}

.rule-card { display: flex; flex-direction: column; gap: 14px; }

.rule-card--custom { border-left: 5px solid #FF85BB; }
.rule-card--default { border-left: 5px solid rgba(2,26,84,0.2); }

.rule-card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
}

.rule-code-badge {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #FF85BB;
  margin: 0 0 4px;
}

.rule-name { font-size: 1rem; font-weight: 800; color: #021A54; margin: 0 0 2px; }
.rule-desc { font-size: 0.82rem; color: rgba(2,26,84,0.7); font-weight: 600; margin: 0; }

.status-chip {
  font-size: 0.72rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 999px;
  border: 2px solid #021A54;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-chip.custom  { background: #FF85BB; color: #021A54; }
.status-chip.default { background: #F5F5F5; color: #021A54; }

/* ── Editor grid ── */
.editor-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.field { display: flex; flex-direction: column; gap: 6px; }

.field label {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  color: #FF85BB;
  text-align: center;
}

.num-input {
  width: 100%;
  border: 2px solid #021A54;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 1rem;
  font-weight: 800;
  color: #021A54;
  background: #F5F5F5;
  outline: none;
  text-align: center;
  box-sizing: border-box;
  appearance: textfield;
  -moz-appearance: textfield;
}

.num-input::-webkit-inner-spin-button,
.num-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }

.num-input:focus   { background: #fff; }
.num-input:disabled { opacity: 0.6; cursor: not-allowed; }
.input-error { border-color: #FF85BB !important; background: #FFCEE3 !important; }

.field-error {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 800;
  color: #FF85BB;
  text-align: center;
}

.default-hint {
  font-size: 0.8rem;
  color: rgba(2,26,84,0.75);
  font-weight: 600;
  margin: 0;
}

.card-success-msg {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 800;
  color: #021A54;
  background: #FF85BB;
  border: 2px solid #021A54;
  border-radius: 8px;
  padding: 6px 10px;
  text-align: center;
}

.card-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.btn-save, .btn-reset { flex: 1 1 auto; }

/* ── Audit panel ── */
.audit-panel { margin-top: 4px; }

.audit-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.audit-head h3 { margin: 0 0 4px; font-size: 1.2rem; font-weight: 800; color: #021A54; }
.audit-sub     { margin: 0; font-size: 0.85rem; font-weight: 600; color: rgba(2,26,84,0.7); }
.audit-empty   { font-size: 0.9rem; font-weight: 600; color: rgba(2,26,84,0.7); font-style: italic; margin: 0; }

.activity-list { display: flex; flex-direction: column; gap: 10px; }

.activity-item {
  padding: 12px 14px;
  border-radius: 12px;
  border: 2px solid #021A54;
  background: rgba(255,255,255,0.6);
}

.activity-item--update { border-left: 5px solid #FF85BB; }
.activity-item--reset  { border-left: 5px solid rgba(2,26,84,0.25); }

.activity-skeleton { display: flex; flex-direction: column; gap: 8px; pointer-events: none; }

.sk-line { height: 12px; border-radius: 6px; background: rgba(2,26,84,0.08); }
.sk-line.wide   { width: 70%; }
.sk-line.narrow { width: 45%; }

.activity-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}

.activity-action-badge {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
  border: 2px solid #021A54;
}

.badge-update { background: #FF85BB; color: #021A54; }
.badge-reset  { background: #F5F5F5; color: #021A54; }

.activity-time    { font-size: 0.78rem; font-weight: 700; color: rgba(2,26,84,0.8); }
.activity-by      { margin: 0 0 4px; font-size: 0.85rem; font-weight: 600; color: rgba(2,26,84,0.8); }
.activity-by strong { color: #021A54; }
.activity-details { margin: 0; font-size: 0.85rem; font-weight: 600; color: #021A54; }

/* ── Transitions ── */
.fade-slide-enter-active, .fade-slide-leave-active { transition: opacity 200ms ease, transform 200ms ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(-5px); }

/* ── Responsive ── */
@media (max-width: 980px) {
  .rules-grid { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .page-header-card { flex-direction: column; align-items: flex-start; }
  .editor-grid { grid-template-columns: repeat(2, 1fr); }
  .card-actions { flex-direction: column; }
  .btn-save, .btn-reset { width: 100%; justify-content: center; }
}

@media (max-width: 380px) {
  .editor-grid { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-card { animation: none; }
  .fade-slide-enter-active, .fade-slide-leave-active { transition: none; }
}
</style>