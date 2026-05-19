<template>
  <main class="view page active messages-page">
    <!-- Sidebar -->
    <aside class="conversations-sidebar">
      <div class="sidebar-header">
        <h2>Messages</h2>
        <div class="sidebar-actions">
          <button class="action-btn support-btn" @click="openSupport" title="Contact Support">
            🎧 Support
          </button>
          <button class="action-btn new-btn" @click="showNewChat = true" title="New Message">
            ✏️
          </button>
        </div>
      </div>

      <div v-if="conversations.length === 0 && !loadingConvs" class="empty-convs">
        <p>No conversations yet.</p>
        <p class="empty-hint">Start one with a tutor or tutee, or contact support.</p>
      </div>

      <ul class="conv-list">
        <li
          v-for="conv in conversations"
          :key="conv.id"
          class="conv-item"
          :class="{ active: activeConvId === conv.id, support: conv.is_support }"
          @click="openConversation(conv)"
        >
          <div class="conv-avatar" :class="{ 'support-avatar': conv.is_support }">
            <img
              v-if="conv.other_user?.profilePicture"
              :src="conv.other_user.profilePicture"
              :alt="convDisplayName(conv)"
              @error="e => e.target.style.display='none'"
            />
            <span v-else>{{ convInitials(conv) }}</span>
          </div>
          <div class="conv-info">
            <div class="conv-top">
              <span class="conv-name">{{ convDisplayName(conv) }}</span>
              <span class="conv-time">{{ formatTime(conv.updated_at) }}</span>
            </div>
            <div class="conv-bottom">
              <span class="conv-last">{{ conv.last_message || 'No messages yet' }}</span>
              <span v-if="conv.unread_count > 0" class="unread-badge">{{ conv.unread_count }}</span>
            </div>
          </div>
        </li>
      </ul>
    </aside>

    <!-- Chat panel -->
    <section class="chat-panel" v-if="activeConv">
      <div class="chat-header">
        <div class="chat-header-avatar" :class="{ 'support-avatar': activeConv.is_support }">
          <img
            v-if="activeConv.other_user?.profilePicture"
            :src="activeConv.other_user.profilePicture"
            :alt="convDisplayName(activeConv)"
            @error="e => e.target.style.display='none'"
          />
          <span v-else>{{ convInitials(activeConv) }}</span>
        </div>
        <div class="chat-header-info">
          <h3>{{ convDisplayName(activeConv) }}</h3>
          <span class="chat-role" v-if="activeConv.other_user?.role">{{ activeConv.other_user.role }}</span>
          <span class="chat-role support-label" v-if="activeConv.is_support">{{ isAdmin ? 'Support Contact' : 'Support Team' }}</span>
        </div>
      </div>

      <div class="messages-list" ref="messagesList">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message-bubble-wrap"
          :class="{ mine: msg.sender.id === currentUserId }"
        >
          <div class="bubble" :class="{ 'bubble-mine': msg.sender.id === currentUserId }">
            <p class="bubble-text">{{ msg.content }}</p>
            <span class="bubble-time">{{ formatTime(msg.created_at) }}</span>
          </div>
        </div>
        <div v-if="messages.length === 0" class="no-messages">
          <p>Say hello! 👋</p>
        </div>
      </div>

      <form class="message-input-bar" @submit.prevent="sendMessage">
        <input
          v-model="newMessage"
          class="message-input"
          placeholder="Type a message…"
          maxlength="2000"
          autocomplete="off"
          :disabled="sending"
        />
        <button type="submit" class="send-btn" :disabled="!newMessage.trim() || sending">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </form>
    </section>

    <!-- Empty state when no conv selected -->
    <section class="chat-empty" v-else>
      <div class="chat-empty-inner">
        <div class="empty-icon">💬</div>
        <h3>Your Messages</h3>
        <p>Select a conversation on the left, or start a new one.</p>
        <div class="empty-btns">
          <button class="btn-primary" @click="showNewChat = true">New Message</button>
          <button class="btn-support" @click="openSupport">Contact Support</button>
        </div>
      </div>
    </section>

    <!-- New conversation modal -->
    <Transition name="modal-fade">
      <div v-if="showNewChat" class="modal-backdrop" @click.self="showNewChat = false">
        <div class="modal-card" role="dialog" aria-modal="true">
          <button class="modal-close" @click="showNewChat = false">&times;</button>
          <h3>New Message</h3>
          <p class="modal-sub">Search for a tutor or tutee to start a conversation.</p>
          <input
            v-model="searchQuery"
            class="search-input"
            placeholder="Search by name…"
            @input="onSearch"
            autocomplete="off"
          />
          <ul class="search-results" v-if="searchResults.length">
            <li
              v-for="user in searchResults"
              :key="user.id"
              class="search-result-item"
              @click="startConversation(user)"
            >
              <div class="result-avatar">{{ (user.full_name || '?')[0].toUpperCase() }}</div>
              <div class="result-info">
                <p class="result-name">{{ user.full_name }}</p>
                <p class="result-role">{{ user.role }}</p>
              </div>
            </li>
          </ul>
          <p v-else-if="searchQuery.length >= 2 && !searching" class="no-results">No users found.</p>
        </div>
      </div>
    </Transition>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { api, getUser } from '@/api.js'

