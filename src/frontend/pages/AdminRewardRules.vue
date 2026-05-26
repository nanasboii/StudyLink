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
  color: #66707a;
  margin: 6px 0 14px;
}

.item {
  border-left: 5px solid #2d5b87;
  padding: 12px;
  margin-bottom: 12px;
  background: #ffffff;
  border-radius: 0 8px 8px 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
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
  color: #1f7a4d;
  background: #e8f6ee;
  border-radius: 999px;
  padding: 3px 10px;
}

.pill.inactive {
  color: #7a1f1f;
  background: #fdeaea;
}

.meta {
  color: #4e5964;
  font-size: 0.9rem;
  margin-top: 4px;
}

.editor-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(120px, 1fr));
  gap: 10px;
  margin-top: 12px;
}

label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
  color: #394450;
}

input {
  border: 1px solid #c9d3de;
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
  background: #1d6b42;
  color: #ffffff;
  font-weight: 700;
  padding: 8px 12px;
  cursor: pointer;
}

.reset-btn {
  border: 1px solid #d7dfe8;
  border-radius: 8px;
  background: #ffffff;
  color: #344657;
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
  color: #6f7983;
  font-size: 0.82rem;
}

.audit-panel {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #e3e8ed;
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
  color: #2d3f4f;
}

.activity-list {
  display: grid;
  gap: 8px;
}

.activity-item {
  border: 1px solid #e4e8ed;
  border-radius: 10px;
  padding: 10px;
  background: #fbfdff;
}

.activity-title {
  margin: 0;
  color: #233547;
  font-weight: 700;
}

.activity-meta {
  margin: 4px 0 0;
  color: #6a7886;
  font-size: 0.83rem;
}

.activity-details {
  margin: 6px 0 0;
  color: #4b5b6a;
  font-size: 0.88rem;
}

.message {
  color: #b63830;
  font-weight: 600;
  margin-bottom: 8px;
}

.message.ok {
  color: #1e6a3f;
}

.page-bg {
  min-height: 100vh;
  padding: 20px;
  background-color: #f5f7fa;
}

.phone-shell {
  max-width: 720px;
  margin: 0 auto;
}

@media (max-width: 720px) {
  .editor-grid {
    grid-template-columns: 1fr;
  }
}
</style>
