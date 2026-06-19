<template>
  <main class="messages-page view page active">

    <!-- ── Sidebar ── -->
    <aside class="conversations-sidebar" :class="{ 'mobile-hidden': activeConvId && isMobile }">
      <div class="sidebar-header">
        <h2 class="sidebar-title">Messages</h2>
        <div class="sidebar-actions">
          <button class="action-btn" @click="openSupport" title="Contact Support">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Support
          </button>
          <button class="action-btn action-btn--primary" @click="showNewChat = true" title="New Message">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New
          </button>
        </div>
      </div>

      <div class="sidebar-search">
        <svg class="sidebar-search-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="convSearchQuery" class="sidebar-search-input" placeholder="Search conversations…" aria-label="Search conversations"/>
      </div>

      <!-- Skeleton -->
      <div v-if="loadingConvs" class="conv-skeleton-list" aria-label="Loading conversations">
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
        <p v-if="!convSearchQuery" class="empty-hint">Start one with a tutor or tutee.</p>
      </div>

      <ul v-else class="conv-list">
        <li
          v-for="conv in filteredConversations"
          :key="conv.id"
          class="conv-item"
          :class="{ active: activeConvId === conv.id, 'is-support': conv.is_support, unread: conv.unread_count > 0 }"
          @click="openConversation(conv)"
          :aria-current="activeConvId === conv.id ? 'true' : undefined"
        >
          <div class="conv-avatar-wrap">
            <div class="conv-avatar" :class="{ 'support-avatar': conv.is_support }">
              <img v-if="hasConversationAvatar(conv)"
                :src="normalizeAssetUrl(conv.other_user?.profilePicture)"
                :alt="convDisplayName(conv)"
                @error="markConversationAvatarError(conv)"
              />
              <div v-else-if="!conv.is_support" class="avatar-fallback-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2c-4.42 0-8 2.46-8 5.5 0 .55.45 1 1 1h14c.55 0 1-.45 1-1 0-3.04-3.58-5.5-8-5.5Z" fill="currentColor"/></svg>
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

    <!-- ── Chat Panel ── -->
    <section class="chat-panel" v-if="activeConvId">
      <div class="chat-header glass-header">
        <button class="back-btn" @click="closeConversation" title="Back" aria-label="Back to conversations">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div class="chat-header-avatar" aria-hidden="true">
          <img v-if="activeConv && hasConversationAvatar(activeConv)"
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
            <span v-else-if="activeConv?.is_support">StudyLink Support</span>
            <span v-else>{{ activeConv?.other_user?.role || '' }}</span>
          </p>
        </div>
        <div class="chat-header-actions">
          <button class="icon-btn" @click="scrollToBottom(true)" title="Scroll to latest" aria-label="Scroll to latest">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      </div>

      <div class="messages-list" ref="messagesList" @scroll="onMessagesScroll">
        <div v-if="loadingMessages" class="messages-loading" aria-label="Loading messages">
          <span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span>
        </div>
        <template v-for="(group, gi) in groupedMessages" :key="gi">
          <div class="date-divider" role="separator"><span>{{ group.label }}</span></div>
          <div
            v-for="msg in group.messages"
            :key="msg.id"
            class="message-bubble-wrap"
            :class="{ mine: msg.sender?.id === currentUserId, optimistic: msg.optimistic, failed: msg.failed }"
            @mouseenter="hoveredMessageId = msg.id"
            @mouseleave="hoveredMessageId = null"
          >
            <div v-if="msg.sender?.id !== currentUserId" class="msg-avatar" aria-hidden="true">
              <img v-if="normalizeAssetUrl(msg.sender?.profilePicture)"
                :src="normalizeAssetUrl(msg.sender.profilePicture)"
                :alt="msg.sender?.fullName || ''"
              />
              <span v-else>{{ (msg.sender?.fullName || '?')[0].toUpperCase() }}</span>
            </div>
            <div class="bubble-col">
              <div class="bubble" :class="{ 'bubble-mine': msg.sender?.id === currentUserId, 'bubble-failed': msg.failed }">
                <p class="bubble-text">{{ msg.content }}</p>
                <div class="bubble-meta">
                  <span class="bubble-time">{{ formatTimeShort(msg.created_at) }}</span>
                  <span v-if="msg.sender?.id === currentUserId" class="read-status" aria-hidden="true">
                    <svg v-if="msg.optimistic && !msg.failed" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" class="status-sending"><circle cx="12" cy="12" r="10" stroke-dasharray="4 2"/></svg>
                    <svg v-else-if="msg.failed" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <svg v-else viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                </div>
              </div>
              <button v-if="msg.failed" class="retry-btn" @click="retryMessage(msg)">↺ Retry</button>
            </div>
            <div v-if="hoveredMessageId === msg.id && !msg.optimistic" class="msg-actions" role="toolbar" aria-label="React to message">
              <button class="msg-action-btn" @click="toggleReaction(msg, '👍')" :class="{ reacted: hasReaction(msg, '👍') }" aria-label="👍">👍</button>
              <button class="msg-action-btn" @click="toggleReaction(msg, '❤️')" :class="{ reacted: hasReaction(msg, '❤️') }" aria-label="❤️">❤️</button>
              <button class="msg-action-btn" @click="toggleReaction(msg, '😂')" :class="{ reacted: hasReaction(msg, '😂') }" aria-label="😂">😂</button>
            </div>
          </div>
        </template>
      </div>

      <!-- Scroll-to-bottom button -->
      <Transition name="fade-up">
        <button v-if="showScrollBtn" class="scroll-bottom-btn" @click="scrollToBottom(true)" aria-label="Jump to latest">
          ↓ <span v-if="newMessageCount > 0">{{ newMessageCount }} new</span>
        </button>
      </Transition>

      <!-- Input bar -->
      <div class="glass-input-bar">
        <div class="input-area" :class="{ focused: inputFocused }">
          <div class="emoji-wrap" @click.stop>
            <button class="emoji-btn" @click="showEmojiPicker = !showEmojiPicker" aria-label="Emoji picker" :aria-expanded="showEmojiPicker">😊</button>
            <Transition name="pop">
              <div v-if="showEmojiPicker" class="emoji-picker" role="dialog" aria-label="Emoji picker">
                <button v-for="e in emojis" :key="e" class="emoji-opt" @click="insertEmoji(e)" :aria-label="e">{{ e }}</button>
              </div>
            </Transition>
          </div>
          <textarea
            ref="inputRef"
            v-model="newMessage"
            class="message-input"
            placeholder="Type a message…"
            rows="1"
            maxlength="2000"
            @focus="inputFocused = true"
            @blur="inputFocused = false"
            @input="onInput"
            @keydown.enter.exact.prevent="sendMessage"
            @keydown.enter.shift.exact="() => {}"
            aria-label="Message input"
          ></textarea>
          <button class="send-btn" @click="sendMessage" :disabled="!newMessage.trim() || sending" aria-label="Send message">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    </section>

    <!-- ── Empty chat state ── -->
    <div v-else class="chat-empty">
      <div class="chat-empty-content">
        <span class="chat-empty-icon" aria-hidden="true">💬</span>
        <h3>Select a conversation</h3>
        <p>Choose a conversation from the left, or start a new one.</p>
        <button class="chip-primary" @click="openSupport">Contact Support</button>
      </div>
    </div>

    <!-- ── New Chat Modal ── -->
    <Transition name="modal-fade">
      <div v-if="showNewChat" class="modal-backdrop" @click.self="showNewChat = false" role="dialog" aria-modal="true" aria-label="Start new conversation">
        <div class="modal-card glass-card" @keydown.esc="showNewChat = false">
          <button class="modal-close" @click="showNewChat = false" aria-label="Close">×</button>
          <h3 class="modal-title">New Conversation</h3>
          <p class="modal-sub">Search for a user to message.</p>
          <div class="modal-search-wrap">
            <input
              ref="searchInputRef"
              v-model="searchQuery"
              class="modal-search-input"
              placeholder="Search by name or role…"
              @input="onSearch"
              aria-label="Search users"
              autocomplete="off"
            />
            <div v-if="searching" class="search-spinner" aria-label="Searching">
              <span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span>
            </div>
            <ul v-if="searchResults.length" class="search-results" role="listbox">
              <li v-for="user in searchResults" :key="user.id" class="search-result-item"
                @click="startConversation(user)" role="option" tabindex="0"
                @keydown.enter="startConversation(user)">
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

