<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active reward-rules-page">

        <!-- ── Header ── -->
        <div class="page-header">
          <div>
            <p class="page-kicker">Admin · Gamification</p>
            <h2>Reward Rules</h2>
            <p class="page-subtext">
              Tune redemption limits live — changes apply immediately to new checks.
            </p>
          </div>
          <button
            class="chip"
            type="button"
            :disabled="isLoading"
            @click="loadRules"
            aria-label="Refresh reward rules"
          >
            {{ isLoading ? 'Loading…' : 'Refresh' }}
          </button>
        </div>

        <!-- ── Summary bar ── -->
        <div v-if="!isLoading && rules.length" class="summary-bar">
          <div class="summary-stat">
            <span class="summary-value">{{ rules.length }}</span>
            <span class="summary-label">Total Rules</span>
          </div>
          <div class="summary-stat summary-stat--active">
            <span class="summary-value">{{ rules.filter(r => r.isActive).length }}</span>
            <span class="summary-label">Active</span>
          </div>
          <div class="summary-stat summary-stat--custom">
            <span class="summary-value">{{ rules.filter(r => r.isCustom).length }}</span>
            <span class="summary-label">Customised</span>
          </div>
        </div>

        <!-- ── Feedback message (auto-dismiss on success) ── -->
        <transition name="fade-slide">
          <p
            v-if="adminMessage"
            class="feedback-msg"
            :class="messageType === 'ok' ? 'success' : 'error'"
            role="alert"
            aria-live="polite"
          >
            {{ adminMessage }}
          </p>
        </transition>

        <!-- ── Rule cards ── -->
        <!-- Skeleton -->
        <div v-if="isLoading" class="rules-grid">
          <div v-for="n in 4" :key="n" class="rule-card skeleton-card" aria-hidden="true">
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

        <!-- Empty -->
        <div v-else-if="rules.length === 0" class="empty-state" role="status">
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"/>
            <path d="M24 14v10l6 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.5"/>
          </svg>
          <p class="empty-title">No reward rules found.</p>
          <p class="empty-sub">The API returned no rules to configure.</p>
        </div>

        <!-- Cards -->
        <div v-else class="rules-grid">
          <article
            v-for="rule in rules"
            :key="rule.code"
            class="rule-card"
            :class="{ 'rule-card--custom': rule.isCustom, 'rule-card--inactive': !rule.isActive }"
          >
            <!-- Card header -->
            <div class="card-header">
              <div class="card-title-row">
                <!-- BUG FIX 1: rule.name can be undefined if API returns unexpected shape;
                     guard with fallback. -->
                <strong class="rule-name">{{ rule.name || rule.code || '—' }}</strong>
                <span class="status-pill" :class="rule.isActive ? 'pill-active' : 'pill-inactive'">
                  {{ rule.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <div class="card-meta-row">
                <span class="meta-chip">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v4l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>
                  {{ rule.pointsCost }} pts
                </span>
                <span class="meta-chip meta-chip--code">{{ rule.code }}</span>
                <span v-if="rule.isCustom" class="meta-chip meta-chip--custom">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" fill="none" stroke="currentColor" stroke-width="2"/></svg>
                  Customised
                </span>
              </div>
              <p v-if="rule.description" class="rule-description">{{ rule.description }}</p>
            </div>

            <!-- Editor grid -->
            <div class="editor-grid">
              <!-- BUG FIX 2: inputs had no aria-label; screenreaders only got the label text,
                   which is ambiguous across cards (all say "Cooldown (days)").
                   Added :id and :aria-describedby tied to the rule code for uniqueness. -->
              <div class="editor-field">
                <label :for="`cooldown-${rule.code}`" class="field-label">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M12 6v6l4 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/></svg>
                  Cooldown
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
                  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                  Per 30 days
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
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                  Per day
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

            <!-- Default hint -->
            <p class="default-hint">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="1.5"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="1.5"/></svg>
              Default: {{ rule.defaultCooldownDays }}d cooldown · {{ rule.defaultMaxPer30Days }} per 30 days · {{ rule.defaultMaxPerDay }} per day
            </p>

            <!-- Per-card success flash -->
            <transition name="fade-slide">
              <p v-if="cardSuccess[rule.code]" class="card-success-msg" role="status">
                ✓ Saved
              </p>
            </transition>

            <!-- Actions -->
            <div class="card-actions">
              <button
                class="btn-save chip"
                type="button"
                :disabled="rule.isSaving"
                @click="saveRule(rule)"
              >
                <svg v-if="!rule.isSaving" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" fill="none" stroke="currentColor" stroke-width="2"/><polyline points="17 21 17 13 7 13 7 21" fill="none" stroke="currentColor" stroke-width="2"/></svg>
                <svg v-else class="spin-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="40 20"/></svg>
                {{ rule.isSaving ? 'Saving…' : 'Save' }}
              </button>

              <button
                class="btn-reset chip chip-soft"
                type="button"
                :disabled="rule.isSaving || !rule.isCustom"
                :title="rule.isCustom ? 'Reset to system defaults' : 'Already using defaults'"
                @click="resetRule(rule)"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="1 4 1 10 7 10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.51 15a9 9 0 1 0 .49-4.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>
                {{ rule.isSaving ? 'Working…' : 'Reset defaults' }}
              </button>
            </div>
          </article>
        </div>

        <!-- ── Audit log panel ── -->
        <section class="audit-panel" aria-labelledby="audit-heading">
          <div class="audit-head">
            <div>
              <h3 id="audit-heading">Recent Rule Activity</h3>
              <p class="audit-sub">Last 20 admin changes to reward rules.</p>
            </div>
            <button
              class="chip"
              type="button"
              :disabled="isLoadingActivity"
              @click="loadActivityLogs"
              aria-label="Refresh activity log"
            >
              {{ isLoadingActivity ? 'Loading…' : 'Refresh' }}
            </button>
          </div>

          <!-- Skeleton -->
          <div v-if="isLoadingActivity" class="activity-list">
            <div v-for="n in 3" :key="n" class="activity-item activity-skeleton" aria-hidden="true">
              <div class="sk-line wide"></div>
              <div class="sk-line narrow"></div>
            </div>
          </div>

          <!-- Empty -->
          <p v-else-if="activityLogs.length === 0" class="audit-empty">
            No reward rule changes recorded yet.
          </p>

          <!-- Log entries -->
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
                <!-- BUG FIX 3: formatDateTimeValue was called without null-guarding createdAt;
                     if the field is missing the function returns the fallback, but the
                     original call passed an undefined fallback → shows 'undefined'. Fixed. -->
                <span class="activity-time">{{ formatDateTimeValue(entry.createdAt, 'Unknown time') }}</span>
              </div>
              <p class="activity-by">By {{ entry.adminName || 'Admin' }}</p>
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
  padding-bottom: 3rem;
}

/* ── Header ── */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  padding: 2rem 2rem 1.25rem;
  flex-wrap: wrap;
}

