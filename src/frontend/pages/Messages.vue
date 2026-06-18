<template>
  <main class="view page active messages-page">
    <!-- Sidebar -->
    <aside class="conversations-sidebar" :class="{ 'mobile-hidden': activeConvId && isMobile }">
      <div class="sidebar-header">
        <h2>Messages</h2>
        <div class="sidebar-actions">
          <button class="action-btn support-btn" @click="openSupport" title="Contact Support">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Support
          </button>
          <button class="action-btn new-btn" @click="showNewChat = true" title="New Message">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New
          </button>
        </div>
      </div>

      <!-- Search conversations -->
      <div class="sidebar-search">
        <svg class="sidebar-search-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="convSearchQuery" class="sidebar-search-input" placeholder="Search conversations..." />
      </div>

      <div v-if="filteredConversations.length === 0 && !loadingConvs" class="empty-convs">
        <p>{{ convSearchQuery ? 'No matching conversations.' : 'No conversations yet.' }}</p>
        <p v-if="!convSearchQuery" class="empty-hint">Start one with a tutor or tutee, or contact support.</p>
      </div>

      <ul class="conv-list">
        <li
          v-for="conv in filteredConversations"
          :key="conv.id"
          class="conv-item"
          :class="{ active: activeConvId === conv.id, support: conv.is_support, unread: conv.unread_count > 0 }"
          @click="openConversation(conv)"
        >
          <div class="conv-avatar-wrap">
            <div class="conv-avatar" :class="{ 'support-avatar': conv.is_support }">
              <img
                v-if="hasConversationAvatar(conv)"
                :src="normalizeAssetUrl(conv.other_user?.profilePicture)"
                :alt="convDisplayName(conv)"
                @error="markConversationAvatarError(conv)"
              />
              <div v-else-if="!conv.is_support" class="avatar-fallback-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img"><path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2c-4.42 0-8 2.46-8 5.5 0 .55.45 1 1 1h14c.55 0 1-.45 1-1 0-3.04-3.58-5.5-8-5.5Z" /></svg>
              </div>
              <span v-else>{{ convInitials(conv) }}</span>
            </div>
            <!-- Online dot (show for non-support convs) -->
            <span v-if="!conv.is_support && onlineUsers.has(conv.other_user?.id)" class="online-dot" aria-label="Online"></span>
          </div>
          <div class="conv-info">
            <div class="conv-top">
              <span class="conv-name">{{ convDisplayName(conv) }}</span>
              <span class="conv-time">{{ formatTime(conv.updated_at) }}</span>
            </div>
            <div class="conv-bottom">
              <span class="conv-last" :class="{ 'conv-last-unread': conv.unread_count > 0 }">
                {{ conv.last_message || 'No messages yet' }}
              </span>
              <span v-if="conv.unread_count > 0" class="unread-badge">{{ conv.unread_count > 9 ? '9+' : conv.unread_count }}</span>
            </div>
          </div>
        </li>
      </ul>
    </aside>

    <!-- Chat panel -->
    <section class="chat-panel" v-if="activeConvId">
      <div class="chat-header">
        <!-- Back button on mobile -->
        <button class="back-btn" @click="closeConversation" title="Back">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>

        <div class="chat-header-avatar">
          <img
            v-if="activeConv && hasConversationAvatar(activeConv)"
            :src="normalizeAssetUrl(activeConv.other_user?.profilePicture)"
            :alt="activeConv ? convDisplayName(activeConv) : ''"
          />
          <span v-else>{{ activeConv ? convInitials(activeConv) : '' }}</span>
        </div>

        <div class="chat-header-info">
          <h3>{{ activeConv ? convDisplayName(activeConv) : '' }}</h3>
          <p class="chat-role" :class="{ 'support-label': activeConv?.is_support }">
            <span v-if="typingIndicator" class="typing-status">
              <span class="typing-dots"><span></span><span></span><span></span></span>
              typing...
            </span>
            <span v-else-if="activeConv?.is_support">StudyLink support</span>
            <span v-else>{{ activeConv?.other_user?.role || '' }}</span>
          </p>
        </div>

        <div class="chat-header-actions">
          <button class="icon-btn" @click="scrollToBottom" title="Scroll to latest">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      </div>

      <!-- Date group messages -->
      <div class="messages-list" ref="messagesList" @scroll="onMessagesScroll">
        <div v-if="loadingMessages" class="messages-loading">
          <span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span>
        </div>

        <template v-for="(group, gi) in groupedMessages" :key="gi">
          <div class="date-divider">
            <span>{{ group.label }}</span>
          </div>
          <div
            v-for="msg in group.messages"
            :key="msg.id"
            class="message-bubble-wrap"
            :class="{ mine: msg.sender.id === currentUserId, optimistic: msg.optimistic }"
            @mouseenter="hoveredMessageId = msg.id"
            @mouseleave="hoveredMessageId = null"
          >
            <!-- Sender avatar (for other user) -->
            <div v-if="msg.sender.id !== currentUserId" class="msg-avatar">
              <img v-if="normalizeAssetUrl(msg.sender.profilePicture)" :src="normalizeAssetUrl(msg.sender.profilePicture)" :alt="msg.sender.fullName" />
              <span v-else>{{ (msg.sender.fullName || '?')[0].toUpperCase() }}</span>
            </div>

            <div class="bubble-col">
              <div class="bubble" :class="{ 'bubble-mine': msg.sender.id === currentUserId, 'bubble-failed': msg.failed }">
                <p class="bubble-text">{{ msg.content }}</p>
                <div class="bubble-meta">
                  <span class="bubble-time">{{ formatTimeShort(msg.created_at) }}</span>
                  <!-- Read receipt / send status -->
                  <span v-if="msg.sender.id === currentUserId" class="read-status">
                    <svg v-if="msg.optimistic && !msg.failed" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" class="status-sending"><circle cx="12" cy="12" r="10" stroke-dasharray="4 2"/></svg>
                    <svg v-else-if="msg.failed" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" class="status-failed"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <svg v-else viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" class="status-sent"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                </div>
              </div>

              <!-- Retry on failed -->
              <button v-if="msg.failed" class="retry-btn" @click="retryMessage(msg)">Retry</button>
            </div>

            <!-- Hover action: emoji reaction quick-add -->
            <div v-if="hoveredMessageId === msg.id && !msg.optimistic" class="msg-actions">
              <button class="msg-action-btn" @click="toggleReaction(msg, '👍')" :class="{ reacted: hasReaction(msg, '👍') }">👍</button>
              <button class="msg-action-btn" @click="toggleReaction(msg, '❤️')" :class="{ reacted: hasReaction(msg, '❤️') }">❤️</button>
              <button class="msg-action-btn" @click="toggleReaction(msg, '😂')" :class="{ reacted: hasReaction(msg, '😂') }">😂</button>
            </div>

            <!-- Reaction display -->
            <div v-if="getReactions(msg).length" class="reactions-row" :class="{ 'reactions-mine': msg.sender.id === currentUserId }">
              <button
                v-for="r in getReactions(msg)"
                :key="r.emoji"
                class="reaction-chip"
                :class="{ 'reaction-mine': r.mine }"
                @click="toggleReaction(msg, r.emoji)"
                :title="r.count + ' reaction(s)'"
              >
                {{ r.emoji }} <span>{{ r.count }}</span>
              </button>
            </div>
          </div>
        </template>

        <div v-if="messages.length === 0 && !loadingMessages" class="no-messages">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <p>Say hello!</p>
        </div>
      </div>

      <!-- Scroll to bottom FAB -->
      <Transition name="fade-up">
        <button v-if="showScrollBtn" class="scroll-fab" @click="scrollToBottom" aria-label="Scroll to bottom">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          <span v-if="newMessageCount > 0" class="scroll-badge">{{ newMessageCount }}</span>
        </button>
      </Transition>

      <!-- Input bar -->
      <div class="message-input-bar">
        <!-- Emoji picker toggle -->
        <div class="emoji-picker-wrap">
          <button class="emoji-btn" @click="showEmojiPicker = !showEmojiPicker" title="Emoji" :class="{ active: showEmojiPicker }">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
          </button>
          <Transition name="pop">
            <div v-if="showEmojiPicker" class="emoji-panel" @click.stop>
              <div class="emoji-grid">
                <button v-for="em in commonEmojis" :key="em" class="emoji-item" @click="insertEmoji(em)">{{ em }}</button>
              </div>
            </div>
          </Transition>
        </div>

        <textarea
          ref="inputRef"
          v-model="newMessage"
          class="message-input"
          placeholder="Type a message..."
          maxlength="2000"
          autocomplete="off"
          :disabled="sending"
          rows="1"
          @keydown.enter.exact.prevent="sendMessage"
          @keydown.enter.shift.exact="() => {}"
          @input="onInput"
          @focus="showEmojiPicker = false"
        ></textarea>

        <div class="input-right">
          <span class="char-count" v-if="newMessage.length > 1800">{{ 2000 - newMessage.length }}</span>
          <button
            type="button"
            class="send-btn"
            :disabled="!newMessage.trim() || sending"
            @click="sendMessage"
            title="Send (Enter)"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    </section>

    <!-- Empty state -->
    <section class="chat-empty" v-else>
      <div class="chat-empty-inner">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <h3>Your Messages</h3>
        <p>Select a conversation, or start a new one.</p>
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
            placeholder="Search by name..."
            @input="onSearch"
            autocomplete="off"
            ref="searchInputRef"
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
import { normalizeAssetUrl } from '@/utils/records.js'