const currentUser   = getUser()
const currentUserId = currentUser?.id ?? null

const conversations     = ref([])
const loadingConvs      = ref(true)
const loadingMessages   = ref(false)
const activeConvId      = ref(null)
const activeConv        = computed(() => conversations.value.find(c => c.id === activeConvId.value) ?? null)
const messages          = ref([])
const newMessage        = ref('')
const sending           = ref(false)
const convSearchQuery   = ref('')
const searchQuery       = ref('')
const searchResults     = ref([])
const searching         = ref(false)
const showNewChat       = ref(false)
const inputFocused      = ref(false)
const showEmojiPicker   = ref(false)
const showScrollBtn     = ref(false)
const newMessageCount   = ref(0)
const hoveredMessageId  = ref(null)
const typingIndicator   = ref(false)
const onlineUsers       = ref(new Set())
const avatarLoadErrors  = ref({})
const reactionsStore    = ref({})
const messagesList      = ref(null)
const inputRef          = ref(null)
const searchInputRef    = ref(null)
const pollTimer         = ref(null)
const searchTimeout     = ref(null)
const isMobile          = ref(window.innerWidth <= 640)

const emojis = ['😊','😂','❤️','👍','🔥','🎉','🤔','😎','🙏','💪']

// ── Format helpers ──
const formatTime = (raw) => {
  if (!raw) return ''
  try {
    const d = new Date(raw)
    if (isNaN(d)) return ''
    const now  = new Date()
    const diff = now - d
    if (diff < 60_000)  return 'now'
    if (diff < 3600_000) return `${Math.floor(diff/60_000)}m`
    if (diff < 86400_000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch { return '' }
}

const formatTimeShort = (raw) => {
  if (!raw) return ''
  try {
    const d = new Date(raw)
    if (isNaN(d)) return ''
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

const convDisplayName = (conv) => {
  if (!conv) return ''
  if (conv.is_support) return 'StudyLink Support'
  return conv.other_user?.fullName || conv.other_user?.full_name || 'Unknown'
}

const convInitials = (conv) => {
  const name = convDisplayName(conv)
  return name ? name[0].toUpperCase() : '?'
}

const hasConversationAvatar = (conv) => {
  if (!conv?.other_user?.profilePicture) return false
  const key = `conv_${conv.id}`
  return !avatarLoadErrors.value[key] && !!normalizeAssetUrl(conv.other_user.profilePicture)
}

const markConversationAvatarError = (conv) => {
  avatarLoadErrors.value = { ...avatarLoadErrors.value, [`conv_${conv.id}`]: true }
}

// ── Filtered conversations ──
const filteredConversations = computed(() => {
  if (!convSearchQuery.value) return conversations.value
  const q = convSearchQuery.value.toLowerCase()
  return conversations.value.filter(c =>
    convDisplayName(c).toLowerCase().includes(q) ||
    (c.last_message || '').toLowerCase().includes(q)
  )
})

// ── Grouped messages ──
const groupedMessages = computed(() => {
  const groups = []
  let currentGroup = null
  const todayStr = new Date().toDateString()

  for (const msg of messages.value) {
    // FIX: guard invalid dates
    const d = msg.created_at ? new Date(msg.created_at) : null
    const dateStr = d && !isNaN(d) ? d.toDateString() : todayStr
    let label = dateStr === todayStr ? 'Today' : (d ? d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }) : 'Unknown')

    if (!currentGroup || currentGroup.dateStr !== dateStr) {
      currentGroup = { dateStr, label, messages: [] }
      groups.push(currentGroup)
    }
    currentGroup.messages.push(msg)
  }
  return groups
})

// ── Reactions ──
const getReactions = (msg) => {
  const store = reactionsStore.value[msg.id]
  if (!store) return []
  return Object.entries(store).filter(([, v]) => v.count > 0).map(([emoji, v]) => ({ emoji, count: v.count, mine: v.mine }))
}

const hasReaction = (msg, emoji) => reactionsStore.value[msg.id]?.[emoji]?.mine ?? false

const toggleReaction = (msg, emoji) => {
  if (!reactionsStore.value[msg.id]) reactionsStore.value[msg.id] = {}
  const current = reactionsStore.value[msg.id][emoji] ?? { count: 0, mine: false }
  reactionsStore.value[msg.id][emoji] = current.mine
    ? { count: Math.max(0, current.count - 1), mine: false }
    : { count: current.count + 1, mine: true }
}

// ── Scroll ──
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
  if (isAtBottom()) { showScrollBtn.value = false; newMessageCount.value = 0 }
}

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

// ── Data ──
const loadConversations = async () => {
  try {
    const data = await api('/conversations')
    conversations.value   = data?.conversations ?? []
    avatarLoadErrors.value = {}
  } catch { /* silent */ } finally {
    loadingConvs.value = false
  }
}

const openConversation = async (conv) => {
  if (!conv?.id) return
  activeConvId.value    = conv.id
  messages.value        = []
  loadingMessages.value = true
  await loadMessages(conv.id)
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
    const data = await api(`/conversations/${convId}/messages`)
    const incoming = data?.messages ?? []
    messages.value = incoming
    await scrollToBottom()
  } catch { /* silent */ } finally {
    loadingMessages.value = false
  }
}

