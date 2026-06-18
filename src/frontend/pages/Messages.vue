<template>
  <main class="view page active messages-page">

    <!-- ── Sidebar ───────────────────────────────────────── -->
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
        <input v-model="convSearchQuery" class="sidebar-search-input" placeholder="Search conversations…" />
      </div>

      <!-- Loading skeleton -->
      <div v-if="loadingConvs" class="conv-skeleton-list">
        <div v-for="i in 4" :key="i" class="conv-skeleton">
          <div class="skel-avatar"></div>
          <div class="skel-lines">
            <div class="skel-line skel-name"></div>
            <div class="skel-line skel-msg"></div>
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
          :class="{ active: activeConvId === conv.id, 'is-support': conv.is_support, unread: conv.unread_count > 0 }"
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
                <svg viewBox="0 0 24 24"><path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2c-4.42 0-8 2.46-8 5.5 0 .55.45 1 1 1h14c.55 0 1-.45 1-1 0-3.04-3.58-5.5-8-5.5Z"/></svg>
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

    <!-- ── Chat panel ─────────────────────────────────────── -->
    <section class="chat-panel" v-if="activeConvId">
      <div class="chat-header glass-header">
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
              typing…
            </span>
            <span v-else-if="activeConv?.is_support">StudyLink support</span>
            <span v-else>{{ activeConv?.other_user?.role || '' }}</span>
          </p>
        </div>

        <div class="chat-header-actions">
          <button class="icon-btn" @click="scrollToBottom(true)" title="Scroll to latest" aria-label="Scroll to latest message">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      </div>

      <!-- Messages list -->
      <div class="messages-list" ref="messagesList" @scroll="onMessagesScroll">
        <div v-if="loadingMessages" class="messages-loading" aria-label="Loading messages">
          <span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span>
        </div>

        <template v-for="(group, gi) in groupedMessages" :key="gi">
          <div class="date-divider" role="separator">
            <span>{{ group.label }}</span>
          </div>
          <div
            v-for="msg in group.messages"
            :key="msg.id"
            class="message-bubble-wrap"
            :class="{
              mine: msg.sender?.id === currentUserId,
              optimistic: msg.optimistic,
              failed: msg.failed
            }"
            @mouseenter="hoveredMessageId = msg.id"
            @mouseleave="hoveredMessageId = null"
          >
            <!-- Other user avatar -->
            <div v-if="msg.sender?.id !== currentUserId" class="msg-avatar" aria-hidden="true">
              <img
                v-if="normalizeAssetUrl(msg.sender?.profilePicture)"
                :src="normalizeAssetUrl(msg.sender.profilePicture)"
                :alt="msg.sender?.fullName || ''"
              />
              <span v-else>{{ (msg.sender?.fullName || '?')[0].toUpperCase() }}</span>
            </div>

            <div class="bubble-col">
              <div
                class="bubble"
                :class="{
                  'bubble-mine': msg.sender?.id === currentUserId,
                  'bubble-failed': msg.failed
                }"
              >
                <p class="bubble-text">{{ msg.content }}</p>
                <div class="bubble-meta">
                  <span class="bubble-time">{{ formatTimeShort(msg.created_at) }}</span>
                  <span v-if="msg.sender?.id === currentUserId" class="read-status" aria-hidden="true">
                    <svg v-if="msg.optimistic && !msg.failed" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" class="status-sending"><circle cx="12" cy="12" r="10" stroke-dasharray="4 2"/></svg>
                    <svg v-else-if="msg.failed" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" class="status-failed"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <svg v-else viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" class="status-sent"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                </div>
              </div>

              <button v-if="msg.failed" class="retry-btn" @click="retryMessage(msg)">↺ Retry</button>
            </div>

            <!-- Hover reactions -->
            <div v-if="hoveredMessageId === msg.id && !msg.optimistic" class="msg-actions" role="toolbar" aria-label="React to message">
              <button class="msg-action-btn" @click="toggleReaction(msg, '👍')" :class="{ reacted: hasReaction(msg, '👍') }" aria-label="👍">👍</button>
              <button class="msg-action-btn" @click="toggleReaction(msg, '❤️')" :class="{ reacted: hasReaction(msg, '❤️') }" aria-label="❤️">❤️</button>
              <button class="msg-action-btn" @click="toggleReaction(msg, '😂')" :class="{ reacted: hasReaction(msg, '😂') }" aria-label="😂">😂</button>
            </div>

            <!-- Reaction chips -->
            <div
              v-if="getReactions(msg).length"
              class="reactions-row"
              :class="{ 'reactions-mine': msg.sender?.id === currentUserId }"
            >
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

        <div v-if="messages.length === 0 && !loadingMessages" class="no-messages" role="status">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <p>Say hello! 👋</p>
        </div>
      </div>

      <!-- Scroll to bottom FAB -->
      <Transition name="fade-up">
        <button v-if="showScrollBtn" class="scroll-fab" @click="scrollToBottom(true)" aria-label="Scroll to bottom">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          <span v-if="newMessageCount > 0" class="scroll-badge">{{ newMessageCount }}</span>
        </button>
      </Transition>

      <!-- Input bar -->
      <div class="message-input-bar glass-input-bar">
        <div class="emoji-picker-wrap">
          <button
            class="emoji-btn"
            @click="showEmojiPicker = !showEmojiPicker"
            title="Emoji"
            :class="{ active: showEmojiPicker }"
            aria-label="Open emoji picker"
            aria-expanded="showEmojiPicker"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
          </button>
          <Transition name="pop">
            <div v-if="showEmojiPicker" class="emoji-panel" @click.stop role="dialog" aria-label="Emoji picker">
              <div class="emoji-grid">
                <button v-for="em in commonEmojis" :key="em" class="emoji-item" @click="insertEmoji(em)" :aria-label="em">{{ em }}</button>
              </div>
            </div>
          </Transition>
        </div>

        <textarea
          ref="inputRef"
          v-model="newMessage"
          class="message-input"
          placeholder="Type a message…"
          maxlength="2000"
          autocomplete="off"
          :disabled="sending"
          rows="1"
          aria-label="Message input"
          @keydown.enter.exact.prevent="sendMessage"
          @keydown.enter.shift.exact="() => {}"
          @input="onInput"
          @focus="showEmojiPicker = false"
        ></textarea>

        <div class="input-right">
          <span class="char-count" v-if="newMessage.length > 1800" aria-live="polite">{{ 2000 - newMessage.length }}</span>
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

    <!-- ── Empty state (no active chat) ──────────────────── -->
    <section v-else class="chat-empty">
      <div class="chat-empty-inner glass-card">
        <div class="empty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="52" height="52" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <h3>Start a conversation</h3>
        <p>Message a tutor, tutee, or contact support.</p>
        <div class="empty-btns">
          <button class="btn-primary" @click="showNewChat = true">New Message</button>
          <button class="btn-support" @click="openSupport">Contact Support</button>
        </div>
      </div>
    </section>

    <!-- ── New Chat Modal ─────────────────────────────────── -->
    <Transition name="modal-fade">
      <div v-if="showNewChat" class="modal-backdrop" @click.self="showNewChat = false" role="dialog" aria-modal="true" aria-label="Start new conversation">
        <div class="modal-card glass-modal" @keydown.esc="showNewChat = false">
          <button class="modal-close" @click="showNewChat = false" aria-label="Close">×</button>
          <h3>New Conversation</h3>
          <p class="modal-sub">Search for a user to message.</p>
          <div class="modal-search-wrap">
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              class="search-input"
              placeholder="Search by name or role…"
              @input="onSearch"
              aria-label="Search users"
              autocomplete="off"
            />
            <div v-if="searching" class="search-spinner" aria-label="Searching">
              <span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span>
            </div>
            <ul v-if="searchResults.length" class="search-results" role="listbox">
              <li
                v-for="user in searchResults"
                :key="user.id"
                class="search-result-item"
                @click="startConversation(user)"
                role="option"
                tabindex="0"
                @keydown.enter="startConversation(user)"
              >
                <div class="result-avatar" aria-hidden="true">{{ (user.full_name || '?')[0].toUpperCase() }}</div>
                <div class="result-info">
                  <p class="result-name">{{ user.full_name }}</p>
                  <p class="result-role">{{ user.role }}</p>
                </div>
              </li>
            </ul>
            <p v-else-if="searchQuery.length >= 2 && !searching" class="no-results">No users found.</p>
          </div>
        </div>
      </div>
    </Transition>

  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { api, getUser } from '@/api.js'
