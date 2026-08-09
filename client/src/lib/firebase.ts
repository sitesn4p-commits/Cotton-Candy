import { getApp, getApps, initializeApp } from 'firebase/app'
import { deleteToken, getMessaging, getToken, isSupported, onMessage, type MessagePayload } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || ''

export function isWebPushConfigured() {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId && firebaseConfig.appId && vapidKey)
}

export async function registerWebPush(onForegroundMessage: (payload: MessagePayload) => void) {
  if (!isWebPushConfigured() || !('serviceWorker' in navigator) || !('Notification' in window)) return null
  if (!await isSupported()) throw new Error('unsupported-browser')
  const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
  if (permission !== 'granted') return { token: null, unsubscribe: () => undefined }

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  const messaging = getMessaging(app)
  await navigator.serviceWorker.register('/admin-sw.js', { scope: '/' })
  const registration = await navigator.serviceWorker.ready
  let token: string
  try {
    token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })
  } catch {
    await deleteToken(messaging).catch(() => undefined)
    token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })
  }
  return { token, unsubscribe: onMessage(messaging, onForegroundMessage) }
}