const sendMessage = async () => {
  const content = newMessage.value.trim()
  if (!content || sending.value || !activeConvId.value) return
  sending.value   = true
  newMessage.value = ''
  if (inputRef.value) inputRef.value.style.height = 'auto'

  const optimistic = {
    id: `opt_${Date.now()}`,
    content,
    created_at: new Date().toISOString(),
    sender: { id: currentUserId, fullName: currentUser?.fullName },
    optimistic: true,
    failed: false,
  }
  messages.value.push(optimistic)
  await scrollToBottom()

  try {
    await api(`/conversations/${activeConvId.value}/messages`, 'POST', { content })
    const idx = messages.value.findIndex(m => m.id === optimistic.id)
    if (idx !== -1) messages.value[idx].optimistic = false
  } catch {
    const idx = messages.value.findIndex(m => m.id === optimistic.id)
    if (idx !== -1) messages.value[idx].failed = true
  } finally {
    sending.value = false
  }
}

const retryMessage = async (msg) => {
  const idx = messages.value.findIndex(m => m.id === msg.id)
  if (idx !== -1) { messages.value[idx].failed = false; messages.value[idx].optimistic = true }
  try {
    await api(`/conversations/${activeConvId.value}/messages`, 'POST', { content: msg.content })
    if (idx !== -1) messages.value[idx].optimistic = false
  } catch {
    if (idx !== -1) messages.value[idx].failed = true
  }
}

