<template>
  <main class="view page active messages-page">

    <!-- ── Sidebar ───────────────────────────────────────────── -->
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

      <div class="sidebar-search">
        <svg class="sidebar-search-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="convSearchQuery" class="sidebar-search-input" placeholder="Search conversations..." />
      </div>

      <!-- FIX: show skeleton while loading, not blank -->
      <div v-if="loadingConvs" class="conv-skeleton-list">
        <div v-for="n in 4" :key="n" class="conv-skeleton-item">
          <div class="skel skel-avatar"></div>
          <div class="skel-info">
            <div class="skel skel-line skel-name"></div>
            <div class="skel skel-line skel-sub"></div>
          </div>
        </div>
      </div>

      <div v-else-if="filteredConversations.length === 0" class="empty-convs">
        <p>{{ convSearchQuery ? 'No matching conversations.' : 'No conversations yet.' }}</p>
        <p v-if="!convSearchQuery" class="empty-hint">Start one with a tutor or tutee, or contact support.</p>
      </div>

      <ul v-else class="conv-list">
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
                <svg viewBox="0 0 24 24"><path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2c-4.42 0-8 2.46-8 5.5 0 .55.45 1 1 1h14c.55 0 1-.45 1-1 0-3.04-3.58-5.5-8-5.5Z" /></svg>
              </div>
              <span v-else>{{ convInitials(conv) }}</span>
            </div>
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

    <!-- ── Chat panel ─────────────────────────────────────────── -->
    <section class="chat-panel" v-if="activeConvId">
      <div class="chat-header">
        <button class="back-btn" @click="closeConversation" title="Back" aria-label="Back to conversations">
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
          <button class="icon-btn" @click="scrollToBottom(true)" title="Scroll to latest">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div class="messages-list" ref="messagesList" @scroll="onMessagesScroll">
        <div v-if="loadingMessages" class="messages-loading">
          <span class="loading-dot"></span>
          <span class="loading-dot"></span>
          <span class="loading-dot"></span>
        </div>

        <template v-for="(group, gi) in groupedMessages" :key="gi">
          <div class="date-divider"><span>{{ group.label }}</span></div>

          <div
            v-for="msg in group.messages"
            :key="msg.id"
            class="message-bubble-wrap"
            :class="{ mine: msg.sender.id === currentUserId, optimistic: msg.optimistic }"
            @mouseenter="hoveredMessageId = msg.id"
            @mouseleave="hoveredMessageId = null"
          >
            <div v-if="msg.sender.id !== currentUserId" class="msg-avatar">
              <img v-if="normalizeAssetUrl(msg.sender.profilePicture)" :src="normalizeAssetUrl(msg.sender.profilePicture)" :alt="msg.sender.fullName" />
              <!-- FIX: guard against null fullName -->
              <span v-else>{{ (msg.sender.fullName || '?')[0].toUpperCase() }}</span>
            </div>

            <div class="bubble-col">
              <div class="bubble" :class="{ 'bubble-mine': msg.sender.id === currentUserId, 'bubble-failed': msg.failed }">
                <p class="bubble-text">{{ msg.content }}</p>
                <div class="bubble-meta">
                  <span class="bubble-time">{{ formatTimeShort(msg.created_at) }}</span>
                  <span v-if="msg.sender.id === currentUserId" class="read-status">
                    <svg v-if="msg.optimistic && !msg.failed" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" class="status-sending"><circle cx="12" cy="12" r="10" stroke-dasharray="4 2"/></svg>
                    <svg v-else-if="msg.failed" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" class="status-failed"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <svg v-else viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" class="status-sent"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                </div>
              </div>

              <button v-if="msg.failed" class="retry-btn" @click="retryMessage(msg)">Retry</button>
            </div>

            <!-- FIX: only show actions when NOT optimistic/failed -->
            <div v-if="hoveredMessageId === msg.id && !msg.optimistic && !msg.failed" class="msg-actions">
              <button class="msg-action-btn" @click="toggleReaction(msg, '👍')" :class="{ reacted: hasReaction(msg, '👍') }">👍</button>
              <button class="msg-action-btn" @click="toggleReaction(msg, '❤️')" :class="{ reacted: hasReaction(msg, '❤️') }">❤️</button>
              <button class="msg-action-btn" @click="toggleReaction(msg, '😂')" :class="{ reacted: hasReaction(msg, '😂') }">😂</button>
            </div>

            <div v-if="getReactions(msg).length" class="reactions-row" :class="{ 'reactions-mine': msg.sender.id === currentUserId }">
              <button
                v-for="r in getReactions(msg)"
                :key="r.emoji"
                class="reaction-chip"
                :class="{ 'reaction-mine': r.mine }"
                @click="toggleReaction(msg, r.emoji)"
                :title="`${r.count} reaction(s)`"
              >
                {{ r.emoji }} <span>{{ r.count }}</span>
              </button>
            </div>
          </div>
        </template>

        <div v-if="messages.length === 0 && !loadingMessages" class="no-messages">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.35"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <p>Say hello!</p>
        </div>
      </div>

      <!-- Scroll FAB -->
      <Transition name="fade-up">
        <button v-if="showScrollBtn" class="scroll-fab" @click="scrollToBottom(true)" aria-label="Scroll to latest">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          <span v-if="newMessageCount > 0" class="scroll-badge">{{ newMessageCount }}</span>
        </button>
      </Transition>

      <!-- Input bar -->
      <div class="message-input-bar">
        <div class="emoji-picker-wrap">
          <button class="emoji-btn" @click.stop="showEmojiPicker = !showEmojiPicker" :class="{ active: showEmojiPicker }" title="Emoji" aria-label="Toggle emoji picker">
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
          aria-label="Message input"
        ></textarea>

        <div class="input-right">
          <span class="char-count" v-if="newMessage.length > 1800">{{ 2000 - newMessage.length }}</span>
          <button
            type="button"
            class="send-btn"
            :disabled="!newMessage.trim() || sending"
            @click="sendMessage"
            title="Send (Enter)"
            aria-label="Send message"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    </section>

    <!-- ── Empty state ────────────────────────────────────────── -->
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

    <!-- ── New conversation modal ─────────────────────────────── -->
    <Transition name="modal-fade">
      <div v-if="showNewChat" class="modal-backdrop" @click.self="showNewChat = false">
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="newChatTitle">
          <button class="modal-close" @click="showNewChat = false" aria-label="Close">&times;</button>
          <h3 id="newChatTitle">New Message</h3>
          <p class="modal-sub">Search for a tutor or tutee to start a conversation.</p>
          <input
            v-model="searchQuery"
            class="search-input"
            placeholder="Search by name..."
            @input="onSearch"
            autocomplete="off"
            ref="searchInputRef"
            aria-label="Search users"
          />
          <!-- FIX: show spinner while searching -->
          <div v-if="searching" class="search-spinner">
            <span class="loading-dot"></span>
            <span class="loading-dot"></span>
            <span class="loading-dot"></span>
          </div>
          <ul class="search-results" v-else-if="searchResults.length">
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