const currentUser = getUser()
const currentUserId = currentUser?.id

const conversations = ref([])
const loadingConvs = ref(true)
const activeConvId = ref(null)
const activeConv = computed(() => conversations.value.find(c => c.id === activeConvId.value) || null)

const messages = ref([])
const newMessage = ref('')
const sending = ref(false)
const messagesList = ref(null)

const showNewChat = ref(false)
const searchQuery = ref('')
const searchResults = ref([])
const searching = ref(false)

let pollTimer = null

const isAdmin = currentUser?.role === 'admin'

const convDisplayName = (conv) => {
  if (conv.is_support && isAdmin) return conv.other_user?.fullName || 'Support Contact'
  if (conv.is_support) return 'StudyLink Support'
  return conv.other_user?.fullName || 'Unknown User'
}

const convInitials = (conv) => {
  if (conv.is_support && isAdmin) {
    const name = conv.other_user?.fullName || '?'
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }
  if (conv.is_support) return '🎧'
  const name = conv.other_user?.fullName || '?'
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const formatTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now - date) / 86400000)
  if (diffDays === 0) return date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return date.toLocaleDateString('en-MY', { weekday: 'short' })
  return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesList.value) {
    messagesList.value.scrollTop = messagesList.value.scrollHeight
  }
}

const loadConversations = async () => {
  try {
    const data = await api('/conversations')
    conversations.value = data.conversations || []
  } finally {
    loadingConvs.value = false
  }
}

const openConversation = async (conv) => {
  activeConvId.value = conv.id
  messages.value = []
  await loadMessages(conv.id)
  conv.unread_count = 0
  startPolling()
}

const loadMessages = async (convId) => {
  const data = await api(`/conversations/${convId}/messages`)
  messages.value = data.messages || []
  await scrollToBottom()
}

const sendMessage = async () => {
  if (!newMessage.value.trim() || !activeConvId.value || sending.value) return
  const content = newMessage.value.trim()
  newMessage.value = ''
  sending.value = true
  try {
    await api(`/conversations/${activeConvId.value}/messages`, 'POST', { content })
    await loadMessages(activeConvId.value)
    await loadConversations()
  } finally {
    sending.value = false
  }
}

const openSupport = async () => {
  showNewChat.value = false
  try {
    const data = await api('/conversations/support', 'POST')
    await loadConversations()
    const conv = conversations.value.find(c => c.id === data.conversationId)
    if (conv) openConversation(conv)
    else {
      activeConvId.value = data.conversationId
      await loadMessages(data.conversationId)
    }
  } catch {}
}