const currentUser = getUser()
const currentUserId = currentUser?.id
const isAdmin = currentUser?.role === 'admin'

// — Refs —
const conversations = ref([])
const loadingConvs = ref(true)
const loadingMessages = ref(false)
const activeConvId = ref(null)
const activeConv = computed(() => conversations.value.find(c => c.id === activeConvId.value) || null)

const messages = ref([])
const newMessage = ref('')
const sending = ref(false)
const messagesList = ref(null)
const inputRef = ref(null)
const searchInputRef = ref(null)

const showNewChat = ref(false)
const searchQuery = ref('')
const convSearchQuery = ref('')
const searchResults = ref([])
const searching = ref(false)
const avatarLoadErrors = ref({})

const hoveredMessageId = ref(null)
const showEmojiPicker = ref(false)
const showScrollBtn = ref(false)
const newMessageCount = ref(0)
const typingIndicator = ref(false)
const typingTimeout = ref(null)
const onlineUsers = ref(new Set())

// Local reactions store: { [msgId]: { [emoji]: { count, mine } } }
const reactionsStore = ref({})

// Detect mobile
const isMobile = ref(window.innerWidth <= 640)
window.addEventListener('resize', () => { isMobile.value = window.innerWidth <= 640 })

let pollTimer = null
let convPollTimer = null