// FIX: guard null currentUser
const currentUser = getUser() ?? {}
const currentUserId = currentUser?.id
const isAdmin = currentUser?.role === 'admin'

// — Refs —
const conversations     = ref([])
const loadingConvs      = ref(true)
const loadingMessages   = ref(false)
const activeConvId      = ref(null)
const activeConv        = computed(() => conversations.value.find(c => c.id === activeConvId.value) ?? null)

const messages          = ref([])
const newMessage        = ref('')
const sending           = ref(false)
const messagesList      = ref(null)
const inputRef          = ref(null)
const searchInputRef    = ref(null)

const showNewChat       = ref(false)
const searchQuery       = ref('')
const convSearchQuery   = ref('')
const searchResults     = ref([])
const searching         = ref(false)
const avatarLoadErrors  = ref({})

const hoveredMessageId  = ref(null)
const showEmojiPicker   = ref(false)
const showScrollBtn     = ref(false)
const newMessageCount   = ref(0)
const typingIndicator   = ref(false)
const onlineUsers       = ref(new Set())
const reactionsStore    = ref({})

// FIX: cleanup resize listener on unmount
const isMobile = ref(window.innerWidth <= 640)
const onResize = () => { isMobile.value = window.innerWidth <= 640 }
window.addEventListener('resize', onResize)