import { normalizeAssetUrl } from '@/utils/records.js'

// ── Auth ──────────────────────────────────────────────────
const currentUser = getUser()
const currentUserId = currentUser?.id ?? null

// ── Refs ──────────────────────────────────────────────────
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

// ── FIX: safe mobile detection with cleanup ───────────────
const isMobile = ref(window.innerWidth <= 640)
const onResize = () => { isMobile.value = window.innerWidth <= 640 }

let pollTimer     = null
let convPollTimer = null

const commonEmojis = ['😊','😂','❤️','👍','🙏','🎉','🔥','✅','😮','😢','👋','💪','🤔','📚','⏰','✨']

// ── Computed ──────────────────────────────────────────────
const filteredConversations = computed(() => {
  if (!convSearchQuery.value.trim()) return conversations.value
  const q = convSearchQuery.value.toLowerCase()
  return conversations.value.filter(c =>
    convDisplayName(c).toLowerCase().includes(q) ||
    (c.last_message ?? '').toLowerCase().includes(q)
  )
})

const groupedMessages = computed(() => {
  const groups = []
  let lastDate = null
  for (const msg of messages.value) {
    // FIX: guard invalid dates
    const raw = msg.created_at
    if (!raw) continue
    const d = new Date(raw)
    if (isNaN(d.getTime())) continue
    const dateKey = d.toDateString()
    const label   = getDateLabel(d)
    if (dateKey !== lastDate) {
      groups.push({ label, messages: [] })
      lastDate = dateKey
    }
    groups[groups.length - 1].messages.push(msg)
  }
  return groups
})

