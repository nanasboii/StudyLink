<template>
  <main class="page-bg">
    <section class="phone-shell">
      <div class="view page active">
        <div class="header-row">
          <h2>Reward Rules</h2>
          <button class="chip" type="button" :disabled="isLoading" @click="loadRules">
            {{ isLoading ? 'Loading...' : 'Refresh' }}
          </button>
        </div>

        <p class="subtext">
          Update redeem limits without redeploying. Changes apply immediately for new redemption checks.
        </p>

        <p v-if="adminMessage" class="message" :class="{ ok: messageType === 'ok' }">
          {{ adminMessage }}
        </p>

        <div class="list">
          <div v-if="isLoading" class="empty-state">Loading reward rules...</div>
          <div v-else-if="rules.length === 0" class="empty-state">No rewards found.</div>

          <article v-else v-for="rule in rules" :key="rule.code" class="item">
            <div class="title-row">
              <strong>{{ rule.name }}</strong>
              <span class="pill" :class="{ inactive: !rule.isActive }">{{ rule.isActive ? 'Active' : 'Inactive' }}</span>
            </div>
            <div class="meta">Code: {{ rule.code }}</div>
            <div class="meta">Cost: {{ rule.pointsCost }} points</div>
            <div class="meta">{{ rule.description }}</div>

            <div class="editor-grid">
              <label>
                Cooldown (days)
                <input
                  type="number"
                  min="0"
                  step="1"
                  v-model.number="rule.cooldownDays"
                  :disabled="rule.isSaving"
                />
              </label>

              <label>
                Max in 30 days
                <input
                  type="number"
                  min="1"
                  step="1"
                  v-model.number="rule.maxPer30Days"
                  :disabled="rule.isSaving"
                />
              </label>

              <label>
                Max per day
                <input
                  type="number"
                  min="1"
                  step="1"
                  v-model.number="rule.maxPerDay"
                  :disabled="rule.isSaving"
                />
              </label>
            </div>

            <div class="actions">
              <button
                class="save-btn"
                type="button"
                :disabled="rule.isSaving"
                @click="saveRule(rule)"
              >
                {{ rule.isSaving ? 'Saving...' : 'Save rule' }}
              </button>
              <button
                class="reset-btn"
                type="button"
                :disabled="rule.isSaving || !rule.isCustom"
                @click="resetRule(rule)"
              >
                {{ rule.isSaving ? 'Working...' : 'Reset to defaults' }}
              </button>
            </div>
            <p class="default-hint">
              Default: {{ rule.defaultCooldownDays }}d cooldown, {{ rule.defaultMaxPer30Days }} in 30 days, {{ rule.defaultMaxPerDay }} per day.
            </p>
          </article>
        </div>

        <section class="audit-panel">
          <div class="audit-head">
            <h3>Recent Rule Activity</h3>
            <button class="chip" type="button" :disabled="isLoadingActivity" @click="loadActivityLogs">
              {{ isLoadingActivity ? 'Loading...' : 'Refresh' }}
            </button>
          </div>
          <p v-if="activityLogs.length === 0" class="empty-state">No reward rule updates yet.</p>
          <div v-else class="activity-list">
            <article v-for="entry in activityLogs" :key="entry.id" class="activity-item">
              <p class="activity-title">{{ entry.actionLabel }} by {{ entry.adminName }}</p>
              <p class="activity-meta">{{ formatDateTimeValue(entry.createdAt, 'Unknown time') }}</p>
              <p class="activity-details">
                {{ entry.rewardCode }}: {{ entry.cooldownDays }}d cooldown, {{ entry.maxPer30Days }} in 30 days, {{ entry.maxPerDay }} per day
              </p>
            </article>
          </div>
        </section>
      </div>
    </section>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { api, requireRoleSession } from '@/api.js';
import { formatDateTimeValue, normalizeRewardActivity, normalizeRewardRule } from '@/utils/records.js'

const rules = ref([]);
const isLoading = ref(true);
const adminMessage = ref('');
const messageType = ref('error');
const activityLogs = ref([]);
const isLoadingActivity = ref(false);

const loadRules = async () => {
  isLoading.value = true;
  adminMessage.value = '';

  try {
    const response = await api('/admin/reward-rules');
    rules.value = Array.isArray(response.rules)
      ? response.rules.map((item) => normalizeRewardRule(item))
      : [];
  } catch (error) {
    adminMessage.value = `Error loading reward rules: ${error.message}`;
    messageType.value = 'error';
    rules.value = [];
  } finally {
    isLoading.value = false;
  }
};

const loadActivityLogs = async () => {
  isLoadingActivity.value = true;
  try {
    const response = await api('/admin/activity-logs');
    const rows = Array.isArray(response.logs) ? response.logs : [];
    activityLogs.value = rows
      .filter((entry) => ['reward_rule_updated', 'reward_rule_reset'].includes(String(entry.action || '')))
      .slice(0, 20)
      .map((entry) => normalizeRewardActivity(entry));
  } catch {
    activityLogs.value = [];
  } finally {
    isLoadingActivity.value = false;
  }
};

