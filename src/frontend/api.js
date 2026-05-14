const TOKEN_KEY = 'studylinkToken'
const USER_KEY = 'studylinkUser'

let toastContainer = null

function ensureToastContainer() {
  if (toastContainer) {
    return toastContainer
  }

  toastContainer = document.getElementById('toastContainer')
  if (toastContainer) {
    return toastContainer
  }

  toastContainer = document.createElement('div')
  toastContainer.id = 'toastContainer'
  toastContainer.className = 'toast-stack'
  document.body.appendChild(toastContainer)
  return toastContainer
}

// --- AUTHENTICATION FUNCTIONS ---
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function getUser() {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw || raw === 'undefined' || raw === 'null') {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch (error) {
    // Recover from corrupted localStorage values to avoid crashing the app render.
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  if (user && typeof user === 'object') {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(USER_KEY)
  }
  window.dispatchEvent(new Event('studylink-session-changed'))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  window.dispatchEvent(new Event('studylink-session-changed'))
}

export function requireSession() {
  const token = getToken()
  const user = getUser()
  if (!token || !user) {
    window.location.href = '/login'
    return null
  }
  return user
}

export function requireRoleSession(...roles) {
  const user = requireSession()
  if (!user) return null

  if (!roles.includes(user.role)) {
    window.location.href = '/resources'
    return null
  }
  return user
}

// --- API FETCH FUNCTION ---
export async function api(path, method = 'GET', body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const options = {
    method,
    headers
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  try {
    // Default to /api for local Vite proxy, then retry direct path on 404.
    const requestUrls = path.startsWith('/') ? [`/api${path}`, path] : [path]

    for (let index = 0; index < requestUrls.length; index += 1) {
      const response = await fetch(requestUrls[index], options)

      if (response.ok) {
        return await response.json()
      }

      const isFirstRequest = index === 0
      const canRetryWithoutApiPrefix = requestUrls.length > 1 && isFirstRequest && response.status === 404
      if (canRetryWithoutApiPrefix) {
        continue
      }

      if (response.status === 401) {
        clearSession() // Auto logout if token expires
      }

      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    throw new Error('Request failed')
  } catch (error) {
    showToast(error.message || 'Request failed', 'error')
    throw error
  }
}

// --- UTILITY FUNCTIONS ---
export function showToast(message, type = 'info', duration = 3000) {
  const container = ensureToastContainer()
  
  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.textContent = message
  
  container.appendChild(toast)
  
  setTimeout(() => {
    toast.remove()
  }, duration)
}

export function setMessage(id, text, isOk = false) {
  const element = document.getElementById(id)
  if (element) {
    element.textContent = text
    element.style.color = isOk ? '#1f7a45' : '#bc2f2f'
  }
  if (text) showToast(text, isOk ? 'success' : 'error')
}

export function debounce(fn, delay = 300) {
  let timer = null
  return (...args) => {
    if (timer) window.clearTimeout(timer)
    timer = window.setTimeout(() => fn(...args), delay)
  }
}