let pollTimer     = null
let convPollTimer = null
let searchTimeout = null

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
    // FIX: guard invalid date
    const d = msg.created_at ? new Date(msg.created_at) : new Date()
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
const conversationAvatarKey   = (conv) => String(conv?.id || '')
const hasConversationAvatar   = (conv) => {
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
  if (!conv) return ''
  if (conv.is_support && isAdmin) return conv.other_user?.fullName || 'Support Contact'
  if (conv.is_support) return 'StudyLink Support'
  return conv.other_user?.fullName || 'Unknown User'
}
const convInitials = (conv) => {
  if (!conv) return '?'
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
  if (isNaN(date)) return ''
  const now = new Date()
  const diffDays = Math.floor((now - date) / 86400000)
  if (diffDays === 0) return date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7)  return date.toLocaleDateString('en-MY', { weekday: 'short' })
  return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })
}

const formatTimeShort = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date)) return ''
  return date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })
}

const getDateLabel = (date) => {
  const now = new Date()
  const diff = Math.floor((now - date) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7)  return date.toLocaleDateString('en-MY', { weekday: 'long' })
  return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'long', year: 'numeric' })
}

// — Reactions —
const getReactions = (msg) => {
  const store = reactionsStore.value[msg.id] || {}
  return Object.entries(store)
    .map(([emoji, { count, mine }]) => ({ emoji, count, mine }))
    .filter(r => r.count > 0)
}
const hasReaction = (msg, emoji) => !!reactionsStore.value[msg.id]?.[emoji]?.mine
const toggleReaction = (msg, emoji) => {
  if (!reactionsStore.value[msg.id]) reactionsStore.value[msg.id] = {}
  const current = reactionsStore.value[msg.id][emoji] || { count: 0, mine: false }
  reactionsStore.value[msg.id][emoji] = current.mine
    ? { count: Math.max(0, current.count - 1), mine: false }
    : { count: current.count + 1, mine: true }
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
    showScrollBtn.value    = false
    newMessageCount.value  = 0
  }
}

const onMessagesScroll = () => {
  if (!messagesList.value) return
  if (isAtBottom()) {
    showScrollBtn.value   = false
    newMessageCount.value = 0
  }
}

// — Textarea auto-resize —
const autoResize = () => {
  if (!inputRef.value) return
  inputRef.value.style.height = 'auto'
  inputRef.value.style.height = Math.min(inputRef.value.scrollHeight, 120) + 'px'
}
const onInput = () => autoResize()

const insertEmoji = (emoji) => {
  newMessage.value += emoji
  showEmojiPicker.value = false
  nextTick(() => inputRef.value?.focus())
}

// — Data loading —
const loadConversations = async () => {
  try {
    const data = await api('/conversations')
    conversations.value   = data.conversations || []
    avatarLoadErrors.value = {}
  } catch {
    // silently fail on poll
  } finally {
    loadingConvs.value = false
  }
}

const openConversation = async (conv) => {
  // FIX: don't re-open same conv (prevents scroll reset on sidebar click)
  if (activeConvId.value === conv.id) return
  activeConvId.value  = conv.id
  messages.value      = []
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
    const data      = await api(`/conversations/${convId}/messages`)
    const incoming  = data.messages || []
    const wasAtBottom = isAtBottom()
    const prevLen   = messages.value.filter(m => !m.optimistic).length

    const confirmedIds = new Set(incoming.map(m => m.id))
    const stillPending = messages.value.filter(m => m.optimistic && !confirmedIds.has(m.id))
    messages.value = [...incoming, ...stillPending]

    const newCount = incoming.length - prevLen
    if (newCount > 0 && !wasAtBottom && prevLen > 0) {
      newMessageCount.value += newCount
      showScrollBtn.value    = true
    } else {
      await scrollToBottom()
    }
  } catch {
    // silently fail on background poll
  } finally {
    loadingMessages.value = false
  }
}