const startPolling = () => {
  stopPolling()
  pollTimer = setInterval(async () => {
    if (activeConvId.value) {
      await loadMessages(activeConvId.value)
      await loadConversations()
    }
  }, 4000)
}

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

let searchTimeout = null
const onSearch = () => {
  clearTimeout(searchTimeout)
  if (searchQuery.value.length < 2) { searchResults.value = []; return }
  searchTimeout = setTimeout(async () => {
    searching.value = true
    try {
      const data = await api(`/users/search?q=${encodeURIComponent(searchQuery.value)}`)
      searchResults.value = data.users || []
    } finally {
      searching.value = false
    }
  }, 300)
}

const startConversation = async (user) => {
  showNewChat.value = false
  searchQuery.value = ''
  searchResults.value = []
  try {
    const data = await api('/conversations', 'POST', { userId: user.id })
    await loadConversations()
    const conv = conversations.value.find(c => c.id === data.conversationId)
    if (conv) openConversation(conv)
  } catch {}
}

onMounted(loadConversations)
onUnmounted(stopPolling)

watch(showNewChat, (val) => {
  if (!val) { searchQuery.value = ''; searchResults.value = [] }
})
</script>

<style scoped>
.messages-page {
  display: flex;
  height: calc(100vh - 60px);
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
  gap: 0;
  overflow: hidden;
}

/* ── Sidebar ── */
.conversations-sidebar {
  width: 320px;
  flex-shrink: 0;
  border-right: 1px solid #f1cdd9;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #fffefe 0%, #fff7fa 100%);
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 16px 12px;
  border-bottom: 1px solid #f1cdd9;
  flex-shrink: 0;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #3a0f22;
}

.sidebar-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #f1cdd9;
  background: #fff;
  font-size: 0.78rem;
  cursor: pointer;
  color: #5b1a35;
  font-weight: 600;
  transition: background 0.15s;
}

.action-btn:hover { background: #fdf4f7; }

.conv-list {
  list-style: none;
  margin: 0;
  padding: 8px 0;
  overflow-y: auto;
  flex: 1;
}

.conv-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  border-radius: 10px;
  margin: 2px 8px;
  transition: background 0.15s;
}

.conv-item:hover { background: #fdf4f7; }
.conv-item.active { background: #f8e4ec; }

.conv-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c0304f, #8d1c42);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
  overflow: hidden;
}

.conv-avatar img { width: 100%; height: 100%; object-fit: cover; }
.support-avatar { background: linear-gradient(135deg, #2c7a5a, #1a5c42); }

.conv-info { flex: 1; min-width: 0; }

.conv-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 6px;
}

.conv-name {
  font-weight: 600;
  font-size: 0.88rem;
  color: #3a0f22;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conv-time {
  font-size: 0.72rem;
  color: #9e7080;
  flex-shrink: 0;
}

.conv-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-top: 2px;
}

.conv-last {
  font-size: 0.78rem;
  color: #9e7080;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.unread-badge {
  background: #8d1c42;
  color: #fff;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 1px 6px;
  flex-shrink: 0;
}

.empty-convs {
  padding: 32px 20px;
  text-align: center;
  color: #9e7080;
  font-size: 0.87rem;
}

.empty-hint { font-size: 0.78rem; margin-top: 6px; }

/* ── Chat panel ── */
.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid #f1cdd9;
  flex-shrink: 0;
}

.chat-header-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c0304f, #8d1c42);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
  overflow: hidden;
}

.chat-header-avatar img { width: 100%; height: 100%; object-fit: cover; }

.chat-header-info h3 {
  margin: 0;
  font-size: 0.95rem;
  color: #3a0f22;
}

.chat-role {
  font-size: 0.75rem;
  color: #9e7080;
  text-transform: capitalize;
}

