import { api } from './api.js'

const SW_URL = '/sw.js'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export async function registerSW() {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register(SW_URL)
    return reg
  } catch {
    return null
  }
}

export async function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

export async function getPushPermission() {
  return Notification.permission
}

export async function subscribeToPush() {
  if (!(await isPushSupported())) {
    throw new Error('Push notifications are not supported in this browser.')
  }

  const permission = await Notification.requestPermission()
  if (permission === 'denied') {
    throw new Error('Notification permission was denied. Please allow notifications in your browser settings.')
  }
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.')
  }

  const reg = await navigator.serviceWorker.ready

  // Unsubscribe from any stale subscription first (handles VAPID key rotation)
  try {
    const existingSub = await reg.pushManager.getSubscription()
    if (existingSub) await existingSub.unsubscribe()
  } catch {
    // Ignore cleanup errors
  }

  const { publicKey } = await api('/push/vapid-public-key')

  let subscription
  try {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  } catch (err) {
    // Brave browser blocks push via its privacy shield
    if (err?.name === 'NotAllowedError') {
      throw new Error('Push notifications blocked by browser. In Brave: click the Brave shield icon → disable "Block fingerprinting" for this site.')
    }
    if (err?.name === 'AbortError' || err?.message?.includes('push service')) {
      throw new Error('Push service unreachable. This can happen in Brave browser — try Chrome or Firefox for push notifications.')
    }
    throw new Error(`Push subscription failed: ${err?.message || 'Unknown error'}`)
  }

  await api('/push/subscribe', 'POST', subscription.toJSON())
  localStorage.setItem('pushSubscribed', '1')
  return subscription
}

export async function unsubscribeFromPush() {
  if (!('serviceWorker' in navigator)) return

  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    await api('/push/unsubscribe', 'DELETE', { endpoint: sub.endpoint }).catch(() => {})
    await sub.unsubscribe()
  }
  localStorage.removeItem('pushSubscribed')
}

export async function getCurrentSubscription() {
  if (!('serviceWorker' in navigator)) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}