const saveRule = async (rule) => {
  adminMessage.value = '';

  if (!Number.isInteger(rule.cooldownDays) || rule.cooldownDays < 0) {
    adminMessage.value = `Cooldown must be an integer >= 0 for ${rule.name}.`;
    messageType.value = 'error';
    return;
  }

  if (!Number.isInteger(rule.maxPer30Days) || rule.maxPer30Days <= 0) {
    adminMessage.value = `30-day limit must be an integer > 0 for ${rule.name}.`;
    messageType.value = 'error';
    return;
  }

  if (!Number.isInteger(rule.maxPerDay) || rule.maxPerDay <= 0) {
    adminMessage.value = `Daily limit must be an integer > 0 for ${rule.name}.`;
    messageType.value = 'error';
    return;
  }

  rule.isSaving = true;

  try {
    await api(`/admin/reward-rules/${encodeURIComponent(rule.code)}`, 'PATCH', {
      cooldownDays: rule.cooldownDays,
      maxPer30Days: rule.maxPer30Days,
      maxPerDay: rule.maxPerDay
    });

    adminMessage.value = `Updated rules for ${rule.name}.`;
    messageType.value = 'ok';
    rule.isCustom = true;
    await loadActivityLogs();
  } catch (error) {
    adminMessage.value = `Failed to update ${rule.name}: ${error.message}`;
    messageType.value = 'error';
  } finally {
    rule.isSaving = false;
  }
};

const resetRule = async (rule) => {
  adminMessage.value = '';
  rule.isSaving = true;

  try {
    await api(`/admin/reward-rules/${encodeURIComponent(rule.code)}`, 'DELETE');
    rule.cooldownDays = rule.defaultCooldownDays;
    rule.maxPer30Days = rule.defaultMaxPer30Days;
    rule.maxPerDay = rule.defaultMaxPerDay;
    rule.isCustom = false;
    adminMessage.value = `Reset ${rule.name} to default rules.`;
    messageType.value = 'ok';
    await loadActivityLogs();
  } catch (error) {
    adminMessage.value = `Failed to reset ${rule.name}: ${error.message}`;
    messageType.value = 'error';
  } finally {
    rule.isSaving = false;
  }
};

onMounted(() => {
  requireRoleSession('admin');
  loadRules();
  loadActivityLogs();
});
</script>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.subtext {
  color: var(--ink-soft);
  margin: 6px 0 14px;
}

.item {
  border-left: 5px solid var(--primary);
  padding: 12px;
  margin-bottom: 12px;
  background: var(--surface);
  border-radius: 0 8px 8px 0;
  box-shadow: 0 2px 6px rgba(177, 31, 75, 0.06);
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.pill {
  font-size: 12px;
  font-weight: 700;
  color: var(--success-ink);
  background: var(--success-bg);
  border-radius: 999px;
  padding: 3px 10px;
}

.pill.inactive {
  color: var(--danger-ink);
  background: var(--danger-bg);
}

.meta {
  color: var(--ink-soft);
  font-size: 0.9rem;
  margin-top: 4px;
}

.editor-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(120px, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.list {
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  align-items: start;
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--ink);
}

input {
  border: 1px solid var(--hairline);
  border-radius: 8px;
  padding: 8px;
}

.actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.save-btn {
  border: 0;
  border-radius: 8px;
  background: var(--primary);
  color: #ffffff;
  font-weight: 700;
  padding: 8px 12px;
  cursor: pointer;
}

.reset-btn {
  border: 1px solid var(--hairline);
  border-radius: 8px;
  background: var(--surface);
  color: var(--ink);
  font-weight: 700;
  padding: 8px 12px;
  cursor: pointer;
}

.save-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.reset-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.default-hint {
  margin: 10px 0 0;
  color: var(--ink-muted);
  font-size: 0.82rem;
}

.audit-panel {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--hairline);
}

.audit-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.audit-head h3 {
  margin: 0;
  color: var(--ink);
}

.activity-list {
  display: grid;
  gap: 8px;
}

.activity-item {
  border: 1px solid var(--hairline);
  border-radius: 10px;
  padding: 10px;
  background: var(--surface-soft-alt);
}

.activity-title {
  margin: 0;
  color: var(--ink);
  font-weight: 700;
}

.activity-meta {
  margin: 4px 0 0;
  color: var(--ink-muted);
  font-size: 0.83rem;
}

.activity-details {
  margin: 6px 0 0;
  color: var(--ink-soft);
  font-size: 0.88rem;
}

.message {
  color: var(--danger-ink);
  font-weight: 600;
  margin-bottom: 8px;
}

.message.ok {
  color: var(--success-ink);
}

.page-bg {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(180deg, var(--canvas), var(--canvas-parchment));
}

.phone-shell {
  width: min(1120px, 100%);
  padding-inline: 12px;
  margin: 0 auto;
}

@media (max-width: 980px) {
  .list {
    grid-template-columns: 1fr;
  }

  .editor-grid {
    grid-template-columns: repeat(2, minmax(120px, 1fr));
  }
}

@media (max-width: 720px) {
  .editor-grid {
    grid-template-columns: 1fr;
  }

  .header-row,
  .title-row,
  .audit-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