// ── Avatar helpers ────────────────────────────────────────
const conversationAvatarKey = (conv) => String(conv?.id ?? '')

const hasConversationAvatar = (conv) => {
  const key = conversationAvatarKey(conv)
  if (avatarLoadErrors.value[key]) return false
  const url = normalizeAssetUrl(conv?.other_user?.profilePicture ?? '')
  return !!url && !conv?.is_support
}

const markConversationAvatarError = (conv) => {
  const key = conversationAvatarKey(conv)
  avatarLoadErrors.value = { ...avatarLoadErrors.value, [key]: true }
}

const convDisplayName = (conv) => {
  if (!conv) return ''
  if (conv.is_support) return 'StudyLink Support'
  return conv.other_user?.fullName ?? conv.other_user?.full_name ?? 'Unknown User'
}

const convInitials = (conv) => {
  const name = convDisplayName(conv)
  if (!name || name === 'Unknown User') return '?'
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

// ── Date helpers ──────────────────────────────────────────
const getDateLabel = (d) => {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatTime = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const diff = now - d
  if (diff < 60000)  return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

const formatTimeShort = (ts) => {
  if (!ts) return ''
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ── Reactions ─────────────────────────────────────────────
const getReactions = (msg) => {
  const store = reactionsStore.value[msg.id] ?? {}
  return Object.entries(store)
    .filter(([, v]) => v.count > 0)
    .map(([emoji, v]) => ({ emoji, count: v.count, mine: v.mine }))
}

const hasReaction = (msg, emoji) => {
  return reactionsStore.value[msg.id]?.[emoji]?.mine ?? false
}

const toggleReaction = (msg, emoji) => {
  if (!reactionsStore.value[msg.id]) reactionsStore.value[msg.id] = {}
  const current = reactionsStore.value[msg.id][emoji] ?? { count: 0, mine: false }
  reactionsStore.value[msg.id][emoji] = current.mine
    ? { count: Math.max(0, current.count - 1), mine: false }
    : { count: current.count + 1, mine: true }
}

// ── Scroll ────────────────────────────────────────────────
const isAtBottom = () => {
  if (!messagesList.value) return true
  const { scrollTop, scrollHeight, clientHeight } = messagesList.value
  return scrollHeight - scrollTop - clientHeight < 60
}

const scrollToBottom = async (smooth = false) => {
  await nextTick()
  if (messagesList.value) {
    messagesList.value.scrollTo({ top: messagesList.value.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
    showScrollBtn.value   = false
    newMessageCount.value = 0
  }
}

const onMessagesScroll = () => {
  if (!messagesList.value) return
  if (isAtBottom()) {
    showScrollBtn.value   = false
    newMessageCount.value = 0
  }
}

// ── Textarea auto-resize ──────────────────────────────────
const autoResize = () => {
  if (!inputRef.value) return
  inputRef.value.style.height = 'auto'
  inputRef.value.style.height = Math.min(inputRef.value.scrollHeight, 120) + 'px'
}

const onInput = () => { autoResize() }

const insertEmoji = (emoji) => {
  newMessage.value += emoji
  showEmojiPicker.value = false
  nextTick(() => inputRef.value?.focus())
}

// ── Data ──────────────────────────────────────────────────
const loadConversations = async () => {
  try {
    const data = await api('/conversations')
    // FIX: safe fallback if data is null/undefined
    conversations.value   = data?.conversations ?? []
    avatarLoadErrors.value = {}
  } catch (err) {
    console.error('[Messages] loadConversations error:', err)
  } finally {
    loadingConvs.value = false
  }
}

const openConversation = async (conv) => {
  if (!conv?.id) return
  activeConvId.value      = conv.id
  messages.value          = []
  loadingMessages.value   = true
  await loadMessages(conv.id)
  // FIX: mutate the reactive list item for unread reset
  const idx = conversations.value.findIndex(c => c.id === conv.id)
  if (idx !== -1) conversations.value[idx].unread_count = 0
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
    const data       = await api(`/conversations/${convId}/messages`)
    const incoming   = data?.messages ?? []
    const wasAtBottom = isAtBottom()
    const prevLen    = messages.value.filter(m => !m.optimistic).length

    // Merge: keep optimistic not yet confirmed
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
  } catch (err) {
    console.error('[Messages] loadMessages error:', err)
  } finally {
    loadingMessages.value = false
  }
}

const sendMessage = async () => {
  const content = newMessage.value.trim()
  if (!content || !activeConvId.value || sending.value) return

  newMessage.value      = ''
  autoResize()
  showEmojiPicker.value = false

  // Optimistic insert
  const tempId       = `opt-${Date.now()}`
  const optimisticMsg = {
    id: tempId,
    content,
    created_at: new Date().toISOString(),
    // FIX: guard currentUser null
    sender: {
      id: currentUserId,
      fullName:       currentUser?.fullName ?? '',
      profilePicture: currentUser?.profilePictureUrl ?? '',
    },
    optimistic: true,
    failed:     false,
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
    // FIX: mark failed
    const idx = messages.value.findIndex(m => m.id === tempId)
    if (idx !== -1) messages.value[idx] = { ...messages.value[idx], failed: true, optimistic: false }
  } finally {
    sending.value = false
    await nextTick()
    inputRef.value?.focus()
  }
}

const retryMessage = async (msg) => {
  messages.value   = messages.value.filter(m => m.id !== msg.id)
  newMessage.value = msg.content
  await nextTick()
  inputRef.value?.focus()
}

const openSupport = async () => {
  showNewChat.value = false
  try {
    const data = await api('/conversations/support', 'POST')
    await loadConversations()
    const conv = conversations.value.find(c => c.id === data?.conversationId)
    if (conv) {
      openConversation(conv)
    } else if (data?.conversationId) {
      activeConvId.value = data.conversationId
      await loadMessages(data.conversationId)
    }
  } catch (err) {
    console.error('[Messages] openSupport error:', err)
  }
}

// ── Polling ───────────────────────────────────────────────
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
  if (pollTimer)     { clearInterval(pollTimer);     pollTimer = null }
  if (convPollTimer) { clearInterval(convPollTimer); convPollTimer = null }
}

// ── User search ───────────────────────────────────────────
let searchTimeout = null
const onSearch = () => {
  clearTimeout(searchTimeout)
  if (searchQuery.value.length < 2) { searchResults.value = []; return }
  searchTimeout = setTimeout(async () => {
    searching.value = true
    try {
      const data = await api(`/users/search?q=${encodeURIComponent(searchQuery.value)}`)
      searchResults.value = data?.users ?? []
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
    const conv = conversations.value.find(c => c.id === data?.conversationId)
    if (conv) openConversation(conv)
  } catch (err) {
    console.error('[Messages] startConversation error:', err)
  }
}

// ── Events ────────────────────────────────────────────────
const handleProfileUpdated = async () => {
  await loadConversations()
  if (activeConvId.value) await loadMessages(activeConvId.value)
}

// FIX: keyboard trap for Escape on emoji picker
const handleGlobalKeydown = (e) => {
  if (e.key === 'Escape') {
    showEmojiPicker.value = false
    if (showNewChat.value) showNewChat.value = false
  }
}

// FIX: close emoji picker on outside click
const handleGlobalClick = () => { showEmojiPicker.value = false }

onMounted(() => {
  loadConversations()
  window.addEventListener('resize', onResize)
  window.addEventListener('studylink-profile-updated', handleProfileUpdated)
  document.addEventListener('click', handleGlobalClick)
  document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  stopPolling()
  window.removeEventListener('resize', onResize)
  window.removeEventListener('studylink-profile-updated', handleProfileUpdated)
  document.removeEventListener('click', handleGlobalClick)
  document.removeEventListener('keydown', handleGlobalKeydown)
  clearTimeout(searchTimeout)
})

watch(showNewChat, (val) => {
  if (!val) {
    searchQuery.value   = ''
    searchResults.value = []
  } else {
    nextTick(() => searchInputRef.value?.focus())
  }
})
</script>

<style scoped>
/* ─── Layout ───────────────────────────────────────────── */
.messages-page {
  display: flex;
  height: calc(100vh - 60px);
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
  gap: 0;
  overflow: hidden;
  background: var(--canvas-parchment, #F5F5F5);
}

/* ─── Sidebar ──────────────────────────────────────────── */
.conversations-sidebar {
  width: 320px;
  flex-shrink: 0;
  min-height: 0;
  border-right: 1px solid var(--primary-soft, #FFCEE3);
  display: flex;
  flex-direction: column;
  background: #ffffff;
  overflow: hidden;
  transition: transform 0.25s ease;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 16px 10px;
  border-bottom: 1px solid var(--primary-soft, #FFCEE3);
  flex-shrink: 0;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.15rem;
  color: var(--ink, #021A54);
  font-weight: 700;
}

.sidebar-actions { display: flex; gap: 6px; }

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--primary-soft, #FFCEE3);
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  transition: background 0.15s, transform 0.1s;
  color: var(--ink, #021A54);
  background: #ffffff;
}
.action-btn:hover { background: var(--primary-soft, #FFCEE3); transform: translateY(-1px); }

.support-btn { color: var(--ink, #021A54); }
.new-btn     { background: var(--primary, #FF85BB); color: #fff; border-color: var(--primary, #FF85BB); }
.new-btn:hover { background: var(--primary-hover, #ff6da9); border-color: var(--primary-hover, #ff6da9); }

/* Search */
.sidebar-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--theme-border, #e0e0e0);
  flex-shrink: 0;
}
.sidebar-search-icon { flex-shrink: 0; color: var(--ink-muted, #6e6e73); }
.sidebar-search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 0.85rem;
  background: transparent;
  color: var(--ink, #021A54);
}
.sidebar-search-input::placeholder { color: var(--ink-muted, #6e6e73); }

/* Skeleton loading */
.conv-skeleton-list { padding: 8px 12px; display: flex; flex-direction: column; gap: 4px; }
.conv-skeleton {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 10px;
  animation: shimmer 1.4s ease infinite;
  background: linear-gradient(90deg, #f5f5f5 25%, #ececec 50%, #f5f5f5 75%);
  background-size: 200% 100%;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.skel-avatar { width: 38px; height: 38px; border-radius: 50%; background: #e0e0e0; flex-shrink: 0; }
.skel-lines  { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.skel-line   { height: 10px; border-radius: 6px; background: #e0e0e0; }
.skel-name   { width: 55%; }
.skel-msg    { width: 75%; opacity: 0.6; }

/* Empty convs */
.empty-convs { padding: 32px 20px; text-align: center; color: var(--ink-muted, #6e6e73); font-size: 0.88rem; }
.empty-hint  { font-size: 0.78rem; margin-top: 6px; color: #aaa; }

/* Conv list */
.conv-list { list-style: none; margin: 0; padding: 6px 0; overflow-y: auto; flex: 1; }

.conv-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.13s;
  border-radius: 0;
  position: relative;
}
.conv-item:hover     { background: var(--primary-soft, #FFCEE3); }
.conv-item.active    { background: var(--primary-soft, #FFCEE3); border-left: 3px solid var(--primary, #FF85BB); }
.conv-item.unread    { background: rgba(255, 133, 187, 0.07); }

.conv-avatar-wrap { position: relative; flex-shrink: 0; }
.conv-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary, #FF85BB), #ff6da9);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.9rem;
  overflow: hidden;
  border: 2px solid var(--primary-soft, #FFCEE3);
}
.conv-avatar img { width: 100%; height: 100%; object-fit: cover; }
.support-avatar  { background: linear-gradient(135deg, #021A54, #0a3a8f); }

.avatar-fallback-icon { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
.avatar-fallback-icon svg { width: 20px; height: 20px; fill: rgba(255,255,255,0.85); }

.online-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #22c55e;
  border: 2px solid #fff;
  position: absolute;
  bottom: 0;
  right: 0;
}

.conv-info { flex: 1; min-width: 0; }
.conv-top  { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; }
.conv-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--ink, #021A54);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.conv-time { font-size: 0.7rem; color: var(--ink-muted, #6e6e73); flex-shrink: 0; }

.conv-bottom { display: flex; justify-content: space-between; align-items: center; gap: 6px; margin-top: 2px; }
.conv-last {
  font-size: 0.78rem;
  color: var(--ink-muted, #6e6e73);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}
.conv-last-unread { color: var(--ink, #021A54); font-weight: 600; }

.unread-badge {
  background: var(--primary, #FF85BB);
  color: #fff;
  border-radius: 10px;
  padding: 1px 7px;
  font-size: 0.68rem;
  font-weight: 700;
  flex-shrink: 0;
}

/* ─── Chat panel ───────────────────────────────────────── */
.chat-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #ffffff;
  position: relative;
}

.glass-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--primary-soft, #FFCEE3);
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.back-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--primary, #FF85BB);
  padding: 6px;
  border-radius: 8px;
  transition: background 0.15s;
}
.back-btn:hover { background: var(--primary-soft, #FFCEE3); }

.chat-header-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary, #FF85BB), #ff6da9);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
  overflow: hidden;
  border: 2px solid var(--primary-soft, #FFCEE3);
}
.chat-header-avatar img { width: 100%; height: 100%; object-fit: cover; }

.chat-header-info { flex: 1; min-width: 0; }
.chat-header-info h3 {
  margin: 0;
  font-size: 0.95rem;
  color: var(--ink, #021A54);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.chat-role { font-size: 0.72rem; color: var(--ink-muted, #6e6e73); text-transform: capitalize; margin: 0; }
.support-label { color: var(--ink, #021A54); font-weight: 600; }

.typing-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--primary, #FF85BB);
  font-style: italic;
}
.typing-dots { display: flex; gap: 3px; align-items: center; }
.typing-dots span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--primary, #FF85BB);
  animation: bounce 1.2s infinite;
}
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes bounce { 0%,80%,100% { transform: translateY(0); } 40% { transform: translateY(-5px); } }

.chat-header-actions { display: flex; gap: 6px; }
.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--theme-border, #e0e0e0);
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink, #021A54);
  transition: background 0.15s;
}
.icon-btn:hover { background: var(--primary-soft, #FFCEE3); border-color: var(--primary, #FF85BB); }

/* ─── Messages list ────────────────────────────────────── */
.messages-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  scroll-behavior: smooth;
  background: var(--canvas-parchment, #F5F5F5);
}

.messages-loading {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding: 20px;
}
.loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--primary, #FF85BB);
  animation: bounce 1.2s infinite;
}
.loading-dot:nth-child(2) { animation-delay: 0.2s; }
.loading-dot:nth-child(3) { animation-delay: 0.4s; }

/* Date divider */
.date-divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 12px 0 6px;
  color: var(--ink-muted, #6e6e73);
  font-size: 0.72rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.date-divider::before,
.date-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--primary-soft, #FFCEE3);
}

/* Message bubble wrap */
.message-bubble-wrap {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  position: relative;
  margin-bottom: 4px;
}
.message-bubble-wrap.mine {
  flex-direction: row-reverse;
}
.message-bubble-wrap.optimistic { opacity: 0.75; }

.msg-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary, #FF85BB), #ff6da9);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
  overflow: hidden;
}
.msg-avatar img { width: 100%; height: 100%; object-fit: cover; }

.bubble-col {
  display: flex;
  flex-direction: column;
  max-width: 68%;
  gap: 3px;
}

.bubble {
  padding: 9px 13px;
  border-radius: 16px 16px 16px 4px;
  background: #ffffff;
  border: 1px solid var(--primary-soft, #FFCEE3);
  word-break: break-word;
  position: relative;
  box-shadow: 0 1px 4px rgba(2, 26, 84, 0.06);
}
.bubble-mine {
  background: var(--primary, #FF85BB);
  border-color: var(--primary, #FF85BB);
  border-radius: 16px 16px 4px 16px;
  color: #fff;
}
.bubble-failed {
  background: #fff0f0;
  border-color: #fca5a5;
}

.bubble-text { margin: 0; font-size: 0.88rem; line-height: 1.45; color: var(--ink, #021A54); }
.bubble-mine .bubble-text  { color: #fff; }
.bubble-failed .bubble-text { color: #991b1b; }

.bubble-meta { display: flex; align-items: center; gap: 4px; justify-content: flex-end; margin-top: 3px; }
.bubble-time { font-size: 0.67rem; color: var(--ink-muted, #6e6e73); }
.bubble-mine .bubble-time { color: rgba(255,255,255,0.7); }

.read-status svg { display: block; }
.status-sending { stroke: rgba(255,255,255,0.5); animation: spin 1.5s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.status-sent   { stroke: rgba(255,255,255,0.8); }
.status-failed { stroke: #ef4444; }

.retry-btn {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 2px 0;
  text-decoration: underline;
  transition: color 0.1s;
}
.retry-btn:hover { color: #b91c1c; }

/* Hover actions */
.msg-actions {
  display: flex;
  gap: 2px;
  background: #fff;
  border: 1px solid var(--primary-soft, #FFCEE3);
  border-radius: 20px;
  padding: 3px 6px;
  box-shadow: 0 2px 8px rgba(2, 26, 84, 0.1);
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
  font-size: 0.9rem;
  padding: 2px 4px;
  border-radius: 6px;
  transition: background 0.1s, transform 0.1s;
}
.msg-action-btn:hover { background: var(--primary-soft, #FFCEE3); transform: scale(1.2); }
.msg-action-btn.reacted { background: rgba(255,133,187,0.2); }

/* Reactions */
.reactions-row { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; padding-left: 36px; }
.reactions-mine { justify-content: flex-end; padding-left: 0; }

.reaction-chip {
  display: flex;
  align-items: center;
  gap: 3px;
  background: var(--primary-soft, #FFCEE3);
  border: 1px solid var(--primary-soft, #FFCEE3);
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 0.78rem;
  cursor: pointer;
  transition: background 0.1s, border-color 0.1s;
}
.reaction-chip span { color: var(--ink, #021A54); font-weight: 600; }
.reaction-chip:hover { background: rgba(255,133,187,0.4); }
.reaction-mine { background: rgba(255,133,187,0.25); border-color: var(--primary, #FF85BB); }

.no-messages {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--ink-muted, #6e6e73);
  font-size: 0.9rem;
  opacity: 0.6;
  padding: 40px;
  text-align: center;
}
.no-messages svg { opacity: 0.4; stroke: var(--primary, #FF85BB); }

/* ─── Scroll FAB ───────────────────────────────────────── */
.scroll-fab {
  position: absolute;
  bottom: 80px;
  right: 20px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--primary, #FF85BB);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(255, 133, 187, 0.4);
  transition: background 0.15s, transform 0.1s;
  z-index: 10;
}
.scroll-fab:hover { background: var(--primary-hover, #ff6da9); transform: scale(1.05); }

.scroll-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--ink, #021A54);
  color: #fff;
  border-radius: 10px;
  padding: 0 5px;
  font-size: 0.65rem;
  font-weight: 700;
  min-width: 16px;
  text-align: center;
}

/* ─── Input bar ────────────────────────────────────────── */
.glass-input-bar {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid var(--primary-soft, #FFCEE3);
  flex-shrink: 0;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.emoji-picker-wrap { position: relative; flex-shrink: 0; }
.emoji-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--theme-border, #e0e0e0);
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-muted, #6e6e73);
  transition: background 0.15s, color 0.15s;
}
.emoji-btn:hover,
.emoji-btn.active { background: var(--primary-soft, #FFCEE3); color: var(--primary, #FF85BB); border-color: var(--primary, #FF85BB); }

.emoji-panel {
  position: absolute;
  bottom: 46px;
  left: 0;
  background: #fff;
  border: 1px solid var(--primary-soft, #FFCEE3);
  border-radius: 14px;
  padding: 10px;
  box-shadow: 0 4px 20px rgba(2, 26, 84, 0.12);
  z-index: 20;
  width: 228px;
}
.emoji-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px; }
.emoji-item {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 5px;
  border-radius: 6px;
  transition: background 0.1s, transform 0.1s;
  text-align: center;
}
.emoji-item:hover { background: var(--primary-soft, #FFCEE3); transform: scale(1.15); }

.message-input {
  flex: 1;
  padding: 9px 12px;
  border: 1px solid var(--primary-soft, #FFCEE3);
  border-radius: 20px;
  font-size: 0.88rem;
  resize: none;
  outline: none;
  line-height: 1.45;
  max-height: 120px;
  overflow-y: auto;
  background: #fff;
  color: var(--ink, #021A54);
  transition: border-color 0.15s;
  font-family: inherit;
}
.message-input:focus { border-color: var(--primary, #FF85BB); }
.message-input:disabled { opacity: 0.6; cursor: not-allowed; }
.message-input::placeholder { color: var(--ink-muted, #6e6e73); }

.input-right { display: flex; align-items: flex-end; gap: 6px; flex-shrink: 0; }
.char-count { font-size: 0.72rem; color: #ef4444; font-weight: 600; }

.send-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--primary, #FF85BB);
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s, transform 0.1s;
  box-shadow: 0 2px 6px rgba(255, 133, 187, 0.4);
}
.send-btn:hover:not(:disabled) { background: var(--primary-hover, #ff6da9); transform: scale(1.05); }
.send-btn:active:not(:disabled) { transform: scale(0.93); }
.send-btn:disabled { background: var(--primary-soft, #FFCEE3); cursor: not-allowed; box-shadow: none; }

/* ─── Empty state ──────────────────────────────────────── */
.chat-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--canvas-parchment, #F5F5F5);
}

.glass-card {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--primary-soft, #FFCEE3);
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(2, 26, 84, 0.08);
  text-align: center;
  padding: 48px 40px;
  max-width: 380px;
  width: 100%;
}
.empty-icon { color: var(--primary, #FF85BB); margin-bottom: 16px; display: flex; justify-content: center; }
.glass-card h3 { margin: 0 0 8px; color: var(--ink, #021A54); font-size: 1.2rem; font-weight: 700; }
.glass-card p  { color: var(--ink-muted, #6e6e73); font-size: 0.88rem; margin: 0 0 24px; }
.empty-btns    { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

.btn-primary {
  padding: 10px 22px;
  background: var(--primary, #FF85BB);
  color: #fff;
  border: none;
  border-radius: 22px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: background 0.15s, transform 0.1s;
  box-shadow: 0 2px 8px rgba(255, 133, 187, 0.3);
}
.btn-primary:hover { background: var(--primary-hover, #ff6da9); transform: translateY(-1px); }

.btn-support {
  padding: 10px 22px;
  background: #ffffff;
  color: var(--ink, #021A54);
  border: 1px solid var(--primary-soft, #FFCEE3);
  border-radius: 22px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: background 0.15s, transform 0.1s;
}
.btn-support:hover { background: var(--primary-soft, #FFCEE3); transform: translateY(-1px); }

/* ─── Modal ────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2, 26, 84, 0.35);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 16px;
}

.glass-modal {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--primary-soft, #FFCEE3);
  border-radius: 20px;
  padding: 28px 24px;
  width: 100%;
  max-width: 420px;
  position: relative;
  box-shadow: 0 8px 40px rgba(2, 26, 84, 0.15);
}
.modal-close {
  position: absolute;
  top: 14px;
  right: 16px;
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--ink-muted, #6e6e73);
  cursor: pointer;
  line-height: 1;
  padding: 4px;
  border-radius: 6px;
  transition: background 0.15s, color 0.15s;
}
.modal-close:hover { background: var(--primary-soft, #FFCEE3); color: var(--ink, #021A54); }
.glass-modal h3   { margin: 0 0 4px; color: var(--ink, #021A54); font-size: 1.1rem; font-weight: 700; }
.modal-sub        { margin: 0 0 16px; font-size: 0.82rem; color: var(--ink-muted, #6e6e73); }

.modal-search-wrap { position: relative; }
.search-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--primary-soft, #FFCEE3);
  border-radius: 10px;
  font-size: 0.88rem;
  outline: none;
  box-sizing: border-box;
  background: #f9f9f9;
  color: var(--ink, #021A54);
  transition: border-color 0.15s;
  font-family: inherit;
}
.search-input:focus { border-color: var(--primary, #FF85BB); background: #fff; }
.search-input::placeholder { color: var(--ink-muted, #6e6e73); }

.search-spinner {
  display: flex;
  gap: 4px;
  justify-content: center;
  padding: 12px;
}

.search-results {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid var(--primary-soft, #FFCEE3);
  border-radius: 10px;
  background: #fff;
}
.search-result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.12s;
}
.search-result-item:hover,
.search-result-item:focus { background: var(--primary-soft, #FFCEE3); outline: none; }
.search-result-item + .search-result-item { border-top: 1px solid var(--theme-border, #e0e0e0); }

.result-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary, #FF85BB), #ff6da9);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.85rem;
  flex-shrink: 0;
}
.result-name { margin: 0; font-size: 0.88rem; font-weight: 600; color: var(--ink, #021A54); }
.result-role { margin: 0; font-size: 0.75rem; color: var(--ink-muted, #6e6e73); text-transform: capitalize; }
.no-results  { padding: 14px; text-align: center; color: var(--ink-muted, #6e6e73); font-size: 0.85rem; }

/* ─── Transitions ──────────────────────────────────────── */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

.pop-enter-active  { transition: opacity 0.15s, transform 0.15s; }
.pop-leave-active  { transition: opacity 0.1s, transform 0.1s; }
.pop-enter-from    { opacity: 0; transform: scale(0.9) translateY(4px); }
.pop-leave-to      { opacity: 0; transform: scale(0.9) translateY(4px); }

.fade-up-enter-active { transition: opacity 0.2s, transform 0.2s; }
.fade-up-leave-active { transition: opacity 0.15s, transform 0.15s; }
.fade-up-enter-from   { opacity: 0; transform: translateY(8px); }
.fade-up-leave-to     { opacity: 0; transform: translateY(8px); }

/* ─── Responsive ───────────────────────────────────────── */
@media (max-width: 900px) {
  .messages-page { height: calc(100vh - 56px); }
  .conversations-sidebar { width: 280px; }
  .bubble-col { max-width: 74%; }
}

@media (max-width: 640px) {
  .messages-page { flex-direction: row; height: calc(100vh - 56px); overflow: hidden; }

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
  .glass-header { padding: 10px 14px; }
  .glass-input-bar { padding: 8px 10px; }
  .bubble-col { max-width: 85%; }
  .msg-actions { left: 32px; }
  .mine .msg-actions { right: 0; left: auto; }
}

@media (max-width: 420px) {
  .sidebar-header { padding: 12px; }
  .conv-item { padding: 8px 10px; }
  .glass-card { padding: 32px 20px; }
}
</style>