.support-label { color: #2c7a5a; font-weight: 600; }

.messages-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message-bubble-wrap {
  display: flex;
  justify-content: flex-start;
}

.message-bubble-wrap.mine {
  justify-content: flex-end;
}

.bubble {
  max-width: 65%;
  background: #f5e6ed;
  border-radius: 14px 14px 14px 4px;
  padding: 10px 14px 6px;
}

.bubble-mine {
  background: #8d1c42;
  border-radius: 14px 14px 4px 14px;
}

.bubble-text {
  margin: 0 0 4px;
  font-size: 0.88rem;
  color: #3a0f22;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.45;
}

.bubble-mine .bubble-text { color: #fff; }

.bubble-time {
  font-size: 0.68rem;
  color: #9e7080;
  display: block;
  text-align: right;
}

.bubble-mine .bubble-time { color: rgba(255,255,255,0.65); }

.no-messages {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9e7080;
  font-size: 0.9rem;
}

.message-input-bar {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid #f1cdd9;
  flex-shrink: 0;
  background: #fff;
}

.message-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #f1cdd9;
  border-radius: 22px;
  font-size: 0.88rem;
  outline: none;
  background: #fdf4f7;
  color: #3a0f22;
  transition: border-color 0.15s;
}

.message-input:focus { border-color: #c0304f; }

.send-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: #8d1c42;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
}

.send-btn:hover:not(:disabled) { background: #6e1534; }
.send-btn:disabled { background: #d4a0b0; cursor: not-allowed; }
.send-btn svg { width: 18px; height: 18px; }

/* ── Empty state ── */
.chat-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fffbfd;
}

.chat-empty-inner {
  text-align: center;
  max-width: 340px;
}

.empty-icon { font-size: 3.5rem; margin-bottom: 16px; }

.chat-empty-inner h3 {
  margin: 0 0 8px;
  font-size: 1.3rem;
  color: #3a0f22;
}

.chat-empty-inner p {
  color: #9e7080;
  font-size: 0.9rem;
  margin: 0 0 24px;
}

.empty-btns {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-primary {
  padding: 9px 22px;
  border-radius: 9px;
  border: none;
  background: #8d1c42;
  color: #fff;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-primary:hover { background: #6e1534; }

.btn-support {
  padding: 9px 22px;
  border-radius: 9px;
  border: 1px solid #2c7a5a;
  background: #fff;
  color: #2c7a5a;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-support:hover { background: #edf7f2; }

/* ── New chat modal ── */
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
  padding: 28px 24px;
  max-width: 420px;
  width: 90%;
  position: relative;
  box-shadow: 0 20px 50px rgba(141, 28, 66, 0.2);
}

.modal-card h3 {
  margin: 0 0 4px;
  font-size: 1.1rem;
  color: #3a0f22;
}

.modal-sub {
  margin: 0 0 16px;
  font-size: 0.85rem;
  color: #9e7080;
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

.search-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #f1cdd9;
  border-radius: 10px;
  font-size: 0.88rem;
  outline: none;
  box-sizing: border-box;
  background: #fdf4f7;
}

.search-input:focus { border-color: #c0304f; }

.search-results {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  max-height: 260px;
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 9px;
  cursor: pointer;
  transition: background 0.13s;
}

.search-result-item:hover { background: #fdf4f7; }

.result-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c0304f, #8d1c42);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.result-name {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 600;
  color: #3a0f22;
}

.result-role {
  margin: 0;
  font-size: 0.75rem;
  color: #9e7080;
  text-transform: capitalize;
}

.no-results {
  padding: 12px;
  text-align: center;
  color: #9e7080;
  font-size: 0.85rem;
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

/* Responsive */
@media (max-width: 640px) {
  .conversations-sidebar {
    width: 100%;
    height: 40%;
  }

  .messages-page {
    flex-direction: column;
    height: auto;
    min-height: calc(100vh - 60px);
  }

  .chat-panel {
    height: 60%;
  }
}
</style>