const sendMessage = async () => {
  const content = newMessage.value.trim()
  // FIX: explicit guards — no empty, no missing conv, no double-send
  if (!content || !activeConvId.value || sending.value) return

  newMessage.value = ''
  autoResize()
  showEmojiPicker.value = false

  const tempId = `opt-${Date.now()}`
  const optimisticMsg = {
    id: tempId,
    content,
    created_at: new Date().toISOString(),
    sender: {
      id: currentUserId,
      fullName: currentUser?.fullName || '',
      profilePicture: currentUser?.profilePictureUrl || ''
    },
    optimistic: true,
    failed: false,
  }
  messages.value = [...messages.value, optimisticMsg]
  await scrollToBottom()

  sending.value = true
  try {
    await api(`/conversations/${activeConvId.value}/messages`, 'POST', { content })
    messages.value = messages.value.filter(m => m.id !== tempId)
    await loadMessages(activeConvId.value)
    await loadConversations()
  } catch {
    // FIX: mark optimistic as failed, don't silently drop
    const idx = messages.value.findIndex(m => m.id === tempId)
    if (idx !== -1) messages.value[idx] = { ...messages.value[idx], failed: true }
  } finally {
    sending.value = false
    await nextTick()
    inputRef.value?.focus()
  }
}

const retryMessage = async (msg) => {
  messages.value    = messages.value.filter(m => m.id !== msg.id)
  newMessage.value  = msg.content
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

// — Polling —
const startPolling = () => {
  stopPolling()
  pollTimer = setInterval(async () => {
    if (activeConvId.value) {
      const prev = messages.value.filter(m => !m.optimistic).length
      await loadMessages(activeConvId.value)
      const next = messages.value.filter(m => !m.optimistic).length
      if (next > prev) typingIndicator.value = false
    }
  }, 3000)
  convPollTimer = setInterval(loadConversations, 10000)
}

const stopPolling = () => {
  if (pollTimer)     { clearInterval(pollTimer);     pollTimer     = null }
  if (convPollTimer) { clearInterval(convPollTimer); convPollTimer = null }
}

// — User search —
const onSearch = () => {
  clearTimeout(searchTimeout)
  if (searchQuery.value.length < 2) { searchResults.value = []; return }
  searchTimeout = setTimeout(async () => {
    searching.value = true
    try {
      const data = await api(`/users/search?q=${encodeURIComponent(searchQuery.value)}`)
      searchResults.value = data.users || []
    } catch {
      searchResults.value = []
    } finally {
      searching.value = false
    }
  }, 300)
}

const startConversation = async (user) => {
  showNewChat.value   = false
  searchQuery.value   = ''
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

const onDocClick = () => { showEmojiPicker.value = false }

// FIX: Escape key closes modal
const onKeyDown = (e) => {
  if (e.key === 'Escape') {
    showNewChat.value     = false
    showEmojiPicker.value = false
  }
}

onMounted(() => {
  loadConversations()
  window.addEventListener('studylink-profile-updated', handleProfileUpdated)
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  stopPolling()
  window.removeEventListener('resize', onResize)
  window.removeEventListener('studylink-profile-updated', handleProfileUpdated)
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeyDown)
  clearTimeout(searchTimeout)
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
  /* FIX: canvas-parchment bg from brand */
  background: #F5F5F5;
}

/* ─── Sidebar ─────────────────────────────────────────────── */
.conversations-sidebar {
  width: 320px;
  flex-shrink: 0;
  min-height: 0;
  border-right: 1px solid #FFCEE3;
  display: flex;
  flex-direction: column;
  /* FIX: glass sidebar — blush tinted */
  background: linear-gradient(180deg, #fff 0%, #fff8fb 100%);
  overflow: hidden;
  transition: transform 0.25s ease;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 16px 10px;
  border-bottom: 1px solid #FFCEE3;
  flex-shrink: 0;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.15rem;
  /* FIX: navy ink */
  color: #021A54;
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

/* FIX: brand pink buttons */
.support-btn { background: #FFCEE3; color: #021A54; }
.support-btn:hover { background: #ffb8d8; }
.new-btn { background: #FF85BB; color: #fff; }
.new-btn:hover { background: #e0609a; }

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
  /* FIX: muted pink icon */
  color: #FF85BB;
  pointer-events: none;
}
.sidebar-search-input {
  width: 100%;
  padding: 8px 12px 8px 32px;
  border: 1.5px solid #FFCEE3;
  border-radius: 20px;
  font-size: 0.82rem;
  background: rgba(255, 255, 255, 0.88);
  color: #021A54;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.sidebar-search-input:focus { border-color: #FF85BB; }

/* Skeleton loader */
.conv-skeleton-list { padding: 8px; }
.conv-skeleton-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  margin-bottom: 4px;
}
.skel {
  border-radius: 6px;
  background: linear-gradient(90deg, #f0e6ee 25%, #fde8f2 50%, #f0e6ee 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
.skel-avatar { width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0; }
.skel-info { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.skel-line { height: 10px; }
.skel-name { width: 60%; }
.skel-sub  { width: 80%; }
@keyframes shimmer { to { background-position: -200% 0; } }

.empty-convs {
  padding: 24px 16px;
  text-align: center;
  color: #b87a92;
  font-size: 0.85rem;
}
.empty-hint { font-size: 0.78rem; margin-top: 4px; }

/* Conversation list */
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
.conv-item:hover  { background: rgba(255, 133, 187, 0.08); }
/* FIX: active item uses brand blush */
.conv-item.active { background: rgba(255, 133, 187, 0.16); }
.conv-item.unread .conv-name { font-weight: 700; }

.conv-avatar-wrap { position: relative; flex-shrink: 0; }

.conv-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  /* FIX: pink gradient avatar */
  background: linear-gradient(135deg, #FF85BB, #e0609a);
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
.support-avatar  { background: linear-gradient(135deg, #1e8a5a, #0f5a3b); }

.avatar-fallback-icon { display: flex; align-items: center; justify-content: center; }
.avatar-fallback-icon svg { width: 20px; height: 20px; fill: rgba(255,255,255,0.85); }

.online-dot {
  position: absolute;
  bottom: 1px; right: 1px;
  width: 10px; height: 10px;
  border-radius: 50%;
  background: #22c55e;
  border: 2px solid #fff;
}

.conv-info { flex: 1; min-width: 0; }
.conv-top  {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.conv-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: #021A54;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.conv-time { font-size: 0.72rem; color: #FF85BB; flex-shrink: 0; }

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
.conv-last-unread { color: #021A54; font-weight: 600; }

/* FIX: pink unread badge */
.unread-badge {
  background: #FF85BB;
  color: #fff;
  border-radius: 10px;
  padding: 1px 6px;
  font-size: 0.68rem;
  font-weight: 700;
  flex-shrink: 0;
}

/* ─── Chat panel ──────────────────────────────────────────── */
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
  border-bottom: 1px solid #FFCEE3;
  flex-shrink: 0;
  /* FIX: blush tinted glass header */
  background: linear-gradient(90deg, #fff 0%, #fff8fb 100%);
}

.back-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  color: #FF85BB;
  padding: 4px;
  border-radius: 8px;
}
.back-btn:hover { background: #FFCEE3; }

.chat-header-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF85BB, #e0609a);
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
.chat-header-info h3 { margin: 0; font-size: 0.95rem; color: #021A54; font-weight: 700; }
.chat-role { font-size: 0.72rem; color: #9e7080; text-transform: capitalize; margin: 0; }
.support-label { color: #2c7a5a; font-weight: 600; }

.typing-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #FF85BB;
  font-style: italic;
}
.typing-dots { display: flex; gap: 3px; align-items: center; }
.typing-dots span {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: #FF85BB;
  animation: bounce 1.2s infinite;
}
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce {
  0%,80%,100% { transform: translateY(0); }
  40%         { transform: translateY(-5px); }
}

.chat-header-actions { margin-left: auto; display: flex; gap: 6px; }
.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #FF85BB;
  padding: 6px;
  border-radius: 8px;
  display: flex;
  align-items: center;
}
.icon-btn:hover { background: #FFCEE3; color: #021A54; }

/* ─── Messages list ───────────────────────────────────────── */
.messages-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  scroll-behavior: smooth;
  /* FIX: very light blush bg for message area */
  background: #fff8fb;
}

.messages-loading, .search-spinner {
  display: flex;
  gap: 6px;
  justify-content: center;
  align-items: center;
  padding: 24px;
}
.loading-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: #FFCEE3;
  animation: bounce 1.2s infinite;
}
.loading-dot:nth-child(2) { animation-delay: 0.2s; }
.loading-dot:nth-child(3) { animation-delay: 0.4s; }

.date-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0 8px;
  color: #FF85BB;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.date-divider::before, .date-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #FFCEE3;
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
  width: 28px; height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF85BB, #e0609a);
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

/* FIX: received bubble uses blush bg */
.bubble {
  background: #FFCEE3;
  border-radius: 14px 14px 14px 4px;
  padding: 10px 14px 7px;
  position: relative;
  transition: opacity 0.2s;
}
/* FIX: sent bubble uses brand navy */
.bubble-mine {
  background: #021A54;
  border-radius: 14px 14px 4px 14px;
}
.optimistic .bubble { opacity: 0.75; }
.bubble-failed { background: #fee2e2 !important; border: 1px solid #fca5a5; }

.bubble-text {
  margin: 0 0 4px;
  font-size: 0.88rem;
  color: #021A54;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
}
.bubble-mine .bubble-text  { color: #fff; }
.bubble-failed .bubble-text { color: #991b1b; }

.bubble-meta { display: flex; align-items: center; gap: 4px; justify-content: flex-end; }
.bubble-time { font-size: 0.67rem; color: #9e7080; }
.bubble-mine .bubble-time  { color: rgba(255,255,255,0.6); }

.read-status svg { display: block; }
.status-sending { stroke: rgba(255,255,255,0.5); animation: spin 1.5s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.status-sent   { stroke: rgba(255,255,255,0.75); }
.status-failed { stroke: #ef4444; }

.retry-btn {
  background: none;
  border: none;
  color: #FF85BB;
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
  border: 1px solid #FFCEE3;
  border-radius: 20px;
  padding: 3px 6px;
  box-shadow: 0 2px 8px rgba(255, 133, 187, 0.15);
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
.msg-action-btn:hover   { background: #FFCEE3; transform: scale(1.2); }
.msg-action-btn.reacted { background: #FFCEE3; }

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
  background: #FFCEE3;
  border: 1px solid #ffb8d8;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 0.78rem;
  cursor: pointer;
  transition: background 0.1s;
}
.reaction-chip span { color: #021A54; font-weight: 600; }
.reaction-chip:hover { background: #ffb8d8; }
.reaction-mine      { background: #FFCEE3; border-color: #FF85BB; }

.no-messages {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #FF85BB;
  font-size: 0.9rem;
}

/* ─── Scroll FAB ──────────────────────────────────────────── */
.scroll-fab {
  position: absolute;
  bottom: 80px; right: 20px;
  width: 36px; height: 36px;
  border-radius: 50%;
  /* FIX: brand pink fab */
  background: #FF85BB;
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 14px rgba(255, 133, 187, 0.4);
  z-index: 10;
}
.scroll-fab:hover { background: #e0609a; }

.scroll-badge {
  position: absolute;
  top: -4px; right: -4px;
  background: #021A54;
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
.fade-up-enter-from, .fade-up-leave-to       { opacity: 0; transform: translateY(8px); }

/* ─── Input bar ───────────────────────────────────────────── */
.message-input-bar {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 14px;
  border-top: 1px solid #FFCEE3;
  flex-shrink: 0;
  background: #fff;
}

.emoji-picker-wrap { position: relative; flex-shrink: 0; }
.emoji-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #FF85BB;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  transition: background 0.15s, color 0.15s;
}
.emoji-btn:hover, .emoji-btn.active { background: #FFCEE3; color: #021A54; }

.emoji-panel {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  background: #fff;
  border: 1px solid #FFCEE3;
  border-radius: 14px;
  padding: 10px;
  box-shadow: 0 8px 24px rgba(255, 133, 187, 0.2);
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
.emoji-item:hover { background: #FFCEE3; transform: scale(1.2); }

.pop-enter-active, .pop-leave-active { transition: opacity 0.15s, transform 0.15s; }
.pop-enter-from, .pop-leave-to       { opacity: 0; transform: translateY(6px) scale(0.95); }

.message-input {
  flex: 1;
  padding: 10px 14px;
  border: 1.5px solid #FFCEE3;
  border-radius: 22px;
  font-size: 0.88rem;
  outline: none;
  background: rgba(255, 255, 255, 0.9);
  color: #021A54;
  transition: border-color 0.15s;
  resize: none;
  line-height: 1.45;
  max-height: 120px;
  overflow-y: auto;
  font-family: inherit;
}
.message-input:focus       { border-color: #FF85BB; }
.message-input::placeholder { color: #FF85BB; opacity: 0.6; }

.input-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.char-count { font-size: 0.72rem; color: #FF85BB; }

/* FIX: pink send button */
.send-btn {
  width: 38px; height: 38px;
  border-radius: 50%;
  border: none;
  background: #FF85BB;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, transform 0.1s;
  flex-shrink: 0;
}
.send-btn:hover:not(:disabled)   { background: #e0609a; transform: scale(1.05); }
.send-btn:disabled                { opacity: 0.45; cursor: not-allowed; }

/* ─── Empty state ─────────────────────────────────────────── */
.chat-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  /* FIX: match blush bg */
  background: #fff8fb;
}
.chat-empty-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px;
  text-align: center;
}
.empty-icon {
  width: 80px; height: 80px;
  border-radius: 50%;
  background: #FFCEE3;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FF85BB;
}
.chat-empty-inner h3 { margin: 0; font-size: 1.1rem; color: #021A54; font-weight: 700; }
.chat-empty-inner p  { margin: 0; font-size: 0.88rem; color: #9e7080; }

.empty-btns { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }

/* FIX: brand primary/support btns */
.btn-primary {
  padding: 9px 18px;
  border-radius: 20px;
  border: none;
  background: #FF85BB;
  color: #fff;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-primary:hover { background: #e0609a; }

.btn-support {
  padding: 9px 18px;
  border-radius: 20px;
  border: 1.5px solid #FFCEE3;
  background: transparent;
  color: #021A54;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-support:hover { background: #FFCEE3; }

/* ─── New chat modal ──────────────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 26, 84, 0.3);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-card {
  position: relative;
  background: #fff;
  border-radius: 20px;
  padding: 28px 24px 24px;
  width: min(100%, 420px);
  border: 1px solid #FFCEE3;
  box-shadow: 0 20px 48px rgba(2, 26, 84, 0.12);
}

.modal-close {
  position: absolute;
  top: 14px; right: 16px;
  background: none;
  border: none;
  font-size: 1.4rem;
  line-height: 1;
  color: #FF85BB;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
}
.modal-close:hover { background: #FFCEE3; }

.modal-card h3 { margin: 0 0 6px; font-size: 1.05rem; color: #021A54; font-weight: 700; }
.modal-sub     { margin: 0 0 14px; font-size: 0.82rem; color: #9e7080; }

.search-input {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid #FFCEE3;
  border-radius: 10px;
  font-size: 0.88rem;
  outline: none;
  box-sizing: border-box;
  background: #fff8fb;
  color: #021A54;
  transition: border-color 0.15s;
}
.search-input:focus { border-color: #FF85BB; }

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
.search-result-item:hover { background: #fff0f7; }

.result-avatar {
  width: 34px; height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF85BB, #e0609a);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}
.result-info { flex: 1; }
.result-name { margin: 0; font-size: 0.88rem; font-weight: 600; color: #021A54; }
.result-role { margin: 0; font-size: 0.75rem; color: #9e7080; text-transform: capitalize; }
.no-results  { padding: 12px; text-align: center; color: #9e7080; font-size: 0.85rem; }

/* ─── Modal transitions ───────────────────────────────────── */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to       { opacity: 0; }

/* ─── Responsive ──────────────────────────────────────────── */
@media (max-width: 900px) {
  .messages-page            { height: calc(100vh - 56px); }
  .conversations-sidebar    { width: 280px; }
  .bubble-col               { max-width: 74%; }
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
  .messages-list  { padding: 12px 14px; }
  .chat-header    { padding: 10px 14px; }
  .message-input-bar { padding: 8px 10px; }
  .bubble-col     { max-width: 84%; }
  .msg-actions    { left: 32px; }
  .mine .msg-actions { right: 0; left: auto; }
}

@media (max-width: 420px) {
  .sidebar-header { padding: 12px; }
  .conv-item      { padding: 8px 10px; margin: 2px 6px; }
}
</style>