const commonEmojis = ['😊','😂','❤️','👍','🙏','🎉','🔥','✅','😮','😢','👋','💪','🤔','📚','⏰','✨']

// — Computed —
const filteredConversations = computed(() => {
  if (!convSearchQuery.value.trim()) return conversations.value
  const q = convSearchQuery.value.toLowerCase()
  return conversations.value.filter(c =>
    convDisplayName(c).toLowerCase().includes(q) ||
    (c.last_message || '').toLowerCase().includes(q)
  )
})

const groupedMessages = computed(() => {
  const groups = []
  let lastDate = null
  for (const msg of messages.value) {
    const d = new Date(msg.created_at)
    const dateKey = d.toDateString()
    const label = getDateLabel(d)
    if (dateKey !== lastDate) {
      groups.push({ label, messages: [] })
      lastDate = dateKey
    }
    groups[groups.length - 1].messages.push(msg)
  }
  return groups
})

// — Avatar helpers —
const conversationAvatarKey = (conv) => String(conv?.id || '')
const hasConversationAvatar = (conv) => {
  const key = conversationAvatarKey(conv)
  return !!normalizeAssetUrl(conv?.other_user?.profilePicture) && !avatarLoadErrors.value[key]
}
const markConversationAvatarError = (conv) => {
  const key = conversationAvatarKey(conv)
  if (!key) return
  avatarLoadErrors.value = { ...avatarLoadErrors.value, [key]: true }
}

// — Display helpers —
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
  if (conv.is_support) return 'SP'
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
const formatTimeShort = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })
}
const getDateLabel = (date) => {
  const now = new Date()
  const diff = Math.floor((now - date) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return date.toLocaleDateString('en-MY', { weekday: 'long' })
  return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })
}