const openSupport = async () => {
  showNewChat.value = false
  try {
    const data = await api('/conversations/support', 'POST', {})
    await loadConversations()
    const conv = conversations.value.find(c => c.id === data?.conversationId)
    if (conv) await openConversation(conv)
  } catch { /* silent */ }
}

// ── Polling ──
const startPolling = () => {
  stopPolling()
  pollTimer.value = setInterval(async () => {
    if (!activeConvId.value) return
    try {
      const data = await api(`/conversations/${activeConvId.value}/messages`)
      const incoming = data?.messages ?? []
      if (incoming.length > messages.value.filter(m => !m.optimistic).length) {
        const atBottom = isAtBottom()
        messages.value = [
          ...incoming,
          ...messages.value.filter(m => m.optimistic),
        ]
        if (atBottom) await scrollToBottom()
        else {
          const newCount = incoming.length - messages.value.filter(m => !m.optimistic).length
          newMessageCount.value += Math.max(0, newCount)
          showScrollBtn.value    = true
        }
      }
    } catch { /* silent */ }
  }, 4000)
}

const stopPolling = () => { clearInterval(pollTimer.value) }

// ── Search ──
let searchTimeout2 = null
const onSearch = () => {
  clearTimeout(searchTimeout2)
  searchResults.value = []
  if (searchQuery.value.length < 2) return
  searching.value = true
  searchTimeout2 = setTimeout(async () => {
    try {
      const data = await api(`/users/search?q=${encodeURIComponent(searchQuery.value)}`)
      searchResults.value = Array.isArray(data?.users) ? data.users : []
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
    if (conv) await openConversation(conv)
  } catch { /* silent */ }
}

const onResize = () => { isMobile.value = window.innerWidth <= 640 }

const handleGlobalKeydown = (e) => {
  if (e.key === 'Escape') { showEmojiPicker.value = false; if (showNewChat.value) showNewChat.value = false }
}
const handleGlobalClick = () => { showEmojiPicker.value = false }

onMounted(() => {
  loadConversations()
  window.addEventListener('resize', onResize)
  document.addEventListener('click', handleGlobalClick)
  document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  stopPolling()
  window.removeEventListener('resize', onResize)
  document.removeEventListener('click', handleGlobalClick)
  document.removeEventListener('keydown', handleGlobalKeydown)
  clearTimeout(searchTimeout2)
})

watch(showNewChat, (val) => {
  if (!val) { searchQuery.value = ''; searchResults.value = [] }
  else nextTick(() => searchInputRef.value?.focus())
})
</script>

<style scoped>
.messages-page {
  display: flex;
  height: calc(100vh - 56px);
  overflow: hidden;
  background: #F5F5F5;
  max-width: 1200px;
  margin: 0 auto;
}

/* ── Sidebar ── */
.conversations-sidebar {
  width: 300px;
  flex-shrink: 0;
  border-right: 2px solid #FFCEE3;
  display: flex;
  flex-direction: column;
  background: rgba(255,255,255,0.9);
  backdrop-filter: blur(12px);
  overflow: hidden;
  transition: transform 0.25s ease;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #FFCEE3;
}
.sidebar-title { margin: 0; font-size: 18px; font-weight: 800; color: #021A54 }
.sidebar-actions { display: flex; gap: 8px }

.action-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border: 1.5px solid #FFCEE3;
  border-radius: 8px;
  background: #F5F5F5;
  color: #021A54;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 120ms;
}
.action-btn:hover { border-color: #FF85BB; background: #fff }
.action-btn--primary { background: #FF85BB; border-color: #021A54; color: #021A54 }
.action-btn--primary:hover { background: #ff6da9 }

.sidebar-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #FFCEE3;
}
.sidebar-search-icon { color: #FF85BB; flex-shrink: 0 }
.sidebar-search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  color: #021A54;
  background: transparent;
}
.sidebar-search-input::placeholder { color: #aaa }

/* Skeleton */
.conv-skeleton-list { padding: 8px }
.conv-skeleton { display: flex; align-items: center; gap: 10px; padding: 10px; animation: shimmer 1.4s infinite }
.skel-avatar { width: 40px; height: 40px; border-radius: 50%; background: #e0e0e0; flex-shrink: 0 }
.skel-lines { flex: 1; display: flex; flex-direction: column; gap: 6px }
.skel-line { border-radius: 4px; background: #ebebeb }
.skel-name { height: 12px; width: 60% }
.skel-msg  { height: 10px; width: 80% }
@keyframes shimmer { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }

.empty-convs { padding: 24px 16px; text-align: center; color: #021A54; font-weight: 600; font-size: 13px }
.empty-hint { color: #6e6e73; font-size: 12px; margin-top: 4px }

.conv-list { list-style: none; margin: 0; padding: 0; overflow-y: auto; flex: 1 }

.conv-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 120ms;
  border-bottom: 1px solid #f5f5f5;
}
.conv-item:hover { background: #F5F5F5 }
.conv-item.active { background: rgba(255,133,187,0.1); border-left: 3px solid #FF85BB }
.conv-item.unread .conv-name { font-weight: 800 }

.conv-avatar-wrap { position: relative; flex-shrink: 0 }
.conv-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: #FFCEE3; border: 2px solid #021A54;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 14px; color: #021A54;
  overflow: hidden;
}
.conv-avatar img { width: 100%; height: 100%; object-fit: cover }
.support-avatar { background: #021A54; color: #FF85BB }
.avatar-fallback-icon svg { width: 18px; height: 18px; fill: #021A54 }
.online-dot {
  position: absolute; bottom: 0; right: 0;
  width: 10px; height: 10px; background: #34c759;
  border: 2px solid #fff; border-radius: 50%;
}

.conv-info { flex: 1; min-width: 0 }
.conv-top { display: flex; justify-content: space-between; align-items: baseline; gap: 4px }
.conv-name { font-size: 13px; font-weight: 600; color: #021A54; white-space: nowrap; overflow: hidden; text-overflow: ellipsis }
.conv-time { font-size: 10px; color: #6e6e73; white-space: nowrap; flex-shrink: 0 }
.conv-bottom { display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-top: 2px }
.conv-last { font-size: 12px; color: #6e6e73; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1 }
.conv-last-unread { color: #021A54; font-weight: 600 }
.unread-badge {
  background: #FF85BB; color: #021A54; border-radius: 999px;
  font-size: 10px; font-weight: 800; min-width: 18px; height: 18px;
  padding: 0 5px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}

/* ── Chat Panel ── */
.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  background: #fff;
}

.glass-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 2px solid #FFCEE3;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(12px);
  flex-shrink: 0;
}

.back-btn {
  display: none;
  width: 32px; height: 32px;
  border: 1.5px solid #FFCEE3; border-radius: 50%;
  background: #F5F5F5; color: #021A54;
  align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0;
}

.chat-header-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: #FFCEE3; border: 2px solid #021A54;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; color: #021A54; font-size: 14px;
  overflow: hidden; flex-shrink: 0;
}
.chat-header-avatar img { width: 100%; height: 100%; object-fit: cover }

.chat-header-info { flex: 1; min-width: 0 }
.chat-header-info h3 { margin: 0; font-size: 15px; font-weight: 700; color: #021A54; white-space: nowrap; overflow: hidden; text-overflow: ellipsis }
.chat-role { margin: 0; font-size: 11px; color: #6e6e73; text-transform: capitalize }
.support-label { color: #FF85BB; font-weight: 600 }

.chat-header-actions { margin-left: auto }
.icon-btn {
  width: 32px; height: 32px; border-radius: 50%;
  border: 1.5px solid #FFCEE3; background: #F5F5F5;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #021A54;
  transition: background 120ms;
}
.icon-btn:hover { background: #FFCEE3 }

.messages-list { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 4px }
.messages-loading { display: flex; justify-content: center; gap: 5px; padding: 20px }
.loading-dot {
  width: 6px; height: 6px; background: #FF85BB; border-radius: 50%;
  animation: bounce 1.4s ease infinite;
}
.loading-dot:nth-child(2) { animation-delay: 0.2s }
.loading-dot:nth-child(3) { animation-delay: 0.4s }
@keyframes bounce { 0%,80%,100% { transform: scale(0) } 40% { transform: scale(1) } }

.date-divider {
  text-align: center; margin: 8px 0;
}
.date-divider span {
  font-size: 11px; font-weight: 600; color: #6e6e73;
  background: #F5F5F5; padding: 3px 10px; border-radius: 999px;
}

.message-bubble-wrap {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  position: relative;
}
.message-bubble-wrap.mine { flex-direction: row-reverse }

.msg-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: #FFCEE3; display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 800; color: #021A54; overflow: hidden; flex-shrink: 0;
}
.msg-avatar img { width: 100%; height: 100%; object-fit: cover }

.bubble-col { display: flex; flex-direction: column; gap: 3px; max-width: 70% }

.bubble {
  padding: 10px 14px;
  border-radius: 16px 16px 16px 4px;
  background: #F5F5F5;
  border: 1.5px solid #FFCEE3;
}
.bubble-mine {
  background: rgba(255,133,187,0.12);
  border-color: #FF85BB;
  border-radius: 16px 16px 4px 16px;
}
.bubble-failed { opacity: 0.6; border-color: #ccc }

.bubble-text { margin: 0; font-size: 14px; color: #021A54; line-height: 1.5; white-space: pre-wrap; word-break: break-word }
.bubble-meta { display: flex; align-items: center; justify-content: flex-end; gap: 4px; margin-top: 4px }
.bubble-time { font-size: 10px; color: #6e6e73 }
.read-status { display: flex; align-items: center; color: #6e6e73 }

.retry-btn {
  font-size: 12px; font-weight: 600; color: #FF85BB;
  background: none; border: none; cursor: pointer; padding: 2px 0;
}
.retry-btn:hover { color: #021A54 }

.msg-actions {
  position: absolute;
  bottom: 100%; left: 36px;
  display: flex; gap: 4px;
  background: rgba(255,255,255,0.95);
  border: 1.5px solid #FFCEE3;
  border-radius: 20px;
  padding: 4px 8px;
  box-shadow: 0 4px 12px rgba(2,26,84,0.1);
  z-index: 10;
}
.mine .msg-actions { left: auto; right: 0 }
.msg-action-btn {
  background: none; border: none; font-size: 16px; cursor: pointer;
  border-radius: 4px; padding: 2px;
  transition: transform 120ms;
}
.msg-action-btn:hover { transform: scale(1.2) }
.msg-action-btn.reacted { filter: drop-shadow(0 0 4px rgba(255,133,187,0.6)) }

.typing-dots {
  display: inline-flex; gap: 2px; align-items: center;
}
.typing-dots span {
  width: 4px; height: 4px; background: #FF85BB; border-radius: 50%;
  animation: bounce 1.2s ease infinite;
}
.typing-dots span:nth-child(2) { animation-delay: 0.2s }
.typing-dots span:nth-child(3) { animation-delay: 0.4s }

/* Scroll button */
.scroll-bottom-btn {
  position: absolute;
  bottom: 80px; right: 16px;
  background: #FF85BB;
  color: #021A54;
  border: 2px solid #021A54;
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(2,26,84,0.12);
}

/* Input bar */
.glass-input-bar {
  padding: 12px 16px;
  border-top: 2px solid #FFCEE3;
  background: rgba(255,255,255,0.9);
  backdrop-filter: blur(12px);
  flex-shrink: 0;
  position: relative;
}
.input-area {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  border: 1.5px solid #FFCEE3;
  border-radius: 16px;
  padding: 8px 12px;
  background: #fff;
  transition: border-color 150ms;
}
.input-area.focused { border-color: #FF85BB; box-shadow: 0 0 0 3px rgba(255,133,187,0.15) }

.emoji-wrap { position: relative }
.emoji-btn {
  background: none; border: none; font-size: 18px; cursor: pointer;
  line-height: 1; transition: transform 120ms;
}
.emoji-btn:hover { transform: scale(1.2) }
.emoji-picker {
  position: absolute;
  bottom: 100%; left: 0;
  background: rgba(255,255,255,0.96);
  backdrop-filter: blur(12px);
  border: 2px solid #021A54;
  border-radius: 12px;
  padding: 10px;
  display: flex; flex-wrap: wrap; gap: 6px;
  width: 200px;
  box-shadow: 0 8px 24px rgba(2,26,84,0.12);
  z-index: 20;
}
.emoji-opt {
  background: none; border: none; font-size: 20px; cursor: pointer;
  border-radius: 6px; padding: 3px;
  transition: transform 120ms, background 120ms;
}
.emoji-opt:hover { background: #FFCEE3; transform: scale(1.15) }

.message-input {
  flex: 1; border: none; outline: none; resize: none; overflow: hidden;
  font-size: 14px; color: #021A54; line-height: 1.5;
  background: transparent; max-height: 120px;
  font-family: inherit;
}
.message-input::placeholder { color: #aaa }

.send-btn {
  width: 36px; height: 36px; border-radius: 50%;
  background: #FF85BB; border: 2px solid #021A54;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: #021A54;
  transition: background 120ms, transform 120ms;
  flex-shrink: 0;
}
.send-btn:hover:not(:disabled) { background: #ff6da9 }
.send-btn:active { transform: scale(0.9) }
.send-btn:disabled { opacity: 0.4; cursor: not-allowed }

/* Empty chat */
.chat-empty {
  flex: 1; display: flex; align-items: center; justify-content: center;
  background: #F5F5F5;
}
.chat-empty-content { text-align: center; padding: 40px }
.chat-empty-icon { font-size: 64px; display: block; margin-bottom: 16px }
.chat-empty-content h3 { margin: 0 0 8px; font-size: 20px; font-weight: 800; color: #021A54 }
.chat-empty-content p { color: #6e6e73; font-size: 13px; margin: 0 0 20px }
.chip-primary {
  background: #FF85BB; color: #021A54;
  border: 2px solid #021A54; border-radius: 8px;
  padding: 10px 20px; font-size: 13px; font-weight: 700;
  cursor: pointer; transition: background 120ms;
}
.chip-primary:hover { background: #ff6da9 }

/* Modal */
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(2,26,84,0.25);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.glass-card {
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(20px);
  border: 2px solid #021A54;
  border-radius: 20px;
  padding: 28px;
  width: min(400px, 100%);
  position: relative;
  box-shadow: 0 20px 60px rgba(2,26,84,0.15);
}
.modal-close {
  position: absolute; top: 12px; right: 14px;
  width: 28px; height: 28px; border-radius: 50%;
  border: none; background: #FFCEE3; color: #021A54;
  font-size: 18px; font-weight: 700; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.modal-close:hover { background: #FF85BB }
.modal-title { margin: 0 0 4px; font-size: 18px; font-weight: 800; color: #021A54 }
.modal-sub { margin: 0 0 16px; font-size: 13px; color: #6e6e73 }
.modal-search-input {
  width: 100%; padding: 10px 14px; box-sizing: border-box;
  border: 1.5px solid #FFCEE3; border-radius: 10px;
  font-size: 14px; color: #021A54; background: #fff;
}
.modal-search-input:focus { outline: none; border-color: #FF85BB }
.modal-search-wrap { display: flex; flex-direction: column; gap: 10px }

.search-spinner { display: flex; gap: 4px; justify-content: center; padding: 8px }
.search-results { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; max-height: 200px; overflow-y: auto }
.search-result-item {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px; border-radius: 10px; cursor: pointer;
  transition: background 120ms;
}
.search-result-item:hover { background: #F5F5F5 }
.result-avatar {
  width: 34px; height: 34px; border-radius: 50%;
  background: linear-gradient(135deg, #FF85BB, #ff6da9);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 13px; flex-shrink: 0;
}
.result-name { margin: 0; font-size: 13px; font-weight: 600; color: #021A54 }
.result-role { margin: 0; font-size: 11px; color: #6e6e73; text-transform: capitalize }
.no-results { text-align: center; color: #6e6e73; font-size: 13px }

/* Transitions */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.2s }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0 }
.pop-enter-active { transition: opacity 0.15s, transform 0.15s }
.pop-leave-active { transition: opacity 0.1s }
.pop-enter-from { opacity: 0; transform: scale(0.9) translateY(4px) }
.pop-leave-to { opacity: 0 }
.fade-up-enter-active { transition: opacity 0.2s, transform 0.2s }
.fade-up-leave-active { transition: opacity 0.15s }
.fade-up-enter-from { opacity: 0; transform: translateY(8px) }
.fade-up-leave-to { opacity: 0 }

/* Responsive */
@media (max-width: 640px) {
  .conversations-sidebar {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 5;
    border-right: none;
  }
  .conversations-sidebar.mobile-hidden { transform: translateX(-100%); pointer-events: none }
  .back-btn { display: flex }
  .chat-panel { width: 100% }
}
@media (prefers-reduced-motion: reduce) {
  .loading-dot, .typing-dots span, .conv-skeleton { animation: none }
}
</style>