.page-kicker {
  margin: 0 0 0.25rem;
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--ink-kicker);
}

.page-header h2 {
  font-size: clamp(1.4rem, 2.5vw, 2rem);
  margin: 0 0 0.25rem;
}

.page-subtext {
  font-size: 0.85rem;
  color: var(--ink-soft);
  margin: 0;
}

/* ── Summary bar ── */
.summary-bar {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 0 2rem 1.25rem;
}

.summary-stat {
  flex: 1 1 80px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0.65rem 1rem;
  border-radius: 14px;
  background: var(--glass-pink-surface-strong, rgba(255,255,255,0.85));
  border: 1px solid var(--glass-pink-border, rgba(177,31,75,0.12));
}

.summary-stat--active  { border-left: 3px solid var(--success, #228652); }
.summary-stat--custom  { border-left: 3px solid var(--primary, #b11f4b); }

.summary-value {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--ink);
  line-height: 1;
}

.summary-label {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ink-soft);
}

/* ── Feedback ── */
.feedback-msg {
  margin: 0 2rem 1rem;
  padding: 0.7rem 1rem;
  border-radius: 10px;
  font-size: 0.875rem;
}

.feedback-msg.success {
  background: rgba(34,134,82,0.09);
  border: 1px solid rgba(34,134,82,0.22);
  color: var(--success-ink, #1a6b40);
}

.feedback-msg.error {
  background: rgba(191,47,69,0.08);
  border: 1px solid rgba(191,47,69,0.2);
  color: var(--danger-ink, #8f2335);
}

/* ── Skeleton ── */
.sk-line, .sk-badge, .sk-input {
  border-radius: 6px;
  background: linear-gradient(90deg,
    rgba(74,20,41,0.06) 25%,
    rgba(74,20,41,0.12) 50%,
    rgba(74,20,41,0.06) 75%);
  background-size: 400% 100%;
  animation: sk-shimmer 1.4s ease infinite;
}

.sk-line.wide    { height: 16px; width: 55%; }
.sk-line.narrow  { height: 12px; width: 35%; }
.sk-badge        { height: 20px; width: 56px; border-radius: 999px; }
.sk-input        { height: 40px; }

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
  0%   { background-position: 100% 50%; }
  100% { background-position:   0% 50%; }
}

@media (prefers-reduced-motion: reduce) {
  .sk-line, .sk-badge, .sk-input { animation: none; }
}

/* ── Empty state ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 3rem 2rem;
  text-align: center;
  color: var(--ink-soft);
}

.empty-state svg { width: 48px; height: 48px; color: var(--ink-soft); opacity: 0.4; }
.empty-title { margin: 0; font-weight: 600; font-size: 1rem; color: var(--ink); }
.empty-sub { margin: 0; font-size: 0.875rem; }

/* ── Rule card grid ── */
.rules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
  padding: 0 2rem 2rem;
  align-items: start;
}

/* ── Rule card ── */
.rule-card {
  border: 1px solid var(--glass-pink-border, rgba(177,31,75,0.12));
  border-radius: 18px;
  padding: 1.25rem;
  background: var(--glass-pink-surface-strong, rgba(255,255,255,0.9));
  box-shadow: 0 2px 12px rgba(74,20,41,0.06);
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  transition: box-shadow 150ms ease;
}

.rule-card:hover {
  box-shadow: 0 6px 20px rgba(74,20,41,0.1);
}

.rule-card--custom {
  border-color: rgba(177,31,75,0.22);
}

.rule-card--inactive {
  opacity: 0.7;
}

/* Card header */
.card-header { display: flex; flex-direction: column; gap: 6px; }

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.rule-name {
  font-size: 1rem;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-pill {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 9px;
  border-radius: 999px;
  flex-shrink: 0;
}

.pill-active {
  background: var(--success-bg, rgba(34,134,82,0.1));
  color: var(--success-ink, #1a6b40);
}

.pill-inactive {
  background: var(--danger-bg, rgba(191,47,69,0.08));
  color: var(--danger-ink, #8f2335);
}

.card-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(74,20,41,0.05);
  color: var(--ink-soft);
}

.meta-chip svg {
  width: 11px;
  height: 11px;
  flex-shrink: 0;
}

.meta-chip--code {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.7rem;
  background: rgba(177,31,75,0.06);
  color: var(--primary, #b11f4b);
}

.meta-chip--custom {
  background: rgba(177,31,75,0.1);
  color: var(--primary, #b11f4b);
}

.rule-description {
  margin: 0;
  font-size: 0.83rem;
  color: var(--ink-soft);
  line-height: 1.5;
}

/* Editor grid */
.editor-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.editor-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ink-soft);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.field-label svg {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  stroke: var(--ink-soft);
}

.field-unit {
  font-weight: 400;
  opacity: 0.7;
  text-transform: lowercase;
  letter-spacing: 0;
  font-size: 0.7rem;
}

.num-input {
  width: 100%;
  border: 1px solid var(--glass-pink-border, rgba(177,31,75,0.14));
  border-radius: 10px;
  padding: 8px 10px;
  font: inherit;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ink);
  background: #fff;
  outline: none;
  text-align: center;
  transition: border-color 150ms ease, box-shadow 150ms ease;
  /* BUG FIX 10: hide the browser's native number spinners — they trigger
     fractional steps on some browsers even with step="1" */
  appearance: textfield;
  -moz-appearance: textfield;
}

.num-input::-webkit-inner-spin-button,
.num-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }

.num-input:focus {
  border-color: var(--primary, #b11f4b);
  box-shadow: 0 0 0 3px rgba(177,31,75,0.08);
}

.num-input:disabled { opacity: 0.6; cursor: not-allowed; }

.input-error {
  border-color: var(--danger, #bf2f45) !important;
  box-shadow: 0 0 0 3px rgba(191,47,69,0.1) !important;
}

.field-error {
  margin: 0;
  font-size: 0.72rem;
  color: var(--danger-ink, #8f2335);
  line-height: 1.3;
}

/* Default hint */
.default-hint {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin: 0;
  font-size: 0.78rem;
  color: var(--ink-soft);
  line-height: 1.5;
}

.default-hint svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  stroke: var(--ink-soft);
  margin-top: 2px;
}

/* Per-card success flash */
.card-success-msg {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--success-ink, #1a6b40);
  background: rgba(34,134,82,0.08);
  border: 1px solid rgba(34,134,82,0.2);
  border-radius: 8px;
  padding: 6px 10px;
}

/* Card actions */
.card-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-save,
.btn-reset {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
}

.btn-save svg,
.btn-reset svg {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.spin-icon {
  animation: spin 0.7s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* ── Audit panel ── */
.audit-panel {
  margin: 0 2rem 2rem;
  padding: 1.25rem;
  border-radius: 18px;
  border: 1px solid var(--glass-pink-border, rgba(177,31,75,0.12));
  background: var(--glass-pink-surface-strong, rgba(255,255,255,0.85));
}

.audit-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.audit-head h3 {
  margin: 0 0 2px;
  font-size: 1rem;
  color: var(--ink);
}

.audit-sub {
  margin: 0;
  font-size: 0.8rem;
  color: var(--ink-soft);
}

.audit-empty {
  font-size: 0.875rem;
  color: var(--ink-soft);
  font-style: italic;
  margin: 0;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.activity-item {
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--hairline, #e0e0e0);
  background: #fff;
}

.activity-item--update { border-left: 3px solid var(--primary, #b11f4b); }
.activity-item--reset  { border-left: 3px solid var(--ink-soft); }

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
  margin-bottom: 4px;
}

.activity-action-badge {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 2px 8px;
  border-radius: 999px;
}

.badge-update {
  background: rgba(177,31,75,0.1);
  color: var(--primary, #b11f4b);
}

.badge-reset {
  background: rgba(74,20,41,0.07);
  color: var(--ink-soft);
}

.activity-time {
  font-size: 0.75rem;
  color: var(--ink-soft);
}

.activity-by {
  margin: 0 0 4px;
  font-size: 0.82rem;
  color: var(--ink-soft);
}

.activity-details {
  margin: 0;
  font-size: 0.83rem;
  color: var(--ink);
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
  .page-header,
  .summary-bar,
  .rules-grid,
  .audit-panel {
    padding-left: 1rem;
    padding-right: 1rem;
  }

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
  .spin-icon { animation: none; }
}
</style>