// — Reactions —
const getReactions = (msg) => {
  const store = reactionsStore.value[msg.id] || {}
  return Object.entries(store)
    .map(([emoji, { count, mine }]) => ({ emoji, count, mine }))
    .filter(r => r.count > 0)
}
const hasReaction = (msg, emoji) => {
  return reactionsStore.value[msg.id]?.[emoji]?.mine || false
}
const toggleReaction = (msg, emoji) => {
  if (!reactionsStore.value[msg.id]) reactionsStore.value[msg.id] = {}
  const current = reactionsStore.value[msg.id][emoji] || { count: 0, mine: false }
  if (current.mine) {
    reactionsStore.value[msg.id][emoji] = { count: Math.max(0, current.count - 1), mine: false }
  } else {
    reactionsStore.value[msg.id][emoji] = { count: current.count + 1, mine: true }
  }
}

// — Scroll management —
const isAtBottom = () => {
  if (!messagesList.value) return true
  const { scrollTop, scrollHeight, clientHeight } = messagesList.value
  return scrollHeight - scrollTop - clientHeight < 60
}

const scrollToBottom = async (smooth = false) => {
  await nextTick()
  if (messagesList.value) {
    messagesList.value.scrollTo({ top: messagesList.value.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
    showScrollBtn.value = false
    newMessageCount.value = 0
  }
}

const onMessagesScroll = () => {
  if (!messagesList.value) return
  const atBottom = isAtBottom()
  if (atBottom) {
    showScrollBtn.value = false
    newMessageCount.value = 0
  }
}

// — Auto-resize textarea —
const autoResize = () => {
  if (!inputRef.value) return
  inputRef.value.style.height = 'auto'
  inputRef.value.style.height = Math.min(inputRef.value.scrollHeight, 120) + 'px'
}

const onInput = () => {
  autoResize()
}

const insertEmoji = (emoji) => {
  newMessage.value += emoji
  showEmojiPicker.value = false
  nextTick(() => inputRef.value?.focus())
}

// — Data loading —
const loadConversations = async () => {
  try {
    const data = await api('/conversations')
    conversations.value = data.conversations || []
    avatarLoadErrors.value = {}
  } finally {
    loadingConvs.value = false
  }
}

const openConversation = async (conv) => {
  activeConvId.value = conv.id
  messages.value = []
  loadingMessages.value = true
  await loadMessages(conv.id)
  conv.unread_count = 0
  startPolling()
  await nextTick()
  inputRef.value?.focus()
}

const closeConversation = () => {
  activeConvId.value = null
  stopPolling()
}

const loadMessages = async (convId) => {
  try {
    const data = await api(`/conversations/${convId}/messages`)
    const incoming = data.messages || []
    const wasAtBottom = isAtBottom()
    const prevLen = messages.value.filter(m => !m.optimistic).length

    // Merge: keep optimistic messages that haven't been confirmed yet
    const confirmedIds = new Set(incoming.map(m => m.id))
    const stillPending = messages.value.filter(m => m.optimistic && !confirmedIds.has(m.id))
    messages.value = [...incoming, ...stillPending]

    const newCount = incoming.length - prevLen
    if (newCount > 0 && !wasAtBottom && prevLen > 0) {
      newMessageCount.value += newCount
      showScrollBtn.value = true
    } else {
      await scrollToBottom()
    }
  } finally {
    loadingMessages.value = false
  }
}

const sendMessage = async () => {
  const content = newMessage.value.trim()
  if (!content || !activeConvId.value || sending.value) return

  newMessage.value = ''
  autoResize()
  showEmojiPicker.value = false

  // Optimistic message
  const tempId = `opt-${Date.now()}`
  const optimisticMsg = {
    id: tempId,
    content,
    created_at: new Date().toISOString(),
    sender: { id: currentUserId, fullName: currentUser?.fullName || '', profilePicture: currentUser?.profilePictureUrl || '' },
    optimistic: true,
    failed: false,
  }
  messages.value = [...messages.value, optimisticMsg]
  await scrollToBottom()

  sending.value = true
  try {
    await api(`/conversations/${activeConvId.value}/messages`, 'POST', { content })
    // Remove optimistic; polling will replace with real message
    messages.value = messages.value.filter(m => m.id !== tempId)
    await loadMessages(activeConvId.value)
    await loadConversations()
  } catch {
    // Mark as failed
    const idx = messages.value.findIndex(m => m.id === tempId)
    if (idx !== -1) messages.value[idx] = { ...messages.value[idx], failed: true }
  } finally {
    sending.value = false
    await nextTick()
    inputRef.value?.focus()
  }
}

const retryMessage = async (msg) => {
  messages.value = messages.value.filter(m => m.id !== msg.id)
  newMessage.value = msg.content
  await nextTick()
  inputRef.value?.focus()
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

// — Simulated typing indicator on received messages —
const maybeShowTyping = (prevCount, newCount) => {
  if (newCount > prevCount) {
    // Briefly show typing before new message animates
  }
}

// — Polling —
const startPolling = () => {
  stopPolling()
  pollTimer = setInterval(async () => {
    if (activeConvId.value) {
      const prev = messages.value.filter(m => !m.optimistic).length
      await loadMessages(activeConvId.value)
      const next = messages.value.filter(m => !m.optimistic).length
      if (next > prev) {
        typingIndicator.value = false
      }
    }
  }, 3000)
  // Poll convs list less frequently
  convPollTimer = setInterval(loadConversations, 10000)
}

const stopPolling = () => {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  if (convPollTimer) { clearInterval(convPollTimer); convPollTimer = null }
}

// — User search —
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

// — Events —
const handleProfileUpdated = async () => {
  await loadConversations()
  if (activeConvId.value) await loadMessages(activeConvId.value)
}

onMounted(() => {
  loadConversations()
  window.addEventListener('studylink-profile-updated', handleProfileUpdated)
  document.addEventListener('click', () => { showEmojiPicker.value = false })
})

onUnmounted(() => {
  stopPolling()
  window.removeEventListener('studylink-profile-updated', handleProfileUpdated)
})

watch(showNewChat, (val) => {
  if (!val) { searchQuery.value = ''; searchResults.value = [] }
  else nextTick(() => searchInputRef.value?.focus())
})
</script>

<style scoped>
/* ─── Layout ─────────────────────────────────────────────── */
.messages-page {
  display: flex;
  height: calc(100vh - 60px);
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
  gap: 0;
  overflow: hidden;
}

/* ─── Sidebar ────────────────────────────────────────────── */
.conversations-sidebar {
  width: 320px;
  flex-shrink: 0;
  min-height: 0;
  border-right: 1px solid #f1cdd9;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #fffefe 0%, #fff7fa 100%);
  overflow: hidden;
  transition: transform 0.25s ease;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 16px 10px;
  border-bottom: 1px solid #f1cdd9;
  flex-shrink: 0;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #3a0f22;
  font-weight: 700;
}

.sidebar-actions { display: flex; gap: 6px; }

.action-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  transition: background 0.15s, transform 0.1s;
}
.action-btn:active { transform: scale(0.96); }
.support-btn { background: #f5e6ed; color: #8d1c42; }
.support-btn:hover { background: #f0d5e5; }
.new-btn { background: #8d1c42; color: #fff; }
.new-btn:hover { background: #7a1636; }

/* Sidebar search */
.sidebar-search {
  position: relative;
  padding: 10px 12px 8px;
  flex-shrink: 0;
}
.sidebar-search-icon {
  position: absolute;
  left: 22px;
  top: 50%;
  transform: translateY(-50%);
  color: #b87a92;
  pointer-events: none;
}
.sidebar-search-input {
  width: 100%;
  padding: 8px 12px 8px 32px;
  border: 1px solid #f1cdd9;
  border-radius: 20px;
  font-size: 0.82rem;
  background: #fdf4f7;
  color: #3a0f22;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.sidebar-search-input:focus { border-color: #c0304f; }

.empty-convs {
  padding: 24px 16px;
  text-align: center;
  color: #9e7080;
  font-size: 0.85rem;
}
.empty-hint { font-size: 0.78rem; margin-top: 4px; }

.conv-list {
  flex: 1;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  padding: 6px 0;
}

.conv-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  margin: 2px 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.13s;
}
.conv-item:hover { background: rgba(193, 48, 79, 0.06); }
.conv-item.active { background: rgba(193, 48, 79, 0.1); }
.conv-item.unread .conv-name { font-weight: 700; }

/* Avatar with online dot */
.conv-avatar-wrap { position: relative; flex-shrink: 0; }

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
  font-size: 0.85rem;
  overflow: hidden;
  flex-shrink: 0;
}
.conv-avatar img { width: 100%; height: 100%; object-fit: cover; }
.support-avatar { background: linear-gradient(135deg, #1e8a5a, #0f5a3b); }

.avatar-fallback-icon { display: flex; align-items: center; justify-content: center; }
.avatar-fallback-icon svg { width: 20px; height: 20px; fill: rgba(255,255,255,0.85); }

.online-dot {
  position: absolute;
  bottom: 1px;
  right: 1px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #22c55e;
  border: 2px solid #fff;
}

.conv-info { flex: 1; min-width: 0; }

.conv-top {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.conv-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: #3a0f22;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.conv-time { font-size: 0.72rem; color: #b87a92; flex-shrink: 0; }

.conv-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}
.conv-last {
  font-size: 0.78rem;
  color: #9e7080;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}
.conv-last-unread { color: #3a0f22; font-weight: 600; }

.unread-badge {
  background: #c0304f;
  color: #fff;
  border-radius: 10px;
  padding: 1px 6px;
  font-size: 0.68rem;
  font-weight: 700;
  flex-shrink: 0;
}

/* ─── Chat panel ─────────────────────────────────────────── */
.chat-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
  position: relative;
}

.chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid #f1cdd9;
  flex-shrink: 0;
  background: linear-gradient(90deg, #fff 0%, #fff9fb 100%);
}

.back-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  color: #8d1c42;
  padding: 4px;
  border-radius: 8px;
}
.back-btn:hover { background: #f5e6ed; }

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

.chat-header-info { flex: 1; min-width: 0; }
.chat-header-info h3 { margin: 0; font-size: 0.95rem; color: #3a0f22; font-weight: 700; }
.chat-role { font-size: 0.72rem; color: #9e7080; text-transform: capitalize; margin: 0; }
.support-label { color: #2c7a5a; font-weight: 600; }

.typing-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #c0304f;
  font-style: italic;
}
.typing-dots { display: flex; gap: 3px; align-items: center; }
.typing-dots span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #c0304f;
  animation: bounce 1.2s infinite;
}
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce { 0%,80%,100%{ transform: translateY(0); } 40%{ transform: translateY(-5px); } }

.chat-header-actions { margin-left: auto; display: flex; gap: 6px; }
.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #b87a92;
  padding: 6px;
  border-radius: 8px;
  display: flex;
  align-items: center;
}
.icon-btn:hover { background: #f5e6ed; color: #8d1c42; }

/* ─── Messages list ──────────────────────────────────────── */
.messages-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  scroll-behavior: smooth;
}

.messages-loading {
  display: flex;
  gap: 6px;
  justify-content: center;
  align-items: center;
  padding: 24px;
}
.loading-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #e0a8ba;
  animation: bounce 1.2s infinite;
}
.loading-dot:nth-child(2) { animation-delay: 0.2s; }
.loading-dot:nth-child(3) { animation-delay: 0.4s; }

.date-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0 8px;
  color: #b87a92;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.date-divider::before, .date-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #f1cdd9;
}

/* Bubble wraps */
.message-bubble-wrap {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 4px;
  position: relative;
}
.message-bubble-wrap.mine { flex-direction: row-reverse; }

.msg-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c0304f, #8d1c42);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.72rem;
  flex-shrink: 0;
  overflow: hidden;
  margin-bottom: 18px;
}
.msg-avatar img { width: 100%; height: 100%; object-fit: cover; }

.bubble-col { display: flex; flex-direction: column; align-items: flex-start; max-width: 65%; }
.mine .bubble-col { align-items: flex-end; }

.bubble {
  background: #f5e6ed;
  border-radius: 14px 14px 14px 4px;
  padding: 10px 14px 7px;
  position: relative;
  transition: opacity 0.2s;
}
.bubble-mine {
  background: #8d1c42;
  border-radius: 14px 14px 4px 14px;
}
.optimistic .bubble { opacity: 0.75; }
.bubble-failed { background: #fee2e2 !important; border: 1px solid #fca5a5; }

.bubble-text {
  margin: 0 0 4px;
  font-size: 0.88rem;
  color: #3a0f22;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
}
.bubble-mine .bubble-text { color: #fff; }
.bubble-failed .bubble-text { color: #991b1b; }

.bubble-meta { display: flex; align-items: center; gap: 4px; justify-content: flex-end; }
.bubble-time { font-size: 0.67rem; color: #9e7080; }
.bubble-mine .bubble-time { color: rgba(255,255,255,0.6); }

.read-status svg { display: block; }
.status-sending { stroke: rgba(255,255,255,0.5); animation: spin 1.5s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.status-sent { stroke: rgba(255,255,255,0.75); }
.status-failed { stroke: #ef4444; }

.retry-btn {
  background: none;
  border: none;
  color: #c0304f;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 2px 6px;
  text-decoration: underline;
  margin-top: 2px;
}

/* Hover actions */
.msg-actions {
  display: flex;
  gap: 4px;
  background: #fff;
  border: 1px solid #f1cdd9;
  border-radius: 20px;
  padding: 3px 6px;
  box-shadow: 0 2px 8px rgba(141,28,66,0.12);
  position: absolute;
  top: -30px;
  left: 36px;
  z-index: 10;
}
.mine .msg-actions { left: auto; right: 0; }

.msg-action-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.95rem;
  padding: 2px 4px;
  border-radius: 6px;
  transition: background 0.1s, transform 0.1s;
}
.msg-action-btn:hover { background: #f5e6ed; transform: scale(1.2); }
.msg-action-btn.reacted { background: #fce7ef; }

/* Reactions */
.reactions-row {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 4px;
  padding-left: 36px;
}
.reactions-mine { justify-content: flex-end; padding-left: 0; }
.reaction-chip {
  display: flex;
  align-items: center;
  gap: 3px;
  background: #f5e6ed;
  border: 1px solid #f1cdd9;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 0.78rem;
  cursor: pointer;
  transition: background 0.1s;
}
.reaction-chip span { color: #8d1c42; font-weight: 600; }
.reaction-chip:hover { background: #f0d5e5; }
.reaction-mine { background: #f9d4e1; border-color: #e8a0b5; }

.no-messages {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #9e7080;
  font-size: 0.9rem;
}

/* ─── Scroll FAB ────────────────────────────────────────── */
.scroll-fab {
  position: absolute;
  bottom: 80px;
  right: 20px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #8d1c42;
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(141,28,66,0.35);
  z-index: 10;
}
.scroll-fab:hover { background: #7a1636; }
.scroll-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #c0304f;
  color: #fff;
  border-radius: 10px;
  padding: 0 5px;
  font-size: 0.65rem;
  font-weight: 700;
  min-width: 16px;
  text-align: center;
  border: 2px solid #fff;
}

.fade-up-enter-active, .fade-up-leave-active { transition: opacity 0.2s, transform 0.2s; }
.fade-up-enter-from, .fade-up-leave-to { opacity: 0; transform: translateY(8px); }

/* ─── Input bar ─────────────────────────────────────────── */
.message-input-bar {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid #f1cdd9;
  flex-shrink: 0;
  background: #fff;
}

.emoji-picker-wrap { position: relative; flex-shrink: 0; }
.emoji-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #b87a92;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  transition: background 0.15s, color 0.15s;
}
.emoji-btn:hover, .emoji-btn.active { background: #f5e6ed; color: #8d1c42; }

.emoji-panel {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  background: #fff;
  border: 1px solid #f1cdd9;
  border-radius: 14px;
  padding: 10px;
  box-shadow: 0 8px 24px rgba(141,28,66,0.18);
  z-index: 50;
  width: 230px;
}
.emoji-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px; }
.emoji-item {
  background: none;
  border: none;
  font-size: 1.15rem;
  cursor: pointer;
  padding: 5px;
  border-radius: 8px;
  text-align: center;
  transition: background 0.1s, transform 0.1s;
}
.emoji-item:hover { background: #f5e6ed; transform: scale(1.2); }

.pop-enter-active, .pop-leave-active { transition: opacity 0.15s, transform 0.15s; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translateY(6px) scale(0.95); }

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
  resize: none;
  line-height: 1.45;
  max-height: 120px;
  overflow-y: auto;
  font-family: inherit;
}
.message-input:focus { border-color: #c0304f; }
.message-input::placeholder { color: #b87a92; }

.input-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.char-count { font-size: 0.72rem; color: #c0304f; font-weight: 600; }

.send-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #8d1c42;
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s, transform 0.1s;
}
.send-btn:hover:not(:disabled) { background: #7a1636; }
.send-btn:active:not(:disabled) { transform: scale(0.93); }
.send-btn:disabled { background: #e8b4c5; cursor: not-allowed; }

/* ─── Empty state ───────────────────────────────────────── */
.chat-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fff7fa 0%, #fdeef5 100%);
}
.chat-empty-inner { text-align: center; padding: 40px; }
.empty-icon { color: #e8b4c5; margin-bottom: 16px; display: flex; justify-content: center; }
.chat-empty-inner h3 { margin: 0 0 8px; color: #3a0f22; font-size: 1.2rem; }
.chat-empty-inner p { color: #9e7080; font-size: 0.88rem; margin: 0 0 20px; }
.empty-btns { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

.btn-primary {
  padding: 10px 20px;
  background: #8d1c42;
  color: #fff;
  border: none;
  border-radius: 22px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: background 0.15s;
}
.btn-primary:hover { background: #7a1636; }
.btn-support {
  padding: 10px 20px;
  background: #f5e6ed;
  color: #8d1c42;
  border: none;
  border-radius: 22px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: background 0.15s;
}
.btn-support:hover { background: #f0d5e5; }

/* ─── Modal ─────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(58,15,34,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}
.modal-card {
  background: #fff;
  border-radius: 18px;
  padding: 26px 24px;
  width: 100%;
  max-width: 420px;
  position: relative;
}
.modal-close {
  position: absolute;
  top: 12px;
  right: 16px;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #9e7080;
  cursor: pointer;
  line-height: 1;
  padding: 4px;
}
.modal-close:hover { color: #3a0f22; }
.modal-card h3 { margin: 0 0 4px; color: #3a0f22; font-size: 1.05rem; font-weight: 700; }
.modal-sub { margin: 0 0 14px; font-size: 0.82rem; color: #9e7080; }

.search-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #f1cdd9;
  border-radius: 10px;
  font-size: 0.88rem;
  outline: none;
  box-sizing: border-box;
  background: #fdf4f7;
  color: #3a0f22;
  transition: border-color 0.15s;
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
.result-name { margin: 0; font-size: 0.88rem; font-weight: 600; color: #3a0f22; }
.result-role { margin: 0; font-size: 0.75rem; color: #9e7080; text-transform: capitalize; }
.no-results { padding: 12px; text-align: center; color: #9e7080; font-size: 0.85rem; }

/* ─── Modal transition ──────────────────────────────────── */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

/* ─── Responsive ────────────────────────────────────────── */
@media (max-width: 900px) {
  .messages-page { height: calc(100vh - 56px); }
  .conversations-sidebar { width: 280px; }
  .bubble-col { max-width: 74%; }
}

@media (max-width: 640px) {
  .messages-page { flex-direction: row; height: calc(100vh - 56px); }

  .conversations-sidebar {
    position: absolute;
    top: 0; left: 0;
    width: 100%;
    height: 100%;
    z-index: 5;
    border-right: none;
    transition: transform 0.3s ease;
  }
  .conversations-sidebar.mobile-hidden {
    transform: translateX(-100%);
    pointer-events: none;
  }

  .back-btn { display: flex; }

  .chat-panel { width: 100%; }

  .messages-list { padding: 12px 14px; }
  .chat-header { padding: 10px 14px; }
  .message-input-bar { padding: 8px 10px; }
  .bubble-col { max-width: 84%; }

  .msg-actions { left: 32px; }
  .mine .msg-actions { right: 0; left: auto; }
}

@media (max-width: 420px) {
  .sidebar-header { padding: 12px; }
  .conv-item { padding: 8px 10px; margin: 2px 6px; }
}
</style>
